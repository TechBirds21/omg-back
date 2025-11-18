@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.
echo Backend URL: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop
echo.
cd /d %~dp0
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause

