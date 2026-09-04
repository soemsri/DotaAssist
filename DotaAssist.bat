@echo off
cd /d "%~dp0"
title DotaAssist Launcher

if exist "%~dp0src-tauri\target\release\dota-assist.exe" (
    start "" "%~dp0src-tauri\target\release\dota-assist.exe"
    exit
)

if exist "%~dp0src-tauri\target\debug\dota-assist.exe" (
    start "" "%~dp0src-tauri\target\debug\dota-assist.exe"
    exit
)

echo Starting DotaAssist (GSI Bridge + UI)...
node scripts\start-app.cjs
