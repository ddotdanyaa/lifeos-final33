# MASTER_ALGORITHM_INDEX — каталог алгоритмов

Алгоритмы (не функции, не модели): что вычисляют, откуда идея, как ложатся на LifeOS (vanilla,
без тяжёлого ML/сервера без слова владельца), и пакет. `Метки`: ✅ прямо · 🔸 лексический/локальный
фоллбэк · ⛔ только идея (тяжело). Полный контекст функций — `docs/DONOR_FUNCTION_CATALOG.md`.

## Память
| Алгоритм | Идея откуда | Что делает | LifeOS | Пакет |
|---|---|---|---|---|
| Importance scoring | Mem0 | вес факта = свежесть+частота+связность | 🔸 наверх главное | M1 |
| Decay / forgetting | Mem0 | старое тихо теряет вес (не удаляется) | 🔸 decay-вес | M1 |
| ADD-only + supersede | Mem0/Graphiti | новый факт добавляется, старый помечается устаревшим | 🔸 supersede-цепочка через proposal | M4 |
| Conflict resolution | Mem0 | при противоречии — обновление, не перезапись | 🔸 proposal на supersede | M4 |
| Bi-temporal validity | Graphiti | у факта окно valid/ingested time | 🔸 `since`/`until` у рёбер (since уже есть) | M4/F7 |

## Поиск / ранжирование
| Алгоритм | Идея | Что | LifeOS | Пакет |
|---|---|---|---|---|
| BM25 / lexical | minisearch/Omnisearch | ключевой поиск + сниппеты | ✅ есть | R2 |
| Cosine / Jaccard / Overlap | Neo4j GDS / Smart Connections | похожесть по векторам/соседям | 🔸 метрика I5 | I5 |
| Hybrid fusion | Graphiti/LlamaIndex/Mem0 | слияние lexical+vector+graph в один ранг | 🔸 fusion-скор | R2 |
| Reranking by graph distance | Graphiti | ближе в графе = релевантнее | 🔸 переранжирование выдачи | R2 |
| KNN | Neo4j GDS | k ближайших по признакам | 🔸 семантические соседи | I5 |

## Граф знаний (Neo4j GDS — эталон 65+)
| Алгоритм | Что | LifeOS | Пакет |
|---|---|---|---|
| Degree centrality | число связей = хаб | ✅ есть | I4 |
| PageRank / Personalized PR | влияние по входящим / от фокуса | 🔸 «влиятельные» / «важное рядом» | I8 |
| Betweenness / Closeness | мосты между темами / центр графа | 🔸 итеративно на нашем графе | I9 |
| Louvain / Label propagation | сообщества (кластеры тем) | 🔸 лексический прокси | I7 |
| Weakly connected components | «острова знаний» | 🔸 обход | I10 |
| Node similarity (Jaccard/overlap) | похожие по общим соседям | 🔸 | I5 |
| Shortest path (Dijkstra/A*) | «как связаны A и B» | 🔸 путь в графе | I11 |
| Link prediction (Adamic-Adar, Common Neighbors) | вероятность будущего ребра | 🔸 ранжировать кандидатов связей | I12 |
| Node2Vec / FastRP | эмбеддинг узла графа | ⛔ тяжело, идея | — |

## Дедупликация
| Алгоритм | Идея | LifeOS | Пакет |
|---|---|---|---|
| Entity/edge merge | Graphiti/Mem0 | слить дубли сущностей/фактов | 🔸 merge-review (есть частично) | E1 |
| Fuzzy match | AFFiNE fuzzy (внедрён) | нечёткое совпадение имён | ✅ vendored | — |

## Retrieval / RAG
| Алгоритм | Идея | Что | LifeOS | Пакет |
|---|---|---|---|---|
| Chunking (sentence/semantic/hierarchical) | LlamaIndex | разбиение под цитаты | 🔸 chunk для R1 | R1 |
| Retrieve→rerank→synthesize | Haystack/LlamaIndex | конвейер сборки ответа | 🔸 pipeline | R1/R2 |
| Response synthesis (refine/compact/tree) | LlamaIndex | стратегии сборки из чанков | 🔸 | R1 |
| Grounding + honest refusal | NotebookLM | ответ только из источников, иначе отказ | ✅ принцип §7 | R1 |
| Router query | LlamaIndex | выбрать индекс/срез под тип запроса | 🔸 роутинг | R2 |

## Планирование / агенты
| Алгоритм | Идея | Что | LifeOS | Пакет |
|---|---|---|---|---|
| State-graph execution | LangGraph | шаги над типизированным состоянием | 🔸 сценарий | S1 |
| Conditional routing | LangGraph | ветвление по состоянию | 🔸 | S1 |
| Checkpointer | LangGraph | сохранить состояние после шага | ✅ commit IndexedDB | S1 |
| HITL interrupt / resume | LangGraph | пауза → человек → продолжение | ✅ preview→approve | S1 |
| Time-travel (state history) | LangGraph | откат/ветка «что если» | 🔸 история прогонов | S3 |

## Context / prompt assembly
| Алгоритм | Идея | Что | LifeOS | Пакет |
|---|---|---|---|---|
| Top-k + metadata filters | Mem0/LlamaIndex | ограниченная релевантная выдача в контекст | ✅ паттерн | R1 |
| Context compression / summary-over-time | Zep/Mem0 | сжать длинную историю в сводку | 🔸 сводка чата/дня (buildDaySummaryText есть) | M2 |
| Prompt assembly с цитатами | NotebookLM/LlamaIndex | контекст + цитаты-источники в промпт | ✅ buildOllamaChatPrompt (есть) | R1 |

## Синхронизация / маршрутизация
| Алгоритм | Идея | Что | LifeOS | Пакет |
|---|---|---|---|---|
| Incremental re-index | Smart Connections | переиндексировать только правки | ✅ rebuildIndexes | — |
| Proposal routing by type | (наш) | тип предложения → назначение/группа | ✅ destinationForProposalType | — |
| Community detection (routing тем) | Neo4j/Graphiti | сгруппировать связанное для маршрутизации | 🔸 I7 | I7 |
