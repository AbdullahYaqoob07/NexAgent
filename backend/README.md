# NexAgent FastAPI Backend

This is the FastAPI backend for the NexAgent workflow automation platform, using Firebase for authentication and data storage.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Firebase Project with Admin SDK credentials
- Redis (optional, for caching)

### Installation

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment setup**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your Firebase credentials and other settings
   ```

4. **Firebase setup**:
   - Get your Firebase Admin SDK credentials from Firebase Console
   - Update the Firebase configuration in `.env`

### Running the Server

**Development mode**:
```bash
python run.py
```

**Production mode**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Create new user account |
| POST | `/api/v1/auth/signin` | Sign in user (returns user info) |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/verify-token` | Verify Firebase ID token |
| GET | `/api/v1/auth/me` | Get current user profile |

### Example Requests

**Sign Up**:
```json
POST /api/v1/auth/signup
{
  "email": "user@example.com",
  "password": "securepassword123",
  "display_name": "John Doe"
}
```

**Verify Token**:
```json
POST /api/v1/auth/verify-token
{
  "token": "firebase-id-token-here"
}
```

**Get Current User**:
```bash
GET /api/v1/auth/me
Authorization: Bearer firebase-id-token-here
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Environment
ENVIRONMENT=development
DEBUG=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Security
SECRET_KEY=your-super-secret-key-here

# Firebase Configuration (Required)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

### Firebase Setup

1. Go to Firebase Console → Project Settings → Service accounts
2. Generate new private key
3. Add the credentials to your `.env` file
4. Make sure Firestore is enabled in your Firebase project

## 🏗️ Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py        # Settings and configuration
│   ├── models/
│   │   ├── __init__.py
│   │   └── auth_models.py   # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   └── firebase_service.py  # Firebase integration
│   └── api/
│       └── v1/
│           ├── __init__.py
│           └── auth.py      # Authentication routes
├── .env.example
├── requirements.txt
├── run.py                   # Development runner
└── README.md
```

## 🔐 Authentication Flow

1. **Frontend Registration**:
   - User signs up through frontend Firebase Auth
   - Backend creates user profile in Firestore

2. **Frontend Sign In**:
   - User signs in through frontend Firebase Auth
   - Frontend receives ID token

3. **API Requests**:
   - Frontend sends ID token in Authorization header
   - Backend verifies token using Firebase Admin SDK
   - Backend returns user data or performs authenticated actions

## 🧪 Testing

**Test health endpoint**:
```bash
curl http://localhost:8000/health
```

**Test authentication**:
```bash
# Sign up
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "display_name": "Test User"}'
```

## 🚀 Deployment

### Docker (Coming Soon)

### Manual Deployment

1. Set environment variables on your server
2. Install dependencies: `pip install -r requirements.txt`
3. Run with production server: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Environment Variables for Production

- Set `ENVIRONMENT=production`
- Set `DEBUG=false`
- Use strong `SECRET_KEY`
- Configure proper CORS origins
- Use production Firebase credentials

## 📝 Development Notes

- This backend uses Firebase Auth for user authentication
- User data is stored in Firebase Firestore
- Authentication happens client-side, backend verifies tokens
- CORS is configured for Next.js frontend (localhost:3000)
- API documentation is available at `/docs` in development mode

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling and logging
3. Update models when adding new endpoints
4. Test your changes before submitting

## 📞 Support

For questions or issues, please check the main NexAgent repository or create an issue.