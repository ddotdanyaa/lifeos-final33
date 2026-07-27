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
test.setTimeout(150000);

const appUrl = "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${appUrl}?visual=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function captureAndApply(page, lines) {
  for (const line of ["разогрев"].concat(lines)) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(240);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(600);
}

// V1: белая надпись на прозрачном фоне — это невидимая кнопка. Так и было в «тихих часах»:
// переменная `--accent` там переопределялась ЧЕРЕЗ САМУ СЕБЯ, что по спецификации даёт цикл и
// пустое значение, а `.ui-btn-primary` рисуется как `background: var(--accent); color: #fff`.
// Главное действие Дома пропадало ровно вечером — тогда, когда владелец разбирает день.
test("главная кнопка Дома видима: фон не прозрачный", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Хочу купить машину до августа"]);

  const paint = await page.evaluate(() => {
    const button = document.querySelector('[data-testid="human-primary-action"]');
    if (!button) return null;
    const style = getComputedStyle(button);
    return { bg: style.backgroundColor, color: style.color };
  });
  expect(paint).toBeTruthy();
  expect(paint.bg).not.toBe("rgba(0, 0, 0, 0)");
  expect(paint.bg).not.toBe("transparent");
});

// V2: ни одна CSS-переменная не должна ссылаться сама на себя. Цикл делает значение пустым, и
// поломка проявляется не там, где написана, — её тяжело связать с причиной.
test("ни одна переменная темы не ссылается сама на себя", async ({ page }) => {
  await reset(page);
  const cycles = await page.evaluate(async () => {
    const css = await fetch("/styles.css").then((response) => response.text());
    const found = [];
    const re = /--([a-z0-9-]+)\s*:\s*([^;{}]+);/g;
    let match;
    while ((match = re.exec(css)) !== null) {
      const name = match[1];
      // Ссылка именно на ЭТУ переменную, а не на другую с тем же началом имени.
      if (new RegExp("var\\(\\s*--" + name + "\\s*[,)]").test(match[2])) found.push(name);
    }
    return [...new Set(found)];
  });
  expect(cycles).toEqual([]);
});

// V3: в узких колонках «Сегодня» строка задачи не должна вылезать за рамку карточки. Раньше
// кнопки «Главная / →Завтра / Объект / Изменить» обрезались краем колонки.
test("строки задач не переполняют узкие колонки «Сегодня»", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Посчитать свободные деньги за 3 месяца на машину", "Оценить продажу старой машины"]);
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("today"));
  await page.waitForTimeout(800);

  const overflowing = await page.evaluate(() => [...document.querySelectorAll(".now-column .today-task-row, .bucket-column .today-task-row")]
    .filter((node) => node.scrollWidth > node.clientWidth + 1)
    .map((node) => node.textContent.slice(0, 40)));
  expect(overflowing).toEqual([]);
});

// V4: связь «об одном» не должна держаться на служебных словах. Шапка тела заметки
// («Suggested actions:», «Source artifact:») одинакова у всех записей, и по ней инсайты
// связывали цель про машину с задачей про Дмитрия.
test("инсайты-связи не строятся на служебных словах шапки", async ({ page }) => {
  await reset(page);
  await captureAndApply(page, ["Хочу купить машину до августа", "Надо ответить Дмитрию до среды", "Позвонить маме в выходные"]);

  const details = await page.evaluate(() => [...document.querySelectorAll('[data-testid="insight-detail"], .insight-row span, .insight-card span')]
    .map((node) => node.textContent || ""));
  const joined = details.join(" ");
  expect(/suggested/i.test(joined)).toBe(false);
  expect(/\bactions\b/i.test(joined)).toBe(false);
});
