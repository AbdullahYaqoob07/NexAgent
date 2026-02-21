# Fix: Backend Connection Refused Error

## Problem
```
GET http://localhost:8000/api/v1/two-factor/check-account-status?email=... 
net::ERR_CONNECTION_REFUSED
```

This means the **backend server is not running** or the URL is incorrect.

---

## Solution

### Step 1: Check if Backend is Running

Open a new terminal and check:
```bash
# Check if port 8000 is in use
# Windows
netstat -ano | findstr :8000

# Mac/Linux
lsof -i :8000
```

If nothing shows up, the backend is **not running**.

---

### Step 2: Start the Backend Server

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment (if you have one)
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start the server
python run.py
```

You should see:
```
🚀 Starting NexAgent API server...
📍 Environment: development
🌐 Server: http://0.0.0.0:8000
📚 Docs: http://0.0.0.0:8000/docs
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### Step 3: Verify Frontend Environment Variable

Check your `.env.local` file in the **root directory** (not in `backend/`):

**File: `NexAgent/.env.local`**
```env
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
```

**Important:**
- File must be in the **root** `NexAgent/` directory
- Variable name must be exactly: `NEXT_PUBLIC_BACKEND_API_URL`
- Value must be: `http://localhost:8000` (no trailing slash)

---

### Step 4: Restart Frontend

After updating `.env.local`:
```bash
# Stop frontend (Ctrl+C)
# Then restart
npm run dev
```

---

### Step 5: Test Backend Connection

Open browser and visit:
```
http://localhost:8000/docs
```

You should see the API documentation page. If you see an error, the backend is not running correctly.

---

## Alternative: Make Account Status Check Optional

The code has been updated to handle backend unavailability gracefully. If the backend is not running, login will still work (without account lockout checking).

However, for full 2FA functionality, you **must** have the backend running.

---

## Quick Checklist

- [ ] Backend server is running (`python run.py` in `backend/` directory)
- [ ] Backend shows "Uvicorn running on http://0.0.0.0:8000"
- [ ] `.env.local` exists in root directory with `NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000`
- [ ] Frontend has been restarted after adding `.env.local`
- [ ] Can access `http://localhost:8000/docs` in browser

---

## Still Having Issues?

### Check Backend Logs
Look at the terminal where backend is running for errors:
- Firebase credentials missing?
- Port 8000 already in use?
- Python dependencies missing?

### Check Frontend Console
Open browser DevTools → Console:
- Is `NEXT_PUBLIC_BACKEND_API_URL` defined?
- Any other connection errors?

### Test with curl
```bash
# Test if backend is responding
curl http://localhost:8000/health

# Should return: {"status": "healthy"}
```

---

## Development Workflow

**Terminal 1 - Backend:**
```bash
cd backend
python run.py
```

**Terminal 2 - Frontend:**
```bash
cd NexAgent  # or just in root if already there
npm run dev
```

Both should be running simultaneously!

