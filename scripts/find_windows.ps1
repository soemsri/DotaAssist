$procs = Get-Process | Where-Object { $_.MainWindowTitle }
foreach ($p in $procs) {
    Write-Host "$($p.Id) - $($p.ProcessName): $($p.MainWindowTitle)"
}
