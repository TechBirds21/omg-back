# 🚀 Deployment Guide - Omaguva E-commerce

## Quick Deployment Checklist

### ✅ Pre-Deployment
- [x] Backend code ready
- [x] Frontend build created
- [x] Environment variables documented
- [ ] Git repository initialized
- [ ] Render account ready

---

## 📦 Part 1: Backend Deployment to Render

### Step 1: Initialize Git Repository (if not already done)
```bash
git init
git add .
git commit -m "Initial commit - Ready for deployment"
```

### Step 2: Push to GitHub/GitLab
```bash
# Create repository on GitHub first, then:
git remote add origin https://github.com/yourusername/omaguva-backend.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **New → Web Service**
3. **Connect Repository**: Select your GitHub repository
4. **Configure Service**:
   - **Name**: `omaguva-backend`
   - **Environment**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. **Set Environment Variables** (in Render Dashboard):
   ```
   DATABASE_PREFERENCE=supabase
   SUPABASE_URL=https://yxaohpktlgkspapnhbwa.supabase.co
   SUPABASE_KEY=<your-supabase-service-role-key>
   APP_NAME=Omaguva Backend
   DEBUG=false
   ```

6. **Advanced Settings**:
   - Auto-Deploy: `Yes`
   - Health Check Path: `/healthz`

7. **Click "Create Web Service"**

### Step 4: Get Backend URL
After deployment, note your backend URL:
- Example: `https://omaguva-backend.onrender.com`
- Your API will be at: `https://omaguva-backend.onrender.com/api`

---

## 🌐 Part 2: Frontend Deployment

### Option A: Deploy to Hosting Platform (Using ZIP)

1. **Build is already created** in `dist/` folder
2. **ZIP file created**: `frontend-build.zip`
3. **Upload to your hosting platform**:
   - Extract the ZIP file
   - Upload all contents of `dist/` folder to your hosting root directory
   - Configure environment variables (see below)

### Option B: Deploy to Vercel/Netlify

1. **Connect repository** to Vercel/Netlify
2. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Set environment variables** (see below)

---

## 🔧 Environment Variables for Frontend

Set these in your hosting platform's environment variables section:

```env
VITE_API_BASE=https://omaguva-backend.onrender.com/api
VITE_API_URL=https://omaguva-backend.onrender.com
VITE_SUPABASE_URL=https://yxaohpktlgkspapnhbwa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YW9ocGt0bGdrc3BhcG5oYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzA1OTAsImV4cCI6MjA2ODc0NjU5MH0.Ezxz85xISpTXJXj2LZIENv0PflBWxobkTDRKkB0-rec
```

**Important**: Replace `omaguva-backend.onrender.com` with your actual Render backend URL after deployment!

---

## 📋 Post-Deployment Verification

### Backend Health Check
```bash
curl https://your-backend.onrender.com/healthz
curl https://your-backend.onrender.com/api/health
```

### Frontend Check
1. Visit your frontend URL
2. Check browser console for errors
3. Verify API calls are working
4. Test a product page load

---

## 🔗 Important URLs

- **Backend API**: `https://omaguva-backend.onrender.com/api`
- **API Docs**: `https://omaguva-backend.onrender.com/docs`
- **Health Check**: `https://omaguva-backend.onrender.com/healthz`

---

## 🆘 Troubleshooting

### Backend Issues
- Check Render logs for errors
- Verify environment variables are set
- Ensure `DATABASE_PREFERENCE=supabase` is set
- Check Supabase credentials

### Frontend Issues
- Verify `VITE_API_BASE` points to correct backend URL
- Check CORS settings in backend
- Ensure all environment variables are set
- Clear browser cache

---

## 📝 Notes

- Backend auto-deploys on git push (if enabled)
- Frontend needs manual rebuild after environment variable changes
- Always test in production after deployment
- Keep environment variables secure

