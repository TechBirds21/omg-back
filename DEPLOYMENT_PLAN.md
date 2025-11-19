# 🚀 Deployment Plan: Omaguva Backend & Frontend

## Overview
- **Backend**: Deploy to Render (Python/FastAPI)
- **Frontend**: Deploy to HostingRaja (React/Vite)
- **Database**: Supabase (already configured)
- **Storage**: Cloudflare R2 (optional, for file uploads)

---

## 📋 Pre-Deployment Checklist

### ✅ Code Readiness
- [x] Backend API endpoints working locally
- [x] Frontend builds successfully
- [x] Database schema matches code
- [x] Environment variables documented
- [ ] All tests passing (if applicable)
- [ ] Git repository ready

### ✅ Account Setup
- [ ] Render account created
- [ ] HostingRaja account created
- [ ] Git repository access configured
- [ ] Supabase credentials available
- [ ] Cloudflare R2 credentials (if using)

---

## 🔧 Part 1: Backend Deployment (Render)

### Step 1: Prepare Render Configuration

#### 1.1 Create `render.yaml` (Optional - for Infrastructure as Code)
```yaml
services:
  - type: web
    name: omaguva-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_PREFERENCE
        value: supabase
      - key: SUPABASE_URL
        sync: false  # Set manually
      - key: SUPABASE_KEY
        sync: false  # Set manually
```

#### 1.2 Create `Procfile` (Alternative to render.yaml)
```procfile
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Step 2: Render Dashboard Setup

1. **Go to Render Dashboard** → New → Web Service
2. **Connect Repository**:
   - Select your Git repository
   - Choose branch (usually `main` or `master`)

3. **Configure Build Settings**:
   - **Name**: `omaguva-backend`
   - **Environment**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables** (in Render Dashboard → Environment):
   ```
   # Database Configuration
   DATABASE_PREFERENCE=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-service-role-key
   
   # Application
   APP_NAME=Omaguva Backend
   DEBUG=false
   
   # Cloudflare R2 (Optional - for file storage)
   R2_ACCOUNT_ID=your-r2-account-id
   R2_ACCESS_KEY_ID=your-r2-access-key
   R2_SECRET_ACCESS_KEY=your-r2-secret-key
   R2_BUCKET_NAME=omaguva-storage
   R2_PUBLIC_BASE_URL=https://your-bucket.r2.dev
   
   # PhonePe (if using)
   PHONEPE_ENABLED=false
   PHONEPE_MERCHANT_ID=your-merchant-id
   PHONEPE_MERCHANT_SECRET=your-merchant-secret
   PHONEPE_PAYMENT_CALLBACK_URL=https://your-backend-url.onrender.com/payments/phonepe/callback
   
   # ZohoPay (if using)
   VITE_ZOHOPAY_ACCOUNT_ID=your-account-id
   VITE_ZOHOPAY_DOMAIN=IN
   VITE_ZOHOPAY_API_KEY=your-api-key
   ```

5. **Advanced Settings**:
   - **Auto-Deploy**: `Yes` (deploys on git push)
   - **Health Check Path**: `/healthz`
   - **Plan**: Free tier (or upgrade as needed)

### Step 3: Deploy & Verify

1. **Click "Create Web Service"**
2. **Wait for build** (5-10 minutes first time)
3. **Check logs** for any errors
4. **Test health endpoint**: `https://your-service.onrender.com/healthz`
5. **Test API endpoint**: `https://your-service.onrender.com/api/health`

### Step 4: Configure Custom Domain (Optional but Recommended)

**To use your own domain (e.g., `api.yourdomain.com`) instead of Render's URL:**

1. **In Render Dashboard** → Your Service → Settings → Custom Domains
2. **Add Custom Domain**:
   - Enter your domain: `api.yourdomain.com` (or `backend.yourdomain.com`)
   - Render will provide DNS records to add
3. **Update DNS** (in your domain registrar):
   - Add CNAME record: `api` → `your-service.onrender.com`
   - Or A record as provided by Render
4. **Wait for SSL** (Render automatically provisions SSL certificates)
5. **Verify**: Test `https://api.yourdomain.com/healthz`

**Note**: You can still use Render's URL during setup, then switch to custom domain later.

### Step 5: Get Backend URL
- **Render URL**: `https://omaguva-backend-xxxx.onrender.com` (temporary)
- **Custom Domain**: `https://api.yourdomain.com` (after DNS setup)
- **Save the URL you'll use** - you'll need it for frontend configuration

---

## 🎨 Part 2: Frontend Deployment (HostingRaja)

### Step 1: Build Frontend Locally (Test First)

```bash
# In project root
npm install
npm run build

# Test the build locally
npm run preview
```

### Step 2: Prepare Environment Variables

Create `.env.production` file:
```env
# Backend API URL - Use your custom domain (recommended)
VITE_API_BASE=https://api.yourdomain.com/api
VITE_API_URL=https://api.yourdomain.com

# Or use Render URL temporarily (replace with custom domain later)
# VITE_API_BASE=https://omaguva-backend-xxxx.onrender.com/api
# VITE_API_URL=https://omaguva-backend-xxxx.onrender.com

# Supabase (for frontend direct access if needed)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# ZohoPay (if using)
VITE_ZOHOPAY_ACCOUNT_ID=your-account-id
VITE_ZOHOPAY_DOMAIN=IN
VITE_ZOHOPAY_API_KEY=your-api-key

# Default Images
VITE_DEFAULT_LOGO_URL=https://your-cdn.com/logo.png
VITE_DEFAULT_PRODUCT_IMAGE=https://your-cdn.com/default-product.png
```

**Important**: 
- HostingRaja may require you to set these in their dashboard instead of `.env` file
- Check HostingRaja documentation for environment variable setup

### Step 3: HostingRaja Dashboard Setup

#### Option A: FTP/File Upload
1. **Build locally**:
   ```bash
   npm run build
   ```
2. **Upload `dist/` folder contents** to HostingRaja via FTP
3. **Configure**:
   - Document root: `/dist` or `/public_html`
   - SPA routing: Enable (for React Router)

#### Option B: Git Integration (if available)
1. **Connect Git repository** in HostingRaja dashboard
2. **Set build command**: `npm install && npm run build`
3. **Set output directory**: `dist`
4. **Set environment variables** in HostingRaja dashboard

### Step 4: Configure HostingRaja

1. **Domain Setup**:
   - Point your domain to HostingRaja nameservers
   - Or use HostingRaja subdomain

2. **SPA Routing** (Critical for React Router):
   - Create `.htaccess` file in root (if Apache):
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
   - Or configure in HostingRaja dashboard (if available)

3. **Environment Variables**:
   - Add all `VITE_*` variables in HostingRaja dashboard
   - Rebuild after adding variables

### Step 5: Deploy & Verify

1. **Upload/Deploy** files
2. **Test**:
   - Homepage loads
   - API calls work (check browser console)
   - Navigation works (SPA routing)
   - Payment flows work

---

## 🔗 Part 3: Connect Frontend to Backend

### Update Frontend API Configuration

1. **Update API base URLs** in frontend code (if hardcoded):
   - Check `src/lib/api-*.ts` files
   - They should use `import.meta.env.VITE_API_BASE`

2. **Update CORS** in backend (if needed):
   - Backend already allows all origins (`allow_origins=["*"]`)
   - If you want to restrict, update `backend/app/main.py`:
   ```python
   allow_origins=[
       "https://yourdomain.com",
       "https://www.yourdomain.com",
   ]
   ```

---

## 🧪 Part 4: Testing Checklist

### Backend Tests
- [ ] Health check: `GET /healthz` → 200 OK
- [ ] API health: `GET /api/health` → 200 OK
- [ ] Database connection working
- [ ] Payment endpoints accessible
- [ ] Store billing endpoints working

### Frontend Tests
- [ ] Homepage loads
- [ ] Products display
- [ ] Add to cart works
- [ ] Checkout flow works
- [ ] Payment integration works
- [ ] Admin dashboard accessible
- [ ] Store billing page works
- [ ] All API calls succeed (check Network tab)

### Integration Tests
- [ ] Create order → Backend receives it
- [ ] Payment callback → Backend processes it
- [ ] Invoice generation → PDF downloads
- [ ] Store bill creation → Database updated

---

## 📝 Part 5: Post-Deployment

### 1. Update Webhook URLs
If using payment gateways, update webhook URLs to use your custom domain:
- **ZohoPay**: `https://api.yourdomain.com/api/payments/zohopay/webhook`
- **PhonePe**: `https://api.yourdomain.com/api/payments/phonepe/callback`
- **Easebuzz**: `https://api.yourdomain.com/api/payments/easebuzz/webhook`

**Note**: Replace `api.yourdomain.com` with your actual custom domain!

### 2. Monitor Logs
- **Render**: Dashboard → Logs tab
- **HostingRaja**: Check error logs in dashboard
- **Browser Console**: Check for frontend errors

### 3. Performance Optimization
- Enable CDN for static assets (if available)
- Optimize images
- Enable compression
- Monitor API response times

---

## 🔐 Security Checklist

- [ ] Environment variables secured (not in git)
- [ ] CORS configured properly
- [ ] API rate limiting (if needed)
- [ ] HTTPS enabled (both frontend and backend)
- [ ] Supabase RLS policies configured
- [ ] Payment gateway credentials secured

---

## 🐛 Troubleshooting

### Backend Issues

**Build fails**:
- Check `requirements.txt` is correct
- Check Python version (should be 3.9+)
- Check build logs in Render dashboard

**Database connection fails**:
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check Supabase project is active
- Verify RLS policies allow service role

**API returns 500**:
- Check Render logs
- Verify all environment variables are set
- Check database connection

### Frontend Issues

**Build fails**:
- Check Node.js version (should be 18+)
- Check all dependencies install correctly
- Check for TypeScript errors

**API calls fail**:
- Verify `VITE_API_BASE` is correct
- Check CORS settings in backend
- Check browser console for errors
- Verify backend is running

**Routing doesn't work**:
- Ensure SPA routing is configured
- Check `.htaccess` file (if Apache)
- Verify `index.html` is served for all routes

**Environment variables not working**:
- Rebuild after adding variables
- Check variable names start with `VITE_`
- Verify variables are set in HostingRaja dashboard

---

## 📊 Environment Variables Summary

### Backend (Render)
```
DATABASE_PREFERENCE=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
R2_ACCOUNT_ID=xxx (optional)
R2_ACCESS_KEY_ID=xxx (optional)
R2_SECRET_ACCESS_KEY=xxx (optional)
R2_BUCKET_NAME=xxx (optional)
PHONEPE_ENABLED=false (optional)
PHONEPE_MERCHANT_ID=xxx (optional)
PHONEPE_MERCHANT_SECRET=xxx (optional)
```

### Frontend (HostingRaja)
```
# Use your custom domain for API (recommended)
VITE_API_BASE=https://api.yourdomain.com/api
VITE_API_URL=https://api.yourdomain.com

# Or use Render URL temporarily
# VITE_API_BASE=https://xxx.onrender.com/api
# VITE_API_URL=https://xxx.onrender.com

VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_ZOHOPAY_ACCOUNT_ID=xxx (optional)
VITE_ZOHOPAY_DOMAIN=IN (optional)
VITE_ZOHOPAY_API_KEY=xxx (optional)
```

**Important**: Replace `api.yourdomain.com` with your actual custom domain!

---

## 🎯 Quick Start Commands

### Local Testing
```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
npm install
npm run dev
```

### Production Build
```bash
# Backend (Render handles this)
# Just push to git

# Frontend
npm run build
# Upload dist/ to HostingRaja
```

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **HostingRaja Docs**: Check their dashboard/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev
- **FastAPI Docs**: https://fastapi.tiangolo.com

---

## ✅ Final Checklist Before Going Live

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] All environment variables set
- [ ] Database connection working
- [ ] Payment gateways configured
- [ ] Webhook URLs updated
- [ ] SSL/HTTPS enabled
- [ ] Domain configured
- [ ] All features tested
- [ ] Error monitoring set up
- [ ] Backup strategy in place

---

**Ready to deploy?** Share your Render and Git details, and we'll proceed step by step! 🚀

