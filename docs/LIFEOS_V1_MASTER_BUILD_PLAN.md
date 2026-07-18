# LifeOS v1.0 — Master Build Plan (исполняемый план до готового продукта)

status: ACTIVE
created_at: 2026-07-17
updated_at: 2026-07-17 (v1.1 — сверка с полным текстом v34 vision; добавлены P6.4/P6.5, усилены DoD и 9 пакетов)
owner: Даня (danieliminullin@gmail.com)
executor: Claude (Sonnet), пакет за пакетом

Этот документ — **единственный источник истины по порядку работ**. Любая новая сессия:
1) читает память проекта (`MEMORY.md` проекта Claude) и этот файл;
2) берёт **первый неотмеченный пакет** из Прогресс-леджера (§9);
3) выполняет его по Протоколу (§5);
4) отмечает чекбокс, пишет отчёт, останавливается на owner-gated шагах.

---

## 1. Продукт и цель

LifeOS — **артефакт-центричная персональная операционная платформа** (local-first, RU-first, vanilla JS PWA). Не заметки, не Notion, не AI-чат, не dashboard. Всё значимое → артефакт с source/receipt/permissions/links/rollback. Данные ≠ представление. System Factory — центр: будущие функции создаются из примитивов, а не хардкодятся.

**Цель плана:** довести текущий работающий продукт (M0–M8 каркас построен) до **v1.0 «готовый и цельный»** по Definition of Done (§3), не потеряв scope.

## 2. Источники истины (пути проверены 2026-07-17)

| Что | Где |
|---|---|
| Канон-пакет (правила игры) | ✅ в репо: `context/00_READ_ME_FIRST_for_Claude_Code.md`, `context/01_SCOPE_PRESERVATION_CHECK.md` (Seven Contracts §3), `context/02_V33_CANON_NAVIGATION_INDEX.md` |
| v34 vision (полный, канонический) | ✅ в репо: `context/LifeOS_v34_Master_Product_Vision.txt` (+ `.pdf` рядом) |
| v33 canon (6.6 МБ, читать ТОЛЬКО по индексу 02_, точечно по строкам) | ✅ в репо: `context/LifeOS_v33_FINAL_CANON_MAX_ACCEL.md` |
| Доп. первоисточники (справка, reference_only, НЕ база кода) | Старая Next.js-реализация v33: `C:\Users\Данил\ДЛЯ ПРОВЕРКИ И АНАЛИЗА\` (app/, components/, lib/); копия web/worker: `C:\Users\Данил\копия LifeOS — копия\`; `Downloads\LIFEOS_V33_ARTIFACT_OS_MASTER_FUNCTION_SPEC_AUDITED.md` (3.9 МБ); `Downloads\V33_CANON_FUNCTION_INVENTORY_AND_BUILD_PLAN_REBUILT.xlsx` |
| Исполняемый контракт архитектуры | `artifact-os-architecture.mjs` (schema v3 → станет v4 в P1.1), `docs/architecture/ARTIFACT_OS_ARCHITECTURE_CONTRACT.md` |
| Леджер покрытия канона (1449 позиций C01–C25) | `docs/source_of_truth/V33_CANON_COVERAGE_LEDGER.csv` — **устарел (2026-06-23, всё `planned`)**, освежается в P0.3 и в конце каждой фазы |
| Память разработки | `docs/product_brain/PRODUCT_BRAIN_OVERVIEW.md` |
| Архив чатов ChatGPT (справка, не блокер) | `C:\Users\Данил\Downloads\0805fda6...zip` (938 МБ; `conversations-*.json`) — точечный grep при необходимости |

## 3. Definition of Done v1.0 («готовый и цельный»)

- [ ] Все audit-скрипты зелёные (текущие 24 + новые: seven-contracts, system-factory, health) — 0 red.
- [ ] Все e2e-наборы зелёные: final-human-product (H01–H10), human-public, owner-rescue, kb-smoke, final-journeys, + новые: presentation-runtime (M0-proof), export-roundtrip, first-run.
- [ ] **M0-доказательство строго:** 3 типа артефактов (note / agent_report / import_receipt) × 4 режима рендера (feed-bubble / card / table-row / timeline), подключены к search, graph, feed, data-control, inspector, health.
- [ ] Seven Contracts: конформанс-аудит зелёный для всех коллекций.
- [ ] Export → wipe → import: доказанная эквивалентность состояния (e2e).
- [ ] Health-панель: 10 состояний подсистем честно отображаются; изоляция отказов доказана инъекцией сбоя.
- [ ] 10 стартовых паков (по реестру v33) устанавливаются/удаляются с квитанциями и rollback.
- [ ] AI: Ollama-путь работает при наличии демона; BYOK-ключи в маскированном vault; ни одного скрытого cloud-вызова (каждый — locality receipt + подтверждение); бюджеты и стоимость модельных вызовов видимы (C67).
- [ ] Obsidian bridge: импорт vault-папки (frontmatter/теги/backlinks/вложения) с preview, ImportReceipt и rollback; экспорт обратно в markdown — доказано e2e.
- [ ] Семантический поиск: честный гейт — работает при локальных эмбеддингах (Ollama), иначе `provider_unavailable` без имитации.
- [ ] Доки и леджеры синхронизированы с реальностью; public-demo собран; GitHub push + тег v1.0.0 (owner-gated).
- [ ] Scope-check: продукт НЕ выглядит как «заметки/чат/dashboard» — Лента=renderer, Системы/Граф/Контроль живые.

## 4. Неприкосновенные законы (сжатo; полностью — context/00_, §4)

1. System Factory — центр. 2. Всё значимое → артефакт. 3. Данные ≠ представление. 4. Adapters, не переписывание. 5. Kernel: local-first, privacy, BYOK, local LLM, permissions, vault, export, degraded. 6. Seven Contracts (Object/Artifact/Receipt/Capability/Locality/Package/Quality). 7. Никаких скрытых действий. 8. Изоляция отказов.

**Формула полноты:** `System = Entities + Fields + Relations + Views + Actions + Triggers + Workflows + Agents + Artifacts + Receipts + Permissions + Renderers + Packages + Adapters + Policies + Health + Export/Rollback`. Функция не раскладывается → расширяй примитивы, не хардкодь.

## 5. Протокол выполнения пакета (обязателен для каждого)

1. **До кода** объяви в чате заголовок пакета: цель · allowed files · гейты · stop-условие.
2. Маленький diff. Сначала ищи существующий helper, потом пиши новый. Никаких широких рефакторов вне пакета.
3. **Гейты:** всегда G-SMOKE; плюс гейты пакета (§6). Не ослаблять тесты/аудиты ради зелёного — контракт меняется только вместе с намеренным изменением продукта, с обоснованием в отчёте.
4. После правок `ui/**`, `app.js`, `styles.css`, `index.html`, `artifact-os-architecture.mjs` → `node tools/build-public.mjs`.
5. Обнови: чекбокс в §9 + при значимом — `PRODUCT_BRAIN_OVERVIEW.md` (Current state / Next package) + строки леджера покрытия.
6. **Отчёт:** что изменено (файлы) · тесты/гейты (фактический вывод) · receipts/evidence · риски · блокеры · следующий пакет.
7. **Запреты:** не коммитить/пушить без явного слова владельца; ключи/учётки вводит только владелец; никаких скрытых cloud/model вызовов; деструктивные операции — только с preview+подтверждением; v33 читать только точечно по `context/02_...`; не заявлять «готово» без прогнанных гейтов.
8. Owner-gated шаги: остановись, скажи владельцу что нужно, жди.

## 6. Гейты (команды)

| Гейт | Команда |
|---|---|
| G-SMOKE | `npm run verify` (node --check app.js + smoke.mjs, 86 маркеров) |
| G-AUDIT | все `node tools/audit-*.mjs` циклом (24+) |
| G-ARCH | `npm run audit:architecture && npm run audit:workspace-links && npm run audit:workspace-shape` |
| G-E2E-CORE | `npx playwright test output/playwright/final-human-product.spec.mjs output/playwright/human-public.spec.mjs output/playwright/owner-rescue.spec.mjs --workers=1 --reporter=line` |
| G-E2E-KB | `npx playwright test output/playwright/kb-smoke.spec.mjs --workers=1 --reporter=line` |
| G-E2E-J | `npm run e2e:journeys` |
| G-PUBLIC | `node tools/build-public.mjs && node tools/audit-public-build.mjs` |

Сервер для e2e: `npm start` (порт 4173, отдаёт рабочие файлы live).

## 7. Фазы и пакеты

Формат пакета: **ID · цель · allowed files · гейты · stop**. Глобально forbidden: node_modules, ослабление тестов, данные пользователя.

### Фаза 0 — Фиксация фундамента (честная база)

- **P0.1 CONTEXT_CANON_INTO_REPO** — создать `context/`, положить 00/01/02 из `Downloads/files.zip`, `LifeOS_canon_v33.md` из `для проверки/`, v34 PDF + TXT-извлечение. Files: `context/**`, `.gitignore` (если нужно). Гейты: файлы на месте, G-SMOKE, G-AUDIT не деградировал. Stop: никакого кода продукта.
- **P0.2 KB_SMOKE_RESCUE** — восстановить `book-workbench` (Библиотека) и `top-control` (шапка/мобайл), перевести сырые клики kb-smoke на `openSurface`. Files: `ui/library.js`, `ui/shell.js`, `ui/components/**`, `output/playwright/kb-smoke.spec.mjs`, точечно `app.js`. Гейты: G-E2E-KB зелёный, G-E2E-CORE зелёный, G-AUDIT. Stop: не трогать другие спеки.
- **P0.3 LEDGER_TRUTH_REFRESH** — пересчитать статусы `V33_CANON_COVERAGE_LEDGER.csv` по реальности (P0-kernel/P1-corridor + реализованные P2-строки → implemented с EvidencePath), синхронизировать PRODUCT_BRAIN. Files: `docs/source_of_truth/**`, `docs/product_brain/**`. Гейты: audit:product-brain, audit:release-evidence. Stop: только доки/CSV.
- **P0.4 COMMIT_BASELINE** *(owner-gated)* — владелец: ревью диффа → commit; `gh auth login`; push (`npm run release:push`). Гейты: audit-owner-rescue-final и audit-nonstop-until-done зелёные → **все аудиты 100%**.
- **P0.5 APPROVED_ENGINES_INSTALLED** — установить утверждённые внешние движки (§11) в dependencies с 0 уязвимостей (`npm audit`); интеграция — НЕ здесь, а в профильных пакетах (§11 указывает какой движок в какой пакет). Гейты: G-SMOKE, G-AUDIT не деградировал, `npm audit` = 0.

### Фаза 1 — Seven Contracts в ядре (закон 6)

- **P1.1 OBJECT_CONTRACT_V4** — schema v3→v4: каждой записи всех 47 коллекций — полные поля Object Contract (`id,type,title,owner,source_refs,artifact_refs,relations,lifecycle_state,privacy_scope,access_contour,provenance,confidence,receipts,created_at,updated_at,version`), идемпотентная миграция в normalizeState + новый `tools/audit-seven-contracts.mjs` (часть Object). Канон: v33 строки 16041–16066. Files: `artifact-os-architecture.mjs`, `app.js` (normalize), `tools/audit-seven-contracts.mjs`, `docs/architecture/**`. Гейты: G-SMOKE, G-ARCH, новый аудит, G-E2E-CORE. Stop: рендеры не трогать.
- **P1.2 RECEIPT_COVERAGE_MATRIX** — все 14 сильных мутаций (create/update/delete/export/import/publish/share/model-call/workflow-run/permission-change/memory-write/merge/design-apply/pack-install) пишут receipt с locality-меткой; матрица покрытия в audit-ledger. Files: `app.js` (commit-пути), `tools/audit-ledger.mjs`. Гейты: audit:ledger, G-E2E-CORE.
- **P1.3 CAPABILITY_LOCALITY** — грант способностей `resource+action+scope+locality+approval+budget` в control; провайдер-действия проверяют грант; секция в Контроле. Files: `app.js`, `ui/control.js`, `ui/providers.js`, audit-seven-contracts (части Capability/Locality). Гейты: новый аудит, audit:no-label-theater-hard.

### Фаза 2 — Presentation Runtime (закон 3, строгое M0-доказательство)

- **P2.1 RENDERER_REGISTRY** — явный реестр `artifact type → {feed-bubble, card, table-row, timeline}` (+graph node существует); Design Studio выбирает режим на поверхность; доказать на 3 типах M0: note / agent_report (из agentRuns) / import_receipt (из installedPacks/sources). Включая ViewPreset на поверхность/канал: renderer + theme + density (compact/normal/comfortable) + grouping (v34 §7.3–7.4). Files: `ui/v34-platform.js`, `ui/components/shared.js`, `app.js` (точечно), `artifact-os-architecture.mjs` (реестр). Гейты: G-ARCH, G-E2E-CORE, G-PUBLIC.
- **P2.2 ARTIFACT_INSPECTOR_UNIVERSAL** — единый инспектор любого артефакта: контрактные поля, трейл квитанций, связи, переключатель рендера, export/rollback. Новый e2e `presentation-runtime.spec.mjs` (M0: 3×4 + связка search/graph/feed/control/inspector/health). Files: `ui/components/InspectorDrawer.js`, `ui/**`, новый спек. Гейты: новый спек зелёный, G-E2E-CORE.

### Фаза 3 — System Factory вглубь (закон 1, центр платформы)

- **P3.1 SYSTEM_FIELDS_TYPED** — systemDefinitions: сущности с типизированными полями (text/number/date/select/relation) + валидация; Builder редактирует; systemRecords хранят данные по сущностям. Канон: v34 §7; v33 18096–18166. Files: `ui/v34-platform.js` (builder/systems), `app.js`, `artifact-os-architecture.mjs`. Гейты: G-ARCH, G-E2E-CORE.
- **P3.2 SYSTEM_VIEWS_ACTIONS** — виды системы (list/table/card через реестр P2.1) + действия (create/update/state-change) с квитанциями; поля-даты проецируются в Сегодня/Календарь. Гейты: G-E2E-CORE + e2e-кейс системы.
- **P3.3 SYSTEM_TRIGGERS_LITE** — декларативные триггеры (on-create / on-field-change / daily) → flowRuns: сперва dry-run, apply после подтверждения. Новый `tools/audit-system-factory.mjs`: демо-система раскладывается по формуле полноты. Гейты: новый аудит, G-E2E-CORE.

### Фаза 4 — Workflows & Agents runtime (законы 7–8)

- **P4.1 FLOW_EXEC_REAL** — шаги flow исполняются против репозитория с по-шаговыми квитанциями, счётчиком бюджета, kill switch; сбой flow изолирован (health-состояние). Files: `app.js`, `ui/agents-flows.js`, `ui/components/FlowCanvas.js`. Гейты: G-E2E-J (флоу-кейсы), G-E2E-CORE.
- **P4.2 AGENT_GUARDED_RUNS** — многошаговые agent-run: preview → approve → apply; проверка capability; отчёт = agent_report_artifact (связка с P2). Гейты: G-E2E-CORE, audit-seven-contracts.

### Фаза 5 — Model Fabric (закон 5: local LLM + BYOK)

- **P5.1 OLLAMA_LIVE** — полный локальный путь чата/суммаризации при доступном демоне (endpoint уже конфигурится); честный degraded без него; квитанция каждого вызова (модель/маршрут/locality); ответы чата с цитатами/ссылками на артефакты-источники (v34 §21). Гейты: `npm run e2e:ai-providers` (P19), G-E2E-CORE.
- **P5.2 BYOK_VAULT_ROUTING** — vault ключей (вводит ТОЛЬКО владелец в UI; маскирование; не попадает в export по умолчанию); политика маршрутизации в modelProfiles (local-first, cloud только с явным подтверждением); per-call locality receipt; бюджеты tokens/cost на маршрут и видимая стоимость (C67 cost transparency, v34 §11). Files: `app.js`, `ui/providers.js`, `ui/control.js`. Гейты: audit:no-label-theater-hard, новый e2e-кейс с mock.
- **P5.3 AI_MEMORY_GATE** — любые AI-записи в память/граф только через proposals (preview+apply); аудит «нет скрытых memory-write». Гейты: audit-seven-contracts (Receipt), G-E2E-CORE.

### Фаза 6 — Adapters / импорт (закон 4)

- **P6.1 PDF_EPUB_LOCAL** — реальный локальный парсинг: PDF через `pdfjs-dist` (уже в deps), EPUB через `fflate`; текст → sources/reader; сбой парсинга = честный fallback. Files: `app.js` (import-пути), `ui/reader.js`, `ui/components/ReaderSurface.js`. Гейты: `npm run e2e:reader-player` (H09), G-E2E-CORE.
- **P6.2 IMPORT_PIPELINE_RECEIPTS** — каждый импорт → import_receipt_artifact; крупные импорты — фоновыми чанк-джобами с прогрессом в Ленте и отменой (v34 §46.2 «10k notes»); чексуммы/дедуп + merge-review дубликатов с receipt (entity resolution, канон v33 18238–18281); STT/OCR остаются честными гейтами до движков. Гейты: G-E2E-KB, audit:ledger.
- **P6.3 ICS_EML_FILE_IMPORT** — файловый импорт `.ics` → события календаря, `.eml` → sources (без доступа к аккаунтам, только файлы). Гейты: e2e-кейс календаря (H08), G-E2E-CORE.
- **P6.4 OBSIDIAN_VAULT_BRIDGE** — мост Obsidian (v34 §17, §45.2; milestone M4): выбор папки vault → локальный скан markdown → frontmatter/теги/backlinks/вложения → preview (заметки/конфликты) → подтверждение → notes/relations + graph/search индексация → `ObsidianVaultScanReport` + ImportReceipt → rollback. Экспорт обратно в markdown с сохранением структуры папок/имён (§17.3). Files: `app.js` (import-пути), `ui/library.js`, `ui/components/**`, новый e2e `obsidian-bridge.spec.mjs`. Гейты: новый спек зелёный, G-E2E-KB, audit:ledger. Stop: двусторонняя синхронизация — post-v1.
- **P6.5 SEMANTIC_SEARCH_GATED** — семантический поиск (v34 §9.6, §19): вектор-индекс поверх заметок/источников через локальные эмбеддинги (Ollama embeddings при наличии); выдача рядом с точным поиском с бейджем уверенности/источника; честный `provider_unavailable` без демона, никакой имитации. Files: `app.js` (search fabric), `ui/**` (выдача), провайдер-паспорт embeddings. Гейты: e2e с mock-эмбеддингами, audit:no-label-theater-hard. Stop: облачные эмбеддинги — только BYOK с подтверждением (не по умолчанию).

### Фаза 7 — Data Control до конца (доверие)

- **P7.1 TRASH_UNDO_GRACE** — мягкое удаление во всех коллекциях: корзина + grace-восстановление; undo последних коммитов по event log. Канон: v33 18282–18316. Files: `app.js`, `ui/control.js`. Гейты: G-E2E-CORE, audit:recovery-final.
- **P7.2 EXPORT_ROUNDTRIP_PROOF** — новый e2e: полный export → чистое состояние → import → эквивалентность; экспорт одного артефакта из инспектора; опциональный зашифрованный снапшот-бэкап (v34 §10.3). Гейты: новый спек зелёный.
- **P7.3 TWIN_RECOVERY_DRILL** — twin-снапшот → сценарий восстановления контекста доказан e2e. Гейты: e2e-кейс, G-E2E-CORE.

### Фаза 8 — Marketplace & стартовые паки (Package Contract)

- **P8.1 PACK_MANIFEST_ENFORCE** — манифест пака валидируется по Package Contract (types/views/workflows/permissions/data-effects/uninstall/rollback/trust/compat); install preview включает migration preview (v34 §25.2); uninstall с rollback доказан. Files: `app.js`, `ui/v34-platform.js` (marketplace), audit-seven-contracts (Package). Гейты: аудит, G-E2E-CORE.
- **P8.2 TEN_STARTER_PACKS** — 10 локальных паков по реестру v33 (строки 21390–21561): Capture / Daily-Time (включая weekly review и focus-сессии) / Work / Money / Food-Health / Household / Travel / Learning-Media / Social / Builder-AI — как system definitions на Factory (доказательство выразительности). Без фейковых сэмпл-данных (audit-no-hardcoded-sample). Гейты: audit:market-ledger, e2e установка/удаление.

### Фаза 9 — Health & изоляция отказов (закон 8)

- **P9.1 HEALTH_REGISTRY_PANEL** — состояния `alive/starting/degraded/failed/disabled/updating/requires_config/permission_blocked/provider_unavailable/index_stale` на подсистему; панель в Контроле; деградации видны в Ленте; канал уведомлений (notification = видимый сигнал без скрытого действия, v34 §6.2 primitives). Новый `tools/audit-health.mjs`. Files: `app.js`, `ui/control.js`, `artifact-os-architecture.mjs`. Гейты: новый аудит, G-E2E-CORE.
- **P9.2 FAILURE_INJECTION** — тест-хуки инъекции сбоя (провайдер/хранилище); доказать: приложение живо, остальные поверхности работают, деградация честно показана. Гейты: e2e-кейс изоляции.

### Фаза 10 — Целостность и полировка

- **P10.1 FIRST_RUN_CALM** — первый запуск: пустые состояния каждой поверхности ведут к действию; направляемый первый ввод; e2e «первые 10 минут». Гейты: новый спек, audit:home-complexity, audit:no-cockpit-first-screen.
- **P10.2 MOBILE_PWA_CONTINUITY** — мобильная навигация для всех поверхностей v34, PWA install-flow, offline-smoke. Гейты: H10, mobile-кейсы e2e.
- **P10.3 PERF_BUDGETS** — бюджеты (boot, интеракция) закреплены в audit-performance-final с порогами. Гейты: аудит зелёный на бюджетах.
- **P10.4 UX_COHERENCE** — терминология RU-first, иерархия, обновление скоркарты 9+ (`docs/qc/FINAL_UI_HUMAN_AUDIT.md`); command palette покрывает все v34-поверхности и действия Factory (C36). Гейты: audit:primary-ui-language, audit:visual-hierarchy, audit:human-ux-final.

### Фаза 11 — Релиз v1.0

- **P11.1 DOCS_TRUTH_SYNC** — контракт-док, PRODUCT_BRAIN, alignment-док, релиз-репорт, финальный пересчёт леджера покрытия; scenario coverage matrix как QA-документ (v34 §46); документация режимов работы (Mode 1 локально / Mode 2 деймон / Mode 3 домашний сервер через server.mjs LAN); DoD-чеклист §3 весь отмечен. Гейты: G-AUDIT 100%, все e2e.
- **P11.2 RELEASE_V1** *(owner-gated)* — `npm run build:public` + audit:public-build; владелец: commit, push, `npm run deploy:pages`, тег `v1.0.0`. Гейты: audit:release-evidence, Pages отвечает.

## 8. Сознательно ВНЕ v1.0 (post-v1, не потеряно — адресовано канонными строками)

Money/growth-слои (v33 §E, 59041–62613; канон прямо запрещает тащить в первую сборку) · Mechanics_134 бэклог (21720–21858) · реальный smart-home hub · реальный захват экрана (гейт остаётся честным) · STT/OCR движки (blocked-provider, нужны движки владельца) · multi-device sync / home-server глубокий (LAN-режим через server.mjs уже есть) · marketplace vendor-code sandbox.

## 9. Прогресс-леджер (сессии отмечают [x] и дату)

- [x] P0.1 CONTEXT_CANON_INTO_REPO — 2026-07-17: канон в `context/` (00/01/02 + v33 6.6МБ + v34 TXT/PDF)
- [x] P0.2 KB_SMOKE_RESCUE — 2026-07-17: book-workbench/top-control restored in ui/*.js, kb-smoke + G-E2E-CORE + G-ARCH + audits verified green (commit af9a7568)
- [x] P0.3 LEDGER_TRUTH_REFRESH — 2026-07-17: 88/1449 rows moved planned→implemented with EvidencePath (P0-kernel 51/51, P1/P2 Agents 37/54); PRODUCT_BRAIN_OVERVIEW synced
- [x] P0.4 COMMIT_BASELINE *(owner)* — 2026-07-17: owner authorized full-autonomy commit+push for this session (see DECISIONS.md); gh auth verified active, baseline committed and pushed
- [x] P0.5 APPROVED_ENGINES_INSTALLED — 2026-07-17: 9 движков установлены, `npm audit` = 0 уязвимостей (override @xmldom/xmldom→0.9.8), гейты зелёные
- [x] P1.1 OBJECT_CONTRACT_V4 — 2026-07-18: schema v3→v4, `applyObjectContractV4`/`applyObjectContractToState` in artifact-os-architecture.mjs, wired into app.js normalizeState (idempotent), new tools/audit-seven-contracts.mjs; G-SMOKE/G-ARCH/G-E2E-CORE/G-E2E-KB green
- [x] P1.2 RECEIPT_COVERAGE_MATRIX — 2026-07-18: addReceipt()/STRONG_MUTATION_RULES wired into addAudit() (single choke point, all ~150 call sites covered automatically), locality field added; extended tools/audit-seven-contracts.mjs (audit:ledger already meant something else, see DECISIONS.md); G-SMOKE/G-E2E-CORE green
- [x] P1.3 CAPABILITY_LOCALITY — 2026-07-18: capability grants (resource/action/scope/locality/approval/budget) in state.control.capabilities; ensureCapabilityGrant() wired into recordProviderRun() (single choke point, covers every provider action); Control surface section + revoke action; extended audit:seven-contracts; G-SMOKE/G-ARCH/G-E2E-CORE green
- [x] P2.1 RENDERER_REGISTRY — 2026-07-18: RENDERER_REGISTRY/presentArtifact/ViewPreset in artifact-os-architecture.mjs; 4 render-mode functions in ui/components/shared.js; M0 proof (note/agent_report/import_receipt × 4 modes) + ViewPreset controls in Design Studio; found+fixed Design Studio was fully dead (never reachable in the live shell); browser-verified end-to-end; G-ARCH/G-E2E-CORE/G-PUBLIC green
- [x] P2.2 ARTIFACT_INSPECTOR_UNIVERSAL — 2026-07-18: ui/components/InspectorDrawer.js (contract fields/receipt trail/relations/renderer switch/export-rollback), embedded in Graph + Control (search/feed route to it via existing focus-graph-node); new output/playwright/presentation-runtime.spec.mjs (M0 3x4 + integration) green; found+fixed a real mobile horizontal-overflow bug via manual+e2e testing; health integration deferred (P9.1 not built yet)
- [x] P3.1 SYSTEM_FIELDS_TYPED — 2026-07-18: entities are now {name, fields:[{name,type,options,required}]} (text/number/date/select/relation) with validateSystemRecordFields(); createSystemRecord() writes real systemRecords for the first time; Builder UI edits fields + creates records; found+fixed a Cyrillic-name id-collision bug via e2e verification; G-SMOKE/G-ARCH/G-E2E-CORE green
- [x] P3.2 SYSTEM_VIEWS_ACTIONS — 2026-07-18: list/table/card views via P2.1 registry (per-system ViewPreset reuse), update/state-change actions with receipts (updateSystemRecord/toggleSystemRecordState), date-typed fields project into Today/Calendar; new output/playwright/system-factory.spec.mjs green
- [x] P3.3 SYSTEM_TRIGGERS_LITE — 2026-07-18: declarative on-create/on-field-change/daily triggers fire dry-run proposals via the existing proposal-apply flow, never mutate directly; new tools/audit-system-factory.mjs (completeness formula); found+documented pre-existing gap (proposals not rendered in live shell, see BLOCKED.md); e2e proves trigger fires without direct mutation
- [x] P4.1 FLOW_EXEC_REAL — 2026-07-18: executeFlowRun() applies a flowRun's proposals for real against the repository, isolated per-step (try/catch -> health alive/degraded/failed), budget counter + kill switch; found+fixed a real crash bug (flow.budget undefined on same-render new flows, since normalizeState only re-runs on reload not per-commit); new output/playwright/flow-execution.spec.mjs green; G-E2E-J's one failure (Ollama probe) confirmed pre-existing/environmental (no local daemon), not caused by this package
- [x] P4.2 AGENT_GUARDED_RUNS — 2026-07-18: agent runs are preview (proposals only) until approveAgentRun() applies them in a guarded, isolated batch; capability check (agent/run grant, reusing P1.3); run itself is an inspectable agent_report_artifact (ownerType agent-run, P2.1 registry); extended audit:seven-contracts; new e2e proves preview does not mutate, capability grant exists, approve applies for real
- [x] P5.1 OLLAMA_LIVE — 2026-07-18: chat routes to a real Ollama /api/generate call only when the owner already explicitly tested generation (status generation_ok); answer includes citations to the notes the prompt cited; per-call receipt (model/locality) via recordProviderRun; honest fallback to the existing local rule-based answer on any failure, never fake; new output/playwright/ollama-live-chat.spec.mjs (mocked daemon) proves live path, receipt, fallback; e2e:ai-providers' one failure (J15) confirmed pre-existing/environmental (no real local daemon on this machine)
- [x] P5.2 BYOK_VAULT_ROUTING — 2026-07-18: BYOK vault (owner-entered, masked everywhere, excluded from export by default); modelProfiles get routingPolicy (local-first/cloud-confirmed) + visible budget/cost; cloud calls require explicit confirm; addAudit/addReceipt now carry a real per-call locality (cloud:<route> vs local) instead of always "local"; new output/playwright/byok-vault-routing.spec.mjs (mocked cloud endpoint, synthetic test key) proves masking, confirmed call, locality receipt, export redaction; audit:no-label-theater-hard green
- [x] P5.3 AI_MEMORY_GATE — 2026-07-18: extended audit:seven-contracts to statically prove generateOllamaChatAnswer/callModelRoute are pure model-call wrappers (never write notes/claims/insights/graph or auto-apply a proposal); new output/playwright/ai-memory-gate.spec.mjs proves live Ollama chat answer never mutates notes/claims/insights/tasks, only chat-to-proposal creates an open (not applied) proposal; found+documented (already in BLOCKED.md) that live proposal-apply UI doesn't exist in the chat-first shell yet
- [x] P6.1 PDF_EPUB_LOCAL — 2026-07-18: real local parsing wired for the first time since P0.5 installed pdfjs-dist/fflate; parsePdfSource()/parseEpubSource() (fflate's browser-safe esm/browser.js build, not esm/index.mjs which imports node:module) via a new "Извлечь текст" button; honest failure (never fakes success) verified on a broken PDF; new output/playwright/pdf-epub-local.spec.mjs (real generated PDF/EPUB fixtures) green; note: public-demo build doesn't copy node_modules, so this gracefully degrades to the honest gate there (GitHub Pages preview only, not the real product)
- [x] P6.2 IMPORT_PIPELINE_RECEIPTS — 2026-07-18: SHA-256 checksum per import (real dedup, not name/size heuristics); duplicates flagged for explicit owner merge-review (never silently dropped/merged), new Control section; large pastes run as a real cancellable chunked background job (10/chunk) with progress in Feed; rich import_receipt via recordProviderRun (checksum/dedup/chunk details); new output/playwright/import-pipeline.spec.mjs green; found a test-only write-queue-backlog gotcha (not a product bug, see memory)
- [x] P6.3 ICS_EML_FILE_IMPORT — 2026-07-18: parseIcsEvents()/parseEmlMessage() (file-only, zero account/server access); .ics VEVENT blocks become real planBlocks with parsed day/start/end honored as explicit schedule overrides; .eml becomes a readable note (subject/from/date/body, not raw MIME); new output/playwright/ics-eml-import.spec.mjs + e2e:calendar (H08) green
- [ ] P6.4 OBSIDIAN_VAULT_BRIDGE
- [ ] P6.5 SEMANTIC_SEARCH_GATED
- [ ] P7.1 TRASH_UNDO_GRACE
- [ ] P7.2 EXPORT_ROUNDTRIP_PROOF
- [ ] P7.3 TWIN_RECOVERY_DRILL
- [ ] P8.1 PACK_MANIFEST_ENFORCE
- [ ] P8.2 TEN_STARTER_PACKS
- [ ] P9.1 HEALTH_REGISTRY_PANEL
- [ ] P9.2 FAILURE_INJECTION
- [ ] P10.1 FIRST_RUN_CALM
- [ ] P10.2 MOBILE_PWA_CONTINUITY
- [ ] P10.3 PERF_BUDGETS
- [ ] P10.4 UX_COHERENCE
- [ ] P11.1 DOCS_TRUTH_SYNC
- [ ] P11.2 RELEASE_V1 *(owner)*

Выполнено до плана (2026-07-17): аудит состояния (22/24 зелёных; 2 red = ops), решение навигации (9 пунктов, контракты синхронизированы, e2e core зелёные), читабельность подписей (Умный дом/Таблицы/Конструктор/Двойник), public-demo пересобран.

## 10. Утверждённые внешние движки (установлены 2026-07-17, `npm audit` = 0)

Канон v34 §32: adapters/libraries вместо переписывания с нуля. Все лицензии позволяют коммерческую продажу. Подключение — по одному движку в профильном пакете; **новые зависимости сверх этого списка — только по решению владельца.** Все движки должны работать в no-build vanilla ESM (импорт из node_modules/vendor-копии; после подключения — обновить service-worker кэш и `tools/build-public.mjs`).

| Движок (npm) | Лицензия | Что открывает | Пакет |
|---|---|---|---|
| `@huggingface/transformers` | Apache-2.0 | **Локальный Whisper STT в браузере** — голосовые с диктофона расшифровываются на твоём железе, без облака | P6.2 (снимает гейт STT) |
| `tesseract.js` | Apache-2.0 | Локальный OCR скриншотов/фото → текст | P6.2 (снимает гейт OCR) |
| `pdfjs-dist` (уже был) | Apache-2.0 | Парсинг PDF-книг | P6.1 |
| `epubjs` | BSD-2-Clause | Полноценная EPUB-читалка (главы, пагинация, CFI) | P6.1 |
| `marked` + `dompurify` | MIT + Apache-2.0/MPL | Markdown-рендер заметок + санитизация HTML (безопасность импорта) | P6.4 Obsidian bridge, библиотека |
| `minisearch` | MIT | Полнотекстовый поиск-индекс по всем артефактам (Search Fabric v34 §19) | новый мини-пакет в Фазе 2/6 |
| `cytoscape` | MIT | Граф LifeGraph уровня Obsidian (layouts, зум, кластеры) | усиление Графа (Фаза 2) |
| `@toast-ui/editor` | MIT | Markdown WYSIWYG-редактор заметок (глубина PKM вместо textarea) | усиление Библиотеки |
| `chart.js` | MIT | Дашборды/финансы/виджет-рендеры | P2.1 (dashboard renderer) |
| `sortablejs` | MIT | Drag-n-drop доски (board view) | P3.2 (views Factory) |

**Ставит владелец отдельно (системное ПО):** Ollama (MIT) — `winget install Ollama.Ollama` → открывает P5.1 (локальный чат/суммаризация) и P6.5 (эмбеддинги). Модели для коммерческого спокойствия — Apache-2.0: `qwen3`, `mistral`; веса Whisper — MIT.

**Только изучать, код НЕ копировать:** SiYuan (AGPL), Logseq (AGPL), n8n (sustainable-use). Можно изучать и брать идеи свободно: Memos (MIT), Home Assistant (Apache-2.0, адаптер post-v1).

## 11. Как запускать исполнение (для владельца)

Переключи модель на Sonnet и скажи: **«Выполняй план, следующий пакет»** (или конкретно: «пакет P0.1»). Сессия обязана: прочитать память → этот файл → объявить заголовок пакета → выполнить → прогнать гейты → отметить леджер → отчитаться → остановиться на owner-gated. Разрешение на серию: «выполняй пакеты до конца фазы N» — тогда пауза только на owner-gated и на границе фазы с коротким отчётом.
