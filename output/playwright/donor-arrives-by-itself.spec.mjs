import { expect, test } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findLocalChromium() {
  const root = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort().reverse()
    .map((name) => join(root, name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
  return candidates.find((candidate) => existsSync(candidate));
}
const localChromium = findLocalChromium();
if (localChromium) test.use({ launchOptions: { executablePath: localChromium } });
test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?donor=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, text) {
  await page.fill('[data-testid="capture-input"]', text);
  await page.click('[data-testid="capture-text"]');
  await page.waitForTimeout(500);
}

function donorProposals(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().proposals)
    .filter((item) => item.type === "donor" && item.status === "open")
    .map((item) => ({ id: item.id, title: item.title, reason: item.reason, fields: item.fields })));
}

// Сценарий владельца дословно: «нашёл репозиторий, где граф работает лучше, кинул файлом;
// вечером пришёл — обработано, определено, что это репозиторий для изучения; дальше вопросник:
// у нас или у них лучше; можем сделать себе — в очередь на внедрение».

test("ссылка на репозиторий сама становится решением с причиной", async ({ page }) => {
  await reset(page);
  await capture(page, "нашёл https://github.com/graphology/graphology — louvain и pagerank, es modules, работает в браузере");

  const donors = await donorProposals(page);
  expect(donors.length).toBeGreaterThan(0);
  const card = donors[0];
  // Решение, а не отчёт анализатора: что это, что делать и ПОЧЕМУ.
  expect(card.fields.decision).toBeTruthy();
  expect(card.fields.why).toBeTruthy();
  expect(card.fields.url).toContain("graphology");
  // Сверка «у нас или у них»: донор попал в очередь именно потому, что у нас этого нет.
  expect(card.fields.why).toMatch(/У нас нет|поучиться/);
});

test("лицензия не запрещает изучение — она решает только, берём ли код дословно", async ({ page }) => {
  await reset(page);
  // Проект с копилефт-лицензией и чужим стеком: разбирать его можно, и продукт обязан это сказать.
  await capture(page, "https://github.com/getzep/graphiti — python, requirements.txt, networkx, AGPL");

  const donors = await donorProposals(page);
  expect(donors.length).toBeGreaterThan(0);
  const card = donors[0];
  // Главное утверждение пакета: это НЕ отказ. Проект идёт в работу разбором.
  expect(card.fields.decision).not.toBe("отклонить");
  expect(card.fields.queue).toBe(true);
  expect(String(card.fields.verdictTitle)).toMatch(/Изучаем|Берём/);
});

test("принятое решение встаёт в очередь на внедрение и переживает перезагрузку", async ({ page }) => {
  await reset(page);
  await capture(page, "нашёл https://github.com/graphology/graphology — louvain кластеры, es modules");

  const donors = await donorProposals(page);
  expect(donors.length).toBeGreaterThan(0);
  await page.evaluate((id) => window.__lifeosKnowledgeBase.applyProposalForTest(id), donors[0].id);
  await page.waitForTimeout(500);

  const queued = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().donorQueue || {}));
  expect(queued.length).toBe(1);
  expect(queued[0].status).toBe("queued");
  expect(queued[0].url).toContain("graphology");
  expect(queued[0].why).toBeTruthy();

  // Ловушка из промта: новое поле состояния обязано пройти обе точки normalizeState, иначе
  // очередь тихо исчезнет при следующем открытии — и владелец потеряет вечер разбора.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  const afterReload = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().donorQueue || {}));
  expect(afterReload.length).toBe(1);
  expect(afterReload[0].url).toContain("graphology");
});

test("обычная мысль донором не становится", async ({ page }) => {
  await reset(page);
  await capture(page, "надо ответить Дмитрию до среды");
  const donors = await donorProposals(page);
  expect(donors.length).toBe(0);
});
