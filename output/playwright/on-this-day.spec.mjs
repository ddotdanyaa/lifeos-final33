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
  await page.goto(`${appUrl}?otd=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function onThisDay(page, records, today, options) {
  return page.evaluate(async ([rows, day, opts]) => {
    const mod = await import("/core/on-this-day.mjs");
    return mod.onThisDay(rows, day, opts || {});
  }, [records, today, options || null]);
}

// Владелец: «нет ощущения движения». Веха обязана называть себя точно — «месяц назад» никогда
// не выдаётся за «год назад», иначе продукт врёт ради тёплого чувства.

test("год назад находится и подписывается годом", async ({ page }) => {
  await reset(page);
  const found = await onThisDay(page, [
    { id: "a", title: "Хочу купить машину", day: "2025-07-28" },
    { id: "b", title: "Кофе 300", day: "2026-07-01" }
  ], "2026-07-29");
  expect(found).toBeTruthy();
  expect(found.label).toBe("Год назад");
  expect(found.title).toContain("Хочу купить машину");
  // Промах по дате назван вслух, а не спрятан.
  expect(found.detail).toContain("на 1 день раньше");
});

test("дальняя веха сильнее ближней", async ({ page }) => {
  await reset(page);
  const found = await onThisDay(page, [
    { id: "old", title: "Запись года", day: "2025-07-29" },
    { id: "recent", title: "Запись месяца", day: "2026-06-29" }
  ], "2026-07-29");
  // «Год назад» ценнее, чем «месяц назад»: движение видно на большем плече.
  expect(found.label).toBe("Год назад");
  expect(found.title).toContain("Запись года");
});

test("месяц назад не выдаётся за год", async ({ page }) => {
  await reset(page);
  const found = await onThisDay(page, [
    { id: "m", title: "Смета на кухню пришла", day: "2026-06-29" }
  ], "2026-07-29");
  expect(found.label).toBe("Месяц назад");
  expect(found.title).toContain("Месяц назад");
  expect(found.title).not.toContain("Год назад");
});

test("молодому хранилищу показывать нечего — и оно молчит, а не выдумывает", async ({ page }) => {
  await reset(page);
  const found = await onThisDay(page, [
    { id: "z", title: "вчерашняя мысль", day: "2026-07-28" }
  ], "2026-07-29");
  expect(found).toBe(null);
});

test("короткий месяц не уводит веху: 31 марта минус месяц — это февраль", async ({ page }) => {
  await reset(page);
  const shifted = await page.evaluate(async () => {
    const mod = await import("/core/on-this-day.mjs");
    return mod.shiftMonths("2026-03-31", 1);
  });
  // Без поправки вышло бы 3 марта, и подпись «месяц назад» начала бы врать.
  expect(shifted).toBe("2026-02-28");
});
