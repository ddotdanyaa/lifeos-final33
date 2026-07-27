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

// Это спека про потерю данных, которая уже случилась. У владельца загрузка снимка сорвалась,
// приложение поднялось на ПУСТОМ состоянии, и первое же фоновое сохранение записало пустоту
// поверх настоящего хранилища: две голосовые записи и всё, что из них выросло, исчезли.
// Локально-первый продукт не имеет права терять данные молча — здесь это закреплено.
test("пустое состояние не записывается поверх непустого хранилища", async ({ page }) => {
  await page.goto(`${appUrl}?vault-guard=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });

  // Наполняем хранилище настоящей работой владельца, чтобы снимку было что терять.
  for (const line of ["Хочу купить машину до августа", "Надо ответить Дмитрию до среды", "Потратил 800 рублей на такси"]) {
    await page.fill('[data-testid="capture-input"]', line);
    await page.click('[data-testid="capture-text"]');
    await page.waitForTimeout(400);
  }
  await page.evaluate(async () => {
    const kb = window.__lifeosKnowledgeBase;
    for (const proposal of Object.values(kb.getStateSnapshot().proposals).filter((item) => item.status === "open")) {
      await kb.applyProposalForTest(proposal.id);
    }
  });
  await page.waitForTimeout(1500);

  const before = await page.evaluate(() => window.__lifeosKnowledgeBase.vaultSizeForTest());
  expect(before.ownerRecords, "хранилище должно быть непустым").toBeGreaterThan(0);
  expect(before.ownerRecords, "в снимке на диске должны быть записи владельца").toBeGreaterThan(0);

  // Ровно то, что произошло у владельца: приложение попыталось сохранить ПУСТОЕ состояние.
  const blocked = await page.evaluate(() => window.__lifeosKnowledgeBase.saveEmptyStateForTest());
  expect(blocked.rejected, "сохранение пустоты обязано быть отвергнуто").toBe(true);
  expect(String(blocked.reason)).toContain("Сохранение остановлено");

  // И главное: на диске всё осталось.
  const after = await page.evaluate(() => window.__lifeosKnowledgeBase.vaultSizeForTest());
  expect(after.rawLength).toBe(before.rawLength);
});
