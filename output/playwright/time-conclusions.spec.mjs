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
  await page.goto(`${appUrl}?corr=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

// Чистый слой считается в браузере — берём его прямо из модуля, без экранной обвязки: предмет
// проверки здесь математика вывода, а не разметка.
async function correlate(page, series, options) {
  return page.evaluate(async ([rows, opts]) => {
    const mod = await import("/core/day-correlations.mjs");
    return mod.dayCorrelationInsights(rows, opts || {});
  }, [series, options || null]);
}

function series(key, label, values) {
  return { key, label, values };
}

test("настоящая связь становится выводом и объясняет себя", async ({ page }) => {
  await reset(page);
  const hours = [];
  const closed = [];
  for (let day = 0; day < 20; day += 1) {
    hours.push((day % 7) + (day % 3));
    closed.push(10 - (day % 7));
  }
  const result = await correlate(page, [
    series("shift", "Часы смен", hours),
    series("closed", "Закрыто дел", closed)
  ]);

  expect(result.insights.length).toBeGreaterThan(0);
  const first = result.insights[0];
  expect(first.title).toContain("Часы смен");
  // Вывод обязан объяснять себя: по скольким дням и насколько сильно.
  expect(first.detail).toMatch(/По \d+ дням/);
  expect(first.detail).toMatch(/сила связи/);
  // И обязан честно говорить, что это наблюдение, а не причина.
  expect(first.detail).toContain("не причина");
});

// САМАЯ ВАЖНАЯ ПРОВЕРКА ПАКЕТА. Шесть случайных рядов дают 15 пар; при пороге p < 0.05 без
// поправки примерно одна-две объявятся «значимыми» на чистом шуме. Ложный вывод хуже
// отсутствующего: он учит не верить выводам вообще.
test("на чистом шуме выводов не появляется", async ({ page }) => {
  await reset(page);
  const rows = [];
  for (let k = 0; k < 6; k += 1) {
    let seed = k * 991 + 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    rows.push(series("r" + k, "Ряд " + k, Array.from({ length: 25 }, () => Math.round(next() * 100))));
  }
  const result = await correlate(page, rows);
  expect(result.tested).toBeGreaterThan(10);
  expect(result.insights.length).toBe(0);
  expect(result.note).toContain("пережило поправку");
});

test("коротких рядов не хватает — и это сказано вслух, а не молча", async ({ page }) => {
  await reset(page);
  const result = await correlate(page, [
    series("a", "A", [1, 2, 3, 4, 5]),
    series("b", "B", [5, 4, 3, 2, 1])
  ]);
  expect(result.insights.length).toBe(0);
  expect(result.note).toContain("Данных пока мало");
});

test("слабая связь выводом не становится", async ({ page }) => {
  await reset(page);
  // Ряды слегка согласованы, но эффект ниже порога полезности: «чуть-чуть чаще» человек
  // использовать не может, поэтому режем по размеру эффекта, а не только по значимости.
  const a = [];
  const b = [];
  for (let day = 0; day < 30; day += 1) {
    a.push(day % 10);
    b.push((day * 7) % 11);
  }
  const result = await correlate(page, [series("a", "A", a), series("b", "B", b)], { minEffect: 0.9 });
  expect(result.insights.length).toBe(0);
});
