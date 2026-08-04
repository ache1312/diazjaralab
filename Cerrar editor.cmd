@echo off
setlocal EnableExtensions
title Cerrar editor local - Laboratorio Diaz-Jara

where wsl.exe >nul 2>nul
if errorlevel 1 (
  echo No se encontro WSL.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%P in (`wsl.exe wslpath -a "%~dp0."`) do set "STUDIO_PROJECT=%%P"
if not defined STUDIO_PROJECT (
  echo No se pudo convertir la ruta del proyecto para WSL.
  pause
  exit /b 1
)

wsl.exe bash -lc "cd '%STUDIO_PROJECT%' && node scripts/studio/stop.mjs"
if errorlevel 1 pause

endlocal
