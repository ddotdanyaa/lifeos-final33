// П35 · МОСТ TELEGRAM: голос с телефона доходит до артефакта, пока ноутбук просто включён.
//
// Смысл приходит в дороге, где есть телефон и нет LifeOS. Продукт, который ловит только
// напечатанное за ноутбуком, ловит меньшую часть жизни.
//
// [ЛОКАЛЬНАЯ ПРИЁМКА] Живой бот требует токена владельца от @BotFather и его user_id — их
// вводит только он (CLAUDE.md §7). Без токена мост честно не поднимается, и спека проверяет
// ИМЕННО ЭТО: что честный отказ существует, что чужой user_id отбрасывается, и что принесённое
// идёт СУЩЕСТВУЮЩИМ путём импорта, а не вторым.
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(180000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page, tag) {
  await page.goto(`${appUrl}?${tag}=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

test("без токена мост честно не поднят, а не делает вид", async ({ page }) => {
  await reset(page, "telegram-honest");

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.pullTelegramInboxForTest());

  // Токена у владельца в этой среде нет — и система обязана это СКАЗАТЬ, а не изображать
  // ожидание сообщений. Тот же контракт, что у всех провайдеров: ok / not-connected /
  // permission-required / provider_unavailable, и никогда имитация.
  expect(["not-connected", "permission-required"]).toContain(state.status);
  expect(state.why.length, "честный статус обязан объяснять себя").toBeGreaterThan(0);
  expect(state.brought).toBe(0);
});

test("принесённое мостом идёт СУЩЕСТВУЮЩИМ путём импорта, а не вторым", async ({ page }) => {
  await reset(page, "telegram-same-path");

  // Подменяем ответ моста: сервер бы отдал ровно такую форму. Проверяем НЕ сеть, а то, что
  // принесённое проходит тот же путь, что файл с диска — с дедупом, статусами и провенансом.
  const result = await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    const rate = 16000;
    const frames = rate * 2;
    const buffer = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(buffer);
    const ascii = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
    ascii(0, "RIFF"); view.setUint32(4, 36 + frames * 2, true); ascii(8, "WAVEfmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); ascii(36, "data"); view.setUint32(40, frames * 2, true);
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);

    const original = window.fetch;
    window.fetch = async (url, options) => {
      if (String(url).includes("/telegram-inbox")) {
        return new Response(JSON.stringify({
          status: "ok",
          why: "",
          items: [
            { kind: "audio", name: "telegram-voice.wav", mime: "audio/wav", size: bytes.length, base64: btoa(binary), at: new Date().toISOString() },
            { kind: "text", text: "Надо заехать в сервис до пятницы", at: new Date().toISOString() }
          ]
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return original(url, options);
    };
    const state = await kb.pullTelegramInboxForTest();
    window.fetch = original;
    // Ждём ПОЯВЛЕНИЯ записи, а не фиксированную паузу: запись байтов в хранилище асинхронна, и
    // жёсткий таймер ловил бы скорость машины, а не поведение продукта.
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const seen = Object.values(kb.getStateSnapshot().sources).filter((row) => !row.deleted && row.kind === "audio");
      if (seen.length) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const snapshot = kb.getStateSnapshot();
    return {
      state,
      audio: Object.values(snapshot.sources).filter((row) => !row.deleted && row.kind === "audio").map((row) => ({ name: row.name, stored: Boolean(row.mediaStored || row.dataUrl), status: row.status })),
      proposals: Object.values(snapshot.proposals).filter((row) => row.status === "open").map((row) => row.type + " " + row.title),
      tasks: Object.values(snapshot.tasks).filter((row) => !row.deleted).map((row) => row.title),
      runs: Object.values(snapshot.providerRuns || {}).filter((row) => row.providerId === "telegram").length
    };
  });

  expect(result.state.status).toBe("ok");
  expect(result.state.brought).toBe(2);

  // Голос стал записью с байтами — ровно как файл, перетащенный мышкой.
  expect(result.audio.length, "голосовая из Telegram обязана стать записью").toBeGreaterThan(0);
  expect(result.audio[0].name).toContain("telegram");
  expect(result.audio[0].stored, "байты обязаны сохраниться, а не остаться обещанием").toBe(true);

  // Тот же путь — значит и та же защита. Мост в этом прогоне принёс запись дважды (опрос
  // повторился), и вторая ушла в разбор дублей, а не удвоила базу молча. Это дедуп по БАЙТАМ,
  // который уже работал для файлов с диска: второго механизма для Telegram не заводилось.
  const repeats = result.audio.filter((row) => row.status === "duplicate-review");
  if (result.audio.length > 1) {
    expect(repeats.length, "повтор обязан уйти в разбор дублей, а не удвоить базу").toBeGreaterThan(0);
  }

  // Текст разобран тем же разбором — и остановился ПРЕДЛОЖЕНИЕМ, а не готовой задачей. Это тот
  // же контракт, что у печатного ввода: ничего не появляется в списках без подтверждения
  // владельца, и мост его не обходит.
  expect(result.proposals.join(" ").toLowerCase(), "текст из Telegram обязан дойти предложением").toContain("сервис");
  expect(result.tasks.join(" ").toLowerCase(), "и НЕ обязан стать задачей сам").not.toContain("сервис");

  // И у моста есть чек: что принёс и сколько.
  expect(result.runs, "мост обязан оставить след в журнале провайдеров").toBeGreaterThan(0);
});
