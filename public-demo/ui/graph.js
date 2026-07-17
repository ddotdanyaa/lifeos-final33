import { renderGraphCanvas } from "./components/GraphCanvas.js";
import { renderInspectorDrawer } from "./components/InspectorDrawer.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";

export function renderGraph(ctx) {
  const body = `<div class="graph-workspace-split">${renderGraphCanvas(ctx)}${renderInspectorDrawer(ctx)}</div>`;
  return renderWorkspaceLayout("graph", "Граф связей", "Большой canvas: локальный и глобальный граф, фильтры, поиск, inspector и причины связей.", body, { testId: "workspace-graph", kicker: "Связи" });
}
