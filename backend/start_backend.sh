#!/bin/bash

# Backend Startup Script for O Maguva E-Commerce

echo "=========================================="
echo "Starting O Maguva Backend Server"
echo "=========================================="

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Creating .env file from project root..."
    
    # Get Supabase credentials from project root
    if [ -f ../.env ]; then
        SUPABASE_URL=$(grep VITE_SUPABASE_URL ../.env | cut -d '=' -f2)
        SUPABASE_KEY=$(grep VITE_SUPABASE_ANON_KEY ../.env | cut -d '=' -f2)
        
        cat > .env << ENVEOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY

# Database preference
DATABASE_PREFERENCE=supabase

# Application settings
APP_NAME=Omaguva Backend
DEBUG=True
ENVEOF
        
        echo "✅ Created .env file successfully"
    else
        echo "❌ Project .env file not found. Please create backend/.env manually."
        exit 1
    fi
fi

# Check Python version
echo ""
echo "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    echo "✅ Python3 found: $(python3 --version)"
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
    echo "✅ Python found: $(python --version)"
else
    echo "❌ Python not found. Please install Python 3.8 or higher."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate 2>/dev/null

# Install/upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip -q

# Install requirements
echo ""
echo "Installing requirements..."
if [ -f requirements.txt ]; then
    pip install -r requirements.txt -q
    echo "✅ Requirements installed"
else
    echo "❌ requirements.txt not found!"
    exit 1
fi

# Start the server
echo ""
echo "=========================================="
echo "🚀 Starting FastAPI server on port 8000"
echo "=========================================="
echo ""
echo "Backend API will be available at:"
echo "  → http://localhost:8000"
echo "  → http://localhost:8000/docs (API Documentation)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
