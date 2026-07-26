# DONOR SOURCES — где смотреть исходники доноров (в т.ч. с телефона)

Все доноры **публичны на GitHub** — их не нужно копировать в наш репозиторий (7.3 ГБ архивов,
лимит GitHub 100 МБ/файл). Облачная сессия открывает их по ссылке напрямую.

**Что уже разобрано и лежит у нас** (не переанализировать — правило владельца №13):
`docs/DONOR_FUNCTION_CATALOG.md` (160+ функций с применимостью), `MASTER_ARCHITECTURE_INDEX.md`,
`MASTER_ALGORITHM_INDEX.md`, `INTEGRATION_ROADMAP.md` (P0/P1/P2), `RESEARCH_LOG.md`.

Ниже — только адреса и **какие модули реально содержат инженерию**, чтобы не читать репо целиком.

| Донор | Репозиторий | Что смотреть точечно | Для чего у нас |
|---|---|---|---|
| Graphiti | github.com/getzep/graphiti | `graphiti_core/utils/maintenance/` (инвалидация фактов), `graphiti_core/search/` (гибридный поиск, реранк), `graphiti_core/models/` (модель узлов/рёбер с временем) | Темпоральные рёбра, противоречия, провенанс → I-пачка, F7 |
| Mem0 | github.com/mem0ai/mem0 | `mem0/memory/main.py` (add/search/update), логика конфликтов и скоринга | Скоринг важности, decay, дедуп фактов → M1/M4 |
| Cognee | github.com/topoteretes/cognee | `cognee/modules/` (pipeline ingest→cognify→search), `cognee/tasks/` | Пайплайн памяти, версии датасетов → M/I |
| LlamaIndex | github.com/run-llama/llama_index | `llama-index-core/llama_index/core/node_parser/` (chunking), `.../retrievers/`, `.../response_synthesizers/` | Chunking, ретриверы, синтез ответа → R1/R2 |
| Haystack | github.com/deepset-ai/haystack | `haystack/components/retrievers/`, `.../rankers/`, `.../joiners/`, `haystack/core/pipeline/` | Инспектируемый конвейер retrieve→rank→answer → R/Q |
| LangGraph | github.com/langchain-ai/langgraph | `libs/langgraph/langgraph/graph/` (state graph), `.../checkpoint/`, interrupts/HITL | Сценарии как граф состояний, чекпоинты, пауза-подтверждение → S |
| Neo4j GDS | github.com/neo4j/graph-data-science | Документация алгоритмов: PageRank, Betweenness, Louvain, Node Similarity, Link Prediction | Формулы влияния/сообществ/путей → I4/I7/I8/I11/I12 |
| Logseq | github.com/logseq/logseq | `src/main/frontend/` — только ИДЕИ (AGPL, код не берём): блоки, block-refs, journal, queries | Outliner, свойства, запросы-представления → Q/База |
| AnythingLLM | github.com/Mintplex-Labs/anything-llm | `server/utils/` (workspaces, документ→эмбеддинги, цитаты) | UX воркспейсов и цитат (паттерны, не код) |
| Open WebUI | github.com/open-webui/open-webui | UI-паттерны локального чата/RAG | Только смотреть (кастомная лицензия) |
| Graphify | github.com/Graphify-Labs/graphify | Кластеризация, god-nodes, HTML-граф, GRAPH_REPORT | Именованные кластеры тем, «объясни узел» → I7. Уже стоит как инструмент агента |

## Что уже перенесено НАТИВНО (исходники разобраны по строкам)

Владелец прислал архивы доноров, они разобраны и перенесены в ванильный JS. Кода доноров в
репозитории нет — перенесены алгоритмы, с указанием файла-источника в комментарии у каждого.

| Донор (лицензия) | Файл-источник | Что перенесено в LifeOS |
|---|---|---|
| Graphify (MIT) | `graphify/cluster.py` | Louvain-разбиение, именование темы по хабу без LLM, cohesion, дробление раздутых сообществ, детерминированные id |
| Graphify (MIT) | `graphify/analyze.py` | god-nodes по степени, surprise-score связи (мостит темы, периферия→хаб) |
| Graphify (MIT) | `README`/`GRAPH_REPORT` | граф отдаёт текстовый отчёт, а не только картинку |
| Graphiti (Apache-2.0) | `utils/maintenance/dedup_helpers.py` | энтропия имени, 3-граммные шинглы, Жаккар — точность закона №4 |
| Graphiti (Apache-2.0) | `utils/maintenance/edge_operations.py` | факт не удаляется, а закрывается датой: история значений поля, «что было верно на дату» |
| Mem0 (Apache-2.0) | `mem0/memory/main.py` | вес памяти = свежесть + частота + связность, забывание как вес, а не удаление |
| LangGraph (MIT) | `langgraph/types.py:interrupt` + checkpointer | пошаговое исполнение агента, остановка перед необратимым шагом, возобновление владельцем |
| Neo4j GDS (GPL — только формулы) | документация алгоритмов | PageRank-влияние, betweenness как «мосты», кратчайший путь как ответ «как связаны A и B» |
| Logseq (AGPL — только идеи) | — | unlinked references → кандидаты связей по общим редким терминам |

## Жёсткая реальность стека (не обойти отношением к лицензиям)

Все доноры — **серверные**: Python (Graphiti, Mem0, Cognee, LlamaIndex, Haystack, LangGraph),
Java (Neo4j), ClojureScript (Logseq), React/Svelte (AnythingLLM, Open WebUI). LifeOS — ванильный
JS в браузере без сборки. **Их код физически не запускается у нас** независимо от лицензий.
Поэтому единственный рабочий путь: **взять алгоритм и реализовать нативно** — так уже сделаны
PageRank-влияние, дедуп целей, темпоральные рёбра, кластеры заметок.

Язык описаний значения не имеет: читаем на любом, переносим смысл, комментарии пишем по-русски.

## Чего НЕТ и не будет в этом репозитории

- Архивы доноров (7.3 ГБ) — превышают лимиты GitHub, ломают клонирование.
- Личные файлы владельца из Downloads (`Photos.zip` и т.п.) — публиковать нельзя.
- `Три варианта системы дизайна.zip` (359 МБ) — но **сам дизайн распакован и закоммичен**
  в `design-system/` (8 экранов + HANDOFF.md), он и есть канон.
