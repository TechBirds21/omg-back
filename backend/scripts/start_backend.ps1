# PowerShell script to start backend cleanly

Write-Host "Stopping old backend processes..." -ForegroundColor Yellow

# Stop all Python processes on port 8000
$processes = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $processes) {
    try {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped process $pid" -ForegroundColor Gray
    } catch {
        # Ignore errors
    }
}

Start-Sleep -Seconds 2

Write-Host "`nStarting backend..." -ForegroundColor Green
Write-Host "Backend will run on: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop`n" -ForegroundColor Yellow

# Start backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

