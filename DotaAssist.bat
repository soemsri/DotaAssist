@echo off
cd /d "%~dp0"
title DotaAssist Launcher
if exist "%~dp0src-tauri\target\release\dota-assist.exe" (
    start "" "%~dp0src-tauri\target\release\dota-assist.exe"
    exit /b
)
echo Starting DotaAssist native development app...
call npm start
if errorlevel 1 pause
