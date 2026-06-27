# WHY UI STILL FAILED AFTER 8 PASSES

Дата: 2026-06-27

Этот документ не является новым ledger. Это рабочий диагноз перед заменой видимой оболочки LifeOS. Предыдущий pass улучшил парсер, Home и public build, но визуально продукт всё ещё читался как внутренняя панель управления, потому что старый shell продолжал управлять композицией.

## 1. Какие старые layout-компоненты продолжают рисовать cockpit

- `renderTopbar` рисует широкий технический header: поиск, статусы сохранения, база/входы/открыто, фокус, команды. Это выглядит как admin console, а не как личная ОС.
- `renderHomeQuickRibbon` и `renderOwnerAppRibbon` дублируют навигацию и добавляют второй ряд кнопок, из-за чего первый экран становится панелью управления.
- `renderSidebar`, `renderInboxRail`, `renderCaptureRail` показывают списки папок, источников, Product Brain notes и служебные маршруты в пользовательском слое.
- `renderSurfaceWorkspace` навязывает многим страницам одинаковую hero + metrics + cards композицию.
- `renderDataControlPanelV2`, `renderProductBrainControlCard`, `renderOwnerReadinessPanel`, `renderArchitectureContract` живут слишком близко к обычному пользовательскому маршруту.

## 2. Где Home всё ещё использует card-grid вместо assistant-flow

- `renderHumanChatHome` уже делает центральный input, но остаётся внутри старого layout с topbar, ribbon, sidebar и нижней strip-зоной.
- `renderHumanNavRail` превращает Home в две навигации одновременно: верхняя ribbon + левая rail.
- Mini summary блоки всё ещё выглядят как одинаковые cards, а не как лёгкая сводка под ассистентом.

## 3. Где Product Brain / provider / ledger / graph / control видны обычному пользователю без запроса

- Product Brain seed notes остаются в обычном списке заметок/папок через `renderSidebar` и `renderNoteRow`.
- `renderProductBrainControlCard` раскрывается в Control Dev State, но сам Control всё ещё содержит слишком много технической структуры вокруг него.
- `renderGraphFilters` показывает `Dev / Product Brain` в Graph, что допустимо только как явно выключенный dev-фильтр.
- Provider детали через `renderProviderPanelV2` нормальны в Providers workspace, но не должны попадать в Home/Today/Chat.
- Слова `evidence`, `ledger`, `snapshot`, `schema`, `architecture` остаются в dev текстах app.js и не должны быть в primary UI.

## 4. Где proposal UI дублирует смысл

- `renderProposalPanelV2`, `renderRecommendedProposal`, `renderHumanUnderstanding` и `apply-source-proposals` описывают один и тот же разбор разными визуальными слоями.
- Для простого ввода система может иметь много proposals в state, но primary UI должен показывать один человеческий ответ и одну главную кнопку.
- Graph/Control/Source не должны быть равнозначными CTA рядом с “Создать задачу”.

## 5. Где страницы выглядят одинаково из-за общего shell

- Today, Reader, Chat, Agents, Finance, Player, Providers используют общий `renderWorkspaceHero` + `renderSurfaceWorkspace`.
- Общая сетка cards и одинаковые headers делают “разные workspaces” похожими на одну страницу с разным заголовком.
- Calendar и Finance частично имеют собственные панели, но старый shell вокруг них делает их частью cockpit.

## 6. Где тесты дают false-positive

- Старые tests проверяли наличие `data-testid`, например `owner-next-zone`, `proposal-panel`, `architecture-contract`, но не проверяли читаемость и визуальный шум.
- Screenshots считались evidence, даже если на них было слишком много блоков.
- Button audit проверял handler, но не количество видимых CTA и не понятность главного действия.
- Owner journey мог пройти при старом cockpit, потому что ожидал старые test-id.

## 7. Какие компоненты надо удалить из primary UI

- `renderTopbar` как основной header.
- `renderHomeQuickRibbon` / `renderOwnerAppRibbon` как второй ряд навигации.
- `renderSidebar` / `renderInboxRail` / `renderCaptureRail` для обычного режима.
- `renderArtifactPipeline`, `renderConnectedAppNetwork`, `renderReceiptPanel` на Home.
- `renderProposalPanelV2` как основной результат простого ввода.
- Product Brain folders/notes в Library primary list.
- Control/readiness/architecture wall на первом уровне Control.

## 8. Какие компоненты надо перенести в Dev Mode

- `renderProductBrainControlCard`
- `renderOwnerReadinessPanel`
- `renderArchitectureContract`
- Product Brain note list and graph nodes
- Release/lite snapshot state
- raw provider runs and audit internals
- schema/version/event-bus diagnostics

## 9. Какие CSS/layout-правила создают бледную табличную простыню

- Большое количество похожих `.info-panel`, `.workflow-panel`, `.provider-row`, `.storage-map`, `.card-head`.
- Много тонких границ и светло-серых surfaces без сильной иерархии.
- Повторяющиеся card grids для разных задач.
- Header chips и status pills занимают визуальное внимание раньше главного action.
- Right/left rails создают ощущение рабочего cockpit вместо calm assistant.

## 10. Почему прошлый pass снова сделал надписи вместо продукта

Прошлый pass улучшил Human Home внутри старого DOM-скелета, но не заменил сам скелет. Поэтому рядом с новым assistant-flow продолжали жить topbar chips, duplicate navigation, sidebars, dev details и общая card-сетка. Продукт стал лучше функционально, но не сменил видимую модель.

## DELETE_FROM_PRIMARY_UI

- `renderTopbar`
- `renderHomeQuickRibbon`
- `renderOwnerAppRibbon`
- `renderSidebar`
- `renderInboxRail`
- `renderCaptureRail`
- `renderArtifactPipeline`
- `renderConnectedAppNetwork`
- `renderReceiptPanel` on Home
- `renderProposalPanelV2` as visible simple-task result
- Product Brain folders/notes from Library primary UI
- architecture/readiness/release blocks from Control primary UI

## MOVE_TO_DEV_MODE

- Product Brain
- Product Vision
- UX Debt
- Bug Ledger
- Feature Completeness Map
- Release Map
- Maturity/readiness scorecard
- architecture contract/event bus
- schema/version internals
- raw provider run history
- screenshot/evidence references

## REBUILD_FROM_ZERO

- visible shell
- Home assistant entry
- top navigation/bottom mobile navigation
- Today layout
- Calendar planning surface
- Finance dashboard surface
- Habits/Goals/Wheel surface
- Library primary knowledge surface
- Reader surface
- Player surface
- Chat conversation surface
- Agents/Flows node canvas
- Graph full workspace
- Control human audit surface
- Providers setup surface

## KEEP_AS_BACKEND_ENGINE

- `KnowledgeRepository`
- IndexedDB/localStorage persistence and migrations
- Artifact/source model
- `captureTextArtifact`
- parser/date/money intent engine
- proposals and `applyProposal`
- tasks/calendar/finance/habit/goal mutations
- graph construction and canvas logic
- audit/control persistence
- provider probes and honest setup state
- public build/release helpers
