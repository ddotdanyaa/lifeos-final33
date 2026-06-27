import { renderGraphCanvas } from "./components/GraphCanvas.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";

export function renderGraph(ctx) {
  return renderWorkspaceLayout("graph", "Граф связей", "Большой canvas: локальный и глобальный граф, фильтры, поиск, inspector и причины связей.", renderGraphCanvas(ctx), { testId: "workspace-graph", kicker: "Связи" });
}
