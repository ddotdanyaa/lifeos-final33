# LifeOS — Scope Preservation Check (v33 → v34)

**Дата сверки:** 2026-07-16
**Что сверялось:** `LifeOS_v34_Master_Product_Vision` (чистая дистилляция, PDF + TXT) против `LifeOS_v33_FINAL_CANON_MAX_ACCEL_2026-05-10.md` (полный корпус-первоисточник, 7.0 MB).
**Вопрос, на который отвечает файл:** «Ничего ли не урезано?»

---

## 0. Короткий вердикт

- **Архитектура и механизм защиты scope — сохранены полностью и даже улучшены.** v34 не теряет ядро идеи; он приводит разросшийся v33-корпус к чистой платформенной архитектуре (kernel + System Factory + Artifact/Event/Presentation + Adapter + Data Fabric + Model Fabric + Agent/Workflow + Marketplace + формула полноты).
- **Структурные реестры — перенесены 1:1.** 20 canonical modules, 82 visible routes, 56 API routes, 100 improvement categories, 22 tactical axes — всё есть в v34 (разделы 5, приложения A–D).
- **Честное ограничение (его признаёт сам v34).** Нельзя математически доказать «100% ничего не забыто» в продукте, который по замыслу должен уметь создавать любые будущие системы. Поэтому защита — не список функций, а **формула:** `System = Entities + Fields + Relations + Views + Actions + Triggers + Workflows + Agents + Artifacts + Receipts + Permissions + Renderers + Packages + Adapters + Policies + Health`.
- **Что v34 намеренно сжал или не перенёс дословно — 7 слоёв (ниже).** Часть из них архитектурно важна и восстановлена прямо в этом файле; часть — продуктовый/маркетинговый слой, который не нужен для первой сборки, но остаётся в большом v33-файле как справка.

**Итог:** для передачи в Claude Code архитектура полная. Ни один пункт из v33 не «пропал» безвозвратно — всё либо в v34, либо восстановлено здесь, либо адресуется ссылкой на конкретные строки v33 (см. `02_V33_CANON_NAVIGATION_INDEX.md`).

---

## 1. Что v34 сохранил (проверено)

| Слой | Где в v34 | Статус |
|---|---|---|
| 20 canonical modules v33 (M01–M20) | §5 | ✅ 1:1 |
| 82 visible routes | Приложение A | ✅ 1:1 |
| 56 API routes | Приложение B | ✅ 1:1 |
| 100 improvement categories (C01–C100) | Приложение C | ✅ 1:1 |
| 22 tactical axes | Приложение D | ✅ 1:1 |
| Kernel / Subsystem ecosystem | §6 | ✅ расширено и уточнено |
| System Factory + primitives | §7 | ✅ ядро идеи, усилено |
| Artifact / Event / Channel / Presentation Runtime | §8 | ✅ выделено как канон данных |
| Presentation System (themes/renderers/layouts/view presets) | §9 | ✅ дизайн как слой |
| Adapter Runtime (не переписывать всё с нуля) | §10 | ✅ |
| Data Fabric (логическая ткань данных) | §11 | ✅ |
| Privacy / local-first / home-server / BYOK / local LLM | §12–13 | ✅ |
| Model Fabric + routing policies + receipts | §13 | ✅ |
| Agent Runtime + multi-agent + kill switch | §14 | ✅ |
| Workflow Runtime (трассируемые) | §15 | ✅ |
| Artifact Ledger + Data Control | §16 | ✅ |
| Permissions / safety tiers / degraded mode | §20 | ✅ |
| «Чем LifeOS НЕ является» | §2 | ✅ |
| Формула полноты | §23–24, финал | ✅ |
| Roadmap M0–M10 (первый milestone — НЕ reader demo) | §21 | ✅ |
| Дисциплина AI-разработки (пакеты, gates, no false done) | §22 | ✅ |

---

## 2. Что v34 сжал или НЕ перенёс дословно (7 слоёв)

### Слой 1 — Operating Canon C00–C25 (детальное поведение продукта) ⚠️ архитектурно важен
26 доменных спецификаций поведения: capture realism, reply family, daily UX/Today, calendar, planning/recovery, focus, journal/aliveness, sleep/energy, social, household/life-admin, finance/food/travel, AI tiers/Model Hub, memory/graph, lifecycle/explainability, privacy/data control, security/automation safety, visual arch/design studio, i18n, mobile/device continuity, maturity/marketplace.
- **В v34:** свёрнуто в «subsystem families» (§19) — без детали.
- **Действие:** Claude Code читать v33 строки **230–1113** при проектировании конкретной подсистемы. Не инлайню сюда (объёмно), но это обязательная справка.

### Слой 2 — Seven Contracts ⚠️ архитектурно важен → ВОССТАНОВЛЕН НИЖЕ (§3)
Object / Artifact / Receipt / Capability / Locality / Package / Quality contracts. В v34 идеи присутствуют, но **семь именованных контрактов не перечислены**. Это центральные инварианты данных → привожу дословно в §3.

### Слой 3 — Реестр 134 механик (Mechanics_134)
Каталог платящих/retention/download механик из `LifeOS_mechanics_research_134.xlsx`, встроенный в v33.
- **В v34:** упомянут, что существует, но не перенесён.
- **Действие:** v33 строки **21720–21858** (и дубликат 33819–33957). Это продуктовый бэклог, не блокирует первую сборку.

### Слой 4 — Pack Registry (10 категорий портфелей)
Capture / Daily-Time-Planning / Work / Money / Food-Health-Body / Household-Life-admin / Travel / Learning-Media-Creator / Social-Relationship / Builder-AI-Automation packs.
- **В v34:** обобщённый marketplace/packs, но без конкретного портфеля.
- **Действие:** v33 строки **21390–21858**. Наполнение marketplace, не блокирует первую сборку.

### Слой 5 — Монетизация / money-механики
100+ платящих механик, money hooks, топ-40 добавлений, «где люди уже платят», pricing physics, money map 2024–2026.
- **В v34:** почти отсутствует (v34 сфокусирован на архитектуре).
- **Действие:** v33 — множество разделов (Deep Research money, «единый файл §5», APPENDIX J, новые money-слои 62152+). Продуктовый/GTM-слой, для первой сборки не нужен.

### Слой 6 — Growth / ads / conversion-психология
Killer scenarios для лендинга, 30 productized psychological levers, цепочки «ad → first screen → first relief → first proof → paywall», trust + anti-friction patterns, conversion moments, anti-patterns.
- **В v34:** отсутствует полностью.
- **Действие:** v33 строки **59041–62613**. Это маркетинг/рост, не архитектура. Держать как отдельный слой, когда дойдёт до лендинга.

### Слой 7 — Audit Registers (2500+ проверок)
Audit Pass A/B/C (по 500) + Audit Register A/B/C (500+500+1000) + 200-пунктовая стресс-проверка + 1000 контрольных уязвимостей.
- **В v34:** заменено «Scenario Coverage Model» (§23) — компактной моделью измерений вместо плоского списка.
- **Действие:** v33 строки **1193–2702**, **2944–6955**, **16750–17757**. QA-дисциплина, справка при hardening.

---

## 3. GAP-FILL: Seven Contracts (восстановлено дословно из v33, стр. 16041)

Эти семь контрактов — центральные инварианты данных LifeOS. Они **обязаны** попасть в Claude Code вместе с v34, потому что v34 их прямо не перечисляет.

### 3.1 Object Contract / объектный контракт
Каждый объект имеет: `id`, `type`, `title`, `owner`, `source_refs`, `artifact_refs`, `relations`, `lifecycle_state`, `privacy_scope`, `access_contour`, `provenance`, `confidence`, `receipts`, `created_at`, `updated_at`, `version`.

### 3.2 Artifact Contract / артефактный контракт
Каждый входящий материал сохраняется как артефакт до интерпретации. Артефакт не обязан становиться задачей. Он может стать заметкой, знанием, проектом, вопросом, событием, чек-листом, медиа, источником, memory candidate или остаться архивом.

### 3.3 Receipt Contract / контракт квитанций
Каждая сильная мутация создаёт квитанцию: создание, изменение, удаление, экспорт, импорт, публикация, share, model call, workflow run, permission change, memory write, merge, design apply, pack install.

### 3.4 Capability Contract / контракт способностей
Права выдаются не «модулю», а конкретной способности: `resource + action + scope + locality + approval policy + budget`.

### 3.5 Locality Contract / контракт локальности
Каждое действие помечается: локально, локальная сеть, облако, внешний провайдер, пользовательская модель. Cloud fallback не должен быть скрытым.

### 3.6 Package Contract / контракт пакетов
Любой pack имеет manifest: типы объектов, views, workflows, permissions, data effects, uninstall behavior, rollback, trust score, billing model, creator, support, compatibility.

### 3.7 Quality Contract / контракт качества
Каждый слой C01–C25 получает expected entities, required attributes, smoke checks, acceptance criteria, traceability status и release gate.

---

## 4. Дубликаты внутри v33 (важно для Claude Code)

Файл v33 собран методом «ничего не терять» — источники сохранены дословно, поэтому **часть контента повторяется 3–7 раз.** Claude Code не должен читать 7.0 MB подряд. Подтверждённая избыточность:

| Блок | Повторов в v33 |
|---|---:|
| «All-layer expansion plan без потери…» | **7×** |
| Deep Research (стратегический) | 3× |
| «как граф жизни, а не набор мини-продуктов» | 3× |
| «как управляемая платформа персональных систем» | 3× |
| Mechanics_134 registry | 3× |
| 200-пунктовая стресс-проверка | 5× |
| Seven Contracts | 3× |

Реально уникального контента заметно меньше объёма файла. Карта первых (неповторяющихся) вхождений с диапазонами строк — в `02_V33_CANON_NAVIGATION_INDEX.md`.

---

## 5. Что делать дальше (для человека)

1. Отдать Claude Code эту папку целиком + добавить два уже существующих файла (v34 TXT и v33 .md) — рецепт в `00_READ_ME_FIRST_for_Claude_Code.md`.
2. Если нужен ChatGPT-архив — загрузить зип **в этот чат** или положить его **в Project knowledge** (инструкция в `00_...`). Сейчас он недоступен.
3. Слои 5–6 (money + growth) не тащить в первую сборку — это отдельный этап после того, как заработает M0 (universal artifact stream).
