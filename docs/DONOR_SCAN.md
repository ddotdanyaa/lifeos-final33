# Перепись доноров на диске

Сгенерировано `tools/donor-scan.mjs` по папкам в `research/repos`. Лицензия прочитана
файлом, стек определён по манифесту, рампа выведена из них двоих. Это отчёт о файлах,
а не о том, что кто-то помнит про эти проекты.

| Донор | Лицензия | Стек | Рампа | Файлов | Языки |
|---|---|---|---|---|---|
| Dexie.js | Apache-2.0 | JS/TS | **ЛИФТ** | 807 | ts 452 · js 148 · tsx 30 |
| Fuse | Apache-2.0 | JS/TS | **ЛИФТ** | 149 | ts 40 · js 20 · mjs 9 |
| absurd-sql | MIT | JS/TS | **ЛИФТ** | 39 | js 26 |
| actual | MIT | JS-приложение | **ПАТТЕРН** | 3891 | tsx 953 · ts 860 · js 84 |
| anything-llm-master | MIT | JS/TS | **ЛИФТ** | 5566 | js 681 · ts 21 · mjs 10 |
| chrono | MIT | JS/TS | **ЛИФТ** | 397 | ts 381 · js 2 · mjs 1 |
| cognee-main | Apache-2.0 | Python | **ПОРТ** | 2673 | py 1893 · tsx 165 · ts 134 |
| compromise | MIT | JS/TS | **ЛИФТ** | 1113 | js 996 · ts 18 · mjs 10 |
| dinero.js | MIT | JS/TS | **ЛИФТ** | 444 | ts 248 · tsx 30 · js 6 |
| flexsearch | Apache-2.0 | JS/TS | **ЛИФТ** | 280 | js 126 · ts 2 · mjs 1 |
| floating-ui | MIT | JS/TS | **ЛИФТ** | 1642 | ts 178 · tsx 108 · js 53 |
| franc | MIT | JS/TS | **ЛИФТ** | 41 | js 14 |
| fullcalendar | MIT | JS-приложение | **ПАТТЕРН** | 1098 | ts 717 · tsx 68 · css 28 |
| grammY | MIT | JS/TS | **ЛИФТ** | 55 | ts 44 |
| graphify-8 | MIT | Python | **ПОРТ** | 639 | py 258 |
| graphiti-main | Apache-2.0 | Python | **ПОРТ** | 331 | py 255 |
| graphology | MIT | JS/TS | **ЛИФТ** | 717 | js 318 · ts 151 |
| haystack-main | Apache-2.0 | Python | **ПОРТ** | 9906 | py 517 · js 14 · tsx 6 |
| hermes-agent | MIT | Python | **ПОРТ** | 8012 | py 3656 · ts 1294 · tsx 595 |
| jsQR | Apache-2.0 | JS/TS | **ЛИФТ** | 561 | ts 21 · js 2 |
| langgraph-main | MIT | Python | **ПОРТ** | 634 | py 445 · ts 7 · js 1 |
| letta | Apache-2.0 | Python | **ПОРТ** | 1115 | py 875 · ts 3 · go 1 |
| lit | BSD-3-Clause | JS/TS | **ЛИФТ** | 1879 | ts 842 · js 203 · tsx 28 |
| llama_index-main | MIT | Python | **ПОРТ** | 9994 | py 3832 · js 7 · css 5 |
| localForage | Apache-2.0 | JS/TS | **ЛИФТ** | 94 | js 42 · ts 2 · css 2 |
| logseq-master | AGPL-3.0 | ClojureScript | **ЗАПУСК** | 1998 | cljs 856 · css 60 · js 50 |
| mem0-main | Apache-2.0 | JS-приложение | **ПАТТЕРН** | 1748 | ts 417 · py 384 · tsx 227 |
| mermaid | MIT | JS/TS | **ЛИФТ** | 1646 | ts 752 · js 167 · mjs 5 |
| motion | MIT | JS/TS | **ЛИФТ** | 1701 | ts 715 · tsx 420 · js 24 |
| natural | MIT | JS/TS | **ЛИФТ** | 371 | js 206 · ts 85 · mjs 2 |
| neo4j-2026.06 | GPL-3.0 | JVM | **ЗАПУСК** | 13160 | java 8827 |
| ninja-keys | MIT | JS/TS | **ЛИФТ** | 33 | ts 6 · js 3 · css 3 |
| open-webui-main | BSD-3-Clause | Python | **ПОРТ** | 4946 | py 237 · ts 75 · js 11 |
| sherpa-onnx | Apache-2.0 | C/C++ | **WASM** | 5219 | cc 553 · py 400 · js 188 |
| shoelace | MIT | JS/TS | **ЛИФТ** | 507 | ts 336 · js 15 · css 6 |
| silverbullet | MIT | JS/TS | **ЛИФТ** | 990 | ts 461 · rs 91 · tsx 47 |
| skills-main | MIT | не определён | **ПОРТ** | 146 | — |
| tabulator | MIT | JS/TS | **ЛИФТ** | 305 | js 252 · ts 2 |
| usearch | Apache-2.0 | Python | **ПОРТ** | 166 | py 23 · cpp 10 · java 3 |
| web-llm | Apache-2.0 | JS/TS | **ЛИФТ** | 270 | ts 77 · js 11 · css 6 |
| wink-nlp | MIT | JS/TS | **ЛИФТ** | 132 | js 102 · ts 2 |

## Что откуда брать

### Dexie.js — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **дедуп и похожесть**: `tools/fix-dts-duplicates.js` · `src/live-query/obs-sets-overlap.ts` · `src/live-query/cache/does-ranges-overlap.ts`
- **деньги**: `test/tests-chrome-transaction-durability.js` · `test/tests-transaction.js` · `src/public/types/transaction-events.d.ts` · `src/public/types/transaction-mode.d.ts` · `src/public/types/transaction.d.ts` · `src/functions/temp-transaction.ts`
- **экран**: `test/tests-table.js` · `src/public/types/entity-table.d.ts` · `src/public/types/table-hooks.d.ts` · `src/public/types/table-schema.d.ts` · `src/public/types/table.d.ts` · `src/helpers/table-schema.ts`
- **поиск и разбор текста**: `test/integrations/test-dexie-relationships/index.js` · `src/index-umd.ts` · `src/index.ts` · `src/public/index.d.ts` · `src/public/types/entity-table.d.ts` · `src/public/types/entity.d.ts`
- **инсайты и паттерны**: `src/live-query/cache/signalSubscribers.ts` · `addons/dexie-cloud/src/yjs/reopenDocSignal.ts`
- **память и факты**: `src/dbcore/get-key-extractor.ts` · `addons/dexie-cloud/src/sync/extractRealm.ts`

### Fuse — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **память и факты**: `test/cache-invalidation.test.js`
- **дедуп и похожесть**: `test/fuzzy-search.test.js`
- **поиск и разбор текста**: `test/indexing.test.js` · `test/token-search-tokenizer.test.js` · `src/workers/index.ts` · `src/tools/FuseIndex.ts` · `src/search/index.ts` · `src/search/token/index.ts`
- **инсайты и паттерны**: `src/search/bitap/createPatternAlphabet.ts`

### absurd-sql — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `src/index.js`

### actual — ПАТТЕРН

_это приложение на фреймворке — берём приёмы и CSS, не файлы_

- **поиск и разбор текста**: `packages/vite-plugin-peggy/index.js` · `packages/sync-server/src/util/title/index.js` · `packages/loot-core/default-filesystem.d.ts` · `packages/loot-core/default-filesystem.mjs` · `packages/loot-core/src/types/models/index.ts` · `packages/loot-core/src/server/transactions/index.ts`
- **деньги**: `packages/sync-server/src/util/payee-name.ts` · `packages/sync-server/src/app-gocardless/banks/util/extract-payeeName-from-remittanceInfo.ts` · `packages/sync-server/src/app-enablebanking/tests/transactions.spec.ts` · `packages/loot-core/src/types/budget.ts` · `packages/loot-core/src/types/models/category-group.ts` · `packages/loot-core/src/types/models/category.ts`
- **память и факты**: `packages/sync-server/src/app-gocardless/bank-factory.ts` · `packages/sync-server/src/app-gocardless/tests/bank-factory.spec.ts` · `packages/sync-server/src/app-gocardless/banks/util/extract-payeeName-from-remittanceInfo.ts` · `packages/desktop-client/src/components/reports/spreadsheets/summary-spreadsheet.ts` · `packages/desktop-client/e2e/page-models/mobile-envelope-budget-summary-modal.ts` · `packages/desktop-client/e2e/page-models/mobile-tracking-budget-summary-modal.ts`
- **экран**: `packages/sync-server/migrations/1694362247011-create-secret-table.js` · `packages/loot-core/migrations/1722804019000_create_dashboard_table.js` · `packages/desktop-client/e2e/command-bar.test.ts`
- **время и дата**: `packages/loot-core/src/types/models/schedule.ts` · `packages/loot-core/src/shared/schedules.test.ts` · `packages/loot-core/src/shared/schedules.ts` · `packages/loot-core/src/server/util/rschedule.ts` · `packages/loot-core/src/server/schedules/find-schedules.ts` · `packages/loot-core/src/server/forecast/forecast-schedules.ts`
- **граф и связи**: `packages/loot-core/src/server/spreadsheet/graph-data-structure.ts` · `packages/eslint-plugin-actual/lib/rules/typography.js` · `packages/eslint-plugin-actual/lib/rules/__tests__/typography.test.js`
- **инсайты и паттерны**: `packages/desktop-client/src/components/reports/graphs/util/computeTrendLines.test.ts` · `packages/desktop-client/src/components/reports/graphs/util/computeTrendLines.ts`

### anything-llm-master — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `server/index.js` · `server/__tests__/utils/vectorDbProviders/pgvector/index.test.js` · `server/__tests__/utils/TextSplitter/index.test.js` · `server/__tests__/utils/SQLConnectors/connectionParser.test.js` · `server/__tests__/utils/MCP/index.test.js` · `server/__tests__/models/systemPromptVariables.test.js`
- **голос и звук**: `server/__tests__/utils/TextToSpeech/audioFormat.test.js` · `server/utils/TextToSpeech/audioFormat.js` · `frontend/src/utils/chat/messageToSpeech.js` · `collector/utils/WhisperProviders/GenericOpenAiWhisper.js` · `collector/utils/WhisperProviders/localWhisper.js` · `collector/utils/WhisperProviders/OpenAiWhisper.js`
- **граф и связи**: `server/utils/middleware/communityHubDownloadsEnabled.js` · `server/models/communityHub.js` · `server/endpoints/communityHub.js` · `frontend/src/models/communityHub.js` · `frontend/src/hooks/useCommunityHubAuth.js`
- **дедуп и похожесть**: `server/utils/agents/aibitat/utils/dedupe.js`
- **память и факты**: `server/utils/agents/aibitat/utils/summarize.js` · `server/utils/agents/aibitat/plugins/memory.js` · `server/utils/agents/aibitat/plugins/summarize.js` · `server/models/memory.js` · `server/jobs/extract-memories.js` · `server/jobs/helpers/memory-extraction-utils.js`
- **экран**: `server/utils/agents/aibitat/plugins/sql-agent/get-table-schema.js` · `server/utils/agents/aibitat/plugins/sql-agent/list-table.js` · `server/models/slashCommandsPresets.js` · `open-computer/master/setup/a11y-tree.py`
- **время и дата**: `server/models/modelRouterRule.js` · `server/models/scheduledJob.js` · `server/models/scheduledJobRun.js` · `server/jobs/run-scheduled-job.js` · `server/jobs/helpers/scheduled-job-helper.js` · `server/endpoints/scheduledJobs.js`

### chrono — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `test/system.test.ts` · `test/system_timezone.test.ts` · `src/index.ts` · `src/locales/zh/index.ts` · `src/locales/zh/hant/index.ts` · `src/locales/zh/hant/parsers/ZHHantAgoFormatParser.ts`
- **время и дата**: `src/chrono.ts` · `src/locales/zh/hant/refiners/ZHHantMergeDateTimeRefiner.ts` · `src/locales/zh/hant/parsers/ZHHantCasualDateParser.ts` · `src/locales/zh/hant/parsers/ZHHantDateParser.ts` · `src/locales/zh/hans/refiners/ZHHansMergeDateTimeRefiner.ts` · `src/locales/zh/hans/parsers/ZHHansCasualDateParser.ts`
- **инсайты и паттерны**: `src/utils/pattern.ts`
- **память и факты**: `src/locales/it/refiners/ITExtractYearSuffixRefiner.ts` · `src/locales/en/refiners/ENExtractYearSuffixRefiner.ts` · `src/common/refiners/ExtractTimezoneAbbrRefiner.ts` · `src/common/refiners/ExtractTimezoneOffsetRefiner.ts`
- **дедуп и похожесть**: `src/common/refiners/OverlapRemovalRefiner.ts`

### cognee-main — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **граф и связи**: `examples/python/code_graph_example.py` · `examples/python/subgraph_visualization_demo.py` · `examples/pocs/disambiguation/extract_graph_from_data_with_entity_disambiguation.py` · `examples/guides/custom_graph_model.py` · `examples/guides/graph_visualization.py` · `examples/demos/custom_graph_model_entity_schema_definition.py`
- **память и факты**: `examples/python/semantic_memory_map.py` · `examples/pocs/post_extraction_canonicalization/post_extraction_canonicalization.py` · `examples/pocs/post_extraction_canonicalization/post_extraction_canonicalization_example.py` · `examples/pocs/disambiguation/extract_graph_from_data_with_entity_disambiguation.py` · `examples/guides/agent_memory_quickstart.py` · `examples/guides/consolidate_entity_descriptions_example.py`
- **поиск и разбор текста**: `examples/python/truth_subspace_reranking_demo.py` · `examples/pocs/disambiguation/extract_graph_from_data_with_entity_disambiguation.py` · `examples/guides/consolidate_entity_descriptions_example.py` · `examples/demos/custom_graph_model_entity_schema_definition.py` · `examples/demos/global_context_index_smoke_demo.py` · `cognee-frontend/src/utils/index.ts`
- **время и дата**: `examples/guides/temporal_recall.py` · `examples/demos/temporal_awareness_example/temporal_awareness_example.py` · `cognee/tests/test_temporal_graph.py` · `cognee/tests/unit/modules/retrieval/temporal_retriever_test.py` · `cognee/tests/unit/infrastructure/databases/graph/test_ladybug_temporal.py` · `cognee/tests/integration/retrieval/test_temporal_retriever.py`
- **голос и звук**: `examples/demos/multimedia_processing/multimedia_audio_image_processing_example.py` · `cognee/tests/integration/documents/AudioDocument_test.py` · `cognee/modules/data/processing/document_types/AudioDocument.py` · `cognee/infrastructure/loaders/core/audio_loader.py`
- **инсайты и паттерны**: `distributed/signal.py` · `cognee/modules/search/utils/transform_insights_to_graph.py`
- **дедуп и похожесть**: `cognee/tests/test_deduplication.py` · `cognee/tests/utils/filter_overlapping_entities.py` · `cognee/tests/utils/filter_overlapping_relationships.py` · `cognee/tests/unit/modules/chunking/test_text_chunker_with_overlap.py` · `cognee/tests/unit/infrastructure/databases/vector/test_vector_distance_semantics.py` · `cognee/modules/graph/utils/deduplicate_nodes_and_edges.py`
- **деньги**: `cognee/tests/unit/modules/data/test_create_dataset_concurrency.py` · `cognee/modules/graph/legacy/GraphRelationshipLedger.py` · `cognee/modules/graph/legacy/has_edges_in_legacy_ledger.py` · `cognee/modules/graph/legacy/has_nodes_in_legacy_ledger.py` · `cognee/modules/graph/legacy/mark_ledger_as_deleted.py` · `cognee/modules/graph/legacy/record_data_in_legacy_ledger.py`
- **экран**: `cognee/tests/cli_tests/cli_unit_tests/test_cli_commands.py` · `cognee/tests/cli_tests/cli_unit_tests/test_push_command.py` · `cognee/modules/engine/models/TableRow.py` · `cognee/modules/engine/models/TableType.py` · `cognee/infrastructure/databases/vector/pgvector/create_db_and_tables.py` · `cognee/infrastructure/databases/relational/create_db_and_tables.py`

### compromise — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `tests/two/misc/tagRank.test.js` · `tests/three/chunker/chunks.ignore.js` · `tests/one/change/reindex.test.js` · `src/API/methods/index.js` · `src/4-four/sense/model/index.js` · `src/4-four/sense/model/senses/index.js`
- **деньги**: `tests/three/numbers/money.test.js` · `tests/three/numbers/backlog/money.ignore.js` · `src/2-two/postTagger/model/numbers/money.js`
- **дедуп и похожесть**: `tests/three/numbers/backlog/overlap.ignore.js` · `tests/one/match/fuzzy.test.js` · `src/1-one/match/methods/match/term/_fuzzy.js`
- **инсайты и паттерны**: `scripts/patterns/patterns.js`
- **голос и звук**: `plugins/speech/builds/compromise-speech.min.js` · `plugins/speech/builds/compromise-speech.mjs`
- **граф и связи**: `plugins/paragraphs/builds/compromise-paragraphs.min.js` · `plugins/paragraphs/builds/compromise-paragraphs.mjs`
- **экран**: `data/lexicon/nouns/uncountables.js`

### dinero.js — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **деньги**: `test/utils/castToBigintCurrency.ts` · `test/utils/castToBigjsCurrency.ts` · `packages/dinero.js/src/__tests__/currency-safety.typetest.ts` · `packages/dinero.js/src/currencies/types/DineroCurrency.ts` · `packages/dinero.js/src/core/utils/getAmountAndScale.ts` · `packages/dinero.js/src/core/utils/isScaledAmount.ts`
- **поиск и разбор текста**: `test/utils/index.ts` · `packages/dinero.js/src/index.ts` · `packages/dinero.js/src/currencies/index.ts` · `packages/dinero.js/src/currencies/types/index.ts` · `packages/dinero.js/src/core/index.ts` · `packages/dinero.js/src/core/utils/index.ts`
- **память и факты**: `packages/dinero.js/src/core/types/DineroFactory.ts`

### flexsearch — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `index.d.ts` · `test/tokenize.js` · `src/index.js` · `src/db/sqlite/index.js` · `src/db/redis/index.js` · `src/db/postgres/index.js`

### floating-ui — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `website/pages/index.js` · `packages/vue/test/index.test.ts` · `packages/vue/src/index.ts` · `packages/utils/src/index.ts` · `packages/react-native/src/index.ts` · `packages/react-dom/src/index.ts`
- **экран**: `website/lib/components/Dialog.js` · `website/lib/components/Popover.js` · `website/lib/components/Tooltip.js` · `website/lib/components/Home/Popover.js` · `packages/dom/test/functional/table.test.ts`

### franc — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `test/index.js` · `packages/franc-cli/index.js` · `packages/franc/index.js`

### fullcalendar — ПАТТЕРН

_это приложение на фреймворке — берём приёмы и CSS, не файлы_

- **поиск и разбор текста**: `packages/web-component/src/index.ts` · `packages/web-component/src/themes/pulse/index.ts` · `packages/web-component/src/themes/monarch/index.ts` · `packages/web-component/src/themes/forma/index.ts` · `packages/web-component/src/themes/classic/index.ts` · `packages/web-component/src/themes/breezy/index.ts`
- **инсайты и паттерны**: `packages/vanilla-tests/src/lib/DayGridEventRenderUtils.ts` · `packages/vanilla-tests/src/legacy/eventRender.ts`
- **время и дата**: `packages/vanilla-tests/src/lib/temporal-convert.ts` · `packages/vanilla-tests/src/icalendar/data/recurrenceId.ts` · `packages/vanilla-tests/src/icalendar/data/recurringWeekly.ts` · `packages/vanilla-tests/src/icalendar/data/recurringWeeklyWithCount.ts` · `packages/vanilla-tests/src/icalendar/data/recurringWeeklyWithoutEnd.ts` · `packages/vanilla-tests/src/event-data/recurring.ts`
- **экран**: `packages/vanilla-tests/src/legacy/dayPopoverFormat.ts` · `packages/vanilla-tests/src/legacy/more-link-popover-destroy.ts` · `packages/vanilla-tests/src/legacy/more-link-popover.ts` · `packages/preact/src/daygrid/DayTableSlicer.ts` · `packages/preact/src/daygrid/TableDateProfileGenerator.ts` · `packages/preact/src/daygrid/TableSeg.ts`
- **дедуп и похожесть**: `packages/vanilla-tests/src/legacy/overlap.ts`

### graphify-8 — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **граф и связи**: `worked/mixed-corpus/raw/cluster.py` · `tests/test_cluster.py` · `tests/test_community_hub_labels.py` · `tests/test_corrupt_graph_json.py` · `tests/test_global_graph.py` · `tests/test_hypergraph.py`
- **поиск и разбор текста**: `worked/example/raw/parser.py` · `tests/test_chunking.py` · `tests/test_llm_parser.py` · `tests/test_merge_chunks_validation.py`
- **память и факты**: `tests/bench_extract.py` · `tests/test_astro_extraction.py` · `tests/test_extract.py` · `tests/test_extraction_spec_ids.py` · `tests/test_extractors_registry.py` · `tests/test_extract_cache_location.py`
- **дедуп и похожесть**: `tests/test_dedup.py` · `tests/test_minhash.py` · `tests/test_semantic_similarity.py` · `graphify/dedup.py` · `graphify/_minhash.py`
- **голос и звук**: `tests/test_transcribe.py` · `graphify/transcribe.py`
- **экран**: `graphify/tree_html.py`

### graphiti-main — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **поиск и разбор текста**: `tests/test_entity_exclusion_int.py` · `tests/utils/test_content_chunking.py` · `tests/utils/maintenance/test_entity_extraction.py` · `tests/cross_encoder/test_bge_reranker_client_int.py` · `tests/cross_encoder/test_gemini_reranker_client.py` · `mcp_server/src/models/entity_types.py`
- **граф и связи**: `tests/test_graphiti_int.py` · `tests/test_graphiti_mock.py` · `tests/evals/eval_e2e_graph_building.py` · `server/graph_service/zep_graphiti.py` · `mcp_server/src/graphiti_mcp_server.py` · `graphiti_core/graphiti.py`
- **память и факты**: `tests/utils/maintenance/test_entity_extraction.py` · `mcp_server/tests/test_factories.py` · `mcp_server/src/services/factories.py` · `graphiti_core/utils/maintenance/combined_extraction.py` · `graphiti_core/prompts/extract_edges.py` · `graphiti_core/prompts/extract_nodes.py`
- **время и дата**: `graphiti_core/utils/datetime_utils.py`
- **дедуп и похожесть**: `graphiti_core/utils/maintenance/dedup_helpers.py` · `graphiti_core/prompts/dedupe_edges.py` · `graphiti_core/prompts/dedupe_nodes.py`
- **голос и звук**: `examples/podcast/transcript_parser.py`

### graphology — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `src/utils/index.d.ts` · `src/utils/index.js` · `src/types/index.d.ts` · `src/traversal/index.d.ts` · `src/traversal/index.js` · `src/svg/index.js`
- **граф и связи**: `src/utils/is-graph-constructor.d.ts` · `src/utils/is-graph-constructor.js` · `src/utils/is-graph.d.ts` · `src/utils/is-graph.js` · `src/utils/rename-graph-keys.d.ts` · `src/utils/rename-graph-keys.js`
- **дедуп и похожесть**: `src/library/layout-noverlap.d.ts` · `src/library/layout-noverlap.js`

### haystack-main — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **память и факты**: `test/testing/test_factory.py` · `test/document_stores/test_in_memory.py` · `test/components/retrievers/test_in_memory_bm25_retriever.py` · `test/components/retrievers/test_in_memory_embedding_retriever.py` · `test/components/extractors/test_llm_metadata_extractor.py` · `test/components/extractors/test_regex_text_extractor.py`
- **поиск и разбор текста**: `test/dataclasses/test_streaming_chunk.py` · `test/components/retrievers/test_in_memory_bm25_retriever.py` · `test/components/rankers/test_llm_ranker.py` · `test/components/rankers/test_meta_field_grouping_ranker.py` · `test/components/preprocessors/test_csv_document_splitter.py` · `test/components/preprocessors/test_document_splitter.py`
- **время и дата**: `test/components/preprocessors/test_recursive_splitter.py` · `haystack/components/preprocessors/recursive_splitter.py`
- **экран**: `scripts/generate_platform_components_table.py`

### hermes-agent — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **память и факты**: `website/scripts/extract-automation-blueprints.py` · `website/scripts/extract-skills.py` · `ui-tui/src/__tests__/memoryMonitor.test.ts` · `ui-tui/src/lib/memory.test.ts` · `ui-tui/src/lib/memory.ts` · `ui-tui/src/lib/memoryMonitor.ts`
- **поиск и разбор текста**: `web/src/themes/index.ts` · `web/src/plugins/index.ts` · `web/src/i18n/index.ts` · `web/src/contexts/system-actions-context.ts` · `web/src/contexts/useSystemActions.ts` · `ui-tui/src/sdk/index.ts`
- **дедуп и похожесть**: `web/src/lib/fuzzy.ts` · `ui-tui/src/lib/fuzzy.test.ts` · `ui-tui/src/lib/fuzzy.ts` · `tools/fuzzy_match.py` · `tests/tools/test_fuzzy_match.py` · `tests/run_agent/test_860_dedup.py`
- **время и дата**: `web/src/lib/schedule.test.ts` · `web/src/lib/schedule.ts` · `tests/plugins/test_chronos_cron.py` · `tests/plugins/test_chronos_verify.py` · `tests/hermes_cli/test_plugin_scanner_recursion.py` · `tests/gateway/test_pending_drain_no_recursion.py`
- **экран**: `ui-tui/src/__tests__/asCommandDispatch.test.ts` · `ui-tui/src/__tests__/journeyCommand.test.ts` · `ui-tui/src/__tests__/subagentTree.test.ts` · `ui-tui/src/__tests__/subscriptionCommand.test.ts` · `ui-tui/src/__tests__/topupCommand.test.ts` · `ui-tui/src/__tests__/usageCommand.test.ts`
- **деньги**: `ui-tui/packages/hermes-ink/src/ink/reconciler.ts` · `tools/budget_config.py` · `tests/test_honcho_client_concurrency.py` · `tests/tools/test_budget_config.py` · `tests/tools/test_delegate_summary_budget.py` · `tests/tools/test_mcp_rapid_drop_budget.py`
- **голос и звук**: `tools/audio_container.py` · `tools/transcription_tools.py` · `tests/test_audio_playback_guard.py` · `tests/tools/test_audio_container.py` · `tests/tools/test_transcription.py` · `tests/tools/test_transcription_command_providers.py`
- **граф и связи**: `tools/microsoft_graph_auth.py` · `tools/microsoft_graph_client.py` · `tests/tools/test_execute_code_approval_cluster.py` · `tests/tools/test_microsoft_graph_auth.py` · `tests/tools/test_microsoft_graph_client.py` · `tests/tools/test_skill_view_traversal.py`
- **инсайты и паттерны**: `tools/threat_patterns.py` · `tests/tools/test_mcp_reconnect_signal.py` · `tests/tools/test_signal_media.py` · `tests/tools/test_threat_patterns.py` · `tests/tools/test_watch_patterns.py` · `tests/hermes_cli/test_signal_handler_kanban_worker.py`

### jsQR — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `tests/types/upng-js/index.d.ts` · `src/index.ts` · `src/locator/index.ts` · `src/extractor/index.ts` · `src/decoder/reedsolomon/index.ts` · `src/decoder/decodeData/index.ts`
- **экран**: `src/decoder/decodeData/shiftJISTable.ts`

### langgraph-main — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **память и факты**: `libs/sdk-py/tests/integration/test_factory_graph.py` · `libs/sdk-py/integration/graph/factory_graph.py` · `libs/prebuilt/tests/memory_assert.py` · `libs/langgraph/tests/memory_assert.py` · `libs/checkpoint-conformance/tests/test_validate_memory.py` · `libs/checkpoint/tests/test_memory.py`
- **граф и связи**: `libs/sdk-py/tests/integration/test_factory_graph.py` · `libs/sdk-py/tests/integration/test_remote_graph_v3.py` · `libs/sdk-py/tests/integration/test_subgraphs.py` · `libs/sdk-py/integration/scripts/test_subgraphs.py` · `libs/sdk-py/integration/graph/factory_graph.py` · `libs/sdk-py/integration/graph/streaming_graph.py`
- **экран**: `libs/langgraph/tests/test_parent_command.py` · `libs/langgraph/tests/test_parent_command_async.py`
- **поиск и разбор текста**: `libs/cli/js-monorepo-example/libs/shared/src/index.ts`

### letta — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **граф и связи**: `tests/integration_test_agent_tool_graph.py`
- **память и факты**: `tests/integration_test_summarizer.py` · `tests/test_memory.py` · `tests/test_provider_trace_summarization.py` · `tests/test_static_buffer_summarize.py` · `tests/performance_tests/test_insert_archival_memory.py` · `letta/services/summarizer/self_summarizer.py`
- **поиск и разбор текста**: `tests/integration_test_system_prompt_prefix_caching.py` · `tests/test_optimistic_json_parser.py` · `tests/test_streaming_chunk_usage.py` · `tests/managers/test_identity_manager.py` · `letta/system.py` · `letta/services/identity_manager.py`
- **время и дата**: `tests/test_temporal_metrics_local.py` · `letta/jobs/scheduler.py` · `letta/helpers/datetime_helpers.py`
- **экран**: `alembic/versions/068588268b02_add_vector_db_provider_to_archives_table.py` · `alembic/versions/0b496eae90de_add_file_agent_table.py` · `alembic/versions/0ceb975e0063_add_llm_batch_jobs_tables.py` · `alembic/versions/18ff61fbc034_add_agent_id_index_to_mapping_tables.py` · `alembic/versions/1c8880d671ee_make_an_blocks_agents_mapping_table.py` · `alembic/versions/27de0f58e076_add_conversations_tables_and_run_.py`
- **деньги**: `alembic/versions/6c53224a7a58_add_provider_category_to_steps.py` · `alembic/versions/878607e41ca4_add_provider_category.py`

### lit — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **память и факты**: `scripts/extract-published-lit-version.js` · `packages/localize-tools/src/tests/e2e/extract-xlb-fresh.test.ts` · `packages/localize-tools/src/tests/e2e/extract-xliff-fresh-js.test.ts` · `packages/localize-tools/src/tests/e2e/extract-xliff-fresh-ph.test.ts` · `packages/localize-tools/src/tests/e2e/extract-xliff-fresh.test.ts` · `packages/localize-tools/src/tests/e2e/extract-xliff-merge.test.ts`
- **поиск и разбор текста**: `playground/scripts/template/index.ts` · `packages/ts-transformers/src/index.ts` · `packages/tests/src/utils/filesystem-test-rig.ts` · `packages/task/src/index.ts` · `packages/react/src/index.ts` · `packages/localize-tools/src/index.ts`
- **инсайты и паттерны**: `packages/labs/signals/src/test/signal-watcher_test.ts` · `packages/labs/signals/src/lib/signal-watcher.ts` · `packages/labs/preact-signals/src/test/signal-watcher_test.ts` · `packages/labs/preact-signals/src/lib/signal-watcher.ts`
- **экран**: `packages/labs/cli-localize/src/commands.ts` · `packages/labs/cli/src/lib/command.ts` · `packages/internal-scripts/src/treemirror.ts` · `packages/internal-scripts/bin/treemirror.js`

### llama_index-main — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **экран**: `llama-index-utils/llama-index-utils-azure/llama_index/utils/azure/table.py` · `llama-index-integrations/vector_stores/llama-index-vector-stores-tablestore/tests/test_vector_stores_tablestore.py` · `llama-index-integrations/vector_stores/llama-index-vector-stores-mongodb/tests/test_index_commands.py` · `llama-index-integrations/storage/kvstore/llama-index-storage-kvstore-tablestore/tests/test_storage_kvstore_tablestore.py` · `llama-index-integrations/storage/index_store/llama-index-storage-index-store-tablestore/tests/test_storage_index_store_tablestore.py` · `llama-index-integrations/storage/docstore/llama-index-storage-docstore-tablestore/tests/test_storage_docstore_tablestore.py`
- **голос и звук**: `llama-index-integrations/voice_agents/llama-index-voice-agents-openai/llama_index/voice_agents/openai/audio_interface.py` · `llama-index-integrations/voice_agents/llama-index-voice-agents-gemini-live/tests/test_audio_interface.py` · `llama-index-integrations/voice_agents/llama-index-voice-agents-gemini-live/llama_index/voice_agents/gemini_live/audio_interface.py` · `llama-index-integrations/tools/llama-index-tools-azure-speech/tests/test_tools_azure_speech.py` · `llama-index-integrations/readers/llama-index-readers-youtube-transcript/tests/test_readers_youtube_transcript.py` · `llama-index-integrations/readers/llama-index-readers-whisper/tests/test_readers_whisper.py`
- **поиск и разбор текста**: `llama-index-integrations/vector_stores/llama-index-vector-stores-mongodb/tests/test_index_commands.py` · `llama-index-integrations/vector_stores/llama-index-vector-stores-mongodb/llama_index/vector_stores/mongodb/index.py` · `llama-index-integrations/tools/llama-index-tools-parallel-web-systems/tests/test_tools_parallel_web_systems.py` · `llama-index-integrations/storage/index_store/llama-index-storage-index-store-tablestore/tests/test_storage_index_store_tablestore.py` · `llama-index-integrations/storage/index_store/llama-index-storage-index-store-redis/tests/test_storage_index_store_redis.py` · `llama-index-integrations/storage/index_store/llama-index-storage-index-store-postgres/tests/test_storage_index_store_postgres.py`
- **память и факты**: `llama-index-integrations/vector_stores/llama-index-vector-stores-docarray/llama_index/vector_stores/docarray/in_memory.py` · `llama-index-integrations/tools/llama-index-tools-box/tests/test_tools_box_ai_extract.py` · `llama-index-integrations/tools/llama-index-tools-box/tests/test_tools_box_text_extract.py` · `llama-index-integrations/tools/llama-index-tools-artifact-editor/tests/test_artifact_editor.py` · `llama-index-integrations/tools/llama-index-tools-artifact-editor/llama_index/tools/artifact_editor/memory_block.py` · `llama-index-integrations/readers/llama-index-readers-file/llama_index/readers/file/slides/content_extractor.py`
- **граф и связи**: `llama-index-integrations/tools/llama-index-tools-graphql/tests/test_tools_graphql.py` · `llama-index-integrations/readers/llama-index-readers-graphql/tests/test_readers_graphql.py` · `llama-index-integrations/readers/llama-index-readers-graphdb-cypher/tests/test_readers_graphdb_cypher.py` · `llama-index-integrations/graph_stores/llama-index-graph-stores-tidb/tests/test_graph_stores_tidb.py` · `llama-index-integrations/graph_stores/llama-index-graph-stores-tidb/tests/test_property_graph_stores_tidb.py` · `llama-index-integrations/graph_stores/llama-index-graph-stores-tidb/llama_index/graph_stores/tidb/graph.py`
- **деньги**: `llama-index-integrations/readers/llama-index-readers-document360/llama_index/readers/document360/entities/category.py` · `llama-index-core/tests/callbacks/test_token_budget.py`
- **дедуп и похожесть**: `llama-index-integrations/evaluation/llama-index-evaluation-tonic-validate/llama_index/evaluation/tonic_validate/answer_similarity.py` · `llama-index-core/tests/node_parser/test_duplicate_text_positions.py` · `llama-index-core/llama_index/core/evaluation/semantic_similarity.py`
- **время и дата**: `llama-index-core/llama_index/core/retrievers/recursive_retriever.py`

### localForage — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `src/utils/isIndexedDBValid.js` · `src/drivers/indexeddb.js`

### logseq-master — ЗАПУСК

_код не копируем: AGPL-3.0: разбираем свободно, свою реализацию пишем сами_

- **граф и связи**: `src/test/logseq/db_worker/graph_backup_test.cljs` · `src/test/logseq/common/graph_test.cljs` · `src/test/logseq/cli/command/graph_test.cljs` · `src/test/frontend/worker/graph_dir_test.cljs` · `src/test/frontend/handler/graph_test.cljs` · `src/test/frontend/extensions/graph_pixi_logic_test.cljs`
- **экран**: `src/test/logseq/cli/commands_test.cljs` · `src/test/frontend/worker/commands_test.cljs` · `src/main/logseq/cli/commands.cljs` · `src/main/logseq/cli/tree_text.cljs` · `src/main/frontend/commands.cljs` · `src/main/frontend/worker/commands.cljs`
- **память и факты**: `src/test/frontend/rum_hooks_refactor_test.cljs` · `src/main/frontend/fs/memory_fs.cljs` · `libs/scripts/extract-sdk-schema.js` · `deps/graph-parser/test/logseq/graph_parser/extract_test.cljs` · `deps/db-sync/test/logseq/db_sync/worker_large_op_memory_test.cljs` · `deps/db/script/replay_sync_artifact.cljs`
- **поиск и разбор текста**: `src/test/frontend/extensions/html_parser_test.cljs` · `src/main/frontend/extensions/html_parser.cljs` · `packages/ui/src/amplify/index.ts` · `libs/index.d.ts` · `libs/src/postmate/index.ts` · `deps/publish/src/logseq/publish/index.cljs`
- **дедуп и похожесть**: `src/test/frontend/common/search_fuzzy_test.cljs` · `src/main/frontend/common/search_fuzzy.cljs`
- **голос и звук**: `src/main/frontend/mobile/audio_recorder.cljs`
- **время и дата**: `src/main/frontend/components/scheduled_deadlines.cljs`

### mem0-main — ПАТТЕРН

_это приложение на фреймворке — берём приёмы и CSS, не файлы_

- **память и факты**: `tests/test_memory.py` · `tests/test_memory_integration.py` · `tests/utils/test_entity_extraction.py` · `tests/utils/test_factory.py` · `tests/memory/test_decay_feature_notice.py` · `tests/memory/test_decay_usage_notice.py`
- **поиск и разбор текста**: `tests/utils/test_entity_extraction.py` · `tests/rerankers/test_huggingface_reranker_normalize.py` · `tests/rerankers/test_llm_reranker_config.py` · `tests/rerankers/test_llm_reranker_nested_config.py` · `tests/rerankers/test_llm_reranker_rerank.py` · `tests/rerankers/test_reranker_failure_logging.py`
- **время и дата**: `tests/memory/test_temporal_feature_notice.py` · `tests/memory/test_temporal_usage_notice.py` · `mem0-ts/src/oss/tests/notices.temporal-feature.test.ts` · `mem0-ts/src/oss/tests/notices.temporal-usage.test.ts` · `integrations/mem0-plugin/scripts/session_timeline.py`
- **деньги**: `openmemory/api/app/utils/categorization.py` · `integrations/mem0-plugin/tests/test_auto_setup_categories.py` · `integrations/mem0-plugin/tests/test_coding_categories.py` · `integrations/mem0-plugin/scripts/auto_setup_categories.py` · `integrations/mem0-plugin/scripts/setup_coding_categories.py`
- **экран**: `openmemory/api/alembic/versions/add_config_table.py` · `integrations/pi-agent-plugin/src/commands.test.ts` · `integrations/pi-agent-plugin/src/commands.ts` · `integrations/openclaw/tests/cli-commands.test.ts` · `integrations/openclaw/cli/commands.ts` · `cli/python/tests/test_commands.py`
- **дедуп и похожесть**: `integrations/mem0-plugin/tests/test_rubric_dedup.py`

### mermaid — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `tests/webpack/src/index.js` · `packages/parser/src/index.ts` · `packages/parser/src/language/index.ts` · `packages/parser/src/language/wardley/index.ts` · `packages/parser/src/language/treeView/index.ts` · `packages/parser/src/language/treemap/index.ts`
- **граф и связи**: `packages/parser/tests/gitGraph.test.ts` · `packages/mermaid/src/setupGraphViewbox.js` · `packages/mermaid/src/setupGraphViewbox.spec.js` · `packages/mermaid/src/utils/subGraphTitleMargins.spec.ts` · `packages/mermaid/src/utils/subGraphTitleMargins.ts` · `packages/mermaid/src/rendering-util/createGraph.ts`
- **экран**: `packages/parser/tests/treemap.test.ts` · `packages/parser/tests/treeView.test.ts` · `packages/parser/tests/treeViewValueConverter.test.ts` · `packages/parser/src/language/treemap/treemap-validator.ts` · `packages/mermaid-layout-tidy-tree/src/non-layered-tidy-tree-layout.d.ts` · `packages/mermaid/src/rendering-util/layout-algorithms/swimlanes/driving-tree.ts`
- **инсайты и паттерны**: `packages/mermaid/src/diagrams/xychart/xychartRenderer.ts` · `packages/mermaid/src/diagrams/requirement/requirementRenderer.ts` · `packages/mermaid/src/diagrams/quadrant-chart/quadrantRenderer.ts` · `packages/mermaid/src/diagrams/gantt/ganttRenderer.js`
- **время и дата**: `packages/mermaid/src/diagrams/timeline/timeline-definition.ts` · `packages/mermaid/src/diagrams/timeline/timeline.spec.js` · `packages/mermaid/src/diagrams/timeline/timelineDb.js` · `packages/mermaid/src/diagrams/timeline/timelineRenderer.ts` · `packages/mermaid/src/diagrams/timeline/timelineRendererVertical.ts` · `packages/examples/src/examples/timeline.ts`

### motion — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `packages/motion-utils/src/index.ts` · `packages/motion-dom/src/index.ts` · `packages/motion-dom/src/view/index.ts` · `packages/motion-dom/src/value/index.ts` · `packages/motion-dom/src/value/types/__tests__/index.test.ts` · `packages/motion-dom/src/value/types/numbers/index.ts`
- **экран**: `packages/motion-dom/src/value/types/utils/animatable-none.ts` · `packages/motion-dom/src/projection/utils/flat-tree.ts` · `packages/motion-dom/src/animation/utils/is-animatable.ts` · `packages/motion-dom/src/animation/utils/__tests__/is-animatable.test.ts` · `packages/motion-dom/src/animation/keyframes/utils/make-none-animatable.ts` · `packages/framer-motion/src/render/utils/__tests__/flat-tree.test.ts`
- **время и дата**: `packages/motion-dom/src/utils/supports/scroll-timeline.ts` · `packages/framer-motion/src/render/dom/scroll/utils/can-use-native-timeline.ts` · `packages/framer-motion/src/render/dom/scroll/utils/get-timeline.ts` · `packages/framer-motion/cypress/integration/scroll-view-timeline-transformed-parent.ts` · `packages/framer-motion/cypress/integration/scroll-view-timeline.ts`
- **дедуп и похожесть**: `packages/framer-motion/src/utils/distance.ts` · `packages/framer-motion/src/utils/__tests__/distance.test.ts`

### natural — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `index.js` · `spec/aggressive_tokenizer_de_spec.ts` · `spec/aggressive_tokenizer_es_spec.ts` · `spec/aggressive_tokenizer_fr_spec.ts` · `spec/aggressive_tokenizer_hi_spec.ts` · `spec/aggressive_tokenizer_nl_spec.ts`
- **дедуп и похожесть**: `spec/damerau_levenshtein_spec.ts` · `spec/hamming_distance_spec.ts` · `spec/jaro-winkler_spec.ts` · `spec/levenshtein_spec.ts` · `lib/natural/distance/hamming_distance.js` · `lib/natural/distance/jaro-winkler_distance.js`
- **экран**: `spec/longest_path_tree_spec.ts` · `spec/shortest_path_tree_spec.ts` · `spec/treebank_word_tokenizer_spec.ts` · `lib/natural/util/longest_path_tree.js` · `lib/natural/util/shortest_path_tree.js` · `lib/natural/tokenizers/treebank_word_tokenizer.js`
- **граф и связи**: `spec/orthography_tokenizer_spec.ts` · `lib/natural/util/edge_weighted_digraph.js` · `lib/natural/tokenizers/orthography_matchers.js`
- **инсайты и паттерны**: `lib/natural/sentiment/tools/XmlParser4PatternData.js`
- **память и факты**: `examples/classification/recall.js`

### neo4j-2026.06 — ЗАПУСК

_код не копируем: GPL-3.0: разбираем свободно, свою реализацию пишем сами_

- **поиск и разбор текста**: `community/wal/src/test/java/org/neo4j/kernel/impl/transaction/log/pruning/ThresholdConfigParserTest.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/pruning/ThresholdConfigParser.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/entry/v520/ChunkEndLogEntrySerializerV5_20.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/entry/v520/ChunkStartLogEntrySerializerV5_20.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/entry/v520/LogEntryChunkEnd.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/entry/v520/LogEntryChunkStart.java`
- **деньги**: `community/wal/src/test/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopedConcurrentLogFilesBinarySearchIT.java` · `community/wal/src/test/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopedLogFilesTest.java` · `community/wal/src/test/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopedLogHeaderCacheTest.java` · `community/wal/src/test/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopeFuzzerTest.java` · `community/wal/src/test/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopeLogRangeFuzzerIT.java` · `community/wal/src/test/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopeReadChannelTest.java`
- **память и факты**: `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/pruning/ThresholdFactory.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/enveloped/BaseLogHeaderFactory.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopedLogPruneStrategyFactory.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/enveloped/EnvelopeLogFilesFactory.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/enveloped/LogHeaderFactory.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/entry/LogEntryFactory.java`
- **экран**: `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/entry/LogEntryCommand.java` · `community/wal/src/main/java/org/neo4j/kernel/impl/transaction/log/entry/v42/CommandLogEntrySerializerV4_2.java` · `community/values/src/main/java/org/neo4j/values/storable/CRSTable.java` · `community/testing/storage-engine-utils/src/main/java/org/neo4j/kernel/impl/api/TestCommand.java` · `community/testing/storage-engine-utils/src/main/java/org/neo4j/kernel/impl/api/TestCommandReaderFactory.java` · `community/testing/random-values/src/main/java/org/neo4j/values/storable/SplittableRandomGenerator.java`
- **граф и связи**: `community/values/src/test/java/org/neo4j/values/virtual/GraphElementValueTest.java` · `community/values/src/main/java/org/neo4j/values/virtual/GraphReferenceValue.java` · `community/testing/test-utils/src/main/java/org/neo4j/test/mockito/mock/GraphMock.java` · `community/testing/it-test-support/src/test/java/org/neo4j/test/TestImpermanentGraphDatabase.java` · `community/testing/it-test-support/src/main/java/org/neo4j/test/AdversarialPageCacheGraphDatabaseFactory.java` · `community/testing/it-test-support/src/main/java/org/neo4j/kernel/ZippedStoreCommunity.java`
- **время и дата**: `community/values/src/test/java/org/neo4j/values/utils/TemporalUtilTest.java` · `community/values/src/test/java/org/neo4j/values/storable/DateTimeValueTest.java` · `community/values/src/test/java/org/neo4j/values/storable/LocalDateTimeValueTest.java` · `community/values/src/test/java/org/neo4j/values/storable/TemporalValueTest.java` · `community/values/src/main/java/org/neo4j/values/utils/TemporalUtil.java` · `community/values/src/main/java/org/neo4j/values/utils/TemporalValueWriterAdapter.java`
- **дедуп и похожесть**: `community/testing/it-test-support/src/main/java/org/neo4j/dbms/database/KeepFirstDuplicateBuilder.java` · `community/spatial-index/src/main/java/org/neo4j/gis/spatial/index/curves/PartialOverlapConfiguration.java` · `community/schema/src/main/java/org/neo4j/internal/kernel/api/exceptions/schema/DuplicateSchemaRuleException.java` · `community/record-storage-engine/src/test/java/org/neo4j/internal/batchimport/DeleteDuplicateNodesStepTest.java` · `community/record-storage-engine/src/main/java/org/neo4j/internal/batchimport/DeleteDuplicateNodesStage.java` · `community/record-storage-engine/src/main/java/org/neo4j/internal/batchimport/DeleteDuplicateNodesStep.java`
- **инсайты и паттерны**: `community/schema/src/main/java/org/neo4j/internal/schema/SchemaPatternMatchingType.java` · `community/neo4j-exceptions/src/main/java/org/neo4j/exceptions/PatternException.java` · `community/kernel-api/src/test/java/org/neo4j/internal/kernel/api/security/NodeNullPatternSegmentTest.java` · `community/kernel-api/src/test/java/org/neo4j/internal/kernel/api/security/NodeValuePatternSegmentTest.java` · `community/kernel-api/src/test/java/org/neo4j/internal/kernel/api/security/PatternSegmentTest.java` · `community/kernel-api/src/test/java/org/neo4j/internal/kernel/api/security/RelNullPatternSegmentTest.java`

### open-webui-main — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **поиск и разбор текста**: `i18next-parser.config.ts` · `src/lib/index.ts` · `src/lib/utils/index.ts` · `src/lib/utils/transitions/index.ts` · `src/lib/utils/characters/index.ts` · `src/lib/types/index.ts`
- **голос и звук**: `src/lib/utils/audio.ts` · `backend/open_webui/routers/audio.py`
- **экран**: `src/lib/utils/excelToTable.ts` · `src/lib/components/common/RichTextInput/commands.ts` · `backend/open_webui/migrations/versions/242a2047eae0_update_chat_table.py` · `backend/open_webui/migrations/versions/2f1211949ecc_update_message_and_channel_member_table.py` · `backend/open_webui/migrations/versions/374d2f66af06_add_prompt_history_table.py` · `backend/open_webui/migrations/versions/3781e22d8b01_update_message_table.py`
- **память и факты**: `backend/open_webui/utils/memory.py` · `backend/open_webui/routers/memories.py` · `backend/open_webui/retrieval/vector/factory.py` · `backend/open_webui/models/memories.py` · `backend/open_webui/migrations/versions/42e2978c7933_add_memory_path_and_meta.py` · `backend/open_webui/migrations/versions/4c5ce3d2f27f_add_context_summary_to_chat_message.py`
- **время и дата**: `backend/open_webui/migrations/versions/4ace53fd72c8_update_folder_table_datetime.py`

### sherpa-onnx — WASM

_собирается в WASM, прецедент — whisper.cpp_

- **голос и звук**: `wasm/vad-asr/app-vad-asr.js` · `wasm/vad-asr/sherpa-onnx-vad.js` · `wasm/vad-asr/sherpa-onnx-wasm-main-vad-asr.cc` · `wasm/vad/app-vad.js` · `wasm/vad/sherpa-onnx-vad.js` · `wasm/vad/sherpa-onnx-wasm-main-vad.cc`
- **граф и связи**: `sherpa-onnx/python/tests/test_fast_clustering.py` · `sherpa-onnx/python/csrc/fast-clustering.cc` · `sherpa-onnx/python/csrc/fast-clustering.h` · `sherpa-onnx/java-api/src/main/java/com/k2fsa/sherpa/onnx/FastClusteringConfig.java` · `sherpa-onnx/csrc/context-graph-test.cc` · `sherpa-onnx/csrc/context-graph.cc`
- **память и факты**: `sherpa-onnx/python/tests/test_feature_extractor_config.py` · `sherpa-onnx/python/csrc/speaker-embedding-extractor.cc` · `sherpa-onnx/python/csrc/speaker-embedding-extractor.h` · `sherpa-onnx/jni/speaker-embedding-extractor.cc` · `sherpa-onnx/java-api/src/main/java/com/k2fsa/sherpa/onnx/SpeakerEmbeddingExtractor.java` · `sherpa-onnx/java-api/src/main/java/com/k2fsa/sherpa/onnx/SpeakerEmbeddingExtractorConfig.java`
- **поиск и разбор текста**: `sherpa-onnx/python/csrc/sentence-piece-tokenizer.cc` · `sherpa-onnx/python/csrc/sentence-piece-tokenizer.h` · `sherpa-onnx/csrc/funasr-nano-tokenizer.cc` · `sherpa-onnx/csrc/funasr-nano-tokenizer.h` · `sherpa-onnx/csrc/qwen-asr-tokenizer.cc` · `sherpa-onnx/csrc/qwen-asr-tokenizer.h`
- **экран**: `sherpa-onnx/csrc/offline-tts-supertonic-nfkd-table.h` · `sherpa-onnx/csrc/symbol-table.cc` · `sherpa-onnx/csrc/symbol-table.h` · `scripts/supertonic/generate_nfkd_table.py` · `scripts/bbpe/generate_bbpe_table.py`
- **дедуп и похожесть**: `rust-api-examples/examples/speaker_embedding_cosine_similarity.rs`

### shoelace — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **экран**: `src/components/tree-item/tree-item.component.ts` · `src/components/tree-item/tree-item.styles.ts` · `src/components/tree-item/tree-item.test.ts` · `src/components/tree-item/tree-item.ts` · `src/components/tree/tree.component.ts` · `src/components/tree/tree.styles.ts`
- **поиск и разбор текста**: `src/components/icon/library.system.ts`

### silverbullet — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **память и факты**: `server-common/src/space/memory.rs` · `plugs/index/refactor.ts` · `plugs/index/refactor_splice.test.ts` · `plugs/index/refactor_splice.ts` · `plug-api/lib/memory_cache.test.ts` · `plug-api/lib/memory_cache.ts`
- **поиск и разбор текста**: `server/src/multi/space_index.rs` · `plugs/index/index.bench.ts` · `plugs/index/indexer.test.ts` · `plugs/index/indexer.ts` · `plugs/index/index_stats.ts` · `plugs/editor/system.ts`
- **граф и связи**: `plugs/object-graph/src/graph_builder.test.ts` · `plugs/object-graph/src/graph_builder.ts` · `plugs/object-graph/src/graph_html.ts` · `plugs/object-graph/src/object_graph.ts` · `plugs/index/paragraph.test.ts` · `plugs/index/paragraph.ts`
- **экран**: `plugs/index/command.ts` · `plugs/index/table.test.ts` · `plugs/index/table.ts` · `plug-api/lib/tree.bench.ts` · `plug-api/lib/tree.test.ts` · `plug-api/lib/tree.ts`
- **инсайты и паттерны**: `client/space_lua/stdlib/pattern.ts`
- **дедуп и похожесть**: `client/lib/fuzzy_search.test.ts` · `client/lib/fuzzy_search.ts`

### tabulator — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **экран**: `test/unit/modules/DataTree.spec.js` · `test/unit/modules/HtmlTableImport.spec.js` · `test/unit/modules/ResizeTable.spec.js` · `test/unit/modules/Tooltip.spec.js` · `test/e2e/resize-table.spec.js` · `src/js/modules/Tooltip/Tooltip.js`
- **время и дата**: `src/js/modules/Sort/defaults/sorters/datetime.js` · `src/js/modules/Format/defaults/formatters/datetime.js` · `src/js/modules/Format/defaults/formatters/datetimediff.js` · `src/js/modules/Edit/defaults/editors/datetime.js`
- **поиск и разбор текста**: `src/js/modules/SelectRange/extensions/clipboard/pasteParsers.js` · `src/js/modules/Clipboard/defaults/pasteParsers.js`
- **деньги**: `src/js/modules/Format/defaults/formatters/money.js`

### usearch — ПОРТ

_Python: алгоритм переписываем на ванильный JS по тестам донора_

- **поиск и разбор текста**: `python/usearch/index.py` · `python/scripts/bench_index.py` · `python/scripts/index_faiss.py` · `python/scripts/test_index.py` · `java/test/IndexTest.java` · `java/cloud/unum/usearch/cloud_unum_usearch_Index.cpp`
- **граф и связи**: `python/scripts/bench_cluster.py`
- **дедуп и похожесть**: `python/scripts/test_distances.py`

### web-llm — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `src/index.ts` · `src/openai_api_protocols/index.ts` · `examples/simple-chat-js/index.js`

### wink-nlp — ЛИФТ

_лицензия разрешает, стек наш — переносим код_

- **поиск и разбор текста**: `utilities/bm25-vectorizer.js` · `types/index.d.ts` · `test/bm25-vectorizer-specs.js` · `test/test-model/porter-stemmer.js` · `src/recursive-tokenizer.js` · `src/tokenizer.js`
- **дедуп и похожесть**: `utilities/similarity.js` · `test/similarity-specs.js`
- **инсайты и паттерны**: `test/compose-patterns.specs.js` · `src/compose-patterns.js`
- **деньги**: `test/test-model/token-categories.js`
- **время и дата**: `src/recursive-tokenizer.js`

