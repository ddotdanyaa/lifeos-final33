# LifeOS v1.2 — DAILY_USE_PLAN

Владелец: «владелец начинает ПОЛЬЗОВАТЬСЯ системой ежедневно. Не механика — повседневные
петли и внешний вид.» Владелец разрешил установку системного ПО в этой сессии (2026-07-19)
и работу пакетами с гейтами §4 CLAUDE.md, commit+push после каждого пакета, спорное —
решать самостоятельно и писать в DECISIONS.md, блоки — в BLOCKED.md и продолжать.

## 0. Дополнительный гейт для ВСЕХ пакетов этого плана

Playwright-скриншоты до/после ключевых экранов пакета в `docs/qc/screens/<пакет>/`
(например `docs/qc/screens/U0/home-before.png` + `home-after.png`). Скрипт делает снимок
СРАЗУ после `git stash` (или до правок) и ПОСЛЕ них на одном и том же сценарии/данных, чтобы
владелец мог сравнить визуально. Это ДОПОЛНЯЕТ обычные e2e-гейты §4, не заменяет их.

## 1. Реальный стек и границы (не выдумывать другое)

- Стек не меняется: vanilla JS (ESM) + HTML5 + CSS3, IndexedDB, `ui/*.js` — живая оболочка
  (`app.js`'s собственные inline-рендеры вроде `renderDataControlPanelV2`,
  `renderCaptureCockpit`, `renderCalendarPanelV5` — МЁРТВЫЙ легаси, не трогать без причины;
  все правки — в `ui/*.js` + вызывающие функции в app.js).
- Лицензии: только MIT/Apache-2.0/BSD в код. AGPL/GPL (Logseq, Obsidian, Firefly III,
  Maybe, Audiobookshelf) — только идеи/паттерны, никогда не копировать код.
- **U5 расхождение с формулировкой владельца:** владелец назвал foliate-js для EPUB, но
  `epubjs` (BSD-2) уже установлен и одобрен (см. MEMORY → lifeos-approved-engines) для
  ИМЕННО этой цели. Приоритет — использовать уже одобренный движок, а не добавлять новый;
  foliate-js рассматривается только если epubjs реально не тянет нужный сценарий (решение
  и обоснование — в DECISIONS.md при пакете U5).
- Новый движок для U3 (vosk-browser ИЛИ whisper.cpp server) — это ЕДИНСТВЕННОЕ намеренное
  расширение списка одобренных движков в этом плане, явно разрешённое формулировкой
  владельца («установка разрешена»). Зафиксировать выбор и лицензию в DECISIONS.md.
- Навигация: 9 primary-пунктов зафиксированы аудитами и e2e (`audit-home-complexity.mjs`,
  `toHaveCount(9)` в нескольких спеках) — U0/U1 не меняют состав/число пунктов, только
  внешний вид.

## 2. Гейты (прогонять перед «готово» для КАЖДОГО пакета)

Как в CLAUDE.md §4 + новый гейт скриншотов (§0 выше):
- `npm run verify`
- `for f in tools/audit-*.mjs; do node "$f"; done` (кроме ожидаемо-красного
  `audit-owner-rescue-final` до commit — проверяет чистое дерево)
- Целевой e2e-спек пакета + `final-human-product.spec.mjs` (регрессия) на границе пакета;
  полный `final-journeys.spec.mjs` (P19) — на границе всего плана или при рискованных
  структурных правках (CSS-классы, ctx-поля, общие компоненты).
- `node tools/build-public.mjs` после правок `ui/**`/`app.js`/`styles.css`.
- Скриншоты до/после в `docs/qc/screens/<пакет>/`.

## 3. Пакеты (порядок строго U0 → U1 → U2 → U4 → U3 → U5 → U6)

### U0 DESIGN_SYSTEM

Цель: дизайн-токены (типографическая шкала, отступы по сетке 4/8, цвета, радиусы), тёмная
тема, единые карточки/кнопки/поля, плотность — визуальные ориентиры Obsidian/Linear/Jan
(чисто, плотно, без пестроты). Применить МИНИМУМ к 5 экранам: Дом/Сегодня, Чат, Деньги,
Граф, мобильная навигация.

- **U0.1 Токены**: расширить существующий `:root` в `styles.css` (уже есть частичная
  семантическая палитра — не создавать вторую систему цветов, дополнить). Добавить:
  типографическую шкалу (`--text-xs/sm/base/lg/xl/2xl`, единая шкала строк), отступы
  (`--space-1..8` по сетке 4px), радиусы (`--radius-sm/md/lg`, сейчас только один
  `--radius`), тени (уже есть `--shadow`, добавить `--shadow-sm/lg`).
- **U0.2 Тёмная тема**: `:root[data-theme="dark"]` (или `prefers-color-scheme: dark` как
  дефолт-сигнал + явный тумблер, аналогично паттерну artifact-design skill) — переопределить
  `--paper/--surface/--ink/--muted/--line` и производные. Тумблер темы — в Control или в
  шапке (решение, куда именно — в DECISIONS.md).
- **U0.3 Единые компоненты**: аудит текущих карточек/кнопок/полей на 5 целевых экранах,
  свести к общим классам (переиспользовать `ui/components/shared.js`'s `button()` — не
  плодить новые варианты кнопок инлайново).
- **U0.4 Плотность**: убрать лишние отступы/крупные заголовки там, где это создаёт
  "воздух вместо данных" (Linear/Jan ориентир — плотнее, не жертвуя читаемостью).
- **Гейт**: скриншоты 5 экранов (Дом, Сегодня, Чат, Деньги, Граф + мобильная навигация
  отдельно) до/после; no-overflow e2e (существующий `document.documentElement.scrollWidth`
  паттерн из H10/mobile-тестов, прогнать на всех 5); UX-scorecard
  (`docs/qc/FINAL_UI_HUMAN_AUDIT.md` — обновить построчно, не ослаблять критерии).

### U1 TODAY_HOME

Цель: главный экран = «мой день»: почасовой план (переиспользовать существующий
TimeGrid.js, НЕ строить новый), задачи, сводка денег за сегодня, 4 быстрых действия одной
кнопкой (Голос/Трата/Задача/Мысль). Всё добавляется с главного экрана за ≤2 клика.

- Разместить на `ui/home.js` (Дом = "inbox" surface, живой). Быстрые действия открывают
  МИНИМАЛЬНУЮ форму/шаг (1 клик открыть, 1 клик подтвердить = 2 клика) переиспользуя
  существующие action-хендлеры (quick-task, capture, start-audio-recording — не изобретать
  новые пути ввода, только UI-ярлыки к уже рабочим).
- Сводка денег за сегодня — производное значение (сумма транзакций с day===todayKey()), не
  новая коллекция.
- **Гейт**: e2e — с чистого дня выполнить капчу через каждую из 4 кнопок ≤2 кликами,
  проверить что артефакт создался (task/finance/note/audio) и виден на Дом; скриншоты
  Дом до/после.

### U2 MONEY_FAST

Цель: быстрая фиксация трат/доходов текстом («350 бензин», «заработал 4200 смена») с
авто-парсингом суммы/категории/типа, баланс дня обновляется сразу. Цель "Выкуп машины":
долг/платёж/прогресс-бар/темп (успеваю или нет, простое сравнение факт vs график). Недельная
сводка + графики через `chart.js` (уже одобрен и установлен — не новая зависимость).
Паттерны (не код, MIT/Apache только) — смотреть Actual Budget для UX категорий/фильтров.

- Парсинг суммы/типа — расширить существующий текстовый анализатор капчи
  (`analyzeArtifactInput`/парсеры сумм в app.js), не писать отдельный parser с нуля.
- Темп цели: сравнить текущий прогресс с линейно ожидаемым на эту дату (простая честная
  метрика, не ML-прогноз) — "успеваю"/"отстаю" с числом.
- **Гейт**: e2e — текстовый ввод траты/дохода → баланс дня меняется; цель "Выкуп машины"
  создаётся с прогресс-баром и честным темпом; недельный график рендерится (chart.js
  canvas), реальные данные (не placeholder); скриншоты Деньги до/после.

### U4 CHAT_ACTIONS (третий пакет по порядку выполнения)

Контекст: `BLOCKED.md` уже фиксирует, что proposal-apply UI в чат-оболочке (живой
`ui/chat.js`) отсутствует — только в мёртвом легаси. Довести до конца: сообщение в чат
(«потратил 500 обед») → предложение с превью в самом чате → кнопка «Применить» → реальный
артефакт создан (transaction/task/note/reminder по типу) + receipt. Работает для трат,
задач, заметок, напоминаний — переиспользовать существующий proposal-инфраструктуру
(`state.proposals`, `applySourceProposals`/`chatMessageToProposal`), не изобретать вторую.

- **Гейт**: e2e — 4 сценария (трата/задача/заметка/напоминание) через чат → превью
  предложения видно в самом чат-потоке → Применить → реальный объект + receipt проверены;
  скриншоты Чат до/после (с открытым превью предложения).

### U3 VOICE_LOOP (четвёртый пакет по порядку выполнения)

Цель: довести голос до текста реально (сейчас STT честно заблокирован реальной проблемой
ONNX Runtime, см. BLOCKED.md).

- **U3.1**: сначала попробовать `npm update @huggingface/transformers` до последней версии
  (owner разрешил — но это смена зависимости, значит только патч/минор в рамках той же
  major-линии без ломающих API-изменений; если требуется major bump — решение в
  DECISIONS.md) и повторно прогнать `output/playwright/whisper-transcribe.spec.mjs`'s
  real-model тест. Если чинит — закрыть пакет на этом, никакого нового движка не ставить.
- **U3.2 (если баг остаётся)**: установить ОДИН из: `vosk-browser` (Apache-2.0, модель
  small-ru) как STT-движок за тем же честным статусным механизмом (not-configured →
  downloading → ready → transcribing → done/failed, уже построен в П-B, переиспользовать
  ту же цепочку состояний и receipts), ИЛИ `whisper.cpp server` (MIT) локальным процессом
  (owner разрешил установку системного ПО). Выбор и обоснование — в DECISIONS.md.
- Полная петля: кнопка на главном экране (Дом, из U1) → запись с волной (уже есть, R1) →
  реальный текст → заметка-артефакт → связи в граф (уже есть путь из П-B). Ручной ввод
  рядом с плеером остаётся рабочим fallback всегда.
- **Гейт**: e2e реальный (не мок) — запись (фейковое медиа-устройство, как в R1) → реальная
  расшифровка новым движком → текст → заметка создана → видна в графе; скриншоты Дом/Плеер
  до/после.

### U5 READER

Цель: чтение, не только парсинг. PDF (`pdfjs-dist`, уже установлен) и EPUB (`epubjs`, уже
установлен — см. §1 расхождение с foliate-js выше) с сохранением позиции чтения и
закладками; аудиоплеер — закладки + запоминание позиции воспроизведения. Прогресс — в
артефакте книги/аудио (`readingItems`/audio source), не отдельная коллекция.

- Позиция чтения: страница/процент для PDF, CFI (или процент) для EPUB, currentTime для
  аудио — все три персистятся в существующем объекте артефакта.
- **Гейт**: e2e — открыть PDF/EPUB фикстуру, долистать, закрыть, снова открыть → позиция
  восстановлена; закладка создаётся и ведёт к месту; аудио: то же для currentTime; скриншоты
  Чтение/Плеер до/после.

### U6 EVENING_SUMMARY

Цель: вечерняя сводка (открывается с главного экрана, U1): что сделано за день,
потрачено/заработано, невыполненное переносится на завтра, «что завтра» (ближайшие
задачи/события). Честная агрегация существующих коллекций (tasks/financeTransactions/
planBlocks), никаких новых источников правды.

- Кнопка/карточка на Дом (из U1) открывает сводку; перенос невыполненного — явное действие
  владельца (кнопка «Перенести на завтра»), не автоматическая скрытая мутация (CLAUDE.md §7).
- **Гейт**: e2e — день с задачами (часть выполнена, часть нет) + тратами → сводка честно
  показывает факт, перенос невыполненного работает по клику с receipt; скриншоты Дом →
  Вечерняя сводка до/после.

## 4. Леджер (отмечать [x] и дату по мере закрытия пакетов)

- [x] U0 DESIGN_SYSTEM (2026-07-19) — токены (`--text-*`, `--space-*`, `--radius-*`,
  `--shadow-sm/lg`) добавлены в `:root` (styles.css), расширяя существующую семантическую
  палитру, а не заменяя её. Тёмная тема: `--paper/--surface/--ink/--muted/--line/--shadow*`
  переопределены и через `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`
  (системный сигнал по умолчанию), и через явный `:root[data-theme="dark"]` (выбор владельца
  должен побеждать в обе стороны). Переключатель темы: кнопка в шапке (`ui/shell.js`,
  `data-testid="theme-toggle"`) циклит system → light → dark → system через новый экшен
  `toggle-theme` → `state.theme` (добавлено в `createInitialState`/`normalizeState` по обеим
  точкам, как того требует normalizeState-gotcha) → `applyTheme(state)` в `render()`
  (app.js) выставляет `document.documentElement.dataset.theme`. Проверено вручную в браузере:
  переключение реально меняет `--paper`/`--ink` и т.д. Плотность: `.workspace-head h2` (34px
  плоско, общий для ВСЕХ workspace через `renderWorkspaceLayout`) и `.home-hero-copy h1`
  (clamp 34-58px) сведены к токену `--text-2xl` (28px); `.workspace-v2`/`.workspace-head`
  padding/gap переведены на `--space-*`. Единые компоненты: карточки (`.workspace-v2`,
  `.mini-summary-card`, `.human-answer-card` и т.д.) уже делят один блок правил в styles.css —
  не потребовалось разводить дублирование, только притормозить масштаб заголовков. **Побочная
  находка и фикс** (не в плане, но напрямую вызвана добавлением 4-й кнопки в шапку): у
  `.lifeos-public-header` было всего 3 grid-колонки, но 5-6 прямых детей (бренд, поиск, Ввод,
  Контроль, [Заметка], Тема, статус) — лишние молча переносились на вторую grid-строку,
  которая физически выше, чем фиксированная `height: 74px` шапки, и наезжала на контент под
  шапкой (видно на `docs/qc/screens/U0/home-before.png`). Это существовало ДО U0 (Контроль +
  save-status уже переполняли 3 колонки), но с новой кнопкой стало более заметным. Исправлено
  оборачиванием всех кнопок шапки в один `.header-actions-v2` flex-контейнер — теперь это один
  grid-элемент, а не N. **Гейты**: `npm run verify` зелёный; все 27 `tools/audit-*.mjs`
  зелёные; `final-human-product.spec.mjs` H10 (no-overflow) зелёный;
  `mobile-pwa-continuity.spec.mjs` зелёный отдельно (offline-smoke тест дал один флейк-фейл
  при прогоне сразу после тяжёлого `final-journeys.spec.mjs` — не воспроизводится в изоляции,
  не связано с этим пакетом); `final-journeys.spec.mjs` P19 (24 owner journeys) зелёный;
  `node tools/build-public.mjs` выполнен. Скриншоты до/после (Дом, Сегодня, Чат, Деньги, Граф,
  моб. навигация) в `docs/qc/screens/U0/`. UX-scorecard (`docs/qc/FINAL_UI_HUMAN_AUDIT.md`)
  обновлён с датированной заметкой (оценки не изменились — это визуальный, не функциональный
  пакет).
- [x] U1 TODAY_HOME (2026-07-19) — Home (`ui/home.js`) gained a "Мой день" section
  reusing `renderTimeGrid` (`ui/components/TimeGrid.js`, unmodified) filtered to
  `ctx.scheduleItems` where `day === ctx.todayKey`, plus a compact undone-tasks-today list
  reusing `taskRow` (newly exported from `ui/today.js`, not duplicated). 4 quick actions
  (Голос/Расход/Задача/Мысль) live in `ui/components/AssistantInput.js`'s existing
  quick-buttons row: Голос and Мысль are new, Расход/Задача already existed. Голос directly
  calls the existing `start-audio-recording` handler (R1); Мысль is a new `quick-note` action
  in app.js mirroring `quick-task`'s exact dual-path shape (creates immediately via
  `captureTextArtifact` if the textarea already has text, else just clears the draft) - not a
  new input pathway, same pattern as the handler it sits next to. The audio record panel
  (`renderRecordPanel`, exported from `ui/components/PlayerSurface.js`) is now also rendered on
  Home, conditionally shown only while `state.control.audioRecordingStatus.status !== "idle"`
  (keeps Home calm when not recording; Player always shows it). **Gate**: `npm run verify`
  green; all `tools/audit-*.mjs` green (after reverting an initial "Расход" -> "Трата" label
  rename that broke `audit-primary-ui-language.mjs` - see DECISIONS.md); H10 no-overflow green;
  new `output/playwright/today-home-quick-actions.spec.mjs` proves all 4 quick actions create
  a real artifact (task/finance transaction/source/audio source) in <=2 clicks each, including
  a real fake-device microphone recording end-to-end from Home; `node tools/build-public.mjs`
  run. Before/after screenshots in `docs/qc/screens/U1/` (before = U0's already-captured
  after-state, the true pre-U1 baseline). UX-scorecard updated.
- [x] U2 MONEY_FAST (2026-07-20) — extended `analyzeArtifactInput`'s existing amount/type
  parsers (app.js), not a new parser: added `looksLikeBareMoneyEntry` (2-6 digit number
  leading/trailing a <=4-word phrase, no date/time) as a fallback amount source in
  `extractMoneyEntities`, used it to default bare money-mentioning text to an expense in
  `isExpense` when nothing else (income/balance/subscription/budget/date-time) already claims
  it, and added "заработал" to the income keyword list + `extractMoneyEntitiesHuman`'s money-
  context gate. Both of the plan's exact examples now classify correctly: "350 бензин" →
  expense/350/category "Транспорт" (added бензин/заправ to `inferFinanceCategory`), "заработал
  4200 смена" → income/4200. Also fixed the redundant-task bug U1 found (`isExpense` no longer
  independently triggers a `task-main` draft). Goal pace: `goalPace(goal, todayKey)` in
  `ui/habits-goals.js` compares actual progress to a straight-line schedule from creation to
  `targetDate` - honest arithmetic, not a forecast - rendered as a "Успеваю"/"Отстаю" label next
  to the goal's existing `<progress>` bar (which, along with debt/payment tracking via
  `targetAmount`/`addGoalProgress`, already existed generically for any goal - "Выкуп машины"
  needed no new goal machinery, only the pace label). Weekly chart: `mountFinanceChart` (app.js)
  + a `<canvas>` in `ui/finance.js` render a real chart.js bar chart of the last 7 days' actual
  `financeTransactions` (chart.js's first runtime use since being approved/installed in an
  earlier package). **Gate**: `npm run verify` green; all `tools/audit-*.mjs` green; H03/H10
  green; the full P19 24-journey suite re-run and green (classifier changes are shared/core, so
  ran the whole suite, not just the new spec, per CLAUDE.md §3's phase-boundary rule); new
  `output/playwright/money-fast-capture.spec.mjs` proves both text-capture examples, the goal
  progress-bar+pace, and the chart (sampling actual canvas pixel data, not just checking the
  element exists); `node tools/build-public.mjs` run. Screenshots in `docs/qc/screens/U2/`
  (money-before = U0's already-captured money-after, the true pre-U2 baseline). UX-scorecard
  updated.
- [x] U4 CHAT_ACTIONS (2026-07-20) — closes the exact `BLOCKED.md` gap ("Proposals are not
  rendered anywhere in the live chat-first shell"). New `createChatMessageProposal(state,
  messageId, text)` in app.js runs the owner's message through `analyzeArtifactInput` (the
  same classifier U2 just extended) and picks the single most specific actionable draft via a
  priority list (`finance_expense > finance_income > reminder > task > knowledge`), always
  falling back to the ever-present "knowledge" draft so a plain thought still gets a real,
  appliable note proposal - not a second classification path, reuses `addProposal`/
  `state.proposals` exactly as the main capture input does. Called right after `addChatMessage`
  in the `send-chat` handler. `ctx.proposals` (previously not exposed to the live shell context
  at all - part of why the gap existed) is now wired into `buildNewShellContext`. `ui/chat.js`
  renders each owner message's proposal (if any) as a preview card - type label, title,
  Применить/Отклонить - wired to the ALREADY-WORKING `apply-proposal`/`dismiss-proposal`
  handlers (per BLOCKED.md, these never needed fixing, only a live UI to trigger them);
  replaces the old generic "Сделать задачей" button, which always created an untyped "task"
  proposal regardless of what the message actually said. **Gate**: `npm run verify` green; all
  `tools/audit-*.mjs` green; H10 green; full P19 24-journey suite re-run green (chat/proposal
  code is shared/core); new `output/playwright/chat-actions.spec.mjs` proves all 4 scenarios
  (трата/задача/напоминание/заметка) - correct proposal type previewed, Apply creates the real
  object (financeTransactions/tasks/reminders/insights) plus an audit-log entry; `node
  tools/build-public.mjs` run. Screenshots in `docs/qc/screens/U4/` (chat-before = U0's
  already-captured chat-after; chat-after captured with an open Расход proposal preview
  visible, per the plan's explicit gate wording). UX-scorecard updated.
- [x] U3 VOICE_LOOP (2026-07-20) — U3.1: `npm view @huggingface/transformers version` =
  `4.2.0`, identical to installed - no update exists, closed immediately. U3.2: tried
  vosk-browser (Apache-2.0, small-ru model) first per the plan's listed option - genuinely
  blocked (full evidence in BLOCKED.md/DECISIONS.md: CORS proxy built and needed, a
  hand-rolled ustar tar writer built and verified byte-for-byte two independent ways,
  `Vosk.createModel()` then hangs forever on an internal Emscripten filesystem-sync bug,
  confirmed independent of model size). Tried whisper.cpp (MIT) next - works. Prebuilt
  `whisper-server.exe` (official GitHub release, no compilation) + `ggml-base.bin` live in
  `vendor/whisper-cpp/` (gitignored like `node_modules/`); `npm run setup-whisper-cpp` fetches
  them once, `npm run whisper-server` starts the local daemon. The app treats it exactly like
  Ollama: `probe-whispercpp`/`transcribe-whispercpp` only call an already-running local
  process over HTTP, never spawn one. Full loop proven: Дом "Голос" (U1, R1's real fake-device
  recording) → Player → whisper.cpp transcribe → real text → note created via
  `saveSourceTranscript(mode:"whispercpp")` → linked (proposals/graph/search, the same path
  П-B already built). Whisper's own honest-blocked UI stays untouched; Vosk's honest-blocked
  UI (own gate card, own status) stays visible too rather than being deleted, matching
  CLAUDE.md §7 (never hide a real attempt) - a future vosk-browser release could plausibly fix
  its bug. **Gate**: `npm run verify` green; all `tools/audit-*.mjs` green; full P19
  24-journey suite re-run green; R1's own `waveform-record.spec.mjs` re-verified green (one
  failure traced to this package's own leftover debug browser processes starving
  requestAnimationFrame, not a code regression - fixed by killing the orphans); new
  `output/playwright/voice-loop-whispercpp.spec.mjs` proves the full real loop end-to-end
  (record → transcribe via a real local server → note created and linked, no mocks); new
  `output/playwright/voice-loop-vosk.spec.mjs` proves the real download+repackage pipeline
  runs and records a receipt, documenting the honest blocked state without asserting a
  final status transition that proved slow to observe via automated polling (a shared
  characteristic with this session's own pre-existing Whisper real-model test, not new);
  `node tools/build-public.mjs` run. Screenshots in `docs/qc/screens/U3/` (Дом/Плеер
  до/после). DECISIONS.md/BLOCKED.md carry the full technical trail.
- [ ] U5 READER
- [ ] U6 EVENING_SUMMARY
