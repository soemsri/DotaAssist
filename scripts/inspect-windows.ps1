Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinInspector {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
}
"@

$proc = [WinInspector+EnumWindowsProc]{
    param($hwnd, $lparam)
    $pid = 0
    [WinInspector]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
    $title = New-Object System.Text.StringBuilder 256
    [WinInspector]::GetWindowText($hwnd, $title, 256) | Out-Null
    $class = New-Object System.Text.StringBuilder 256
    [WinInspector]::GetClassName($hwnd, $class, 256) | Out-Null

    $titleStr = $title.ToString()
    $classStr = $class.ToString()

    if ($titleStr.Length -gt 0) {
        Write-Host "HWND: $hwnd | PID: $pid | Title: $titleStr"
    }
    return $true
}
[WinInspector]::EnumWindows($proc, [IntPtr]::Zero) | Out-Null
