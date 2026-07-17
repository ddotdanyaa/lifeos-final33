# v33 Canon — Deduplicated Navigation Index

**Файл:** `LifeOS_v33_FINAL_CANON_MAX_ACCEL_2026-05-10.md`
**Размер:** 7.0 MB · 62 684 строк · ~361 500 слов · 581 top-level заголовок · 1386 заголовков всего.

**Зачем этот индекс:** файл — это архив-омнибус, собранный дословной склейкой десятков источников. Часть блоков повторяется 3–7 раз. Читать подряд не нужно и вредно. Ниже — карта **первых (уникальных) вхождений** каждого слоя с диапазонами строк, плюс явная пометка дубликатов, которые можно пропустить.

**Как читать (Claude Code):** сначала бери v34 vision + `01_SCOPE_PRESERVATION_CHECK.md`. В этот файл лезь точечно — по диапазону строк нужного слоя (`sed -n 'START,ENDp' file.md`). Не загружай весь файл в контекст.

---

## A. Ядро канона (читать в первую очередь)

| Слой | Строки | Приоритет |
|---|---|---|
| MAX ACCELERATION CANON (§0 неприкосновенная формула → §9 next action) | 1–154 | ★★★ |
| Non-negotiable invariants | 204–227 | ★★★ |
| **Operating Canon C00–C25** (26 доменов поведения продукта) | 228–1113 | ★★★ |
| **Seven Contracts** (Object/Artifact/Receipt/Capability/Locality/Package/Quality) | 16041–16066 | ★★★ (также восстановлены в 01_...) |
| Семь контрактов (расширенная формулировка, ДОБАВЛЕНИЕ v4) | 24957–24988 | ★★ |
| v33 top-level modules (M01–M20) | 2788–2812 | ★★ |
| Mandatory entities v33 | 2901–2929 | ★★ |
| C01–C25 → модули map | 2813–2842 / 16104–16136 | ★★ |

## B. Архитектура и слои (уникальные)

| Слой | Строки |
|---|---|
| Speed Protocol + Final implementation waves (Wave 0–8) | 1115–1192 |
| LifeGraph deep (Obsidian++) | 17838–17928 |
| Second Brain / Personal Twin | 17929–17984 |
| AI Design Personalization | 17985–18038 |
| Local AI / Model Hub | 18039–18095 |
| Agent Builder / n8n-like Workflow Studio | 18096–18166 |
| Adaptive Home / Today | 18167–18204 |
| Contract Tests / QC Gates | 18205–18237 |
| Entity Resolution | 18238–18281 |
| Undo / Grace / Anti-shame | 18282–18316 |
| Consent-forward Privacy | 18317–18348 |
| Predictive Shortcuts / Inline Actions | 18349–18377 |
| Marketplace нового поколения | 18378–18406 |
| Artifact-core spine research (реальный on-device AI, trust-first) | 57849–59040 |
| 60 missing layers + additions | 59058–59745 |

## C. Реестры и бэклоги (продуктовые)

| Слой | Строки |
|---|---|
| **Mechanics_134** — полный реестр 134 механик | 21720–21858 |
| Приоритет из mechanics workbook (топ-40, money hooks, ready modes, метрики) | 21562–21719 |
| **Pack Registry** — 10 категорий портфелей packs | 21390–21561 |
| 16 обязательных v33-модулей (детально, 3.1–3.16) | 20960–21389 |
| Feature registry / приоритетный реестр функций | 19336–19358 / 19667–19790 |
| APPENDIX F — Functions to implement (verbatim) | 44713–46973 |
| APPENDIX G — New functions list (verbatim) | 46974–49989 |

## D. Аудиты и стресс-тесты (QA-дисциплина, справка при hardening)

| Слой | Строки |
|---|---|
| Audit Pass A (смысл/канон/UX, 500 проверок) | 1193–1695 |
| Audit Pass B (архитектура/данные/безопасность, 500) | 1696–2198 |
| Audit Pass C (исполнение/ускорение/Codex, 500) | 2199–2702 |
| Audit Register A (500 логико-последовательных уязвимостей) | 2944–3947 |
| Audit Register B (500 общих слабостей) | 3948–4951 |
| Audit Register C (1000 финальных проверок) | 4952–6955 |
| 1000 уникальных контрольных уязвимостей + решения | 16750–17757 |
| 200-пунктовая стресс-проверка (первое вхождение) | 18525–18751 |

## E. Рынок / деньги / рост (GTM-слой, НЕ для первой сборки)

| Слой | Строки |
|---|---|
| Deep Research: где люди платят / что добавлять | 19528–19967 |
| Wide mechanics research (top-15 build-now, money, fast upgrades) | 54597–56407 |
| Market thesis / opportunity map / candidate registry | 56408–56909 |
| Deep research «одна персональная ОС жизни» (life-state map, ready packs) | 56910–57848 |
| 25 killer scenarios для рекламы/лендинга | 59746–59799 |
| 30 productized psychological levers | 60064–60395 |
| 25 «I need this» сценариев (ad → paywall) | 60396–60649 |
| 20 trust + anti-friction patterns | 60650–60676 |
| 20 conversion moments + 15 anti-patterns | 60677–60725 |
| Новые покупаемые слои / exclusion ledger / 40 candidates | 61105–61862 |
| Money map 2024–2026 / Top-60 money layers | 62152–62613 |

## F. Большие сохранённые «verbatim» блоки

| Блок | Строки | Заметка |
|---|---|---|
| **APPENDIX A — v20 Canon (verbatim)** | 6974–15951 | ~9000 строк базового v20-канона; читать при вопросах о наследии |
| APPENDIX B — v33 full implementation assembly | 15952–27349 | содержит Seven Contracts, Mechanics_134, Codex prompt |
| APPENDIX E — Canon 15 (verbatim) | 39413–44712 | |
| APPENDIX H — Canon 33 improvement v1 | 49990–50699 | |
| APPENDIX I — Canon 33 improvement v2 | 50700–51222 | |
| APPENDIX J — Research v2 (verbatim) | 51223–54596 | |

---

## G. ⚠️ Дубликаты — можно пропускать

Эти блоки повторяют более ранние вхождения дословно. Читать только первое вхождение (колонка «Оригинал»).

| Повторяющийся блок | Оригинал (читать это) | Дубликаты (пропустить) |
|---|---|---|
| All-layer expansion plan (×7) | 17766–18769 | 22011, 27355, 29865, 34110, и др. |
| «граф жизни» report (×3) | 18770–19527 | 28359, 30869 |
| Deep Research стратегический (×3) | 19528–19967 | 29117, 31627 |
| «управляемая платформа» (×3) | 19968–20469 | 29557, 32067 |
| Deep research money-механики (×2) | 20470–20904 | 32569 |
| «единый файл улучшений» (×2) | 20905–22007 | 33004 |
| BASE v33 version 1/2 preserved (×2) | 22008–23829 | 34101 |
| Deep Research 2 prompt (×2) | 24160–24916 | 36259 |
| ДОБАВЛЕНИЕ v4 (×2) | 24917–27349 | 37016 |
| APPENDIX C/D all-layer (дубли APPENDIX-A-раздела) | — | 27350, 29860 |
| 200-пунктовая стресс (×5) | 18525 | 22770, 28114, 30624, 34869 |

**Практический вывод:** уникальный архитектурный контент v33 сосредоточен в строках **1–2932**, **15952–21858**, **57849–59745**. Всё остальное — либо verbatim-наследие (v20/canon15), либо GTM/деньги, либо дубликаты.
