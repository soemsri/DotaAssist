# Find dota-assist process and force window to TOPMOST and Foreground
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinTop {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const int SW_RESTORE = 9;
}
"@

$processes = Get-Process -Name "dota-assist" -ErrorAction SilentlyContinue
if (!$processes) {
    Write-Host "dota-assist is not running."
    exit 1
}

$pids = $processes | ForEach-Object { $_.Id }
Write-Host "Found dota-assist PIDs: $($pids -join ', ')"

[WinTop]::EnumWindows({
    param($hwnd, $lparam)
    $wPid = 0
    [WinTop]::GetWindowThreadProcessId($hwnd, [ref]$wPid) | Out-Null
    if ($pids -contains $wPid) {
        Write-Host "Found Window HWND: $hwnd for PID: $wPid"
        [WinTop]::ShowWindow($hwnd, [WinTop]::SW_RESTORE) | Out-Null
        [WinTop]::BringWindowToTop($hwnd) | Out-Null
        [WinTop]::SetWindowPos($hwnd, [WinTop]::HWND_TOPMOST, 0, 0, 0, 0, ([WinTop]::SWP_NOMOVE -bor [WinTop]::SWP_NOSIZE -bor [WinTop]::SWP_SHOWWINDOW)) | Out-Null
        [WinTop]::SetForegroundWindow($hwnd) | Out-Null
        Write-Host "Window set to TOPMOST and brought to front!"
    }
    return $true
}, [IntPtr]::Zero) | Out-Null
