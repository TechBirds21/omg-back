# Local Development Setup

This guide will help you set up and run the application locally with the backend and frontend connected.

## Prerequisites

- **Python 3.9+** (for backend)
- **Node.js 18+** (for frontend)
- **npm or bun** (for package management)

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Linux/Mac:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify setup
python test_setup.py

# Start backend server
uvicorn app.main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`

### 2. Frontend Setup

```bash
# In a new terminal, navigate to project root
cd ..

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

The frontend will start at `http://localhost:5173`

## Configuration

### Backend (.env file)

The backend `.env` file is already configured at `backend/.env` with:
- Supabase database connection
- Debug mode enabled
- CORS configured for local development

### Frontend (.env file)

The frontend `.env` file is configured at the project root with:
- `VITE_API_BASE=http://localhost:8000/api` - Points to local backend
- `VITE_SUPABASE_URL` - Supabase database URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Verification

### Check Backend Status

Visit: `http://localhost:8000/healthz`

You should see a health check response with database status.

### Check API Endpoints

- Health: `http://localhost:8000/healthz`
- API Docs: `http://localhost:8000/docs`
- Admin API: `http://localhost:8000/api/admin/*`
- ZohoPay Config: `http://localhost:8000/api/payments/zohopay/config`

### Test Database Connection

Run the verification script:
```bash
cd backend
python test_setup.py
```

This will verify:
- ✅ Configuration loaded correctly
- ✅ Database connection working
- ✅ ZohoPay configuration (if configured)

## ZohoPay Integration

### Configuration

ZohoPay needs to be configured through the admin panel:

1. Start both backend and frontend
2. Login to admin panel at `http://localhost:5173/admin`
3. Go to Settings → Payment Methods
4. Configure ZohoPay with:
   - Account ID
   - Access Token (OAuth token)
   - API Key
   - Domain (IN for India)

### OAuth Token Setup

To get a ZohoPay OAuth token:

1. Register your application at Zoho Developer Console
2. Get authorization code
3. Use the `/api/payments/zohopay/oauth/exchange` endpoint to exchange for access token
4. The token will be stored in the database automatically

### Testing ZohoPay

1. Visit: `http://localhost:8000/api/payments/zohopay/debug/config`
2. This shows the current ZohoPay configuration status
3. Test payment initiation through the checkout flow

## Common Issues

### Database Not Connected

**Symptom**: Backend shows "Database: Not configured"

**Solution**:
1. Check `backend/.env` file exists
2. Verify `SUPABASE_URL` and `SUPABASE_KEY` are set
3. Run `python test_setup.py` to verify connection

### CORS Errors

**Symptom**: Frontend shows CORS errors in browser console

**Solution**:
1. Ensure backend is running on port 8000
2. Check `backend/.env` has correct `ALLOWED_ORIGINS`
3. Restart backend server

### ZohoPay Not Working

**Symptom**: Payment initiation fails or shows "not configured"

**Solution**:
1. Visit `/api/payments/zohopay/debug/config` endpoint
2. Verify configuration is stored in database
3. Check access token is not expired
4. Use OAuth refresh endpoint if token expired

### Port Already in Use

**Symptom**: Cannot start backend/frontend - port in use

**Solution for Backend**:
```bash
# Use different port
uvicorn app.main:app --reload --port 8001
# Update VITE_API_BASE in frontend .env to match
```

**Solution for Frontend**:
```bash
# Vite will auto-select next available port
# Or specify port:
npm run dev -- --port 5174
```

## Development Workflow

1. **Start Backend First**: Always start the backend before frontend
2. **Hot Reload**: Both backend and frontend support hot reload
3. **API Testing**: Use FastAPI docs at `/docs` for testing endpoints
4. **Database Changes**: Reload backend after database schema changes

## Production Deployment

For production deployment:
- Set `DEBUG=false` in backend `.env`
- Use proper production database
- Configure proper CORS origins
- Use environment variables for secrets
- Build frontend: `npm run build`
- Serve backend with gunicorn or similar

## Support

If you encounter issues:
1. Check logs in terminal
2. Run `python test_setup.py` for diagnostics
3. Check API documentation at `/docs`
4. Verify all environment variables are set correctly
