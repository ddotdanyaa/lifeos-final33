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
| Data list / table / toolbar | 🔬 | T (очевидно) — читаю toolbar/faceted |
| Motion library | ⧗ | M — не читан |
| Forms / Fields (deep) | ⧗ | S (Field-система) |
| Toasts / feedback | ⧗ | S (sonner) |

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

## Очередь функций (следующие заходы, по одной, best-of-5)
- **Data list/table (T):** toolbar (поиск+фильтры), faceted-filter, выбор строк → плавающая панель действий, pagination, column-header sort, skeleton, URL-состояние. → под D−1 (База 31 кнопка, Паки 32, Лента 31 секция).
- **Motion (M):** сдержанные появления/переходы (fade/blur/slide), число-каунтеры — точечно.
- **Forms/Fields (S):** Field-система (orientation vertical/horizontal/responsive, container-queries), авто-a11y (aria-describedby/invalid), FieldError-дедуп. → под Конструктор (17 полей → multi-step).
- **Toasts (S sonner):** единый feedback вместо инлайн-сообщений.

## Anti-Duplicate log
Button/Card/Sidebar встречаются во всех репо, но в канон внесены ОДИН раз (источник — S как канонический).
D/T/M используют S как базу — из них берём НЕ примитивы, а паттерны сборки (nav-config, data-table, motion).
