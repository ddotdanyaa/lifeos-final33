async (page) => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  await page.goto("http://localhost:4173", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    localStorage.removeItem("lifeos.v33.artifact-os.active-view");
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("lifeos-v33-artifact-os");
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="app-shell"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="capture-text"]').fill([
    "Ticket 1 repository artifact",
    "This source must become a durable Artifact with receipt, audit, graph and Data Control."
  ].join("\n"));
  await page.locator('[data-testid="capture-submit"]').click();

  const artifactId = (await page.locator('[data-testid="artifact-id"]').innerText()).trim();
  assert(/^art_/.test(artifactId), `Expected artifact id, got ${artifactId}`);

  await page.locator('[data-testid="assemble-corridor"]').click();
  await page.locator('[data-testid="stage-control"]').waitFor({ timeout: 10000 });

  await page.locator('[data-testid="nav-library"]').click();
  await page.locator('[data-testid="note-body"]').waitFor({ timeout: 10000 });
  const noteBody = await page.locator('[data-testid="note-body"]').inputValue();
  await page.locator('[data-testid="note-body"]').fill(`${noteBody}\n\nLinked during smoke: [[Ticket 1]] [[Repository Kernel]]`);
  await page.locator('[data-testid="save-note"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="backlinks"]')?.textContent?.includes("Ticket 1"));
  assert((await page.locator('[data-testid="backlinks"]').innerText()).includes("Ticket 1"), "Backlink was not rendered");

  await page.locator('[data-testid="nav-today"]').click();
  await page.locator('[data-testid="toggle-task"]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-testid="task-list"]')?.textContent?.includes("done"));
  assert((await page.locator('[data-testid="task-list"]').innerText()).includes("done"), "Task did not toggle to done");

  await page.locator('[data-testid="nav-chat"]').click();
  await page.locator('[data-testid="chat-input"]').fill("Make this a real local workflow, not a static panel.");
  await page.locator('[data-testid="chat-send"]').click();
  await page.locator('[data-testid="message-to-task"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="chat-log"]')?.textContent?.includes("real local workflow"));
  assert((await page.locator('[data-testid="chat-log"]').innerText()).includes("real local workflow"), "Chat message was not saved");

  await page.locator('[data-testid="nav-agents"]').click();
  await page.locator('[data-testid="run-agent"]').click();
  await page.locator('[data-testid="approve-proposal"]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-testid="proposal-list"]')?.textContent?.includes("approved-local"));
  assert((await page.locator('[data-testid="proposal-list"]').innerText()).includes("approved-local"), "Proposal was not approved locally");

  await page.locator('[data-testid="nav-graph"]').click();
  await page.locator('[data-testid="graph-svg"]').waitFor({ timeout: 10000 });
  const nodeCount = Number(await page.locator('[data-testid="graph-node-count"]').innerText());
  const edgeCount = Number(await page.locator('[data-testid="graph-edge-count"]').innerText());
  assert(nodeCount >= 8, `Expected graph node count >= 8, got ${nodeCount}`);
  assert(edgeCount >= 7, `Expected graph edge count >= 7, got ${edgeCount}`);

  await page.locator('[data-testid="nav-control"]').click();
  await page.locator('[data-testid="export-preview"]').click();
  await page.locator('[data-testid="delete-preview"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="control-panel"]')?.textContent?.includes("control.delete_preview"));
  const controlText = await page.locator('[data-testid="control-panel"]').innerText();
  const previewText = await page.locator('[data-testid="control-preview"]').innerText();
  assert(controlText.includes("control.delete_preview"), "Delete preview receipt missing");
  assert(previewText.includes("Delete is blocked here"), "Delete preview boundary missing");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="app-shell"]').waitFor({ timeout: 10000 });
  const reloadedId = (await page.locator('[data-testid="artifact-id"]').innerText()).trim();
  assert(reloadedId === artifactId, `Artifact id changed after reload: ${artifactId} -> ${reloadedId}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-testid="nav-inbox"]').click();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!hasOverflow, "Mobile viewport has horizontal overflow");

  await page.screenshot({ path: "output/playwright/ticket1-artifact-corridor.png", fullPage: true });
  return { ok: true, artifactId, nodeCount, edgeCount };
}
