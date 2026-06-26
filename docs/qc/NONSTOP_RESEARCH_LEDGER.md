# NONSTOP RESEARCH LEDGER

Updated: 2026-06-25T13:40:55.931Z

| Topic | Source | Implementation decision |
| --- | --- | --- |
| File API / drag-drop | https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications | Use file input plus drag/drop FileList, store local SourcePacket, no silent upload. |
| IndexedDB | https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API | Keep IndexedDB as local-first store with chunked compressed payload. |
| Storage quota | https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate | Show usage/quota in Data Control. |
| Ollama API | https://github.com/ollama/ollama/blob/main/docs/api.md | Probe /api/tags only after owner click; model output stays proposal-only. |
| Playwright screenshots/e2e | https://playwright.dev/docs/screenshots | Save owner screenshots in output/playwright. |
| Service Worker | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API | Keep as later local/offline package; localhost is secure context for dev. |
| Web Speech / STT | https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API | Do not claim STT unless engine/browser support is explicitly available; manual transcript remains primary. |
| Canvas graph | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API | Keep canvas graph, add real repository-backed node types and filters. |
| PDF parsing | https://mozilla.github.io/pdf.js/ | PDF import remains honest parser gate until PDF.js integration is implemented and tested. |
| OCR | https://github.com/naptha/tesseract.js | Receipt screenshots can be stored and manually extracted; automatic OCR is gated. |
| EPUB parsing | https://github.com/futurepress/epub.js/ | EPUB import remains honest parser gate until parser package is added and tested. |
| local-first app patterns | local skill: .agents/skills/local-first/SKILL.md | UI reads/writes local repository first; sync/provider layers are gates. |
