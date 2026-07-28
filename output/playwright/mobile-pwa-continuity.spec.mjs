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
if (localChromium) {
  test.use({ launchOptions: { executablePath: localChromium } });
}

test.setTimeout(120000);

const appUrl = "http://127.0.0.1:4173";

// Every surface registered in ui/shell.js's primaryNav/secondaryNav/draftNav (mirrors the nav
// source of truth so this test can't silently drift from what the app actually ships).
// "habits" ушёл из меню намеренно: он рисовал ТОТ ЖЕ экран, что и "goals" (проверено обходом —
// 1097 знаков и 6 кнопок у обоих), и канон §9 велит объединять одинаковые экраны. Сама
// поверхность жива и открывается программно — из меню исчез только второй пункт-двойник.
const ALL_NAV_SURFACES = [
  "inbox", "today", "calendar", "finance", "feed", "systems", "library", "graph", "control",
  "capture", "projects", "chat", "agents", "models", "smart-home", "marketplace", "builder",
  "design", "databases", "screen", "twin", "goals", "reader", "player", "providers"
];

test("mobile navigation reaches every v34 surface, not just the bottom-bar five", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 980 });
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("home-workspace-rail")).toBeHidden();

  const mobileMore = page.locator('[data-testid="mobile-more-nav"]');
  for (const surfaceId of ALL_NAV_SURFACES) {
    const mobileDirect = page.getByTestId(`mobile-surface-${surfaceId}`);
    if (await mobileDirect.isVisible().catch(() => false)) {
      await mobileDirect.click();
    } else {
      const moreTarget = mobileMore.getByTestId(`mobile-more-${surfaceId}`);
      if (!(await moreTarget.isVisible().catch(() => false))) {
        await mobileMore.locator("summary").click();
      }
      await moreTarget.evaluate((element) => element.click());
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(horizontalOverflow, `surface "${surfaceId}" should not cause horizontal overflow on mobile`).toBe(false);
  }
});

test("PWA install flow: beforeinstallprompt is honored, and offline-smoke keeps the shell alive", async ({ page, context }) => {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__lifeosKnowledgeBase?.resetForTest);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.evaluate(() => window.__lifeosKnowledgeBase.resetForTest())
  ]);
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 30000 });

  // 1. PWA install flow: simulate the browser offering install, then honor the owner's
  // explicit "Установить" action - a real prompt() call, real outcome recorded.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = () => Promise.resolve();
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });

  const surfaceProviders = page.getByTestId("surface-providers").first();
  if (!(await surfaceProviders.isVisible().catch(() => false))) {
    await page.locator('[data-testid="app-ribbon"] summary').first().click();
  }
  await page.getByTestId("surface-providers").first().click();
  await expect(page.getByTestId("pwa-install-status")).toHaveAttribute("data-raw-status", "available");

  await page.getByTestId("show-pwa-install").click();
  await expect(page.getByTestId("pwa-install-status")).toHaveAttribute("data-raw-status", "accepted", { timeout: 10000 });
  const afterInstall = await page.evaluate(() => window.__lifeosKnowledgeBase.getStateSnapshot());
  const installRun = Object.values(afterInstall.providerRuns).find((run) => run.providerId === "pwa" && run.kind === "install-prompt" && run.status === "accepted");
  expect(installRun).toBeTruthy();

  // 2. Offline-smoke: with the service worker registered and caching the app shell, going
  // fully offline (real network-level offline, not just the "online" flag) and reloading
  // must still render the app, served from the real cache - not a browser error page.
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 }).catch(() => {});
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await expect(page.locator(".lifeos-shell-v2")).toBeVisible({ timeout: 15000 });
  await context.setOffline(false);
});
