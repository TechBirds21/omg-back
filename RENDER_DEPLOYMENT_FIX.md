# Render Deployment Fix

## Issue
Render was detecting Bun instead of Python, causing `uvicorn: command not found` error.

## Solution

### Option 1: Use render.yaml (Recommended)
The `render.yaml` file in the root directory will configure Render correctly:
- **Environment**: Python
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Option 2: Manual Configuration in Render Dashboard

1. **Go to Render Dashboard** → Your Service → Settings
2. **Set Environment**: `Python 3`
3. **Set Root Directory**: `backend`
4. **Set Build Command**: `pip install -r requirements.txt`
5. **Set Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Important Settings

- **Environment**: Must be `Python 3` (not Bun, not Node)
- **Root Directory**: `backend` (so it finds requirements.txt)
- **Python Version**: 3.9 or higher (Render will auto-detect)

### Verify

After deployment, check:
- Service should show "Python" as environment
- Build logs should show `pip install` running
- Start command should show `uvicorn` starting

---

## Files Updated

1. ✅ `render.yaml` - Added proper Python configuration
2. ✅ `backend/Procfile` - Simplified (Render uses rootDir setting)

---

**Note**: If Render still detects Bun, manually set the environment to Python in the dashboard.

