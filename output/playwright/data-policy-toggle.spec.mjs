import { expect, test } from "@playwright/test";

// ГЕЙТ решения владельца 2026-07-30 про приватность: это ТУМБЛЕР, а не флажок у каждой функции.
// Его словами: «OCR может быть без сети, может быть с сетью синхронизации... Короче, это такой вот
// тумблер, который можно перетягивать в разные стороны». Два полюса: полностью локально — «долго,
// неудобно, зато максимально безопасно»; с сетью — «максимально быстро, но... почти небезопасно».
//
// Проверяется то, что легко подделать словами и нельзя подделать поведением:
//   1) по умолчанию включён локальный режим (безопасное значение не требует действий владельца);
//   2) в локальном режиме внешний запрос НЕ УХОДИТ — ни одного обращения к внешнему хосту;
//   3) локальная модель на 127.0.0.1 в том же режиме работает: тумблер выключает сеть, а не продукт;
//   4) переключение видно в журнале и в чеках, а не только на экране.

const appUrl = "http://127.0.0.1:4173";
const FAKE_TEST_KEY = "sk-test-not-a-real-credential-0000";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?data-policy=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function openSurface(page, id) {
  const direct = page.getByTestId(`surface-${id}`).first();
  if (!(await direct.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
    await page.waitForTimeout(350);
  }
  if (!(await page.getByTestId(`surface-${id}`).first().isVisible().catch(() => false))) {
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

// Готовит облачный маршрут с ключом владельца — единственный путь в приложении, который вообще
// способен уйти с устройства.
async function addCloudRoute(page) {
  await openSurface(page, "models");
  await page.locator("#model-title").fill("Тестовый облачный маршрут");
  await page.locator("#model-endpoint").fill("https://mock-cloud-llm.test/api/generate");
  await page.locator("#model-kind").selectOption("cloud-gated");
  await page.getByTestId("add-model-profile").click();
  await expect(page.getByTestId("model-row").filter({ hasText: "Тестовый облачный маршрут" })).toBeVisible();
  await openSurface(page, "providers");
  await page.locator("#byok-provider").selectOption({ label: "Тестовый облачный маршрут" });
  await page.locator("#byok-key").fill(FAKE_TEST_KEY);
  await page.getByTestId("add-byok-key").click();
  await expect(page.getByTestId("byok-key-row").first()).toBeVisible();
}

test("по умолчанию всё остаётся на этом компьютере", async ({ page }) => {
  await reset(page);
  await openSurface(page, "control");
  await expect(page.getByTestId("data-policy")).toHaveAttribute("data-mode", "local-only");
  await expect(page.getByTestId("data-policy-current")).toContainText("всё остаётся на этом компьютере");
  const mode = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().control.dataPolicy?.mode);
  expect(mode).toBe("local-only");
});

test("в локальном режиме внешний запрос не уходит вообще, и причина названа", async ({ page }) => {
  test.setTimeout(120000);
  await reset(page);

  // Считаем ЛЮБОЕ обращение к внешнему хосту. Мок стоит, чтобы запрос не ушёл в настоящую сеть,
  // если правило не сработает, — но сам факт запроса всё равно будет виден в счётчике.
  const externalRequests = [];
  await page.route("**/mock-cloud-llm.test/**", (route) => {
    externalRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ response: "не должно дойти" }) });
  });

  await addCloudRoute(page);
  await openSurface(page, "models");
  await page.getByTestId("call-model-route").first().click();
  await page.waitForTimeout(1500);

  // Главное утверждение: ни одного обращения наружу.
  expect(externalRequests, "в локальном режиме запрос не должен уходить").toEqual([]);

  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  // Отказ честный: причина на экране, запись в журнале, чек о невыполненном вызове.
  expect(state.commandMessage).toContain("остаётся на этом компьютере");
  expect((state.auditLog || []).some((entry) => entry.type === "policy.external.blocked")).toBe(true);
  const blockedRun = Object.values(state.providerRuns || {}).find((run) => run.kind === "route-call" && run.status === "blocked");
  expect(blockedRun, "невыполненный вызов должен остаться следом, а не тишиной").toBeTruthy();
});

test("локальная модель на 127.0.0.1 работает и в локальном режиме", async ({ page }) => {
  test.setTimeout(120000);
  await reset(page);
  // Демон замокан, но адрес настоящий локальный — правило обязано его пропустить, иначе тумблер
  // выключал бы не сеть, а сам продукт.
  await page.route("**/api/tags", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ models: [{ name: "qwen3:4b", capabilities: ["completion", "thinking"] }] })
  }));
  await page.route("**/api/generate", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ response: "OK" })
  }));
  await openSurface(page, "chat");
  await page.getByTestId("probe-ollama").click();
  await page.getByTestId("test-ollama-generation").click();
  await expect(page.getByTestId("ollama-status")).toHaveAttribute("data-raw-status", "generation_ok");
  const mode = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot().control.dataPolicy?.mode);
  expect(mode, "режим при этом не менялся").toBe("local-only");
});

test("переключение наружу оставляет след: чек и запись в журнале", async ({ page }) => {
  await reset(page);
  await openSurface(page, "control");
  await page.getByTestId("data-policy-network").click();
  await expect(page.getByTestId("data-policy")).toHaveAttribute("data-mode", "network-allowed");
  await page.evaluate(() => window.__lifeosKnowledgeBase.flushForTest());
  const state = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  expect(state.control.dataPolicy.mode).toBe("network-allowed");
  expect(state.control.dataPolicy.updatedAt, "у переключения должно быть время").toBeTruthy();
  expect((state.auditLog || []).some((entry) => entry.type === "policy.data.change")).toBe(true);
  expect((state.control.receipts || []).some((receipt) => receipt.kind === "data-policy")).toBe(true);

  // И обратно: усиление приватности не должно требовать подтверждений и тоже оставляет след.
  await page.getByTestId("data-policy-local").click();
  await expect(page.getByTestId("data-policy")).toHaveAttribute("data-mode", "local-only");
});
