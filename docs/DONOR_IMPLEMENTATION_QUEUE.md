# DONOR IMPLEMENTATION QUEUE — конвейер внедрения из аудита доноров

Директива владельца (2026-07-21): «таких должны быть сотни… просто работай — чтобы под
конец смело сказать: всё, что есть в аудитах, внедрено». Этот файл — постоянная очередь:
каждая строка — конкретная фича с донором-источником. Порядок внутри секции = приоритет.
Правила: пакетами по 3-6 фич, гейты §4 CLAUDE.md на границе пакета, commit+push, отмечать
[x] с датой. Лицензии/пути доноров — docs/OSS_DONOR_AUDIT.md. Не повторять сделанное.

## ГРАФ (доноры: Obsidian-поведение, xyflow/system MIT, tldraw-концепции, AFFiNE MIT, sigma.js MIT)

- [x] G1 (2026-07-21): живая физика при drag; zoom controls; zoom-to-fit; минимап с
  вьюпорт-рамкой и click-to-jump; подписи-по-зуму.
- [x] G2.1 (2026-07-21) Поиск подсвечивает узлы на canvas: совпадения ярко + акцентное кольцо, остальное гаснет.
- [x] G2.2 (2026-07-21) Hover-tooltip у узла: название, тип, число связей.
- [x] G2.3 (2026-07-21) Double-click по узлу открывает артефакт (openGraphNodeInState + receipt).
- [x] G2.4 (2026-07-21) Легенда цветов типов (топ-6 присутствующих) в углу canvas.
- [ ] G2.5 Слайдеры сил: отталкивание/длина связи/гравитация центра (Obsidian graph settings).
- [ ] G2.6 Глубина локального графа 1/2/3 хопа (Obsidian local graph depth).
- [ ] G2.7 Подсветка входящих vs исходящих связей разным тоном (juggl/Obsidian).
- [ ] G2.8 Anti-collision подписей (не наезжают при плотном графе; sigma.js label collision).
- [ ] G2.9 «Оживить» кнопка — перезапуск раскладки (Obsidian restart layout).
- [ ] G2.10 Edge-bundle/кривые связи для плотных пучков (sigma.js/cytoscape curve).
- [ ] G2.11 Пульс новых узлов: появившиеся за сегодня мягко подсвечены (AFFiNE fresh-indicator).
- [ ] G2.12 Фильтр по дате: показывать граф «на дату» (Timeline интеграция, слайдер).
- [ ] G2.13 WebGL-фоллбэк для vault >2000 узлов (sigma.js — отдельное решение+DECISIONS).

## ЗАДАЧИ/СЕГОДНЯ (доноры: obsidian-tasks MIT, super-productivity MIT)

- [x] T1.1 (2026-07-21) Urgency-скоринг: сортировка «Что делать сейчас», Сегодня и Дом.
- [x] T1.2 (2026-07-21) Тихая полоска срочности (accent/danger) на строках задач.
- [ ] T1.3 Повторяемые задачи: «каждый день/неделю/месяц» (obsidian-tasks Recurrence + SP repeatCfg): done → создаётся следующая с новой датой.
- [ ] T1.4 Отложить-на: +1ч/вечер/завтра/пн (SP snooze-паттерн) одним кликом из строки задачи.
- [ ] T1.5 Время-в-задаче: takt «займёт ~25м» поле + сумма на день (SP timeEstimate).
- [ ] T1.6 Подзадачи (checklist внутри задачи; SP subTaskIds паттерн, без нового артефакта).
- [ ] T1.7 «Сначала лягушка»: пометить главную задачу дня, она всегда сверху (SP frog/today-tag).
- [ ] T1.8 Done-лента дня: зачёркнутые уезжают вниз с анимацией (SP done-list).

## ДЕНЬГИ (донор: actual MIT, expensica MIT, tremor Apache)

- [ ] F1.1 Обнаружение регулярных платежей (actual `find-schedules`): ≥2 похожие транзакции с шагом ~месяц → предложение «сделать регулярным» (proposal+receipt).
- [ ] F1.2 Регулярные платежи как коллекция прогнозов: «до конца месяца ожидается −X» (actual schedules).
- [ ] F1.3 Правила авто-категорий (actual transaction-rules): «бензин→Транспорт» правится владельцем, правило сохраняется.
- [ ] F1.4 Месячный бюджет по категориям с конвертами и остатком (actual budget).
- [ ] F1.5 Sparkline 7 дней в мини-карте «Деньги» на Дому (tremor SparkChart разметка).
- [ ] F1.6 BarList топ-категорий месяца в Деньгах (tremor BarList).
- [ ] F1.7 Calendar-heatmap трат по дням месяца (expensica calendar-view).
- [ ] F1.8 Прогноз «хватит ли до зарплаты»: линейный burn-rate vs остаток (actual forecast, честная арифметика).

## ЧАТ/AI (донор: LibreChat MIT; UX — Open WebUI только смотреть)

- [ ] C1.1 Стриминг ответа Ollama токенами (печатается по мере генерации; LibreChat SSE/stream паттерн на наш fetch).
- [ ] C1.2 Кнопка «Стоп» во время генерации (AbortController; LibreChat stop).
- [ ] C1.3 «Перегенерировать» последний ответ (LibreChat regenerate).
- [ ] C1.4 Цитаты-источники в ответе: какие артефакты пошли в контекст, кликабельны (LibreChat citations + наш graph-context).
- [ ] C1.5 Селектор модели прямо в чате (список из /api/tags; LibreChat model-select).
- [ ] C1.6 Вложение артефакта в сообщение (выбор из базы; LibreChat attachments-паттерн, локально).
- [ ] C1.7 Markdown-рендер ответов с подсветкой кода (marked+dompurify уже есть — включить в чат-пузыри).
- [ ] C1.8 Черновик сообщения переживает переключение поверхности (LibreChat draft persistence).

## ДОМ/DASHBOARD (доноры: tremor Apache, magicui MIT CSS-идеи, SP)

- [ ] D1.1 Sparkline-тренды в трёх мини-картах (Сегодня/Деньги/Привычки) за 7 дней.
- [ ] D1.2 Прогресс-кольцо дня (задачи done/total) в шапке Дома (tremor donut-мини).
- [ ] D1.3 Streak-счётчики привычек с огоньком за серию (SP simple-counter streak).
- [ ] D1.4 Тихие часы: после 22:00 Дом приглушает яркость акцентов (SP evening-theme идея).
- [ ] D1.5 Hover-glow карточек (magicui glow — перевести в наш CSS, деликатно).

## ПОИСК/ПАЛИТРА (доноры: AFFiNE MIT fuzzy-match, ninja-keys MIT)

- [ ] S1.1 Fuzzy-match в поиске графа и палитре (AFFiNE `fuzzy-match.ts` — адаптировать кодом).
- [ ] S1.2 Подсветка совпавших букв в результатах (AFFiNE highlight).
- [ ] S1.3 Недавние/частые команды сверху палитры (ninja-keys recents).
- [ ] S1.4 Поиск по типу: «task: письмо», «money: бензин» префиксы (obsidian-tasks query-мини).

## КАЛЕНДАРЬ (донор: tui.calendar MIT — паттерны/разметка, Schedule-X MIT)

- [ ] K1.1 Месячный вид с плотными полосками событий (tui.calendar month-view разметка).
- [ ] K1.2 Drag длительности блока (растянуть конец; tui.calendar resize — на наш sortable/pointer).
- [ ] K1.3 «Сейчас»-линия в дневном виде, автоскролл к текущему часу (tui.calendar now-indicator).
- [ ] K1.4 Конфликты времени подсвечены (два блока в один час; tui.calendar collision).

## ЧТЕНИЕ/ПЛЕЕР (доноры: уже свои, полировка SP/AFFiNE-идеи)

- [ ] R1.1 Скорость аудио 0.75×-2× с запоминанием (Audiobookshelf-идея, код свой).
- [ ] R1.2 Прогресс-полоска чтения книги в списке Базы (%, AFFiNE list-progress).
- [ ] R1.3 «Продолжить чтение» карточка на Дому: последняя книга/позиция (SP continue-where-left).

## ПЛАТФОРМА (доноры: Excalidraw MIT history, AFFiNE MIT)

- [ ] P1.1 Undo/redo последней мутации (Ctrl+Z, Excalidraw history.ts diff-паттерн; с receipt).
- [ ] P1.2 Мягкие анимации появления карточек (AFFiNE transitions, CSS-only, уважая prefers-reduced-motion).
- [ ] P1.3 Быстрый переключатель поверхностей Ctrl+1..9 (SP keyboard-form).

## БУДУЩИЕ КРУПНЫЕ (отдельные планы, не терять)

- [ ] W1 Whiteboard-поверхность на ядре Excalidraw element/* (MIT, код) — mind map/планирование.
- [ ] W2 Agent/Workflow Builder на xyflow/system математике (MIT, код).
- [ ] W3 Doc↔Canvas переключение артефакта (AFFiNE edgeless, MIT, код).
