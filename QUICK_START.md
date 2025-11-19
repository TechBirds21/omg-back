# Quick Start Guide - O Maguva E-Commerce

## 🚀 Getting Started in 3 Steps

### Step 1: Start the Backend (Python)

**On Linux/Mac:**
```bash
cd backend
./start_backend.sh
```

**On Windows:**
```bash
cd backend
start_backend.bat
```

The backend will:
- Install Python dependencies automatically
- Connect to Supabase database
- Start on http://localhost:8000

**Verify Backend is Running:**
Open in browser: http://localhost:8000/docs

You should see the FastAPI documentation page.

---

### Step 2: Start the Frontend (React)

In a new terminal, from the project root:

```bash
npm install  # Only needed first time
npm run dev
```

The frontend will start on http://localhost:5173

---

### Step 3: Access the Application

**Customer Store:**
- Homepage: http://localhost:5173
- Collections: http://localhost:5173/collections
- Cart: http://localhost:5173/cart

**Admin Panel:**
- Login: http://localhost:5173/admin/login
- Dashboard: http://localhost:5173/admin
- Products: http://localhost:5173/admin/products
- Orders: http://localhost:5173/admin/orders
- Settings: http://localhost:5173/admin/settings

**Store Billing (POS):**
- POS System: http://localhost:5173/store-billing

---

## 📋 Prerequisites

### Backend Requirements:
- Python 3.8 or higher
- pip (Python package manager)

### Frontend Requirements:
- Node.js 18 or higher
- npm 8 or higher

---

## 🔧 Configuration

### Database (Already Configured)
- **Type**: Supabase PostgreSQL
- **Connection**: Configured in backend/.env
- **Status**: Check at startup logs

### Environment Variables

**Backend** (backend/.env):
```env
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_KEY=your_key_here
DATABASE_PREFERENCE=supabase
DEBUG=True
```

**Frontend** (.env):
```env
VITE_API_BASE=http://localhost:8000/api
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

---

## ✅ Verify Everything is Working

### 1. Backend Health Check
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "Omaguva Backend"
}
```

### 2. Get Products
```bash
curl http://localhost:8000/api/store/products
```

Should return a list of products.

### 3. Frontend Homepage
Open http://localhost:5173 - You should see the O Maguva homepage.

---

## 🎯 Common Issues & Solutions

### Backend Won't Start

**Issue**: `python: command not found`
**Solution**: Install Python 3.8+ from https://www.python.org/downloads/

**Issue**: `Port 8000 already in use`
**Solution**:
```bash
# Find and kill the process
lsof -i :8000  # On Mac/Linux
netstat -ano | findstr :8000  # On Windows
```

**Issue**: `Module not found`
**Solution**:
```bash
cd backend
pip install -r requirements.txt
```

### Frontend Won't Start

**Issue**: `Cannot find module`
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue**: `Port 5173 already in use`
**Solution**: Vite will automatically use the next available port.

### Database Connection Failed

**Issue**: Backend shows "Database: Not configured"
**Solution**:
1. Check backend/.env exists
2. Verify SUPABASE_URL and SUPABASE_KEY are correct
3. Restart the backend

---

## 📁 Project Structure

```
project/
├── backend/              # Python FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI app
│   ├── .env             # Backend config
│   ├── requirements.txt # Python dependencies
│   ├── start_backend.sh # Linux/Mac startup
│   └── start_backend.bat # Windows startup
│
├── src/                 # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities & API calls
│   └── main.tsx        # React entry point
│
├── supabase/           # Supabase config
│   └── migrations/     # Database migrations
│
├── .env                # Frontend config
├── package.json        # Node dependencies
└── vite.config.ts      # Vite config
```

---

## 🔑 Default Admin Credentials

**Note**: Check your Supabase database for admin users or set up authentication in the admin panel.

---

## 📚 Additional Documentation

- **Backend Setup**: See `BACKEND_SETUP.md`
- **Deployment**: See `DEPLOYMENT_README.md`
- **API Documentation**: http://localhost:8000/docs (when backend is running)

---

## 🆘 Need Help?

1. **Backend Issues**: Check backend console logs
2. **Frontend Issues**: Check browser console (F12)
3. **Database Issues**: Check Supabase dashboard
4. **API Issues**: Use http://localhost:8000/docs to test endpoints

---

## 🎉 You're All Set!

Your O Maguva E-Commerce platform should now be running:
- 🐍 Backend: http://localhost:8000
- ⚛️ Frontend: http://localhost:5173
- 📚 API Docs: http://localhost:8000/docs

Happy coding! 🚀
