# 🔐 Environment Variables Reference

## Backend (Render) - Required Variables

Set these in Render Dashboard → Your Service → Environment:

```env
# Database Configuration
DATABASE_PREFERENCE=supabase
SUPABASE_URL=https://yxaohpktlgkspapnhbwa.supabase.co
SUPABASE_KEY=<your-supabase-service-role-key>

# Application
APP_NAME=Omaguva Backend
DEBUG=false
```

## Backend (Render) - Optional Variables

```env
# PhonePe Payment Gateway
PHONEPE_ENABLED=false
PHONEPE_MERCHANT_ID=<your-merchant-id>
PHONEPE_MERCHANT_SECRET=<your-merchant-secret>
PHONEPE_SALT_INDEX=1
PHONEPE_CLIENT_ID=<your-client-id>
PHONEPE_CLIENT_SECRET=<your-client-secret>
PHONEPE_PAYMENT_CALLBACK_URL=https://omaguva-backend.onrender.com/payments/phonepe/callback

# Cloudflare R2 Storage (Optional)
R2_ACCOUNT_ID=<your-r2-account-id>
R2_ACCESS_KEY_ID=<your-r2-access-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret-key>
R2_BUCKET_NAME=omaguva-storage
R2_PUBLIC_BASE_URL=https://your-bucket.r2.dev
```

## Frontend (Hosting Platform) - Required Variables

Set these in your hosting platform's environment variables:

```env
# API Configuration
VITE_API_BASE=https://omaguva-backend.onrender.com/api
VITE_API_URL=https://omaguva-backend.onrender.com

# Supabase Configuration
VITE_SUPABASE_URL=https://yxaohpktlgkspapnhbwa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YW9ocGt0bGdrc3BhcG5oYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzA1OTAsImV4cCI6MjA2ODc0NjU5MH0.Ezxz85xISpTXJXj2LZIENv0PflBWxobkTDRKkB0-rec
```

## Frontend (Hosting Platform) - Optional Variables

```env
# ZohoPay (if using)
VITE_ZOHOPAY_ACCOUNT_ID=<your-account-id>
VITE_ZOHOPAY_DOMAIN=IN
VITE_ZOHOPAY_API_KEY=<your-api-key>
```

---

## ⚠️ Important Notes

1. **Replace Backend URL**: After deploying to Render, replace `omaguva-backend.onrender.com` with your actual Render service URL
2. **Supabase Key**: Use your **Service Role Key** (not anon key) for backend
3. **Security**: Never commit these values to git
4. **Rebuild**: Frontend needs to be rebuilt after changing environment variables

---

## 🔍 How to Get Supabase Service Role Key

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy **"service_role"** key (keep this secret!)

---

## 📝 After Deployment

1. Update `VITE_API_BASE` in frontend with your actual Render URL
2. Rebuild frontend if environment variables changed
3. Test all API endpoints
4. Verify CORS is working

