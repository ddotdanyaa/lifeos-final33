# OWNER_RESCUE_RESEARCH_LEDGER

| Topic | Source | Product decision |
|---|---|---|
| File drag/drop | https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop | Keep visible drop zone, file input fallback, no silent mutation before Apply. |
| Browser storage quota | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | Keep chunked IndexedDB/local fallback and expose storage status in Control, not Home. |
| Notifications | https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API | Notification permission remains explicit and provider/control-gated. |
| Ollama API | https://docs.ollama.com/api/introduction | Probe local endpoint only after owner click; output stays proposal-only. |
| Ollama chat | https://docs.ollama.com/api/chat | Chat/provider calls remain gated; local chat works without AI. |
