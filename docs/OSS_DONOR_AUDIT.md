# OSS DONOR AUDIT — источники готового кода для LifeOS

Дата: 2026-07-21. Задача владельца: не писать функции с нуля, а брать из больших
открытых проектов и адаптировать под наш vanilla-стек. Этот файл — леджер доноров:
что скачано, что проверено, откуда что берём. **Повторно эту работу не делать** —
сначала смотреть сюда.

Клоны лежат в scratchpad сессии (`audit-sources/`), в git не попадают (это чужой код,
в наш репозиторий копируются только адаптированные фрагменты с пометкой источника).

## Правило лицензий (жёсткое, из CLAUDE.md §2 плана v1.2)

- **Код брать можно:** MIT / Apache-2.0 / BSD.
- **Только идеи/паттерны, ни строки кода:** AGPL/GPL (Vikunja, Plane, Logseq core,
  Firefly III, Maybe и т.п.).
- **Никогда:** «слитый»/проприетарный код (Notion, TickTick, Todoist и пр.) — юридически
  заражён, нарушает и закон, и наш контракт лицензий. Проверено и решено: не используем.

## Проверенные доноры (лицензии прочитаны из LICENSE в клоне)

| Донор | Лицензия | Масштаб | Что даёт LifeOS |
|---|---|---|---|
| super-productivity/super-productivity | MIT ✅ | 2860 файлов, ~722K строк | Daily Summary / Finish Day, перенос незавершённых на завтра, worklog, планировщик, привычки-счётчики, метрики |
| actualbudget/actual | MIT ✅ (текст «Permission is hereby granted…») | 1911 файлов, ~284K строк | Финансы: schedules (регулярные платежи), transaction-rules (авто-категории), budget/goal templates, отчёты |
| obsidian-tasks-group/obsidian-tasks | MIT ✅ | 465 файлов, ~193K строк | Повторяемость задач (recurrence), реестр статусов, query/фильтры задач, urgency-скоринг |
| dhruvir-zala/obsidian-expensica | MIT ✅ | 35 файлов, ~28K строк | Дневная/недельная/месячная сводка расходов, calendar-heatmap трат |
| onejgordon/flow-dashboard | MIT ✅ | 79 файлов, ~13K строк | Дневной журнал + виджеты привычек/целей, анализ выполнения по дням |
| lumoe/obsidian-rollover-daily-todos | MIT ✅ | 6 файлов, ~1.3K строк | Rollover незавершённых todo в новый день, undo-модалка |
| hamzamohdzubair/logseq-plugin-daily-todo | MIT ✅ | 2 файла, ~0.3K строк | Мелкий образец carry-over (уже изучен, малоценен рядом с SP) |

## Карта донорского кода → пакеты LifeOS

### U6 EVENING_SUMMARY (текущий пакет) — донор Super Productivity

Точные файлы-образцы:

- `src/app/pages/daily-summary/daily-summary.component.ts` (709 строк) —
  метрики дня: `nrOfDoneTasks$` (фильтр по `isDone`), `totalNrOfTasks$`, `timeWorked$`
  (сумма `timeSpentOnDay[dayStr]` без родителей с сабтасками), заметка дня
  (`dailySummaryNote` со сбросом чекбоксов на новый день), `isWithinYesterdayMargin`
  (окно «ещё считается вчера» для ранней ночи).
- `src/app/pages/daily-summary/plan-tasks-tomorrow/plan-tasks-tomorrow.component.ts` —
  `planAllTodayTomorrow()`: выбрать id незавершённых за сегодня → каждому проставить
  день = завтра (сабтаски с dueDay=сегодня тоже) → это наша кнопка «Перенести на завтра»
  (у нас: явное действие владельца + receipt, не автоматика — CLAUDE.md §7).
- `finishDay()` там же — порядок: pre-actions → подтверждение → архив done → переход.
  У нас архива нет, но порядок «сначала показать, потом по кнопке мутировать» сохраняем.
- `daily-summary.component.html` — структура UI: шапка с датой, блок статов
  (выполнено/всего, время), вкладки (обзор / план на завтра), заметка дня, финальная
  кнопка «Завершить день».

Адаптация: Angular/RxJS/NgRx → наши проекции в `buildNewShellContext` (app.js) +
рендерер в `ui/home.js`; селекторы → фильтры по `state.tasks`/`state.financeTransactions`
с `day === todayKey()`; dispatch → наши handlers c `addAudit` receipt.

### Будущие пакеты (чтобы не искать заново)

- **Финансы (расширение U2):** Actual `packages/loot-core/src/shared/schedules.ts` +
  `server/schedules/find-schedules.ts` (обнаружение регулярных платежей),
  `server/transactions/transaction-rules.ts` (правила авто-категоризации),
  `server/budget/actions.ts` (месячный бюджет). Всё MIT — можно кусками.
- **Повторяемые задачи:** obsidian-tasks `src/Task/Recurrence.ts` и рядом (RRule-подобная
  повторяемость «каждый пн», «каждые 3 дня») + super-productivity
  `features/task-repeat-cfg/`.
- **Приоритизация:** obsidian-tasks `src/Task/Urgency.ts` — числовой urgency-скоринг
  задачи (due/scheduled/priority) — годится для «что делать сейчас» на Сегодня.
- **Heatmap трат/активности:** expensica `src/visualizations/calendar-view.ts`.
- **Виджет привычек с днями недели:** flow-dashboard `src/js/components/HabitWidget.js`.

## Леджер выполненного аудита (не повторять)

- [x] 2026-07-21 — web-research доноров, клоны 7 репо, лицензии прочитаны из LICENSE,
  масштаб посчитан, feature-grep по 8 доменам (`run-oss-audit.mjs` в scratchpad).
- [x] 2026-07-21 — разбор кода Daily Summary в super-productivity построчно
  (метрики, перенос на завтра, finish-day flow) — выводы зафиксированы выше.
- [ ] Разбор Actual schedules/rules — делать при следующем финансовом пакете.
- [ ] Разбор obsidian-tasks Recurrence/Urgency — делать при пакете повторяемых задач.
