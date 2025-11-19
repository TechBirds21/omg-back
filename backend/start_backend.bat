@echo off
REM Backend Startup Script for O Maguva E-Commerce (Windows)

echo ==========================================
echo Starting O Maguva Backend Server
echo ==========================================

REM Navigate to backend directory
cd /d "%~dp0"

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found!
    echo Creating .env file from project root...
    
    if exist ..\.env (
        echo # Supabase Configuration > .env
        findstr VITE_SUPABASE_URL ..\.env >> .env
        findstr VITE_SUPABASE_ANON_KEY ..\.env >> .env
        echo. >> .env
        echo # Database preference >> .env
        echo DATABASE_PREFERENCE=supabase >> .env
        echo. >> .env
        echo # Application settings >> .env
        echo APP_NAME=Omaguva Backend >> .env
        echo DEBUG=True >> .env
        
        echo Created .env file successfully
    ) else (
        echo Project .env file not found. Please create backend\.env manually.
        pause
        exit /b 1
    )
)

REM Check Python installation
echo.
echo Checking Python installation...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Python not found. Please install Python 3.8 or higher.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

python --version
echo Python found successfully

REM Check if virtual environment exists
if not exist venv (
    echo.
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install requirements
echo.
echo Installing requirements...
if exist requirements.txt (
    pip install -r requirements.txt --quiet
    echo Requirements installed
) else (
    echo requirements.txt not found!
    pause
    exit /b 1
)

REM Start the server
echo.
echo ==========================================
echo Starting FastAPI server on port 8000
echo ==========================================
echo.
echo Backend API will be available at:
echo   - http://localhost:8000
echo   - http://localhost:8000/docs (API Documentation)
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
