# 🚀 Render Deployment - Step by Step Guide

## ✅ Pre-Deployment Checklist

- [x] Backend code is ready
- [x] `render.yaml` file exists and is configured
- [x] `backend/Procfile` exists
- [x] `backend/requirements.txt` is up to date
- [x] Frontend build created (`dist/` folder)
- [x] Frontend ZIP created (`frontend-build.zip`)

---

## 📋 Step 1: Initialize Git Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Ready for Render deployment"
```

---

## 📋 Step 2: Push to GitHub

1. **Create a new repository on GitHub** (if you don't have one)
   - Go to: https://github.com/new
   - Repository name: `omaguva-ecommerce` (or your preferred name)
   - Make it **Private** (recommended)
   - **Don't** initialize with README, .gitignore, or license

2. **Connect and push**:
```bash
# Add remote (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/omaguva-ecommerce.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## 📋 Step 3: Deploy Backend to Render

### 3.1 Create Web Service

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. **Connect your GitHub repository**:
   - Click "Connect GitHub" (if not connected)
   - Authorize Render
   - Select your repository: `omaguva-ecommerce`
   - Click "Connect"

### 3.2 Configure Service

**Basic Settings**:
- **Name**: `omaguva-backend`
- **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **IMPORTANT**
- **Environment**: `Python 3` ⚠️ **MUST BE PYTHON, NOT BUN**

**Build & Deploy**:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**OR** if `render.yaml` exists, Render will auto-detect these settings.

### 3.3 Set Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**:

**Required Variables**:
```
DATABASE_PREFERENCE=supabase
SUPABASE_URL=https://yxaohpktlgkspapnhbwa.supabase.co
SUPABASE_KEY=<your-supabase-service-role-key>
APP_NAME=Omaguva Backend
DEBUG=false
```

**Optional Variables** (if using):
```
PHONEPE_ENABLED=false
PHONEPE_MERCHANT_ID=<your-merchant-id>
PHONEPE_MERCHANT_SECRET=<your-merchant-secret>
PHONEPE_PAYMENT_CALLBACK_URL=https://omaguva-backend.onrender.com/payments/phonepe/callback
```

### 3.4 Deploy

1. Click **"Create Web Service"**
2. Wait for build (5-10 minutes first time)
3. Check build logs for any errors
4. Once deployed, note your service URL:
   - Example: `https://omaguva-backend.onrender.com`
   - Your API: `https://omaguva-backend.onrender.com/api`

### 3.5 Verify Backend

Test these URLs:
- Health: `https://omaguva-backend.onrender.com/healthz`
- API Health: `https://omaguva-backend.onrender.com/api/health`
- API Docs: `https://omaguva-backend.onrender.com/docs`

---

## 📋 Step 4: Update Frontend Environment Variables

After backend is deployed, update frontend environment variables:

**In your hosting platform**, set:
```
VITE_API_BASE=https://omaguva-backend.onrender.com/api
VITE_API_URL=https://omaguva-backend.onrender.com
VITE_SUPABASE_URL=https://yxaohpktlgkspapnhbwa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YW9ocGt0bGdrc3BhcG5oYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzA1OTAsImV4cCI6MjA2ODc0NjU5MH0.Ezxz85xISpTXJXj2LZIENv0PflBWxobkTDRKkB0-rec
```

**⚠️ IMPORTANT**: Replace `omaguva-backend.onrender.com` with your actual Render backend URL!

---

## 📋 Step 5: Deploy Frontend

### Option A: Using ZIP File (HostingRaja/Shared Hosting)

1. **Extract `frontend-build.zip`**
2. **Upload all contents** of `dist/` folder to your hosting root directory
3. **Set environment variables** in hosting control panel (if supported)
4. **Configure SPA routing** (see below)

### Option B: Using Vercel/Netlify

1. **Connect repository** to Vercel/Netlify
2. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
3. **Set environment variables** (see Step 4)
4. **Deploy**

---

## 🔧 SPA Routing Configuration

If your hosting platform doesn't support SPA routing automatically, create these files:

### For Apache (.htaccess)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### For Nginx (nginx.conf)
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## ✅ Post-Deployment Verification

### Backend
- [ ] Health endpoint works: `/healthz`
- [ ] API docs accessible: `/docs`
- [ ] API endpoints respond correctly
- [ ] Database connection working

### Frontend
- [ ] Homepage loads
- [ ] Products display correctly
- [ ] API calls work (check browser console)
- [ ] No CORS errors
- [ ] Routing works (try navigating to different pages)

---

## 🆘 Common Issues & Fixes

### Backend Issues

**Issue**: "uvicorn: command not found"
- **Fix**: Ensure Environment is set to `Python 3` (not Bun)
- **Fix**: Ensure Root Directory is `backend`
- **Fix**: Remove `backend/ $` prefix from commands

**Issue**: "Module not found"
- **Fix**: Check `requirements.txt` includes all dependencies
- **Fix**: Check build logs for missing packages

**Issue**: Database connection fails
- **Fix**: Verify `SUPABASE_URL` and `SUPABASE_KEY` are set correctly
- **Fix**: Check `DATABASE_PREFERENCE=supabase` is set

### Frontend Issues

**Issue**: API calls fail (CORS error)
- **Fix**: Backend CORS is already configured to allow all origins
- **Fix**: Verify `VITE_API_BASE` is correct

**Issue**: 404 on page refresh
- **Fix**: Configure SPA routing (see above)
- **Fix**: Ensure hosting supports SPA routing

**Issue**: Environment variables not working
- **Fix**: Rebuild frontend after setting variables
- **Fix**: Variables must start with `VITE_`
- **Fix**: Clear browser cache

---

## 📝 Important Notes

1. **Backend URL**: After deployment, update frontend `VITE_API_BASE` with your actual Render URL
2. **Auto-Deploy**: Render auto-deploys on git push (if enabled)
3. **Environment Variables**: Keep sensitive keys secure, never commit to git
4. **Custom Domain**: You can add custom domain in Render Settings → Custom Domains
5. **SSL**: Render provides free SSL certificates automatically

---

## 🎯 Quick Reference

**Backend URL**: `https://omaguva-backend.onrender.com`  
**API Base**: `https://omaguva-backend.onrender.com/api`  
**Health Check**: `https://omaguva-backend.onrender.com/healthz`  
**API Docs**: `https://omaguva-backend.onrender.com/docs`

**Frontend Build**: `frontend-build.zip` (ready to upload)

---

## ✅ Deployment Complete!

Once both backend and frontend are deployed:
1. Test all major features
2. Verify payments work (if configured)
3. Check mobile responsiveness
4. Monitor error logs
5. Set up monitoring/alerts (optional)

Good luck with your deployment! 🚀

