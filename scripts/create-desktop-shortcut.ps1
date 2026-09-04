# PowerShell script to create Desktop shortcut for DotaAssist
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ProjectDir = Split-Path -Parent $PSScriptRoot

$TargetExe = Join-Path $ProjectDir "src-tauri\target\release\dota-assist.exe"
$IconFile = Join-Path $ProjectDir "src-tauri\icons\icon.ico"
$ShortcutPath = Join-Path $DesktopPath "DotaAssist.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetExe
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = "$IconFile,0"
$Shortcut.Description = "DotaAssist - Overlay & Strategy Assistant"
$Shortcut.Save()

Write-Host "Created shortcut successfully at: $ShortcutPath" -ForegroundColor Green
