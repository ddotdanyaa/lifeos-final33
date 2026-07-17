# LIFEOS PREVENTION GUIDE

Цель документа: перечислить причины, из-за которых разработка LifeOS на этой рабочей станции может ломаться или вести себя нестабильно, и дать проверяемые профилактические действия.

## 1. Claude Code / Claude Desktop

### Риски

- Claude Code не установлен, команда `claude` отсутствует.
- Claude Desktop не установлен, `%APPDATA%\Claude` отсутствует.
- Claude web `https://claude.ai` возвращает 403 на текущем маршруте.
- Desktop MCP не может работать без Desktop app и корректного config path.
- Microsoft Store версия Claude Desktop может ломать MCP-доступ из-за sandbox-ограничений; для MCP предпочтителен официальный desktop installer.
- VPN или TLS inspection может ломать Claude login и API.
- CLI и Desktop могут использовать разные proxy/cert paths.
- Desktop extensions/MCP требуют полной перезагрузки приложения после изменения конфигурации.
- Неверный JSON в `claude_desktop_config.json` отключает MCP.
- Относительные пути в MCP config ненадёжны на Windows; нужны абсолютные пути.
- MCP server может быть установлен на project scope и не показываться в других проектах.

### Проверки

```powershell
claude --version
claude auth status
Test-Path "$env:APPDATA\Claude\claude_desktop_config.json"
Get-Process | Where-Object { $_.ProcessName -match 'Claude|claude' }
Invoke-WebRequest -UseBasicParsing https://code.claude.com
Invoke-WebRequest -UseBasicParsing https://claude.ai
```

### Профилактика

- Установить `Anthropic.Claude` и `Anthropic.ClaudeCode` через winget или официальный источник.
- Авторизовать Claude из GUI/CLI.
- Проверить работу Claude без VPN и с VPN.
- Для MCP использовать абсолютные пути, валидировать JSON перед запуском Desktop.
- После изменений MCP закрывать Claude Desktop полностью и запускать заново.

## 2. VPN / регион / DNS / TLS

### Риски

- Россия + VPN: часть AI-сервисов может возвращать 403, timeout или TLS errors.
- `claude.ai` уже вернул 403.
- `cursor.com` уже дал timeout, хотя `api2.cursor.sh` ответил.
- `registry.npmjs.org` уже дал transport error через PowerShell.
- split-tunnel может отправлять browser traffic и CLI traffic разными маршрутами.
- DNS на Wi-Fi и tunnel может различаться.
- WinHTTP proxy direct, но приложения Electron могут использовать Chromium proxy settings.
- TLS inspection или некорректный VPN endpoint может ломать certificate chain.
- Некоторые сервисы блокируют datacenter/VPN IP.
- Cursor/Claude могут зависать после переключения VPN без restart приложения.

### Проверки

```powershell
netsh winhttp show proxy
Get-DnsClientServerAddress
Invoke-WebRequest -UseBasicParsing https://claude.ai
Invoke-WebRequest -UseBasicParsing https://api.anthropic.com
Invoke-WebRequest -UseBasicParsing https://cursor.com
Invoke-WebRequest -UseBasicParsing https://registry.npmjs.org
```

### Профилактика

- Использовать стабильный VPN endpoint с чистым IP.
- Для dev-доменов держать один предсказуемый маршрут.
- Проверять DNS `1.1.1.1` и `8.8.8.8`.
- После переключения VPN перезапускать Cursor/Claude/terminal.
- Для Playwright/npm использовать официальные proxy-переменные только после явного решения владельца.

## 3. Git / GitHub / LFS

### Риски

- Рабочее дерево грязное; легко смешать продуктовые изменения и окружение.
- `core.autocrlf=true` может менять line endings.
- LFS endpoint показывает `auth=none`.
- Большие evidence-файлы могут не уйти без LFS auth.
- HTTPS credential helper зависит от GitHub CLI auth.
- VPN может ломать GitHub TLS или push.

### Проверки

```powershell
git status --short
git config --list --show-origin
gh auth status
gh repo view
git ls-remote origin
git lfs env
git lfs ls-files
```

### Профилактика

- Перед системными работами фиксировать `git status --short`.
- Не смешивать environment docs и продуктовые правки в одном commit без явного решения.
- Проверить LFS pull/push до больших артефактов.
- Не менять `core.autocrlf` без отдельного решения по репозиторию.

## 4. Node / npm / pnpm

### Риски

- Node v24 работает, но часть пакетов ориентируется на LTS.
- npm 11 больше не поддерживает `npm bin -g`.
- PowerShell execution policy может ломать `.ps1` wrappers на других машинах.
- npm registry уже дал transport error.
- Глобальный prefix в `C:\Users\Данил\AppData\Local\npm-global`; PATH должен содержать bin location.
- native npm packages требуют Build Tools/Python.

### Проверки

```powershell
node --version
npm --version
pnpm --version
npm config get prefix
npm root -g
Invoke-WebRequest -UseBasicParsing https://registry.npmjs.org
```

### Профилактика

- Для LifeOS держать lockfile и не обновлять зависимости без browser proof.
- Для новых native packages сначала установить Python 3.12 и Build Tools.
- При сетевых ошибках npm проверять VPN route и TLS.

## 5. Python / uv

### Риски

- `python` указывает на Microsoft Store alias, версия не работает.
- `py` launcher отсутствует.
- `uv` отсутствует.
- Python tooling, Playwright Python, document/PDF tooling и node-gyp могут падать.

### Проверки

```powershell
python --version
py --version
uv --version
where python
```

### Профилактика

- Установить Python 3.12 через winget.
- Отключить App Execution Alias для Python или поставить корректный PATH.
- Установить uv после появления рабочего Python.

## 6. Build Tools / Rust / Go / Bun / SQLite / PostgreSQL

### Риски

- Visual Studio Build Tools не обнаружены.
- Rust/Cargo не найдены.
- Go не найден.
- Bun не найден.
- SQLite CLI не найден.
- PostgreSQL CLI не найден.
- Любые native extensions или инструменты на Rust/Go будут падать.

### Проверки

```powershell
rustc --version
cargo --version
go version
bun --version
sqlite3 --version
psql --version
```

### Профилактика

- Установить только те toolchains, которые реально нужны LifeOS pipeline.
- После установки перезапустить terminal, чтобы PATH обновился.
- Для Build Tools проверить `vswhere`.

## 7. Docker / WSL

### Риски

- Docker CLI установлен, daemon не работает.
- WSL default distro `docker-desktop` stopped.
- Нет отдельной Linux dev distro.
- Docker Desktop может требовать запуск GUI и WSL integration.
- Docker named pipe `//./pipe/docker_engine` недоступен.

### Проверки

```powershell
docker version
docker info
wsl --status
wsl --list --verbose
```

### Профилактика

- Запустить Docker Desktop вручную.
- Проверить Settings → Resources → WSL Integration.
- Создать отдельную dev distro только при необходимости.
- Не удалять Docker data без отдельного backup.

## 8. Ollama / локальные модели

### Риски

- Ollama API работает, но frontend может получить CORS failure.
- `qwen2.5:3b` отвечает, но медленно на CPU.
- Streaming test требует корректной обработки chunked response.
- Модель может выгружаться из памяти и давать длинный первый ответ.
- Большие модели перегрузят 16 GB RAM и Intel N95.
- VPN обычно не нужен для локального inference, но browser-origin policy остаётся.

### Проверки

```powershell
ollama --version
ollama list
ollama ps
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:11434/api/tags
```

Non-stream generate:

```powershell
$body = @{ model='qwen2.5:3b'; prompt='Reply OK'; stream=$false; options=@{num_predict=8} } | ConvertTo-Json -Depth 5
Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://127.0.0.1:11434/api/generate -Body $body -ContentType 'application/json'
```

### Профилактика

- В LifeOS считать Ollama usable только после `/api/tags` и `/api/generate`.
- Для browser frontend проверить CORS/allowed origins.
- Основная модель для этой машины: `qwen2.5:3b`.
- Не запускать крупные модели во время Playwright/browser proof.

## 9. Playwright / Browser

### Риски

- Playwright 1.61 установлен, но browser assets зависят от CDN.
- CDN может ломаться через VPN/proxy.
- Chrome/Edge version output в PowerShell исказился кодировкой.
- Browser proof LifeOS сейчас падает на продуктовой проверке graph link.
- Service worker/cache может показывать старую сборку.
- Headless Chrome и обычный Chrome могут иметь разные storage profiles.

### Проверки

```powershell
npx playwright --version
npx playwright install --dry-run chromium
npm run --silent verify:browser-chat
```

### Профилактика

- В browser proof использовать cache-busting и service worker unregister.
- Хранить скриншоты в `output/playwright`.
- При VPN/CDN ошибках использовать `HTTPS_PROXY` только после явного решения владельца.
- Проверять и clean profile, и обычный пользовательский браузер.

## 10. LifeOS product runtime

### Риски

- `npm run verify` проходит, но browser proof падает.
- Текущий failure: `chat artifact has no graph link`.
- Это означает, что продуктовая цепочка Input → Artifact → Graph не замкнута.
- Service worker может оставлять старый UI.
- IndexedDB/localStorage может хранить старые сообщения и статусы.

### Проверки

```powershell
npm run --silent verify
npm run --silent build:public
npm run --silent verify:browser-chat
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/
```

### Профилактика

- Не считать статические проверки достаточными.
- Каждый UX fix проверять браузером.
- Проверять старое пользовательское state migration.
- Не писать финальный статус без browser proof.

## 11. Security / Defender / Firewall

### Риски

- Defender real-time protection активен, может задерживать node_modules, Playwright browser downloads, local servers.
- Firewall включён на всех профилях.
- VPN/tunnel adapters добавляют маршрутизационную сложность.
- hosts file содержит Docker host mappings.

### Проверки

```powershell
Get-MpComputerStatus
Get-NetFirewallProfile
Get-NetTCPConnection -LocalPort 11434
Get-NetTCPConnection -LocalPort 4173
Get-Content "$env:SystemRoot\System32\drivers\etc\hosts"
```

### Профилактика

- Не отключать Defender/firewall без отдельного решения владельца.
- Для локальных портов проверять owner process.
- Не менять hosts/VPN/proxy/firewall из Codex-сессии.

## 12. Приоритеты устранения

1. Установить Claude Desktop и Claude Code, выполнить вход.
2. Проверить Claude через VPN и без VPN.
3. Поставить рабочий Python 3.12 и uv.
4. Запустить Docker Desktop или признать Docker не обязательным для текущего LifeOS цикла.
5. Установить Visual Studio Build Tools для native packages.
6. Проверить npm registry через текущий VPN.
7. Проверить Cursor GUI: AI, indexing, terminal, proxy.
8. Повторить Ollama streaming через корректный stream reader.
9. Вернуться к LifeOS browser proof failure `chat artifact has no graph link`.
10. После каждого изменения повторять команды из соответствующей секции.

## Использованные источники

- https://code.claude.com/docs/en/troubleshoot-install
- https://code.claude.com/docs/en/setup
- https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- https://support.claude.com/en/collections/16163169-claude-desktop
- https://www.anthropic.com/engineering/desktop-extensions
- https://cursor.com/help/troubleshooting/network
- https://docs.ollama.com/faq
- https://github.com/ollama/ollama/issues/669
- https://playwright.dev/docs/browsers
- https://docs.docker.com/desktop/features/wsl/
- https://cli.github.com/manual/gh_auth_login
- https://cli.github.com/manual/gh_auth_setup-git
- https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows
- https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/
