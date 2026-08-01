#Requires -Version 5.1
<#
  Обёртка для терминала Windows: `.\tools\free-ai-keys.ps1 -Best`.

  Почему обёртка, а не своя реализация: проверка ключей обязана быть ПРОВЕРЕННОЙ — иначе она сама
  становится источником потерянного времени. Логика живёт в tools/free-ai-keys.mjs, прогнанном на
  наборе поддельных провайдеров (200 с пустым телом, 401, 429, устаревшая модель, отказ max_tokens,
  мёртвый хост). Вторая реализация на PowerShell означала бы второй, непроверенный вердикт.
#>
param(
  [switch]$Signup,
  [switch]$Best,
  [string]$Only = "",
  [string]$Keys = "",
  [int]$TimeoutSec = 25
)

try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $here "free-ai-keys.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Нужен Node.js — он же нужен и самому LifeOS. https://nodejs.org" -ForegroundColor Red
  exit 1
}

$argv = @($script)
if ($Signup)     { $argv += "--signup" }
if ($Best)       { $argv += "--best" }
if ($Only)       { $argv += "--only=$Only" }
if ($Keys)       { $argv += "--keys=$Keys" }
$argv += "--timeout=$($TimeoutSec * 1000)"

& node @argv
exit $LASTEXITCODE
