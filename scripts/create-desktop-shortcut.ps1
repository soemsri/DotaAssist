# PowerShell script to create Desktop shortcut for DotaAssist
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ProjectDir = Split-Path -Parent $PSScriptRoot

$ReleaseExe = Join-Path $ProjectDir "src-tauri\target\release\dota-assist.exe"
$BatFile = Join-Path $ProjectDir "DotaAssist.bat"
$IconFile = Join-Path $ProjectDir "src-tauri\icons\icon.ico"
$ShortcutPath = Join-Path $DesktopPath "DotaAssist.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
if (Test-Path $ReleaseExe) {
    $Shortcut.TargetPath = $ReleaseExe
} else {
    $Shortcut.TargetPath = $BatFile
}
$Shortcut.WorkingDirectory = $ProjectDir
if (Test-Path $IconFile) {
    $Shortcut.IconLocation = "$IconFile,0"
}
$Shortcut.Description = "DotaAssist - Overlay & Strategy Assistant"
$Shortcut.Save()

Write-Host "Created shortcut successfully at: $ShortcutPath" -ForegroundColor Green
