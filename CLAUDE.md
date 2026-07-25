# CLAUDE.md — правила работы над LifeOS

Этот файл читается автоматически в начале каждой сессии Claude Code. Держи его коротким и точным. Глубина — в `context/` и `docs/`.

## 1. Что это за проект

**LifeOS** — локально-первая **артефакт-центричная персональная операционная платформа** (НЕ заметки/Notion/AI-чат/dashboard). Полное видение: [context/LifeOS_v34_Master_Product_Vision.txt](context/LifeOS_v34_Master_Product_Vision.txt). Правила канона: [context/00_READ_ME_FIRST_for_Claude_Code.md](context/00_READ_ME_FIRST_for_Claude_Code.md). Seven Contracts: [context/01_SCOPE_PRESERVATION_CHECK.md](context/01_SCOPE_PRESERVATION_CHECK.md). В 7-МБ `context/LifeOS_v33_FINAL_CANON_MAX_ACCEL.md` лезь ТОЛЬКО точечно по индексу `context/02_V33_CANON_NAVIGATION_INDEX.md`, не целиком.

## 2. Реальный стек (не выдумывай другой)

- **Pure Vanilla JS (ESM) + HTML5 + CSS3.** Нет Next.js, React, TypeScript, JSX, build-шага. Браузер грузит `app.js` как `<script type="module">` напрямую.
- Хранилище: **IndexedDB** с gzip-чанками (`fflate`) + localStorage fallback. НЕ SQLite.
- Зависимости рантайма — утверждённый список движков в плане §10 (marked, dompurify, minisearch, cytoscape, chart.js, sortablejs, epubjs, @toast-ui/editor, tesseract.js, @huggingface/transformers, pdfjs-dist, fflate). **Новые зависимости — только по решению владельца.** Движки подключать по одному в профильном пакете; после подключения обновить service-worker кэш и `tools/build-public.mjs`. Node — только для тулинга.
- Ключевые файлы: `app.js` (storage kernel + capture analyzer, ~764 КБ), `artifact-os-architecture.mjs` (исполняемый контракт: 47 коллекций, 27 workspace-линз, schema v3), `ui/shell.js` (навигация), `ui/*.js` + `ui/v34-platform.js` (поверхности), `styles.css`. Сервер: `server.mjs` (порт 4173, отдаёт файлы live).
- `public-demo/` генерируется из исходников: после правок `ui/**`, `app.js`, `styles.css`, `index.html`, `artifact-os-architecture.mjs` → `node tools/build-public.mjs`.
- **Эталон дизайна владельца — `design-system/`** (8 кликабельных экранов `*.dc.html` + `HANDOFF.md` с 10 законами продукта и контрактом бэкенда). Открывается на том же сервере: `/design-system/Home.dc.html`. Это **источник визуального языка и поведения**; переносим ПОВЕДЕНИЕ, а не пиксели, в наш стек (прототипный DC-рантайм НЕ тащим). Токены `styles.css` уже сведены с ним (V3).
- **Один локалхост: 4173.** Держать ровно один сервер (`npm start`); лишние порты (4174/4199 и т.п.) — гасить, чтобы не путаться, какой из них настоящий.

## 3. Автономная работа (execution discipline)

- **План — источник истины:** [docs/LIFEOS_V1_MASTER_BUILD_PLAN.md](docs/LIFEOS_V1_MASTER_BUILD_PLAN.md) (v1.0, завершён), [docs/LIFEOS_V1_1_ACCELERATION_PLAN.md](docs/LIFEOS_V1_1_ACCELERATION_PLAN.md) (v1.1, завершён), затем [docs/LIFEOS_V1_2_DAILY_USE_PLAN.md](docs/LIFEOS_V1_2_DAILY_USE_PLAN.md) (v1.2, текущая очередь — порядок пакетов строго как в его §3/§4, не по алфавиту/номеру). Бери первый неотмеченный пакет, объявляй заголовок ПЕРЕД кодом, отмечай чекбокс после.
- Маленькие пакеты, маленькие diff. Сначала ищи существующий helper, потом пиши новый. Никакого широкого рефактора вне пакета.
- **Никогда не заявляй «готово»** без прогнанных гейтов, receipt и risk note.
- **Не ослабляй тесты/аудиты ради зелёного.** Контракт меняется только вместе с намеренным изменением продукта, с обоснованием в отчёте.
- Читай `MEMORY.md` проекта в начале сессии.
- **Правила скорости (проверены на v1.0-сессии, 34 пакета):** (1) независимые tool-вызовы делай параллельно в одном ходе, не последовательно; (2) длинные прогоны (полный e2e-набор из 30+ спеков, `ollama pull`, скачивание моделей) — в фоне (`run_in_background`), продолжай работу, не жди вслепую; (3) внутри пакета гоняй только его целевой спек/аудит, полный набор (`for f in tools/audit-*.mjs`, весь `output/playwright/`) — только на границе пакета/фазы перед commit.

## 3.1 Донорский принцип (правило владельца, 2026-07-21)

**Research-Driven Development (правило владельца 2026-07-22): перед КАЖДОЙ новой функцией —
сначала сверься с базой знаний [research/README.md](research/README.md)** (RDD-цикл: найти аналог →
сравнить реализации → выделить лучшее → спроектировать под LifeOS → код). Индексы: `research/MASTER_*`
(проекты/функции/архитектура/алгоритмы) + детальный каталог `docs/DONOR_FUNCTION_CATALOG.md`. Не
переанализировать уже изученное (там же — честный статус: что скачано/разобрано). Далее — как раньше:
какие зрелые open-source проекты уже решают задачу, изучить 5–10 лучших реализаций, взять
сильнейшую архитектуру и максимально переиспользовать код/UX/инженерные решения.
Собственный код — только для уникальной логики LifeOS (Artifact Core, Proposal Engine,
Receipt Engine, Memory Graph, Personal OS). Лицензии: код — только MIT/Apache-2.0/BSD,
читать LICENSE-файл, не верить памяти (tldraw — не MIT; originui — AGPL); AGPL/GPL/MPL/
custom — только идеи. Стек-фильтр обязателен: React/build-only — только паттерны/CSS.

## 4. Гейты (прогоняй перед «готово»)

- `npm run verify` — node --check app.js + smoke.mjs (86 маркеров).
- Все аудиты: `for f in tools/audit-*.mjs; do node "$f"; done` (24+ скриптов).
- E2E: `npx playwright test output/playwright/final-human-product.spec.mjs --workers=1 --reporter=line` (нужен `npm start` на 4173).
- После правок UI → `node tools/build-public.mjs`.

## 5. Чистый и читаемый код (vanilla JS/CSS)

- Пиши в стиле окружающего кода: те же имена, идиомы, плотность комментариев. Не тащи framework-паттерны в vanilla.
- Функции маленькие и named; никакой «магии». Строковые шаблоны для HTML — экранируй пользовательский ввод (`escapeHtml`).
- CSS: используй существующие переменные/токены из `styles.css`; семантические цвета, не хардкод хексов вне палитры.
- Каждый интерактивный элемент — с `data-testid`, чтобы e2e его находил.

## 6. UI/UX (удобно и читабельно)

- **RU-first** интерфейс. Прогрессивное раскрытие: мало пунктов в главном меню, остальное — во вторичном «Ещё».
- Главное меню = **9 пунктов** (Дом · Сегодня · Календарь · Деньги · Лента · Системы · База · Граф · Контроль); менять — только осознанно, синхронизируя контракты (см. `MEMORY.md` → lifeos-nav-decision).
- Данные ≠ представление: один артефакт → много рендеров (лента/карточка/таблица/timeline/граф).
- Первый экран спокойный, capture-first, без «кокпита проверок».

## 7. Границы безопасности (жёстко)

- **Никаких скрытых действий:** нет скрытого cloud-вызова, memory-write, graph-мутации, screen-capture, smart-home-control, external-share, destructive-delete. Всё значимое — preview + подтверждение + receipt в Data Control.
- Провайдеры честны: `not-connected` / `permission-required` / `provider_unavailable` — никогда не имитируй успех.
- **Не коммить и не пушь без явного слова владельца.** Ключи/учётки/CAPTCHA вводит только владелец. `gh auth`, деплой, релиз — owner-gated.
- Изоляция отказов: падение подсистемы не роняет платформу.

## 8. Definition of Done

См. §3 в [docs/LIFEOS_V1_MASTER_BUILD_PLAN.md](docs/LIFEOS_V1_MASTER_BUILD_PLAN.md). Кратко: гейты зелёные + receipt + scope-check (продукт не скатился в «заметки/чат/dashboard») + доки синхронизированы.
