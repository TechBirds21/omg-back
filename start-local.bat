@echo off
REM Quick start script for local development (Windows)

echo =========================================
echo Starting Omaguva Local Development
echo =========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: Must run from project root directory
    exit /b 1
)

REM Check if backend .env exists
if not exist "backend\.env" (
    echo Error: backend\.env not found
    echo Please create it with Supabase credentials
    exit /b 1
)

REM Start backend
echo Starting backend...
cd backend

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment and install dependencies
call .venv\Scripts\activate.bat
echo Installing backend dependencies...
pip install -q -r requirements.txt

REM Test backend setup
echo Testing backend configuration...
python test_setup.py

REM Start backend server
echo Starting backend server on http://localhost:8000
start "Omaguva Backend" /MIN uvicorn app.main:app --reload --port 8000

cd ..

REM Give backend time to start
timeout /t 3 /nobreak > nul

REM Start frontend
echo.
echo Starting frontend on http://localhost:5173
echo.
echo =========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo =========================================
echo.
echo Press Ctrl+C in backend window to stop backend
echo.

npm run dev
