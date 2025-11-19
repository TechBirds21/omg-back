#!/bin/bash
# Quick start script for local development

echo "========================================="
echo "Starting Omaguva Local Development"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Must run from project root directory"
    exit 1
fi

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo "Error: backend/.env not found"
    echo "Please create it with Supabase credentials"
    exit 1
fi

# Start backend in background
echo "Starting backend..."
cd backend

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment and install dependencies
source .venv/bin/activate
echo "Installing backend dependencies..."
pip install -q -r requirements.txt

# Test backend setup
echo "Testing backend configuration..."
python test_setup.py

# Start backend server in background
echo "Starting backend server on http://localhost:8000"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

cd ..

# Give backend time to start
sleep 3

# Start frontend
echo ""
echo "Starting frontend on http://localhost:5173"
echo ""
echo "========================================="
echo "✅ Backend: http://localhost:8000"
echo "✅ Frontend: http://localhost:5173"
echo "✅ API Docs: http://localhost:8000/docs"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start frontend (this will block until Ctrl+C)
npm run dev

# Cleanup on exit
echo ""
echo "Stopping backend server..."
kill $BACKEND_PID
echo "Done!"
