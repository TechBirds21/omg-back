# Backend Setup Guide - O Maguva E-Commerce

## Quick Start

The backend is a Python FastAPI server that connects to Supabase database.

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Starting the Backend

#### Option 1: Using the Startup Script (Recommended)

```bash
cd backend
./start_backend.sh
```

The script will automatically:
- Create a virtual environment if it doesn't exist
- Install all required packages
- Set up environment variables
- Start the server on http://localhost:8000

#### Option 2: Manual Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Verify Backend is Running

Once started, the backend will be available at:

- **API Base URL**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

You should see output like:

```
============================================================
🚀 Omaguva Backend starting up...
============================================================
✅ Database: Supabase
⚠️  Storage: Cloudflare R2 not configured
============================================================
```

## Environment Configuration

The backend uses a `.env` file which is automatically created with Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Database preference
DATABASE_PREFERENCE=supabase

# Application settings
APP_NAME=Omaguva Backend
DEBUG=True
```

## Database Connection

The backend is configured to use **Supabase** as the primary database.

### Database Architecture

```
Backend (FastAPI)
    ↓
Unified Database Service
    ↓
Supabase Service → Supabase PostgreSQL
```

### Connection Status

Check database connection at startup. You should see:
- ✅ `Database: Supabase` - Connected successfully
- ⚠️ `Database: Not configured` - Check .env file

## API Endpoints

### Store/Customer APIs

- `GET /api/store/products` - Get products with filters
- `GET /api/store/products/{id}` - Get product by ID
- `GET /api/store/products/by-name/{name}` - Get product by name
- `GET /api/store/categories` - Get all categories
- `GET /api/store/testimonials` - Get testimonials
- `GET /api/store/settings` - Get store settings
- `POST /api/store/orders` - Create new order

### Admin APIs

- `GET /api/admin/products` - Get all products (admin)
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/{id}` - Update product
- `DELETE /api/admin/products/{id}` - Delete product
- `GET /api/admin/categories` - Get categories
- `GET /api/admin/orders` - Get orders
- `PUT /api/admin/orders/{id}/status` - Update order status

### Payment APIs

- `POST /api/payments/phonepe/init` - Initialize PhonePe payment
- `POST /api/payments/phonepe/callback` - PhonePe callback
- `POST /api/payments/easebuzz/init` - Initialize Easebuzz payment
- `POST /api/payments/zohopay/init` - Initialize ZohoPay payment

### Store Billing APIs

- `GET /api/store-billing/products` - Get products for POS
- `GET /api/store-billing/categories` - Get categories
- `POST /api/store-billing/bills` - Create bill
- `GET /api/store-billing/bills` - Get bills history

## Troubleshooting

### Backend Won't Start

1. **Check Python version**:
   ```bash
   python3 --version  # Should be 3.8 or higher
   ```

2. **Check if port 8000 is in use**:
   ```bash
   # On Linux/Mac:
   lsof -i :8000
   # On Windows:
   netstat -ano | findstr :8000
   ```

3. **Check .env file exists**:
   ```bash
   cat backend/.env
   ```

4. **Install dependencies manually**:
   ```bash
   cd backend
   pip install fastapi uvicorn supabase pydantic pydantic-settings
   ```

### Database Connection Errors

1. **Verify Supabase credentials** in `.env`:
   - SUPABASE_URL should start with `https://`
   - SUPABASE_KEY should be the anon key

2. **Test connection manually**:
   ```python
   from supabase import create_client

   url = "your_supabase_url"
   key = "your_supabase_key"

   client = create_client(url, key)
   result = client.table("products").select("*").limit(1).execute()
   print(result.data)
   ```

3. **Check Supabase dashboard**:
   - Go to https://supabase.com
   - Verify your project is active
   - Check API settings

### Virtual Environment Issues

If you get `pip: command not found`:

```bash
# Install pip
python3 -m ensurepip --upgrade

# Or use system package manager
# Ubuntu/Debian:
sudo apt-get install python3-pip

# macOS:
brew install python3
```

## Development Mode

The backend runs in **reload mode** by default, which means:
- File changes automatically restart the server
- Useful for development
- Debug mode is enabled

For production, change in `.env`:
```env
DEBUG=False
```

And start without reload:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Dependencies

Main packages:
- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **supabase** - Supabase client
- **pydantic** - Data validation
- **httpx** - HTTP client
- **reportlab** - PDF generation (invoices)
- **twilio** - SMS notifications
- **sqlalchemy** - Database ORM (if using PostgreSQL directly)

See `requirements.txt` for full list.

## Port Configuration

Default port: **8000**

To change the port:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

Don't forget to update the frontend `.env`:
```env
VITE_API_BASE=http://localhost:9000/api
```

## Testing the Backend

### 1. Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
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

### 3. Get Categories
```bash
curl http://localhost:8000/api/store/categories
```

### 4. Interactive API Docs
Open in browser: http://localhost:8000/docs

You can test all endpoints directly from the Swagger UI.

## Logs

Backend logs are printed to console. You'll see:
- Incoming requests
- Database queries
- Error messages
- Startup information

For persistent logs, redirect output:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1
```

## Next Steps

1. Start the backend: `cd backend && ./start_backend.sh`
2. Verify it's running: Open http://localhost:8000/docs
3. Start the frontend: `npm run dev` (in project root)
4. Access the app: http://localhost:5173

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify `.env` configuration
3. Ensure Supabase project is active
4. Check that port 8000 is available
5. Try reinstalling dependencies: `pip install -r requirements.txt --force-reinstall`
