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
  await page.goto(`${appUrl}?fold=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function seed(page) {
  for (const line of ["Хочу купить машину до августа", "Оценить продажу старой машины", "Потратил 20000 бензин"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(260);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await page.waitForTimeout(800);
}

const control = '[data-testid="library-control-trail"]';

// F1 (запрос владельца: «много окон, кучно и непонятно»): свёрнутыми приходят ровно те блоки,
// у которых ЕСТЬ СОБСТВЕННОЕ РАБОЧЕЕ МЕСТО — на чужом экране это дубль. Всё уникальное для
// экрана остаётся открытым: первая попытка свернула связи и статус провайдера, и обе спеки
// упали по делу — так сворачивание усугубляло ту самую жалобу, ради которой затевалось.
test("свёрнуто только то, у чего есть своё рабочее место", async ({ page }) => {
  await reset(page);
  await seed(page);

  for (const panel of ["library-control-trail", "library-book-panel"]) {
    await expect(page.locator(`[data-testid="${panel}"] [data-testid="toggle-panel"]`)).toHaveAttribute("aria-expanded", "false");
    expect(await page.locator(`[data-testid="${panel}"] [data-testid="panel-body"]`).count()).toBe(0);
  }
  // Уникальное для экрана открыто: срез, связи и честный статус поиска по смыслу.
  await expect(page.getByTestId("lens-builder")).toBeVisible();
  await expect(page.locator('[data-testid="library-backlinks-panel"] [data-testid="toggle-panel"]')).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("semantic-search-input")).toBeVisible();
});

// F2 — ГЛАВНОЕ ПРАВИЛО: свёрнуто ≠ спрятано. В заголовке всегда стоит счётчик того, что внутри,
// иначе сворачивание превращается в скрытие данных, а §7 запрещает скрытое поведение.
test("у свёрнутого блока в заголовке виден счётчик содержимого", async ({ page }) => {
  await reset(page);
  await seed(page);

  const counts = await page.locator(`${control} [data-testid="panel-count"]`).allTextContents();
  expect(counts.length).toBe(1);
  expect(counts[0]).toMatch(/^\d+$/);

  // Число в заголовке совпадает с тем, что раскрывается внутри.
  await page.locator(`${control} [data-testid="toggle-panel"]`).click();
  await page.waitForTimeout(600);
  const inside = await page.locator(`${control} .control-trail-row strong`).allTextContents();
  const sum = inside.reduce((total, value) => total + Number(value || 0), 0);
  expect(String(sum)).toBe(counts[0]);
});

// F3: честный статус провайдера читается прямо в заголовке — и остаётся читаемым, даже если
// владелец свернёт блок. Спрятать «поиск недоступен» за клик — это нарушение §7.
test("недоступность семантического поиска видна и в свёрнутом заголовке", async ({ page }) => {
  await reset(page);
  await seed(page);

  await expect(page.getByTestId("semantic-search-panel")).toContainText("нужны локальные эмбеддинги");

  await page.locator('[data-testid="semantic-search-panel"] [data-testid="toggle-panel"]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('[data-testid="semantic-search-panel"] [data-testid="toggle-panel"]')).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("semantic-search-panel")).toContainText("нужны локальные эмбеддинги");
});

// F4: выбор владельца переживает перезагрузку. Иначе «свернул» ничего не значит на следующий день.
test("раскрытие запоминается и переживает перезагрузку", async ({ page }) => {
  await reset(page);
  await seed(page);

  await page.locator(`${control} [data-testid="toggle-panel"]`).click();
  await page.waitForTimeout(600);
  await expect(page.locator(`${control} [data-testid="toggle-panel"]`)).toHaveAttribute("aria-expanded", "true");

  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => window.__lifeosKnowledgeBase.setSurfaceForTest("library"));
  await page.waitForTimeout(900);

  await expect(page.locator(`${control} [data-testid="toggle-panel"]`)).toHaveAttribute("aria-expanded", "true");
});

// F5: панель, открытая ПО УМОЛЧАНИЮ, тоже должна закрываться с первого нажатия. Ловушка:
// в карте состояния записи ещё нет, и «!undefined» снова открывает уже открытое.
test("панель, открытая по умолчанию, закрывается с первого нажатия", async ({ page }) => {
  await reset(page);
  await seed(page);

  const head = page.locator('[data-testid="lens-panel"] [data-testid="toggle-panel"]');
  await expect(head).toHaveAttribute("aria-expanded", "true");
  await head.click();
  await page.waitForTimeout(600);
  await expect(head).toHaveAttribute("aria-expanded", "false");
  expect(await page.getByTestId("lens-builder").count()).toBe(0);
});

// F6: сворачивание — это ВИД, а не данные. В журнале изменений его быть не должно, иначе
// история правок забьётся тем, что владелец просто убрал блок с глаз.
test("сворачивание не пишется в журнал изменений", async ({ page }) => {
  await reset(page);
  await seed(page);

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().auditLog.length);
  await page.locator(`${control} [data-testid="toggle-panel"]`).click();
  await page.waitForTimeout(600);
  await page.locator(`${control} [data-testid="toggle-panel"]`).click();
  await page.waitForTimeout(600);

  const after = await page.evaluate(() => {
    const state = window.__lifeosKnowledgeBase.getStateSnapshot();
    return {
      audit: state.auditLog.length,
      receipts: state.control.receipts.filter((row) => /панел|panel/i.test(row.summary || "")).length
    };
  });
  expect(after.audit).toBe(before);
  expect(after.receipts).toBe(0);
});
