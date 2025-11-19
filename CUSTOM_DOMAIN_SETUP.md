# 🌐 Custom Domain Setup Guide

## Overview
This guide shows you how to use your own domain (e.g., `api.yourdomain.com`) for the backend API instead of Render's default URL.

---

## ✅ Benefits of Custom Domain

1. **Professional**: Clean URLs like `api.yourdomain.com` instead of `xxx.onrender.com`
2. **Branding**: Matches your main domain
3. **Flexibility**: Easy to switch hosting providers later
4. **SSL**: Automatic HTTPS with Let's Encrypt

---

## 🔧 Step 1: Add Custom Domain in Render

1. **Go to Render Dashboard** → Your Backend Service → Settings
2. **Scroll to "Custom Domains"** section
3. **Click "Add Custom Domain"**
4. **Enter your domain**: 
   - Example: `api.yourdomain.com` or `backend.yourdomain.com`
   - Or: `api.omaguva.com` (use your actual domain)
5. **Click "Save"**

Render will show you DNS records to add.

---

## 📝 Step 2: Configure DNS Records

### Option A: CNAME (Recommended)

In your domain registrar (GoDaddy, Namecheap, etc.):

1. **Go to DNS Management**
2. **Add CNAME Record**:
   - **Name/Host**: `api` (or `backend`)
   - **Value/Target**: `your-service-name.onrender.com` (provided by Render)
   - **TTL**: `3600` (or default)

**Example**:
```
Type: CNAME
Name: api
Value: omaguva-backend-xxxx.onrender.com
TTL: 3600
```

### Option B: A Record (If CNAME not supported)

1. **Get IP address** from Render (they'll provide it)
2. **Add A Record**:
   - **Name**: `api`
   - **Value**: `IP address from Render`
   - **TTL**: `3600`

---

## ⏳ Step 3: Wait for DNS Propagation

1. **DNS propagation**: Usually 5-30 minutes, can take up to 48 hours
2. **Check status**: Render dashboard will show "Pending" → "Active"
3. **SSL Certificate**: Render automatically provisions SSL (may take a few minutes)

**Test DNS**:
```bash
# Check if DNS is resolving
nslookup api.yourdomain.com

# Or use online tools:
# - https://dnschecker.org
# - https://www.whatsmydns.net
```

---

## ✅ Step 4: Verify Custom Domain

1. **Check Render Dashboard**: Domain should show "Active" with green checkmark
2. **Test Health Endpoint**:
   ```
   https://api.yourdomain.com/healthz
   ```
   Should return: `{"status": "ok"}`

3. **Test API Endpoint**:
   ```
   https://api.yourdomain.com/api/health
   ```

---

## 🔄 Step 5: Update Frontend Configuration

### Update Environment Variables

**In HostingRaja Dashboard** (or `.env.production`):

```env
# OLD (Render URL)
# VITE_API_BASE=https://omaguva-backend-xxxx.onrender.com/api
# VITE_API_URL=https://omaguva-backend-xxxx.onrender.com

# NEW (Custom Domain)
VITE_API_BASE=https://api.yourdomain.com/api
VITE_API_URL=https://api.yourdomain.com
```

**Important**: Replace `yourdomain.com` with your actual domain!

### Rebuild Frontend

After updating environment variables:

```bash
npm run build
# Upload new dist/ folder to HostingRaja
```

Or if using Git integration, push changes and HostingRaja will rebuild.

---

## 🔐 Step 6: Update CORS (If Needed)

If you restricted CORS in backend, update `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",           # Main domain
        "https://www.yourdomain.com",       # WWW subdomain
        "https://api.yourdomain.com",       # API subdomain (if needed)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Or keep `allow_origins=["*"]` for development.

---

## 🔗 Step 7: Update Webhook URLs

Update payment gateway webhook URLs to use custom domain:

### ZohoPay
- **Old**: `https://xxx.onrender.com/api/payments/zohopay/webhook`
- **New**: `https://api.yourdomain.com/api/payments/zohopay/webhook`

### PhonePe
- **Old**: `https://xxx.onrender.com/api/payments/phonepe/callback`
- **New**: `https://api.yourdomain.com/api/payments/phonepe/callback`

### Easebuzz
- **Old**: `https://xxx.onrender.com/api/payments/easebuzz/webhook`
- **New**: `https://api.yourdomain.com/api/payments/easebuzz/webhook`

**Update these in**:
- Payment gateway dashboards (ZohoPay, PhonePe, Easebuzz)
- Backend environment variables (if using)

---

## 🧪 Testing Checklist

- [ ] DNS resolves correctly (`nslookup api.yourdomain.com`)
- [ ] HTTPS works (`https://api.yourdomain.com/healthz`)
- [ ] SSL certificate is valid (green lock in browser)
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints work from frontend
- [ ] CORS allows requests from frontend domain
- [ ] Webhook URLs updated in payment gateways
- [ ] Frontend uses new API URL (check browser Network tab)

---

## 🐛 Troubleshooting

### DNS Not Resolving

**Problem**: `nslookup` returns nothing or wrong IP

**Solutions**:
1. Wait longer (DNS can take up to 48 hours)
2. Check DNS record is correct (typo in name/value)
3. Clear DNS cache: `ipconfig /flushdns` (Windows)
4. Try different DNS server: `nslookup api.yourdomain.com 8.8.8.8`

### SSL Certificate Not Working

**Problem**: Browser shows "Not Secure" or certificate error

**Solutions**:
1. Wait 5-10 minutes after DNS propagation
2. Check Render dashboard - SSL status should be "Active"
3. Clear browser cache
4. Try incognito/private mode
5. Check certificate: `https://www.ssllabs.com/ssltest/`

### CORS Errors

**Problem**: Frontend gets CORS errors when calling API

**Solutions**:
1. Update `allow_origins` in `backend/app/main.py` to include frontend domain
2. Check frontend is using correct API URL
3. Verify HTTPS is used (not HTTP)
4. Check browser console for exact error message

### API Returns 404

**Problem**: Custom domain works but endpoints return 404

**Solutions**:
1. Verify you're using full path: `https://api.yourdomain.com/api/health`
2. Check Render service is running
3. Check Render logs for errors
4. Test with Render URL first to isolate issue

---

## 📋 Quick Reference

### Domain Examples

**Good**:
- `api.omaguva.com`
- `backend.omaguva.com`
- `api.yourdomain.com`

**Avoid**:
- `omaguva.com` (use subdomain for API)
- `www.api.omaguva.com` (unnecessary www)

### DNS Record Examples

**CNAME**:
```
Type: CNAME
Name: api
Value: omaguva-backend-xxxx.onrender.com
```

**A Record** (if needed):
```
Type: A
Name: api
Value: 123.45.67.89 (IP from Render)
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ `https://api.yourdomain.com/healthz` returns `{"status": "ok"}`
2. ✅ Browser shows green lock (valid SSL)
3. ✅ Frontend can make API calls successfully
4. ✅ No CORS errors in browser console
5. ✅ Payment webhooks work correctly

---

**Need Help?** Check Render's documentation: https://render.com/docs/custom-domains

