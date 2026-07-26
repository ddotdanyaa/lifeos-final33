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
  await page.goto(`${appUrl}?stance=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function capture(page, line) {
  await page.fill('[data-testid="capture-input"]', line);
  await page.click('[data-testid="capture-text"]');
  await page.waitForTimeout(300);
}

async function applyAll(page) {
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(400);
}

async function claims(page) {
  return page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().claims || {})
    .filter((item) => !item.deleted));
}

// S1: строка прямо из целевого сценария владельца. «Марина согласна на август если без кредита»
// уходила в «не разобрано»: имя есть, месяц есть, а смысла записи — чужая позиция и её условие —
// система не видела. При этом именно условие решает, выполнима цель или нет.
test("позиция человека и её условие распознаны и сохранены", async ({ page }) => {
  await reset(page);
  await capture(page, "Марина согласна на август если без кредита");
  await applyAll(page);

  const list = await claims(page);
  const stance = list.find((item) => /Марина/i.test(item.title || ""));
  expect(stance).toBeTruthy();
  expect(stance.person).toBe("Марина");
  expect(stance.stance).toBe("согласна");
  expect(stance.condition).toBe("без кредита");
  // Записано со слов, а не выведено — это должно быть сказано прямо (закон №5).
  expect(stance.body).toContain("со слов владельца");

  // И запись больше не числится непонятой.
  const notUnderstood = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().sources || {})
    .filter((item) => !item.deleted && item.parsedIntent === "not-understood").length);
  expect(notUnderstood).toBe(0);
});

// S2: условие стоит НА ЦЕЛИ, а не отдельной записью в стороне — иначе оно не участвует
// в решении и его никто не увидит в нужный момент.
test("условие видно на карточке цели как ограничение", async ({ page }) => {
  await reset(page);
  await capture(page, "Хочу купить машину до августа");
  await capture(page, "Марина согласна на август если без кредита");
  await applyAll(page);

  const goal = await page.evaluate(() => Object.values(window.__lifeosKnowledgeBase.getStateSnapshot().goals || {})
    .find((item) => !item.deleted && /машин/i.test(item.title || "")));
  await page.evaluate((id) => window.__lifeosKnowledgeBase.openObjectForTest(id), goal.id);
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });
  await page.getByTestId("object-tab-rel").click();

  const relations = await page.getByTestId("object-relation").allTextContents();
  const limit = relations.find((text) => /ограничивает/.test(text));
  expect(limit).toBeTruthy();
  expect(limit).toContain("без кредита");
  expect(limit).toContain("Марина");
});

// S3: позиция видна и в карточке самого человека — это то, что владелец о нём знает.
test("позиция видна в карточке человека", async ({ page }) => {
  await reset(page);
  await capture(page, "Марина согласна на август если без кредита");
  await applyAll(page);

  const person = await page.evaluate(() => window.__lifeosKnowledgeBase.resolvePeopleForTest()
    .find((row) => /Марин/i.test(row.name)));
  expect(person).toBeTruthy();
  await page.evaluate((id) => window.__lifeosKnowledgeBase.openObjectForTest(id), person.objectId);
  await expect(page.getByTestId("workspace-object")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("object-people-stance").first()).toContainText("без кредита");
});

// S4: позиция без условия — это тоже факт, просто без ограничения. Цель она не ограничивает,
// потому что ограничивать нечем.
test("позиция без условия сохраняется, но цель не ограничивает", async ({ page }) => {
  await reset(page);
  await capture(page, "Дмитрий против переезда");
  await applyAll(page);

  const stance = (await claims(page)).find((item) => /Дмитрий/i.test(item.title || ""));
  expect(stance).toBeTruthy();
  expect(stance.stance).toBe("против");
  expect(stance.condition).toBe("");
});

// S5: без имени позиция не выдумывается. «Против кредита» — это сомнение владельца, а не
// чужая позиция, и приписывать её человеку нельзя.
test("без имени чужая позиция не выдумывается", async ({ page }) => {
  await reset(page);
  await capture(page, "Против кредита на машину");
  await applyAll(page);

  const withPerson = (await claims(page)).filter((item) => item.person);
  expect(withPerson).toEqual([]);
});
