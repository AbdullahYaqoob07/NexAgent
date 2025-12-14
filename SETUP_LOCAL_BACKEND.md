# Setting Up Local Backend (Railway Trial Ended)

Since your Railway trial ended, let's set up the backend to run locally.

## Quick Setup Steps

### 1. Install Python Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Create `.env` File in `backend/` Directory

Create a file `backend/.env` with:

```env
# Environment
ENVIRONMENT=development
DEBUG=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_VERSION=v1

# Security
SECRET_KEY=your-local-dev-secret-key-change-in-production

# Firebase Configuration (Get from Firebase Console)
FIREBASE_PROJECT_ID=nexagent-90391
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nexagent-90391.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# CORS (for local development)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=INFO
```

### 3. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `nexagent-90391`
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Copy the values to your `.env` file

### 4. Run the Backend

```bash
cd backend
python run.py
```

You should see:
```
🚀 Starting NexAgent API server...
📍 Environment: development
🌐 Server: http://0.0.0.0:8000
📚 Docs: http://0.0.0.0:8000/docs
```

### 5. Update Frontend to Use Local Backend

Create or update `.env.local` in the **root** directory (not backend):

```env
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
```

### 6. Restart Your Frontend

```bash
# Stop the current frontend (Ctrl+C)
# Then restart
npm run dev
```

## Testing

1. **Backend Health Check**: Open http://localhost:8000/health in your browser
2. **API Docs**: Open http://localhost:8000/docs
3. **Frontend**: Should now connect to local backend at http://localhost:3000

## Troubleshooting

### Port 8000 Already in Use
```bash
# Change port in backend/.env
API_PORT=8001

# And update frontend .env.local
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8001
```

### Firebase Authentication Errors
- Make sure you copied the Firebase credentials correctly
- The private key should be on multiple lines with `\n` in the .env file
- Or use the JSON file path method (see below)

### CORS Errors
- Make sure `CORS_ORIGINS` in `backend/.env` includes `http://localhost:3000`
- Restart the backend after changing .env

## Alternative: Use Firebase JSON File

Instead of putting Firebase credentials in `.env`, you can:

1. Place the downloaded Firebase JSON file in `backend/` as `firebase-credentials.json`
2. Update `backend/app/core/config.py` to read from the file

But for now, the `.env` method is simpler.

