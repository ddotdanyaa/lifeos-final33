# OSS DONOR AUDIT v2 — полная карта доноров для LifeOS

Обновлено: 2026-07-21 (v1 → v2: добавлен список владельца — tldraw/AppFlowy/AFFiNE/
BlockSuite/Excalidraw/xyflow/Open WebUI/LibreChat/magicui/originui/react-bits/tremor/
flexsearch/shadcn/Fuse.js). Все лицензии прочитаны из LICENSE-файлов клонов или официальных
raw-источников, НЕ по памяти. **Повторно эту работу не делать** — сначала смотреть сюда.

Клоны: scratchpad сессии `audit-sources/` (19 репо, суммарно >3.5 млн строк). В git
попадают только адаптированные фрагменты с пометкой источника.

## Правило процесса (принцип владельца, 2026-07-21, внесён в CLAUDE.md)

Перед написанием новой подсистемы: (1) определить, какие зрелые open-source проекты уже
решают задачу; (2) изучить 5–10 лучших реализаций (начиная с этого файла); (3) выбрать
сильнейшую архитектуру и максимально переиспользовать код/UX/инженерные решения.
Собственный код — только для уникальной логики LifeOS (Artifact Core, Proposal Engine,
Receipt Engine, Memory Graph, Personal OS). Остальное — интегрировать, не изобретать.

## Правило лицензий (жёсткое)

- **Код можно:** MIT / Apache-2.0 / BSD (или явный MIT-раздел mixed-лицензии).
- **Только идеи/архитектура/UX, ни строки кода:** AGPL/GPL, MPL-2.0 (file-copyleft),
  custom/source-available (tldraw, Open WebUI), MIT+Commons Clause (react-bits).
- **Никогда:** «слитый» проприетарный код — юридически заражён.

## Мастер-таблица доноров (19 репо, лицензии проверены)

### Код можно брать (permissive)

| Донор | Лицензия (из LICENSE) | Масштаб | Что даёт |
|---|---|---|---|
| super-productivity | MIT ✅ | ~722K строк | Daily summary, перенос на завтра, worklog, планировщик (использован в U6) |
| LibreChat | MIT ✅ | ~749K строк | Chat: streaming (SSE/events.ts), tool-calling (agents/run.ts, handlers.ts), citations, attachments, model selector, agents/memory |
| actual (Actual Budget) | MIT ✅ | ~284K строк | Финансы: schedules, transaction-rules, budget actions, forecast |
| obsidian-tasks | MIT ✅ | ~193K строк | Recurrence, статусы, urgency-скоринг, query задач |
| **Excalidraw** | MIT ✅ | ~183K строк | **Canvas-ядро в чистом TS**: `packages/element/src/selection.ts`, `bounds.ts`, `binding.ts` (привязка стрелок), `transform.ts`, `packages/excalidraw/history.ts` (undo/redo), CommandPalette |
| **AFFiNE (frontend)** | Mixed: всё вне packages/backend и common/native — **MIT** ✅ | ~877K строк | Doc↔Canvas (edgeless) UX, панель свойств, quicksearch/cmdk, fuzzy-match (`core/src/utils/fuzzy-match.ts`), journal suggest, AI tool-call карточки |
| **xyflow** | MIT ✅ | ~46K строк | **`packages/system` — framework-agnostic ядро без React**: edge-path математика (bezier/smoothstep), viewport/pan-zoom, drag — идеально для vanilla |
| tremor | Apache-2.0 ✅ | ~22K строк | Dashboard: BarList, SparkChart, DonutChart, KPI-структуры (SVG/разметку адаптировать, движок графиков остаётся chart.js) |
| flexsearch | Apache-2.0 ✅ | ~89K строк | Поиск: альтернатива minisearch (уже установлен); переходить только по бенчмарку |
| magicui | MIT ✅ | ~37K строк | Эффекты/анимации карточек, glow, hero (Tailwind→наш CSS переводится руками) |
| shadcn/ui | MIT ✅ (проверено raw) | — | Формы/компоненты как паттерн разметки и a11y |
| Fuse.js | Apache-2.0 ✅ (проверено raw) | — | Fuzzy-поиск, альтернатива |
| expensica | MIT ✅ | ~28K строк | Дневная/недельная сводка трат, calendar-heatmap |
| flow-dashboard | MIT ✅ | ~13K строк | Виджеты привычек/целей по дням |
| rollover-daily-todos | MIT ✅ | ~1.3K строк | Rollover + undo-модалка |

### Только архитектура/UX (ни строки кода)

| Донор | Лицензия (факт) | Причина запрета кода | Что изучать |
|---|---|---|---|
| **tldraw** | ⚠️ **Custom «tldraw license»** (source-available, watermark/key) — НЕ MIT | Проприетарные условия | Архитектура: Editor/HistoryManager, camera/viewport, selection UX, keyboard UX — концепции пере-реализуем сами |
| **AppFlowy** | ⚠️ AGPL-3.0 (проверено raw) + Flutter/Rust | AGPL + код физически не встаёт в vanilla JS | UX базы данных: views/table/kanban/calendar, sidebar, slash-меню |
| **BlockSuite** | ⚠️ MPL-2.0 | File-copyleft — конфликт с нашим правилом | Архитектура блок-документа: `framework/std/src/gfx/viewport.ts`, store/transformer, слои doc/edgeless |
| **Open WebUI** | ⚠️ «Open WebUI License» (branding clause с 2025) | Custom-ограничения | UX локального AI: model selector, RAG/citations, tools UI |
| **originui** | ⚠️ **AGPL-3.0** (сюрприз — не «просто формы») | AGPL | Внешний вид форм/календаря событий |
| react-bits | ⚠️ MIT + Commons Clause | Commons Clause ≠ чистый MIT | Идеи анимаций/onboarding |
| Vikunja, Plane, Logseq, Firefly III | AGPL | AGPL | Идеи фич |

## Карта: подсистема LifeOS → доноры (в порядке приоритета)

- **Граф (довести до уровня Obsidian и выше):** гибрид — cytoscape (установлен, движок) +
  edge-математика из `xyflow/packages/system` (MIT, код) + camera/фокус-UX из tldraw
  (концепции) + edgeless-переходы AFFiNE (MIT, код фронтенда). Не одна библиотека.
- **Whiteboard / Mind map / Builder / System Designer (будущая поверхность):** ядро —
  Excalidraw `packages/element` (MIT: selection, bounds, binding стрелок, transform) +
  viewport-математика xyflow/system; UX — tldraw/AFFiNE (концепции).
- **Agent/Workflow Builder (n8n-подобный):** xyflow/system (MIT) как графовая математика,
  рендер vanilla; handoff/chain-паттерны из LibreChat `SidePanel/Agents/Advanced/`.
- **Чат/AI (углубление):** LibreChat (MIT, код): streaming events, tool-calling handlers,
  citations, attachments, model selector; UX-полировка — Open WebUI (только смотреть).
- **Редактор/блоки:** установлен @toast-ui/editor; slash-меню и nested-blocks UX —
  BlockSuite/AFFiNE (AFFiNE-фронтенд можно кодом), архитектура store — BlockSuite (идеи).
- **Dashboard (Дом/Деньги):** tremor (Apache, разметка KPI/BarList/Spark) поверх chart.js;
  эффекты — magicui (MIT, CSS переводим).
- **Поиск:** minisearch остаётся (установлен, MIT); flexsearch/Fuse — только если бенчмарк
  на реальном vault покажет выигрыш (решение через DECISIONS.md).
- **Undo/redo платформы:** Excalidraw `history.ts` + tldraw HistoryManager (концепция
  diff-based undo с batching).
- **Повтор задач/приоритизация:** obsidian-tasks Recurrence/Urgency (MIT, код).
- **Финансы глубже:** actual schedules/rules/budget (MIT, код).
- **Ежедневные петли:** super-productivity (использован U6), expensica heatmap.

## Леджер аудита (не повторять)

- [x] 2026-07-20/21 — v1: research + клоны 7 репо, разбор super-productivity daily-summary
  построчно → U6 собран из него.
- [x] 2026-07-21 — v2: клоны 12 новых репо (~2.4 млн строк), лицензии из LICENSE-файлов,
  feature-grep по 12 доменам (`run-oss-audit-v2.mjs` в scratchpad). Сюрпризы
  зафиксированы: tldraw НЕ MIT; originui — AGPL; react-bits — Commons Clause; Open WebUI —
  branding clause; AFFiNE-фронтенд — MIT (можно код); xyflow/system — framework-agnostic.
- [ ] Построчный разбор Excalidraw selection/binding — при пакете Whiteboard/Graph-гибрида.
- [ ] Построчный разбор LibreChat streaming/tool-calling — при следующем AI-пакете.
- [ ] Построчный разбор xyflow/system edge-math — при Graph-гибриде или Builder.
- [ ] Бенчмарк minisearch vs flexsearch на реальном vault — по потребности.
