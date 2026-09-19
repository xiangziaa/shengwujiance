@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12+ or 24 LTS including npm first.
  goto :failed
)
if not exist "frontend\node_modules\vite\bin\vite.js" (
  echo Dependencies missing. Run: npm run setup
  goto :failed
)
if not exist "local-asr\.venv\Scripts\python.exe" goto :setup_asr
if not exist "local-asr\models\paraformer-zh-small-onnx\model_int8.onnx" goto :setup_asr
if not exist "local-asr\models\paraformer-zh-small-onnx\tokens.txt" goto :setup_asr

rem A healthy service is reused; an occupied but unready port is an error.
powershell.exe -NoProfile -Command "try { $h = Invoke-RestMethod http://127.0.0.1:8767/health -TimeoutSec 3; if ($h.ready -eq $true -and $h.model -eq 'paraformer-zh-small-onnx') { exit 0 } } catch {}; if (Get-NetTCPConnection -State Listen -LocalPort 8767 -ErrorAction SilentlyContinue) { exit 2 }; exit 1"
set "asr_status=%errorlevel%"
if "%asr_status%"=="2" (
  echo Port 8767 is occupied by an unready or different service. Check it and retry.
  goto :failed
)
powershell.exe -NoProfile -Command "try { $r = Invoke-WebRequest http://localhost:5173 -UseBasicParsing -TimeoutSec 3; if ($r.Content -match '/@vite/client') { exit 0 } } catch {}; if (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue) { exit 2 }; exit 1"
set "web_status=%errorlevel%"
if "%web_status%"=="2" (
  echo Port 5173 is occupied by an unready or different service. Check it and retry.
  goto :failed
)

if "%asr_status%"=="0" (
  echo ASR is already running; reusing it.
) else (
  start "XiaoAn - Local ASR" /D "%~dp0" cmd.exe /d /k "local-asr\.venv\Scripts\python.exe local-asr\server.py"
)
if "%web_status%"=="0" (
  echo Frontend is already running; reusing it.
) else (
  start "XiaoAn - Frontend" /D "%~dp0" cmd.exe /d /k "npm.cmd run dev -- -- --strictPort"
)
echo.
echo Web: http://localhost:5173
echo ASR: http://127.0.0.1:8767/health
echo Keep both service windows open. Close each window to stop its service.
echo Startup output and errors are shown in the service windows.
pause
exit /b 0

:setup_asr
echo ASR installation incomplete. Run:
echo powershell -ExecutionPolicy Bypass -File local-asr/setup.ps1
:failed
pause
exit /b 1
