import { renderPlayerSurface } from "./components/PlayerSurface.js";
import { renderWorkspaceLayout } from "./components/WorkspaceLayout.js";

export function renderPlayer(ctx) {
  return renderWorkspaceLayout("player", "Плеер", "Слушать, расшифровывать вручную и превращать фрагменты в знания или задачи.", renderPlayerSurface(ctx), { testId: "workspace-player", kicker: "Аудио" });
}
