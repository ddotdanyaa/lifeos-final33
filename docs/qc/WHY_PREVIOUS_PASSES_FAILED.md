# Why Previous Passes Failed

Дата: 2026-06-27

Этот файл создан не как новый ledger, а как рабочая диагностика причины UX-провала: предыдущие проходы доказывали наличие блоков, но не делали LifeOS понятным ассистентским продуктом.

## 1. Почему попытки превращались в надписи и карточки

Код добавлял новые “доказательные” поверхности поверх старого shell, вместо удаления шума из первого экрана. В результате Home показывал capture, next action, pipeline, proposal wall, graph/control/evidence и Product Brain как почти равные зоны.

Файлы/места:
- `app.js`: `renderOwnerHome` рендерил старый cockpit-слой.
- `app.js`: `renderProposalPanelV2`, `renderArtifactPipeline`, `renderConnectedAppNetwork`, `renderReceiptPanel` попадали в пользовательский Home.
- `app.js`: `renderInboxRail` показывал слишком много маршрутов и мета-состояний.

Исправление в этом пакете:
- Home переключён на `renderHumanChatHome`.
- Left rail переключён на `renderHumanNavRail`.
- Верхняя навигация ограничена 9 основными пунктами.

## 2. Какие тесты давали false positive

Тесты проверяли, что страница открылась, что есть кнопки, что есть screenshot или evidence-файл. Они не проверяли, понял ли пользователь одно главное действие, не проверяли запрет Product Brain в primary UI и не ловили ошибку даты `завтра`.

Конкретные false positives:
- HTTP/localhost и screenshot считались прогрессом без проверки смысла первого экрана.
- Button audits проверяли обработчик, но не проверяли, что кнопок не слишком много.
- Graph audits проверяли наличие фильтра Product Brain, но не проверяли, что он выключен по умолчанию.
- Date parser не проверял timezone-сдвиг `dateKeyFromOffset`.

Исправление:
- Добавляются audits `no-label-theater`, `home-complexity`, `primary-ui-language`, `workspace-shape`, `public-build`.
- Добавляется human-public e2e с живыми сценариями.

## 3. Где audits проверяли наличие блока вместо полезности

`audit:product-brain`, journey reports и release evidence доказывали, что Product Brain существует, а не что обычный пользователь может быстро добавить задачу, расход, файл или идею.

Файлы/места:
- `tools/audit-product-brain.mjs`
- `docs/qc/PRODUCT_BRAIN_AUDIT.md`
- `output/playwright/product-brain-*.png`

Решение:
- Product Brain оставлен в dev-слое, но убран из Home/Library/Chat primary UI.

## 4. Где Product Brain стал шумом

Product Brain попадал в обычный пользовательский слой:
- `renderProductBrainChatContext` был первым блоком Chat.
- `renderProductBrainLibraryCard` показывал Product Brain в Library.
- `graphFilters.productBrain` был включен по умолчанию.
- `renderDataControlPanelV2` показывал Product Brain и architecture/readiness до человеческих recovery/export действий.

Исправление:
- Chat больше не рендерит Product Brain context.
- Library card Product Brain скрыта.
- Graph Product Brain filter выключен по умолчанию и доступен как `Dev / Product Brain`.
- Control dev-state завернут в раскрываемый раздел `Состояние разработки`.

## 5. Где workspaces были “разными route”, но не разными продуктами

Многие страницы использовали одинаковую hero + cards + proposal panel композицию. Это создавало ощущение “одна форма с другим заголовком”.

Места:
- `renderSurfaceWorkspace`
- `renderTodayWorkspace`
- `renderReaderWorkspace`
- `renderChatWorkspace`
- `renderAgentsWorkspace`

Исправление:
- Добавлены shape-классы рабочих поверхностей: `finance-dashboard`, `reader-surface`, `player-surface`, `chat-thread`, `flow-canvas`, `graph-canvas`.
- Следующий обязательный слой: визуально пройти каждый workspace и убрать одинаковость там, где она останется видимой.

## 6. Где chat-first модель не была реализована

Home был capture/dashboard-first, а Chat был Product Brain/status-first. Пользователь видел “статус разработки”, а не ассистента.

Исправление:
- Home теперь отвечает в формате `LifeOS понял / Главное действие / Дополнительно`.
- Для `сегодня в 11 вечера заказать еду` основной ответ должен быть задачей сегодня в 23:00.
- Для финансового ввода основной ответ должен быть одним действием: добавить расход и обновить баланс.
- Chat отвечает про Product Brain только через явный `/dev` или “состояние разработки”.

## 7. Где GitHub/release считался gate, хотя UX не готов

Раньше push/lite snapshot мог выглядеть как финальная стадия, хотя Home и workspaces оставались перегруженными.

Решение:
- GitHub/public demo остаются release-шагом, но не заменяют визуальную готовность.
- Public demo должен быть чистым пользовательским flow без evidence screenshots, приватных файлов и Product Brain primary UI.

## 8. Какие экраны всё ещё рисковали выглядеть как cockpit/spreadsheet

До текущего пакета:
- Home: слишком много зон и равных CTA.
- Graph: Product Brain по умолчанию.
- Control: wall of architecture/readiness/dev state.
- Chat: Product Brain context наверху.
- Finance/Habits/Goals: местами формы и статусы сильнее dashboard-задачи.

## 9. Какие старые components нужно скрыть, удалить или перенести в Dev Mode

Скрыть из primary UI:
- `renderProductBrainChatContext`
- `renderProductBrainLibraryCard`
- Product Brain graph filter default-on
- architecture contract/readiness в Control primary flow
- owner evidence strip на Home
- full proposal wall на Home

Оставить только в Dev Mode / Control:
- Product Brain
- UX Debt
- Bug Ledger
- Release Map
- maturity/readiness scorecard
- raw provider gate wording
- architecture event details

## 10. Что надо переписать, а не патчить

Переписать:
- Home shell: уже начато через `renderHumanChatHome`.
- Primary response/apply flow: уже начато через `buildHumanCaptureAnswer`.
- Human UX audits: добавить проверки смысла, а не наличия блоков.
- Public demo build: добавить whitelisted static output.

Не переписывать в этом пакете:
- Artifact repository/apply ядро, потому что оно уже создает реальные objects, graph edges и audit/control events.
- Provider engines, потому что scope этого пакета заморожен на UX/public build.
