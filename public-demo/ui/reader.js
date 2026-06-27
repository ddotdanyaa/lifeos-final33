import { renderReaderSurface } from "./components/ReaderSurface.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";

export function renderReader(ctx) {
  return renderWorkspaceLayout("reader", "Чтение", "TXT/MD читаются сразу; PDF/EPUB честно просят парсер или ручной текст.", renderReaderSurface(ctx), { testId: "workspace-reader", kicker: "Reader" });
}
