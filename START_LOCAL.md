# 🚀 Start O Maguva E-Commerce Locally

## ✅ Database Connected: https://sqmkdczbkfmgdlbotdtf.supabase.co
**Status**: ✅ OPERATIONAL (16 categories, 90 products, 7621 orders)

---

## Quick Start (3 Steps)

### 1. Test Backend Connection (Recommended First)
```bash
cd backend
python3 test_connection.py
```

### 2. Start Backend
**Linux/Mac**: `cd backend && ./start_backend.sh`  
**Windows**: `cd backend && start_backend.bat`

Backend: http://localhost:8000  
API Docs: http://localhost:8000/docs

### 3. Start Frontend (New Terminal)
```bash
npm run dev
```

Frontend: http://localhost:5173

---

## ✅ Verify Everything Works

```bash
# Backend health
curl http://localhost:8000/health

# Get categories (should return 16)
curl http://localhost:8000/api/store/categories | jq 'length'

# Get products (should return products array)
curl http://localhost:8000/api/store/products | jq 'length'
```

---

## 🔧 Troubleshooting

### Backend Won't Start
- Install Python 3.8+
- `cd backend && pip install -r requirements.txt`
- Check port 8000 is free

### Frontend Shows No Data
- Ensure backend is running on port 8000
- Check browser console (F12) for errors
- Verify .env has `VITE_API_BASE=http://localhost:8000/api`

### Connection Test Fails
- Check `backend/.env` exists
- Run: `cd backend && python3 test_connection.py`

---

## 📦 What's Available
- 16 Categories
- 90 Products
- 4 Testimonials
- 5 Payment Gateways
- 7,621 Orders

**Database is ready! Just start the servers.** 🎉
