# LifeOS Design Canon (живой документ, строится ПО ФУНКЦИЯМ)

Цель — **не 500 решений, а одна система.** Каждая функция сравнивается во всех 5 репо, выбирается
лучшая реализация, вносится в канон **один раз** (anti-duplicate). После утверждения — новые экраны
строятся ТОЛЬКО из этого канона, изобретать варианты запрещено.

Репо: `shadcn-ui/ui` (S) · `precedent` (P) · `dashboard-starter` (D) · `shadcn-table` (T) · `magicui` (M).
Статус функций: ✅ внесена · 🔬 сравнивается · ⧗ очередь.

| Функция | Статус | Победитель |
|---|---|---|
| Токены/цвет/типо/spacing | ✅ | S (OKLCH-система) |
| Button / Card / Input / Badge | ✅ | S (cva-анатомия) |
| Empty / Skeleton (состояния) | ✅ | S |
| Navigation (sidebar+palette) | ✅ | D (config-driven) + S (механика) + P (frosted) |
| Overlays (dialog/sheet/drawer) | ✅ | P (адаптив) + S (анатомия) |
| Command Palette | ✅ | S (cmdk) ← из nav-config (D) |
| Collection View (list/table/grid/kanban/timeline/graph/calendar) | ✅ | T (toolbar/выбор→action-bar) + D (kanban) + наш RENDERER_REGISTRY |
| Interaction (hover/drag/select/undo/optimistic…) | ⧗ | M + все |
| Forms / Fields (deep) | ⧗ | S (Field-система) |
| Toasts / feedback | ⧗ | S (sonner) |
| **Responsive Canon** (5 брейкпоинтов × трансформации) | ⧗ | P (адаптив) + правила |
| **Information Architecture Canon** (кол-во экранов) | ⧗ | из D−1 |

---

## 0. Foundation (S — shadcn OKLCH)

**Цвет.** OKLCH, нейтрали = светлота при chroma 0. Токены парами `X`/`X-foreground`.
Тёмная тема: бордеры = альфа белого (`oklch(1 0 0 / 10%)`). Отдельные семьи `--sidebar-*`, `--surface-*`.
Один акцент. Graph — монохромный рамп, не радуга.
**Радиус.** Корень `--radius: 10px`; sm 6 / md 8 / lg 10 / xl 14 — производные.
**Типографика.** Пара: display-шрифт (заголовки) + UI-шрифт (текст) через `--font-display`/`--font-ui`.
Рабочий размер `14px`. Заголовки `tracking-tight` + `text-wrap:balance`. Веса: 400 текст / 500 кнопки·label / 600 заголовки.
**Spacing.** Сетка 4px; вертикальный ритм строк форм — единая высота `36px` (h-9) у input/button/select.
**Тень.** Тонкий бордер + `shadow-xs/sm`, не тяжёлые тени. Карточка = border + shadow-sm.
**Focus.** `focus-visible` (не focus), кольцо `3px` цвета `--ring` на 50% прозрачности + сдвиг бордера.
**Motion.** Точечные свойства (не `all`), 150–200ms; именованные: fade-in (оверлей) / scale-in (диалог) / slide-up-fade (поповер).

## 1. Примитивы (S) — «так везде, иначе нельзя»

- **Button** — cva: 6 вариантов (default/secondary/outline/ghost/destructive/link) × размеры (h-9 default / h-8 sm / h-10 lg / icon-квадрат). Оптический паддинг у иконки (`has-icon`). Иконки авто-16px. `data-variant`/`data-size` в DOM. Дизейбл opacity-50. **Запрет:** инлайновые кнопки мимо этого набора.
- **Card** — `rounded-xl` + 1px `--border` + `bg-card` + shadow-sm. Header/Content/Footer с единым паддингом. Один силуэт для всех карточек.
- **Input/Select/Textarea** — h-9, rounded-md, 1px border, focus-ring, placeholder `--muted-foreground`. `aria-invalid` → border/ring destructive.
- **Badge** — pill, `text-xs`, `tabular-nums` для чисел.

## 2. Состояния (S) — обязательны на каждом списке/экране

- **Empty** — семья: иконка в приглушённом квадрате (`size-10 rounded bg-muted`) + Title (`text-lg font-medium`) + Description (muted) + Action. Пунктир, `text-balance`, `max-w-sm`. **Правило:** пусто ≠ голый текст — всегда этот блок.
- **Skeleton** — один примитив `bg-accent animate-pulse`; лепится по РАЗМЕРУ реального контента (лейаут не прыгает); текстовые скелетоны — случайной ширины.
- **Error** — `role="alert"`, цвет destructive, дедуп сообщений.

## 3. Navigation ✅ (лучшее из D+S+P)

**Сравнение:** S даёт механику (Sidebar: cookie-state, ⌘B, tooltip-на-свёрнутом, группы, collapsible-sub).
D даёт **архитектуру**: nav как КОНФИГ (`navGroups`: label + items{title,icon,shortcut,access}), и **один конфиг
кормит И сайдбар, И Cmd+K**. P даёт frosted-шапку на скролле.
**Почему D-подход:** единый источник навигации → палитра и меню не расходятся; `shortcut:['d','d']` даёт
клавиатурную навигацию; `access` гейтит пункты (нет прав/черновик — скрыт). Это ровно наш случай 🚧.

**Канон LifeOS:**
- Навигация — из ОДНОГО конфига `navGroups` (group.label + items{id,label,icon,shortcut,ready}). Кормит сайдбар И командную палитру.
- Группы с `text-xs` uppercase-подписью. Активный пункт: `bg-accent + font-medium`.
- Пункт с `ready:false` (черновик) → в группу «🚧 В разработке» / скрыт за «показать всё».
- Шапка: прозрачная сверху → `data-scrolled` matte (blur+border) на скролле.

**Матрица:** Внедрять — да. НЕ внедрять — RBAC/plan/role/org (нет облака). Риск — низкий (у нас уже массивы nav). Стоимость — низкая. Что получим — палитра ⌘K из того же меню + честное скрытие черновиков + клав-шорткаты.

## 4. Overlays ✅ (P адаптив + S анатомия)

**Сравнение:** S — три оверлея (Dialog центр / Sheet сбоку / Drawer снизу), `data-[state=open]` анимации,
sr-only title. P — **один оверлей, тело по устройству**: mobile → Drawer снизу с ручкой, desktop → Dialog центр.
**Почему P-подход:** на телефоне нижний лист достаётся большим пальцем; центр-диалог — нет.

**Канон LifeOS:**
- Один helper `openOverlay(content, {variant})`. `isMobile()` → `.sheet--bottom` (ручка-хваталка, свайп-вниз-закрыть); desktop → `.dialog--center` (`max-width: 28rem`, scale-in, backdrop-blur).
- Оверлей всегда с заголовком (видимым или sr-only), focus-trap, Esc-закрытие, `onOpenAutoFocus` не рвёт фокус.
- **Правило:** новых модалок «с нуля» не делать — только через helper.

**Матрица:** Внедрять — да (D−1: Контроль/Подключения — стены, часть вынести в sheet/tabs). НЕ внедрять — vaul/Radix код. Риск — средний (жест свайпа). Стоимость — средняя. Что получим — мобайл-удобные оверлеи, разгрузка экранов-стен.

## 5. Command Palette ✅ (S cmdk из nav-config D)

**Канон LifeOS:** палитра ⌘K строится из того же `navGroups` (§3) + действий. Поиск сверху (иконка + border-b),
группы с `text-xs` заголовками, `data-selected:bg-accent` навигация стрелками, шорткат справа (`ml-auto text-xs tracking-widest muted`),
честное «ничего не найдено» (py-6 center). У нас палитра уже есть — привести к этому виду и кормить из nav-config.
**Матрица:** Риск низкий, стоимость низкая, эффект ⭐⭐⭐⭐ (быстрый доступ ко всему с клавиатуры).

---

## 6. Collection View ✅ (T таблица + D kanban + наш RENDERER_REGISTRY)

**Ключ:** в LifeOS почти всё — представление ОДНОЙ коллекции артефактов. У нас уже есть
`RENDERER_MODES = [feed-bubble, card, table-row, timeline]` + `RENDERER_REGISTRY` (+ graph/cytoscape,
calendar). Не хватает: grid/gallery, kanban, tree и **слоя управления списком** у табличного вида.

**Сравнение видов по репо:**
- **Table (T):** контейнер `rounded-md border overflow-hidden`; строка `data-state="selected"`; **toolbar** с фильтрами, авто-выведенными из полей (`getCanFilter`), «Reset» (border-dashed) только когда есть фильтр; view-options (видимость колонок); **actionBar** — плавающая панель при выборе строк; faceted/date/range-фильтры; pagination; сортировка в column-header; skeleton. **Это лечит D−1:** База 31/Паки 32 кнопки — убрать по-строчные кнопки, выбор строк → одна панель действий.
- **Kanban (D):** доски-колонки + DnD-перенос (sortablejs у нас уже одобрен).
- **Наши:** feed-bubble (Лента), card, timeline, table-row, graph, calendar — есть, но без единого переключателя вида и без toolbar.

**Канон LifeOS Collection View:**
- Любой список артефактов = `<CollectionView collection renderer>` — рендер по `RENDERER_REGISTRY`, НИКОГДА не копия (SSoT).
- Единый **сегмент-переключатель вида** (List/Card/Table/Gallery/Kanban/Timeline/Calendar/Graph) на surface, из `state.viewPreset[surface].renderer` (уже есть — поднять из design-studio в сам список).
- Единый **toolbar**: поиск + фильтры-по-полям (декларативно из схемы коллекции) + reset-когда-фильтр + view-options.
- **Выбор → плавающая панель действий** (не по-строчные кнопки). Пусто → §2 Empty. Грузится → §2 Skeleton.

**🧬 Артефакт-маппинг (обязателен):** view = проекция `RENDERER_REGISTRY[collection]`; выбор строк = выбор
артефактов (`state.selection[]`); действие из action-bar = **Proposal → preview → confirm → Receipt** (наш
пайплайн `addProposal`), не тихая мутация; фильтр = запрос по полям артефакта. Ноль новых источников правды.
**Матрица:** Внедрять — да, высокий эффект (лечит 3 самых перегруженных экрана). НЕ внедрять — TanStack/DnD-код (берём паттерн; DnD — на sortablejs). Риск — средний. Стоимость — средняя. Что получим — один список-движок вместо N разнородных экранов.

---

## 🧬 Артефакт-маппинг сделанных функций (правило владельца: каждый паттерн — через модель LifeOS)
- **Navigation** → пункт = surface-проекция; палитра и меню из одного nav-config; черновик = `ready:false` артефакт-гейт.
- **Overlays** → модалка = предпросмотр действия над артефактом (preview перед Proposal), не отдельное «окно».
- **Command Palette** → Artifact Search → Command → Create → **Action → Proposal → Receipt** (не «просто ⌘K», а вход в артефакт-пайплайн).
- **Collection View** → см. выше (проекция + selection + Proposal).

## Очередь канонов и функций (по одной, best-of-5, с артефакт-маппингом)
**Функции:** Interaction (M+все: hover/active/pressed/selected/drag/reorder/keyboard/focus/loading/optimistic/undo/transition) · Forms/Fields (S, → Конструктор multi-step) · Toasts (S sonner) · Grid/Gallery/Tree (добор Collection View).
**Отдельные каноны (по твоим правкам):**
- **Responsive Canon:** Desktop/Laptop/Tablet/Mobile/UltraWide × правила: когда Sidebar→Drawer, панели→вкладки, таблица→карточки, появляется FAB/Bottom-Sheet. → под 3 overflow-экрана из D−1.
- **Information Architecture Canon:** сколько экранов нужно, что объединить (Цели≡Привычки), скрыть (10 черновиков), показывать только при данных, убрать из меню. Эффект больше, чем ещё 100 кнопок.

## Воронка к фундаменту (жёстко, по твоему)
500 решений → 260 уникальных (anti-dup) → 140 полезных → 70 обязательных → **30 фундаментальных = правила, которые нельзя нарушать нигде**.

## Этапы до редизайна (по твоему)
Canon v2 → **LifeOS Mapping → Artifact Runtime → Screen Map → UI Runtime** → редизайн экранов строго из канона.

## Anti-Duplicate log
Button/Card/Sidebar/Command/Table есть во всех репо → в канон внесены ОДИН раз (источник — S как канонический;
D/T/M дают НЕ примитивы, а паттерны сборки: nav-config, data-table-toolbar, kanban, motion).

---

## 7. Interaction & Motion ✅ (M + все)
**⛔ НЕ брать из magicui** (78 компонентов, большинство — лендинг-мишура, чужда спокойной ОС):
confetti, meteors, globe, aurora-text, neon-gradient, retro-grid, marquee, particles, orbiting-circles,
light-rays, sparkles, ripple. Это «цирк», D−1 требует обратного.
**Взять (тонко):** `blur-fade` (появление контента), `number-ticker` (денежные итоги), `animated-list`
(стаггер ленты/очереди), `animated-subscribe-button` (машина состояний idle→loading→success), shimmer (загрузка).
**Канон взаимодействий (сильнее влияет на «дорого», чем анимации):**
- hover: фон `--accent` (150ms); active/pressed: лёгкий scale 0.98 или фон темнее; selected: `data-selected` → `bg-accent`.
- focus: только `focus-visible`, кольцо 3px `--ring/50`. keyboard: стрелки в списках/палитре, Esc закрывает оверлей, ⌘K палитра, ⌘B меню.
- drag/reorder: sortablejs (уже одобрен), «ручка» + плейсхолдер-дроп; курсоры grab/grabbing.
- **loading:** skeleton по размеру контента (не спиннер по центру). **optimistic:** действие показывается сразу, откат при ошибке. **undo:** любое разрушительное — с «Отменить» в тосте (окно undo), не модалка-подтверждение.
- transitions: точечные свойства 150–200ms; появление быстрое, уход мягкий.
**🧬 Артефакт-маппинг:** optimistic = предпросмотр Proposal сразу; undo = откат до записи Receipt; loading = провайдер `not-checked→checking→ready`.

## 8. Responsive Canon ✅ (P + правила)
Один источник брейкпоинтов (`deviceInfo()`, из P #useMediaQuery). 5 классов:
- **UltraWide (>1600):** контент ограничен `--content-max` (не растекается), центр; сайдбар фикс.
- **Desktop (1024–1600):** сайдбар фикс, панели рядом, таблицы полные.
- **Laptop (768–1024):** сайдбар сворачивается в icon-режим; многоколоночные панели → 2 кол.
- **Tablet (640–768):** сайдбар → выезжающий Drawer; панели-в-ряд → **вкладки**; таблица → карточки-строки.
- **Mobile (<640):** нижняя таб-навигация; оверлеи → Bottom-Sheet; главное действие → **FAB**; таблица → карточки; фильтры → Sheet.
**Правила трансформации:** Sidebar→Drawer (<768) · панели→вкладки (<768) · таблица→карточки (<768) · FAB+Bottom-Sheet (<640). **Инвариант:** горизонтального скролла нет НИГДЕ (D−1 нашёл 3 нарушения — Сегодня/Контроль/Сценарии).

## 9. Information Architecture Canon ✅ (из D−1 — эффект больше, чем 100 кнопок)
**Цель:** меньше экранов, каждый — один сценарий. По данным D−1:
- **Объединить:** Цели+Привычки → один экран (идентичны). 3 мини-карточки Дома → одна строка-сводка.
- **Скрыть из меню** (за «Показать всё»): 10 черновиков 🚧 (systems/builder/projects/models/smart-home/marketplace/design/databases/screen/twin).
- **Показывать только при данных:** виджеты Дома (уже так), панели инсайтов/модели/рефлексии.
- **Свернуть стены:** Контроль (521 слово/18 секций) и Подключения (520/18) → 4-5 сворачиваемых групп/вкладок.
- **Целевой состав меню:** 9 primary (рабочий контур) + 2-3 сгруппированных вторичных + «В разработке» отдельно.
**Сценарное мышление (не экранами):** `Записать → Разобрать → Инсайт → Проект → Выполнить → Закрыть` — навигация обслуживает сценарий, а не наоборот.
**🧬 Артефакт-маппинг:** экран = линза (workspace-lens) над коллекциями; «объединить экраны» = одна линза с переключателем вида (§6), а не 2 surface.

## 10. Forms/Fields + Toasts ✅ (S)
- **Forms:** Field-система (§D репо-1): один блок Field(label+control+description+error), orientation vertical/horizontal/responsive (container-queries), авто-`aria-describedby/invalid`, FieldError-дедуп, `FormMessage`=null без ошибки. Длинные формы (Конструктор 17 полей) → **multi-step**. **Правило:** новых форм-раскладок не изобретать.
- **Toasts (sonner):** единый неблокирующий feedback (успех/ошибка/undo) вместо инлайн-сообщений по месту. Разрушительные действия → toast с «Отменить».

---

# 🏛 CANON v2 — 30 фундаментальных правил (нельзя нарушать НИГДЕ)

Воронка: ~500 решений из 5 репо → уникальные → полезные → обязательные → **эти 30 фундаментальных.**
Любой экран (существующий или новый) обязан их соблюдать. Нарушение = баг.

**Токены и стиль (1-8)**
1. Только токены: ни одного хардкод-цвета/размера вне `:root` (OKLCH-палитра, chroma 0 для нейтралей).
2. Один акцент. Опасность — только `--destructive`. Никакой пестроты.
3. Бордер тёмной темы = альфа (`white/10%`), не хардкод-серый.
4. Радиус из шкалы (sm6/md8/lg10/xl14). Тень = бордер + shadow-sm, не тяжёлая.
5. Типо-пара display/UI через переменные. Рабочий текст 14px. Заголовки tracking-tight + text-wrap:balance.
6. Веса: 400 текст / 500 кнопки·label / 600 заголовки. Приглушённое — `--muted-foreground`.
7. Spacing по сетке 4px. Единая высота 36px у input/button/select.
8. Focus только `focus-visible`, кольцо 3px `--ring/50`. Мышь не мигает.

**Примитивы (9-14)**
9. Кнопка — только из cva-набора (6 вариантов × размеры). Инлайн-кнопки запрещены.
10. Карточка — один силуэт (rounded-xl + border + shadow-sm). Не плодить варианты.
11. Поля — h-9, единый focus/invalid. Иконки авто-16px.
12. Пусто → блок Empty (иконка+title+desc+action), не голый текст.
13. Загрузка → skeleton по размеру контента, не спиннер по центру.
14. Числа — tabular-nums. Крупные — nFormatter (1.2K/3.4M).

**Навигация и структура (15-20)**
15. Навигация из ОДНОГО конфига → кормит меню И ⌘K-палитру.
16. Меню сгруппировано; черновики (`ready:false`) — отдельно/скрыты.
17. Активный пункт: `bg-accent + font-medium`. Шапка: matte на скролле.
18. Один экран = один сценарий. Дубли экранов запрещены (одна линза + переключатель вида).
19. Стены (>300 слов/>8 секций) — сворачивать в группы/вкладки.
20. Пустое не рисуется; растёт по данным.

**Взаимодействие и адаптив (21-26)**
21. Горизонтального скролла нет нигде. Ни на одном брейкпоинте.
22. <768: Sidebar→Drawer, панели→вкладки, таблица→карточки. <640: FAB + Bottom-Sheet + нижняя навигация.
23. Оверлеи — только через общий helper (mobile→Sheet, desktop→Dialog). Новых модалок с нуля нет.
24. Разрушительное действие → undo-тост, не модалка-подтверждение (кроме необратимого).
25. Optimistic: результат сразу, откат при ошибке. Loading: skeleton.
26. Клавиатура: ⌘K палитра, ⌘B меню, стрелки в списках, Esc закрывает.

**Артефактная модель — незыблемо (27-30)**
27. Любой вход → артефакт. Экран — только проекция (лента/карточка/таблица/timeline/граф) над коллекцией. Никаких модулей со своим состоянием.
28. Список = `RENDERER_REGISTRY[collection]`, не копия. Выбор = выбор артефактов.
29. Любое значимое действие = **Proposal → preview → confirm → Receipt**. Ни одной тихой мутации (§7 CLAUDE.md).
30. Провайдеры честны: `not-connected/permission-required/provider_unavailable` — никогда не имитировать успех.

**Статус:** Canon v2 готов. Дальше — LifeOS Mapping → Screen Map → перестройка экранов строго из этих 30 правил, гейты после каждого.
