# LifeOS — READ ME FIRST (для Claude Code)

Это стартовый файл. Прочитай его целиком, потом действуй по инструкции ниже.
**Ничего не реализуй, пока не выдал понимание, законы архитектуры и первый пакет (см. §7).**

---

## 1. Что такое LifeOS (одним абзацем)

LifeOS — это **артефакт-центричная персональная операционная платформа** для данных, знаний, действий, AI, автоматизаций и пользовательских систем. Не приложение для заметок, не Notion/Obsidian-клон, не AI-чат, не dashboard, не smart-home панель, не marketplace шаблонов и не монолит — всё это лишь подсистемы. Ключевая идея: пользователь не ждёт, пока разработчик вручную добавит каждую функцию; LifeOS даёт **primitives + System Factory + adapters + packages + presentation runtime + AI-runtime**, чтобы любую будущую систему можно было *создать* из общих элементов, а не хардкодить.

---

## 2. Порядок чтения (обязательный)

Собери рабочий контекст в этом порядке:

1. **`00_READ_ME_FIRST_for_Claude_Code.md`** — этот файл (правила игры).
2. **`LifeOS_v34_Master_Product_Vision`** — канон архитектуры. **Добавь этот файл в репозиторий рядом** (см. §3). Читать полностью.
3. **`01_SCOPE_PRESERVATION_CHECK.md`** — что v34 сохранил, что сжал, и Seven Contracts (их v34 не перечисляет — они здесь).
4. **`02_V33_CANON_NAVIGATION_INDEX.md`** — карта большого v33-файла. В сам v33 лезь **точечно по строкам**, не целиком.
5. **`LifeOS_v33_FINAL_CANON_MAX_ACCEL_2026-05-10.md`** — глубокий первоисточник (7 MB, с дубликатами). Только как справка по индексу из п.4.

---

## 3. Комплектация пакета (что положить в репозиторий)

Эта папка содержит 3 новых файла (`00_`, `01_`, `02_`). Чтобы пакет был полным, **добавь рядом два уже существующих файла**, которые есть у владельца:

```
/context/
  00_READ_ME_FIRST_for_Claude_Code.md      ← здесь
  01_SCOPE_PRESERVATION_CHECK.md           ← здесь
  02_V33_CANON_NAVIGATION_INDEX.md         ← здесь
  LifeOS_v34_Master_Product_Vision.txt     ← ДОБАВИТЬ (у владельца есть TXT/PDF)
  LifeOS_v33_FINAL_CANON_MAX_ACCEL.md      ← ДОБАВИТЬ (7 MB, deep reference)
```

> Формат v34: клади **TXT/markdown**, не PDF — PDF даёт лишний overhead. TXT-версия v34 уже содержит встроенные operating rules; они дублируют и дополняют §5–§6 ниже.

---

## 4. Неприкосновенные законы архитектуры

1. **System Factory — центр.** Будущие функции = создаваемые/устанавливаемые системы, а не хардкод-страницы. Если функция не названа явно — она покрыта, если раскладывается по формуле полноты (§8).
2. **Всё значимое → артефакт** с `source`, `receipt`, `permission state`, `status`, `links`, `rollback/export path`.
3. **Данные ≠ представление.** Один артефакт рендерится как feed-bubble / card / table row / graph node / dashboard widget / timeline / terminal log / reader highlight. **Telegram-лента — это один renderer, а не модель данных.**
4. **Adapters вместо переписывания.** Зрелые движки (PKM, capture, visual builder, DB builder, smart-home, workflow, local LLM) подключаются как adapters/sidecars/libraries и приводятся к контракту LifeOS. Проверять лицензии (MIT/BSD/Apache — ок; AGPL/source-available/commercial — только после ревью).
5. **Kernel requirements, не декор:** local-first, privacy, BYOK, local LLM, home-server mode, permissions, secrets vault, data export, degraded modes.
6. **Seven Contracts** (см. `01_...`, §3): Object / Artifact / Receipt / Capability / Locality / Package / Quality — соблюдать все.
7. **Никаких скрытых действий:** нет скрытого cloud call, memory write, graph mutation, task/calendar mutation, screen capture, smart-home control, external share, destructive delete. Всё значимое — с preview, подтверждением и квитанцией.
8. **Изоляция отказов.** Падение одной подсистемы не роняет платформу. Health states: alive / starting / degraded / failed / disabled / updating / requires_config / permission_blocked / provider_unavailable / index_stale.

---

## 5. Правила работы (execution discipline)

- **Не бросать весь корпус в один проход.** Работать маленькими implementation packages.
- Каждый пакет заранее указывает: goal · allowed files · forbidden files · ожидаемое число тронутых файлов · route/API impact · smoke groups · acceptance gates · stop condition · no-hidden-mutation rules · формат финального отчёта.
- Каждое изменение производит: small diff · прогнанные тесты/проверки · artifact receipt · route impact map · risk note · остаточные блокеры · предложение следующего пакета.
- **Anti-hallucination:** нет выдуманных API, нет выдуманных файлов репозитория, нет широкого рефактора без явного пакета, нет скрытых cloud/model вызовов, нет разрушительных действий, нет ложного «done». Сначала искать существующий helper, потом писать новый.
- **Никогда не заявляй «готово»** без тестов, receipt, risk note и проверки на сохранение scope.

---

## 6. Что запрещено упрощать

Не сводить LifeOS к: «reader demo», «Telegram-лента», «Obsidian-клон», «AI chat», «local LLM обёртка», «smart-home панель», «Notion-клон», «marketplace шаблонов», «куча Next.js роутов». Верная формулировка: **Artifact-Centric Personal System Operating Platform.** Всё прочее — kernel primitive / subsystem / adapter / renderer / theme / package / workflow / agent / artifact / receipt.

---

## 7. Твой первый ответ (не код)

Прочитав пакет, верни ровно это, одним ответом:

1. **Понимание продукта** — один абзац своими словами.
2. **Неприкосновенные законы архитектуры** — список (сверься с §4).
3. **Первые 10 implementation packages** — по roadmap M0–M10 из v34 §21. Напоминание: **M0 — это НЕ reader demo**, а Universal Artifact Stream + Presentation Runtime + Adapter Shell.
4. **Риски потери scope** — где план может незаметно скатиться в «просто заметки/чат/dashboard».

Не пиши код на этом шаге.

---

## 8. Формула полноты (механизм «ничего не теряется»)

Любая функция считается покрытой, если раскладывается так:

```
System =
  Entities + Fields + Relations + Views + Actions + Triggers
  + Workflows + Agents + Artifacts + Receipts + Permissions
  + Renderers + Packages + Adapters + Policies + Health
  + Export/Rollback
```

Не раскладывается → либо функция вне LifeOS, либо неполны примитивы ядра (тогда расширяй примитивы, а не хардкодь функцию).

Первый milestone M0 доказывает фундамент: создать 3 типа артефактов (`note_artifact`, `agent_report_artifact`, `import_receipt_artifact`) → отрендерить каждый в 4 режимах (telegram / card / table / timeline) → подключить к search, graph, feed, data-control, artifact inspector, health panel.

---

## 9. Статус источников и известное ограничение (честно)

- **Есть и авторитетно:** v34 vision (чистая архитектура) + v33 canon (7 MB глубокий первоисточник). Сверка v33→v34 выполнена — см. `01_...`. Архитектура и механизм защиты scope сохранены; часть детальных слоёв (C00–C25, 134 механики, pack registry, money/growth-слои, audit registers) в v34 сжата и адресуется ссылками на строки v33.
- **Отсутствует:** ChatGPT-архив (зип с чатами) в этот контекст **не попал** — его нет в загрузках чата, на диске и в Project knowledge. Файлы, загруженные в *другой* чат, сюда не переносятся; между чатами общие только *файлы проекта*.
- **Как добавить архив (для владельца):** загрузить зип **в этот чат** напрямую, **или** положить его в **Project knowledge** проекта (тогда он станет виден во всех чатах проекта). После этого попросить повторить сверку — тогда контент из архива тоже будет учтён.
- **Признанное ограничение (из самого v34):** доказать «100% ничего не забыто» в платформе, которая должна уметь создавать любые будущие системы, математически нельзя. Защита — не список функций, а формула §8.
