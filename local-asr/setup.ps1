$ErrorActionPreference = 'Stop'
python -m venv "$PSScriptRoot\.venv"
if ($LASTEXITCODE -ne 0) { throw 'Failed to create Python environment' }
$asrPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
& $asrPython -m pip install -r "$PSScriptRoot\requirements.txt"
if ($LASTEXITCODE -ne 0) { throw 'Failed to install ASR dependencies' }
& $asrPython "$PSScriptRoot\download_model.py"
if ($LASTEXITCODE -ne 0) { throw 'Failed to download ASR model' }
