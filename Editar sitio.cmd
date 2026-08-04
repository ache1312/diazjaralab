@echo off
setlocal EnableExtensions
title Editor local - Laboratorio Diaz-Jara

where wsl.exe >nul 2>nul
if errorlevel 1 (
  echo No se encontro WSL. Abre el proyecto en el entorno donde esta instalado Node.js.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%P in (`wsl.exe wslpath -a "%~dp0."`) do set "STUDIO_PROJECT=%%P"
if not defined STUDIO_PROJECT (
  echo No se pudo convertir la ruta del proyecto para WSL.
  pause
  exit /b 1
)

start "Editor local del laboratorio" wsl.exe bash -lc "cd '%STUDIO_PROJECT%' && npm run edit"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='http://localhost:4321/admin/'; foreach ($i in 1..90) { try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $url; if ($r.StatusCode -lt 500) { Start-Process $url; exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"

if errorlevel 1 (
  echo El editor no respondio en 90 segundos. Revisa la ventana "Editor local del laboratorio".
  pause
  exit /b 1
)

endlocal
