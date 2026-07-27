# TOP-100 инженерных решений — shadcn-ui/ui (репо 1/5)

Источник: реальный клон `github.com/shadcn-ui/ui` (v4, стиль new-york). Перепись: **61 UI-примитив,
239 examples, 70 charts, 27 blocks, 3237 .tsx**. Прочитаны исходники: `sidebar.tsx` (726 стр.),
`button.tsx`, `empty.tsx`, `field.tsx`, `form.tsx`, `command.tsx`, `globals.css` (токены).
«→» = как переносим в LifeOS (vanilla, без React/Tailwind — берём паттерн, не код).

## A. Токены и тема (OKLCH)
1. Цвет в **OKLCH**, а не HSL/hex — перцептивно равномерная светлота. → перевести палитру LifeOS на oklch, серые = lightness при chroma 0.
2. Нейтрали заданы одной светлотой: `oklch(1 0 0)`…`oklch(0.145 0 0)` — вся серая шкала на одном тоне.
3. `--radius: 0.625rem` (10px) — один корень, остальные радиусы производные.
4. **Бордеры в тёмной теме — альфа белого**: `oklch(1 0 0 / 10%)`, инпут `/ 15%`. Бордер адаптируется к любому фону. → заменить хардкод-линии на альфа-токен.
5. Семантические токены парами `X` / `X-foreground` (bg + текст на нём) — гарантированный контраст.
6. Отдельная семья `--sidebar-*` (bg/foreground/accent/border/ring/primary) — сайдбар отличается от основной поверхности управляемо. → у нас навигация уже темнее — оформить токенами.
7. Семьи `--surface-*`, `--code-*`, `--selection-*` — поверхность, код и выделение — тоже токены.
8. `--ring: oklch(0.708 0 0)` — фокус-кольцо отдельным нейтральным токеном, не акцентом.
9. Дефолтная палитра графиков — монохромный синий рамп `chart-1..5 = blue-300..800`, не радуга. → chart.js привести к одному рампу.
10. `--destructive` даёт цвет и в светлой (`0.577 0.245 27`) и тёмной с разной светлотой — опасность читается в обеих темах.
11. `--primary` в тёмной инвертируется (почти белый) — «основное действие» = максимальный контраст к фону, а не фикс-цвет.
12. `--muted-foreground` (≈0.556 light / 0.708 dark) — единый приглушённый текст для подписей/мет.
13. Тема переключается классом `.dark` на корне (у нас — `data-theme`), все токены переопределяются в одном блоке.
14. `--selection` / `--selection-foreground` — даже выделение текста стилизовано токенами.
15. Токены объявлены на `:root`, компоненты ссылаются только на них — нулевой хардкод цвета в примитивах.

## B. Кнопка (button.tsx)
16. Варианты через **cva** (class-variance-authority): один источник вариантов, а не россыпь классов. → у нас `button()` helper — свести к таблице вариантов.
17. 6 вариантов: default/destructive/outline/secondary/ghost/link — и всё; больше не плодят.
18. 8 размеров: default h-9, xs h-6, sm h-8, lg h-10 + icon/icon-xs/icon-sm/icon-lg (квадратные size-6/8/9/10).
19. **Оптическая коррекция паддинга**: `has-[>svg]:px-3` — у кнопки с иконкой паддинг меньше (иконка визуально «шире»).
20. Иконки авто-16px: `[&_svg:not([class*='size-'])]:size-4` — не надо задавать размер каждой иконке.
21. Фокус: `focus-visible:ring-[3px] ring-ring/50 + border-ring` — 3px кольцо на 50% прозрачности, видно на любом фоне.
22. `aria-invalid:` встроен в кнопку (border+ring destructive) — состояние ошибки без доп. классов.
23. `disabled:opacity-50 disabled:pointer-events-none` — единый дизейбл.
24. `data-slot`/`data-variant`/`data-size` на элементе — хуки для стилизации и тестов. → у нас есть data-testid, добавить data-variant.
25. `asChild` (Slot) — кнопка рендерится как `<a>`/любой тег, сохраняя стиль: ссылка выглядит кнопкой без дублирования.
26. `gap-2` + `inline-flex items-center` — иконка и текст всегда выровнены с одним зазором.
27. `transition-all` только на интерактивных свойствах, `whitespace-nowrap` — кнопка не переносится.

## C. Раскладка и сайдбар (sidebar.tsx — 23 подкомпонента)
28. **Состояние сайдбара в cookie** (`sidebar_state`, max-age 7д) — раскрыт/свёрнут переживает перезагрузку. → сохранять в localStorage.
29. Клавиша **⌘/Ctrl+B** сворачивает сайдбар (глобальный keydown listener). → добавить горячую клавишу навигации.
30. На мобиле сайдбар превращается в **Sheet** (выезжающая панель), десктоп — фиксированный. Один компонент, два поведения по `useIsMobile`.
31. `data-state="expanded|collapsed"` + `data-collapsible` + `data-side` + `data-variant` на контейнере — вся стилизация состояний через data-атрибуты, без JS-классов. → мощный паттерн: состояние в DOM-атрибуте, стиль в CSS.
32. 3 режима сворачивания: `offcanvas` (уезжает), `icon` (только иконки), `none`.
33. 3 варианта: `sidebar` / `floating` (карточка с тенью) / `inset` (основной контент в скруглённой панели).
34. **SidebarRail** — узкая полоса-хваталка на границе для перетаскивания, с курсором `w-resize/e-resize` по стороне.
35. «Gap»-элемент отдельно от «container» — плавная `transition-[width] duration-200 ease-linear` при сворачивании без дёрганья контента.
36. **Tooltip на пунктах при свёрнутом сайдбаре** (`hidden={state!=="collapsed"}`) — иконка без подписи показывает подсказку.
37. `SidebarGroup` + `SidebarGroupLabel` (text-xs, foreground/70) + `SidebarGroupAction` — группы меню с заголовком и действием группы. → мы уже сгруппировали меню; перенять `text-xs` заголовки.
38. `SidebarGroupLabel` при icon-collapse: `-mt-8 opacity-0` — заголовок группы плавно исчезает в узком режиме.
39. **SidebarMenuButton** через cva: варианты default/outline, размеры sm/default/lg (h-7/8/12).
40. `data-[active=true]:bg-sidebar-accent + font-medium` — активный пункт: фон-акцент + жирнее. → наш `.nav-item.active` привести к этому.
41. **SidebarMenuBadge** — счётчик справа в пункте, `tabular-nums`, `pointer-events-none`.
42. **SidebarMenuAction** `showOnHover` — действие пункта появляется только при hover/focus (`md:opacity-0` → `group-hover:opacity-100`).
43. **Расширение хит-зоны на мобиле**: `after:absolute after:-inset-2 md:after:hidden` — невидимая область клика +8px вокруг мелкой кнопки на тач-экране.
44. **SidebarMenuSkeleton** со **случайной шириной** (50–90%) — скелетон списка выглядит естественно, не как одинаковые полоски.
45. `SidebarMenuSub` с `border-l` отступом — вложенное подменю с левой линией-гидом.
46. `SidebarInset` (main) при `variant=inset`: `m-2 rounded-xl shadow-sm` — контент как «карточка на столе».
47. Контекст (`SidebarProvider` + `useSidebar`) — состояние доступно всем частям без пробрасывания пропсов. → у нас глобальный state, тот же принцип.
48. `group/sidebar-wrapper`, `peer` — родитель метит состояние, дети реагируют CSS-селектором (`group-data-[...]`). → перенести логику состояний в CSS, а не в шаблон-строки.
49. `min-h-svh` (small viewport height) — корректная высота на мобиле с адресной строкой.
50. Ширины токенами: `--sidebar-width: 16rem`, `--sidebar-width-icon: 3rem`, mobile 18rem.

## D. Формы и поля (field.tsx + form.tsx)
51. **Composable Field-система** (Field/FieldSet/FieldLegend/FieldGroup/FieldContent/FieldLabel/FieldTitle/FieldDescription/FieldSeparator/FieldError) — не завязана на react-hook-form, работает с любым.
52. Field orientation: `vertical` / `horizontal` / **`responsive`** — раскладка поля меняется по ширине контейнера.
53. **Container queries** (`@container/field-group`, `@md/field-group:flex-row`) вместо media-queries — поле реагирует на ширину РОДИТЕЛЯ, не экрана. → сильный приём для переиспользуемых блоков.
54. `FieldSet` авто-уменьшает gap для чекбокс/радио-групп (`has-[>[data-slot=checkbox-group]]:gap-3`).
55. **FieldLabel-as-card**: label оборачивает всё поле, `has-data-[state=checked]:border-primary bg-primary/5` — выбираемая карточка-опция подсвечивается при выборе.
56. `FieldError` **дедуплицирует** сообщения (Map по message), рендерит одно или список `<ul>`, `role="alert"`.
57. `FieldSeparator` с центрированным текстом «или» поверх линии (`bg-background px-2` перекрывает Separator).
58. `FieldDescription`: ссылки авто-подчёркнуты, `text-muted-foreground`, отрицательные margin-хуки для точного примыкания к предыдущему.
59. `FieldContent` `gap-1.5 leading-snug` — заголовок и подпись поля с плотным зазором.
60. **Form авто-генерит id** (`useId()`): `formItemId`, `formDescriptionId`, `formMessageId` — связывает label/description/error без ручных id.
61. `FormControl` авто-проставляет `aria-describedby` (description + message) и `aria-invalid` — доступность бесплатно.
62. `FormMessage` возвращает **null**, если нет ошибки/текста — никаких пустых узлов в DOM. → наш паттерн «пустое не рисуем» совпадает.
63. `FormLabel` `data-[error=true]:text-destructive` — подпись краснеет при ошибке поля.
64. Ошибка поля течёт вниз `data-[invalid=true]:text-destructive` на группе — весь блок поля реагирует на невалидность.
65. Контекст поля (FormFieldContext/FormItemContext) — id и имя доступны детям без пропсов.

## E. Оверлеи и командная палитра (command.tsx, dialog/sheet/drawer)
66. **CommandDialog**: палитра = cmdk внутри Dialog, `p-0`, sr-only title/description для скринридера.
67. CommandInput: `SearchIcon opacity-50` + `border-b`, обёртка h-9 — единый вид поиска.
68. `CommandList max-h-[300px] scroll-py-1` — список результатов со скроллом и скролл-паддингом.
69. `CommandItem data-[selected=true]:bg-accent` — навигация стрелками подсвечивает пункт.
70. Иконки в CommandItem авто-приглушены `[&_svg:not([class*='text-'])]:text-muted-foreground`.
71. **CommandShortcut**: `ml-auto text-xs tracking-widest text-muted-foreground` — хоткей выровнен вправо серым.
72. `CommandGroup` с `cmdk-group-heading` text-xs — сгруппированные команды с заголовками.
73. `CommandEmpty py-6 text-center` — честное «ничего не найдено» в палитре. → наша командная палитра уже есть, привести к этому виду.
74. Dialog/Sheet/Drawer — три оверлея с общей анатомией (overlay + content + header/footer), Sheet = боковой, Drawer = нижний (vaul).
75. `showCloseButton` — крестик оверлея опционален (в палитре скрыт).
76. Оверлеи используют `data-[state=open/closed]` для анимаций входа/выхода (Radix) — открытие/закрытие анимируется через data-state.

## F. Состояния: пусто / скелетон / загрузка (empty.tsx, skeleton.tsx)
77. **Empty-семья** (Empty/EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription/EmptyContent) — пустое состояние это компонент, а не `<div>Пусто</div>`. → у нас `emptyState()` — расширить до title+media+description+action.
78. `EmptyMedia variant=icon`: `size-10 rounded-lg bg-muted` — иконка пустого состояния в приглушённом квадрате.
79. `EmptyTitle text-lg font-medium tracking-tight` + `EmptyDescription text-sm muted` — чёткая иерархия в пустом экране.
80. Empty: `border-dashed`, `text-balance`, `max-w-sm` — пунктирная рамка, сбалансированный перенос, читаемая ширина.
81. Empty responsive padding `p-6 md:p-12` — на десктопе просторнее.
82. `Skeleton` = один примитив `bg-accent animate-pulse rounded-md` — плейсхолдер лепится из него любой формы.
83. Скелетоны повторяют РАЗМЕР реального контента (h-4, size-4 иконки) — при загрузке лейаут не прыгает.
84. Случайная ширина у текстовых скелетонов (см. #44) — список-заглушка выглядит живым.

## G. Композиция и повторно используемые приёмы
85. **`data-slot` на КАЖДОМ примитиве** — стабильный хук для стилизации/тестов/вложенной адресации (`**:data-[slot=command-input-wrapper]:h-12`).
86. **cva везде** — вариант+размер как данные; дефолты через `defaultVariants`. → ввести мини-cva-хелпер в наш `button()`/карточки.
87. **`asChild`/Slot паттерн** — любой примитив рендерится как нужный тег без потери стиля (кнопка-ссылка, label-карточка).
88. **Группы/peer** (`group/name`, `peer/name`) — родитель/сосед метит состояние, дети реагируют чистым CSS. → перенести состояния из JS в CSS-селекторы.
89. `[&_svg:not([class*='size-'])]:size-4` — авто-размер иконок с возможностью override: правило по умолчанию, а не на каждый вызов.
90. `has-[>svg]` / `has-data-[state=checked]` — **:has()** для реакции родителя на содержимое/состояние ребёнка (оптический паддинг, карточки-опции).
91. **Container queries** (#53) для переиспользуемых блоков — компонент адаптируется к своему контейнеру, а не вьюпорту.
92. Числа в UI — `tabular-nums` (бейджи, счётчики) — цифры не «прыгают» по ширине.
93. `text-balance` на заголовках/пустых состояниях — переносы строк выглядят аккуратно.
94. Экспорт множества мелких подкомпонентов (sidebar — 23) — сборка экрана из кубиков, а не монолит-проп.
95. Единые размеры-константы (h-9 инпут/кнопка/триггер) — вертикальный ритм строк форм совпадает.

## H. Доступность и взаимодействие
96. `focus-visible` (не `focus`) везде — кольцо только при клавиатуре, мышь не мигает.
97. sr-only заголовки/описания у оверлеев и мобильного сайдбара — скринридер получает контекст, глазами не видно.
98. `role="group"`/`role="alert"` на Field/FieldError — семантика для AT.
99. `outline-hidden` + собственное `ring` — свой видимый фокус вместо дефолтного, но не «нет фокуса».
100. Анимации короткие и линейные: `duration-200 ease-linear` (сайдбар), `transition-[width,height,padding]` — точечные свойства, не `all`; сдержанно, без «цирка». → таргет-тайминги для LifeOS.
