# NOTICE — заимствованный код и его авторы

LifeOS переиспользует чужой код там, где лицензия это разрешает. Каждая строка ниже добавлена
в момент внедрения, а не задним числом. Лицензия в каждом случае прочитана ФАЙЛОМ в репозитории
донора, а не по памяти и не по метаданным хостинга.

| Что | Автор | Лицензия | Где у нас | Как внедрено |
|---|---|---|---|---|
| Fuse.js v7.5.0 | Kiro Risk | Apache-2.0 | `ui/vendor/fuse.mjs` | целиком, готовая ESM-сборка |
| jsQR | Cosmo Wolfe | Apache-2.0 | `ui/vendor/jsqr.js` | целиком, готовая сборка |
| natural — коэффициент Дайса и Джаро–Винклер | Adam Phillabaum, Chris Umbel | MIT | `core/similar-thoughts.mjs` | перенос двух функций, принят тест-кейсами донора |
| Agent Skills (24 скилла, 4 агента) | Addy Osmani | MIT | `.claude/skills/`, `.claude/agents/` | целиком |
| Uiverse (Galaxy) | Uiverse community | MIT | `research/repos/uiverse-galaxy` | скачан, компоненты берутся поштучно с шапкой авторства |

Чек-листы checklist.design используются как **требования к экранам**, а не как код: они лежат
пересказом в `.claude/skills/lifeos-ui-checklist/SKILL.md`.
