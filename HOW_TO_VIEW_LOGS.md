# How to View Backend Logs

## Where to See Logs

### 1. Backend Terminal/Console

The backend logs appear in **real-time** in the terminal where you started the backend server.

#### If Backend is Running:
- **Look at the terminal/console window** where you ran:
  ```bash
  cd backend
  python -m uvicorn app.main:app --reload
  ```
- All logs will appear there in real-time

#### If Backend is NOT Running:
1. Open a new terminal/command prompt
2. Navigate to the backend directory:
   ```bash
   cd D:\omaguva_backend\backend
   ```
3. Start the backend:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
4. Logs will appear in this terminal

### 2. What to Look For

When you try to make a ZohoPay payment, you'll see logs like:

```
[ZohoPay Initiate] Full Payload JSON:
{
  "amount": "1420",
  "currency_code": "INR",
  "reference_id": "NOVS1165",
  "description": "OMS25 (Brown)",
  ...
}
[ZohoPay Initiate] URL: https://payments.zoho.in/api/v1/paymentsessions?account_id=60056500354
[ZohoPay Initiate] Account ID: 60056500354
[ZohoPay Initiate] Access Token (first 20 chars): 1005.9bbec7d81f39642...
[ZohoPay Initiate] Response Status: 400
[ZohoPay Initiate] Full Error Response: {"code":"error","message":"Please ensure that the currency is valid."}
```

### 3. Log Locations

- **Backend Logs**: Terminal where `uvicorn` is running
- **Frontend Logs**: Browser Developer Console (F12 → Console tab)
- **Network Requests**: Browser Developer Tools → Network tab

### 4. Quick Test

To verify logs are working:
1. Make a payment attempt
2. Check the backend terminal immediately
3. You should see `[ZohoPay Initiate]` messages

## Troubleshooting

### If you don't see logs:
- Make sure backend is running
- Check the correct terminal window
- Verify the backend started successfully (you should see "Uvicorn running on http://0.0.0.0:8000")

### If backend is not running:
```bash
cd D:\omaguva_backend\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

