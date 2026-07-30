import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
if (localChromium) {
  test.use({ launchOptions: { executablePath: localChromium } });
}

test.setTimeout(90000);

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
    // Раскрытие «Ещё» живёт в состоянии, а не в браузерном <details>: после клика идёт коммит и
    // перерисовка. Без ожидания следующий шаг работает по старому DOM.
    await page.waitForTimeout(350);
    if (!(await page.locator('[data-testid="app-ribbon"] .nav-cluster').first().isVisible().catch(() => false))) {
      await page.locator('[data-testid="app-ribbon"] summary').first().click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }
  // П32 изменил меню намеренно: разделы-каркасы свёрнуты за строку «+N в разработке», чтобы
  // рабочее было видно сразу. До каркаса теперь один дополнительный клик — раскрываем его,
  // а не возвращаем прежнюю плоскую простыню из шестнадцати строк.
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
    // Перебираем группы ПОИМЁННО. Раскрыта всегда одна, поэтому «первый тумблер в DOM» после
    // каждого клика возвращается к началу — цикл по `.first()` ходил бы между двумя группами
    // бесконечно. И ждём перерисовку: раскрытие идёт через состояние, а не через CSS.
    for (const cluster of ["capture", "doing", "ai", "workshop"]) {
      const toggle = page.getByTestId(`nav-cluster-drafts-${cluster}`);
      if (!(await toggle.count())) continue;
      await toggle.click().catch(() => {});
      await page.waitForTimeout(350);
      if (await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false)) break;
    }
  }
  await page.getByTestId(`surface-${id}`).first().click();
}

const FAKE_TEST_KEY = "sk-test-fake-not-a-real-key-00000000";

// P5.2 BYOK_VAULT_ROUTING: owner-entered key, masked everywhere, excluded from export by
// default; cloud routes require explicit confirmation per call; per-call locality receipt
// (cloud, not local); visible budget/cost. FAKE_TEST_KEY above is a synthetic test fixture,
// never a real credential - no real cloud provider is contacted (mocked over the network).
test("BYOK vault: masked key, confirmed cloud call, locality receipt, export redaction", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.route("**/mock-cloud-llm.test/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: "Mocked cloud model answer" })
  }));

  await page.goto("http://127.0.0.1:4173");
  await openSurface(page, "models");
  await page.locator("#model-title").fill("Test Cloud Route");
  await page.locator("#model-endpoint").fill("https://mock-cloud-llm.test/api/generate");
  await page.locator("#model-kind").selectOption("cloud-gated");
  await page.getByTestId("add-model-profile").click();
  await expect(page.getByTestId("model-row").filter({ hasText: "Test Cloud Route" })).toBeVisible();
  await expect(page.getByTestId("model-routing-policy").first()).toHaveText("cloud-confirmed");

  await openSurface(page, "providers");
  await page.locator("#byok-provider").selectOption({ label: "Test Cloud Route" });
  await page.locator("#byok-key").fill(FAKE_TEST_KEY);
  await page.getByTestId("add-byok-key").click();
  const maskedRow = page.getByTestId("byok-key-row").first();
  await expect(maskedRow).toBeVisible();
  await expect(maskedRow).not.toContainText(FAKE_TEST_KEY);
  await expect(page.getByTestId("byok-key-masked").first()).toContainText("*");

  // the raw key must never appear anywhere in the rendered page (always masked)
  const pageText = await page.evaluate(() => document.body.innerText);
  expect(pageText.includes(FAKE_TEST_KEY)).toBe(false);

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const receiptsBefore = before.control.receipts.length;

  // ДОБАВЛЕНО 2026-07-30 вместе с тумблером политики данных: облачный маршрут по умолчанию НЕ
  // вызывается, потому что новое значение по умолчанию — «всё остаётся на этом компьютере»
  // (решение владельца: приватность — один переключатель на систему). Сначала убеждаемся, что
  // без разрешения вызова нет, потом разрешаем — то есть проверок стало больше, а не меньше.
  await openSurface(page, "models");
  await page.getByTestId("call-model-route").first().click();
  await page.waitForTimeout(800);
  const blockedState = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const blockedModel = Object.values(blockedState.modelProfiles).find((item) => item.title === "Test Cloud Route");
  expect(blockedModel.status, "без разрешения владельца облачный вызов не уходит").toBe("blocked-by-policy");

  await openSurface(page, "control");
  await page.getByTestId("data-policy-network").click();
  await expect(page.getByTestId("data-policy")).toHaveAttribute("data-mode", "network-allowed");

  await openSurface(page, "models");
  await page.getByTestId("call-model-route").first().click();

  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const after = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const model = Object.values(after.modelProfiles).find((item) => item.title === "Test Cloud Route");
  expect(model.status).toBe("route_ok");
  expect(model.budget.used).toBeGreaterThan(0);
  const cloudReceipt = after.control.receipts.find((receipt) => receipt.kind === "model-call" && String(receipt.locality || "").startsWith("cloud:"));
  expect(cloudReceipt).toBeTruthy();
  expect(after.control.receipts.length).toBeGreaterThan(receiptsBefore);

  // export must not leak the raw key or even the masked vault by default
  const downloadPromise = page.waitForEvent("download");
  await openSurface(page, "control");
  await page.getByTestId("control-export-all").click();
  const download = await downloadPromise;
  const exportedPath = await download.path();
  const exportedText = readFileSync(exportedPath, "utf8");
  expect(exportedText.includes(FAKE_TEST_KEY)).toBe(false);
  const exportedPayload = JSON.parse(exportedText);
  expect(Object.keys(exportedPayload.control.byokVault || {}).length).toBe(0);
});
