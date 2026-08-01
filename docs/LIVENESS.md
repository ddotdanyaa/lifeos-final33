# Перепись живого — какие контролы продукта что-то делают

Сгенерировано `tools/audit-liveness.mjs`. Контрол считается ЖИВЫМ, только если после нажатия
изменилась разметка, активный экран или адрес. По умолчанию контрол мёртв — доказывать должен он.

Пять исходов, а не два. «Ничего не изменилось» бывает по разным причинам, и смешивать
их — то же враньё, что зелёный гейт при мёртвом экране:
**мёртв** — дефект · **внешний** — нужна незапущенная служба · **слепой** — системный диалог,
автоматически не проверяется вообще · **неустойчив** — экран менялся сам по себе, замер
ничего не доказывает ни в одну сторону.

Каждый контрол меряется из СЕМЕНИ экрана: хранилище возвращается к тому состоянию, в котором
экран открылся, страница перезагружается, экран открывается заново. Поэтому соседи по экрану
друг другу больше не мешают, а числа повторяются от прогона к прогону.

| Экран | Всего | Живых | Мёртвых | Внешних | Слепых | Неустойчивых |
|---|---|---|---|---|---|---|
| library | 12 | 9 | **3** | 0 | 0 | 0 |
| builder | 19 | 16 | **2** | 0 | 1 | 0 |
| systems | 5 | 4 | **1** | 0 | 0 | 0 |
| projects | 5 | 4 | **1** | 0 | 0 | 0 |
| models | 8 | 6 | **1** | 1 | 0 | 0 |
| marketplace | 3 | 2 | **1** | 0 | 0 | 0 |
| databases | 4 | 3 | **1** | 0 | 0 | 0 |
| design | 1 | 0 | **1** | 0 | 0 | 0 |
| smart-home | 5 | 4 | **1** | 0 | 0 | 0 |
| inbox | 9 | 9 | **0** | 0 | 0 | 0 |
| today | 3 | 3 | **0** | 0 | 0 | 0 |
| calendar | 3 | 3 | **0** | 0 | 0 | 0 |
| finance | 6 | 4 | **0** | 0 | 2 | 0 |
| feed | 4 | 4 | **0** | 0 | 0 | 0 |
| graph | 16 | 0 | **0** | 0 | 0 | 16 |
| control | 15 | 15 | **0** | 0 | 0 | 0 |
| capture | 10 | 10 | **0** | 0 | 0 | 0 |
| player | 2 | 1 | **0** | 0 | 1 | 0 |
| reader | 2 | 2 | **0** | 0 | 0 | 0 |
| goals | 3 | 3 | **0** | 0 | 0 | 0 |
| chat | 5 | 4 | **0** | 1 | 0 | 0 |
| agents | 9 | 9 | **0** | 0 | 0 | 0 |
| providers | 25 | 25 | **0** | 0 | 0 | 0 |
| screen | 4 | 4 | **0** | 0 | 0 | 0 |
| twin | 4 | 4 | **0** | 0 | 0 | 0 |

## Мёртвые контролы по экранам

### systems

`focus-v34-node`

### library

`note-row` · `add-question-entry` · `lens-render-list`

### projects

`focus-v34-node`

### models

`focus-v34-node`

### marketplace

`focus-v34-node`

### builder

`focus-v34-node` · `system-view-table`

### databases

`focus-v34-node`

### design

`save-design-profile`

### smart-home

`focus-v34-node`

## Не измерены: до контрола не добрались

Контрол есть в разметке экрана, но в момент замера он был не виден или выключен. Это не
приговор и не оправдание — это дыра в охвате, и она должна быть видна числом.

- **inbox** (9): quick-expense (невидим) · quick-task (невидим) · quick-note (невидим) · capture-audio (невидим) · capture-book (невидим) · bulk-import-lines (невидим) · owner-next-zone (невидим) · owner-money-zone (невидим) · owner-habit-zone (невидим)
- **graph** (3): graph-depth-1 (невидим) · graph-depth-2 (невидим) · graph-depth-3 (невидим)
- **control** (2): undo-last-trash (выключен) · import-product-map (невидим)
- **capture** (10): quick-expense (невидим) · quick-task (невидим) · quick-note (невидим) · capture-audio (невидим) · capture-book (невидим) · bulk-import-lines (невидим) · owner-next-zone (невидим) · owner-money-zone (невидим) · owner-habit-zone (невидим) · run-day-digest (выключен)
- **providers** (1): add-byok-key (выключен)

## Измерены после подготовки

Этих контролов на свежем экране не видно — они показываются только после нажатия соседей.
Путь показа записан и повторяется в каждом прогоне, но начальное состояние у них не
«чистое семя», а семя плюс перечисленные нажатия. Это честнее скрыть нельзя.

- **inbox**: start-audio-recording ← quick-voice · widget-show ← widget-hide
- **library**: note-row ← new-note
- **control**: restore-rollback-snapshot ← create-rollback-snapshot
- **capture**: widget-show ← widget-hide
- **chat**: test-ollama-embeddings ← chat-more-toggle
- **agents**: delegate-task ← agent-panel-run → approve-agent-run · approve-agent-run ← agent-panel-run · toggle-flow-kill-switch ← run-flow-builder · execute-flow-run ← run-flow-builder · cancel-agent-plan ← plan-agent
- **screen**: focus-v34-node ← prepare-screen-companion · open-v34-note ← prepare-screen-companion
- **projects**: focus-v34-node ← create-project · open-v34-note ← create-project · add-project-item ← create-project
- **twin**: focus-v34-node ← create-twin-snapshot · open-v34-note ← create-twin-snapshot · restore-twin-snapshot ← create-twin-snapshot
- **builder**: builder-open-record ← create-system-record-0 · edit-system-record ← create-system-record-0 · toggle-system-record-state ← create-system-record-0
- **databases**: focus-v34-node ← add-database · open-v34-note ← add-database · add-database-row ← add-database
- **smart-home**: focus-v34-node ← add-smart-home-device · open-v34-note ← add-smart-home-device · record-smart-home-event ← add-smart-home-device

## Экраны без входа мышью

До этих экранов на десктопе (1440×1000) нельзя добраться кликом: в ленте навигации у них нет
кнопки, есть только мобильная размером 0×0. Перепись открыла их программно — но владелец так не может.

`screen` · `projects` · `models` · `marketplace`

## Экраны без измерения

Прибор до них не добрался — их прежние числа в карте НЕ обновлялись.

- `habits` — экран не открылся

