$ErrorActionPreference = 'Stop'
$asrPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $asrPython)) {
    throw 'Run local-asr/setup.ps1 first.'
}
& $asrPython "$PSScriptRoot\server.py"
