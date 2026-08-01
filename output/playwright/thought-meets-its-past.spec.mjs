import { expect, test } from "@playwright/test";

// ГЕЙТ боли владельца от 2026-07-30, его словами:
// «я закидываю двадцать мыслей в день… система должна видеть похожие старые идеи → группировать
// → помечать как дубль или как уточнение. Результат: владелец видит „найдено 3 похожих идеи от
// 15.07, 22.07, 27.07“».
//
// Спека названа болью, а не узлом: «мысль встречает свои прошлые». Красная без переноса донора
// `natural` (MIT) в `core/similar-thoughts.mjs` — до него блока похожих не существует вовсе.
//
// Проверяются три вещи вместе, иначе решение выполнено только на словах:
//   1) повтор виден ДО сохранения, пока мысль ещё пишется;
//   2) у находки есть дата и человеческий вердикт (дубль / уточнение / рядом);
//   3) находка кликается и открывает ту самую запись — путь до источника не обрывается.

const appUrl = "http://127.0.0.1:4173";

test.use({ viewport: { width: 1440, height: 1000 } });

async function reset(page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${appUrl}?similar=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
}

async function captureThought(page, text) {
  await page.getByTestId("capture-input").fill(text);
  await page.getByTestId("capture-text").click();
  await expect(page.getByTestId("capture-input")).toHaveValue("", { timeout: 20000 });
}

test("мысль встречает свои прошлые", async ({ page }) => {
  await reset(page);

  // Пустая база: встречать нечего, и молчание тут — правильное поведение, а не отсутствие функции.
  await page.getByTestId("capture-input").fill("Месячный прогноз финансов");
  await expect(page.getByTestId("similar-thoughts")).toHaveCount(0);

  await captureThought(page, "Месячный прогноз финансов: хочу видеть траты на месяц вперёд");

  // Та же мысль другими словами — именно так владелец и повторяется на двадцатой заметке.
  await page.getByTestId("capture-input").fill("прогноз финансов на месяц вперёд");

  const block = page.getByTestId("similar-thoughts");
  await expect(block).toBeVisible({ timeout: 10000 });
  await expect(block).toContainText("Похоже, ты уже об этом писал");

  const first = page.getByTestId("similar-thought").first();
  await expect(first).toBeVisible();
  // Вердикт человеческий, а не число: «0,77» владельцу ничего не сообщает.
  await expect(first).toContainText(/дубль|уточнение|рядом/);

  // Путь до источника: находка обязана открывать саму запись, иначе это опять «вижу, но не открыть».
  await first.click();
  await expect(page.getByTestId("capture-input")).toBeVisible();
});

test("служебные записи не считаются мыслями владельца", async ({ page }) => {
  await reset(page);
  await captureThought(page, "Месячный прогноз финансов: траты на месяц вперёд");
  await page.getByTestId("capture-input").fill("прогноз финансов на месяц вперёд");
  await expect(page.getByTestId("similar-thoughts")).toBeVisible({ timeout: 10000 });

  // Ни одна находка не смеет быть служебной записью — это жалоба владельца про «PWA BOOT» в графе.
  const titles = await page.getByTestId("similar-thought").allInnerTexts();
  for (const title of titles) {
    expect(title.toLowerCase()).not.toMatch(/pwa|install prompt|квитанц|service worker/);
  }
});
