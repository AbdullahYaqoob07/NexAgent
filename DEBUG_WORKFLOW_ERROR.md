# Debugging Workflow Creation Error

## Steps to Debug

### 1. Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab. You should now see detailed error logs including:
- Full error object
- Error response data
- Error status code
- Error message

### 2. Check Backend Terminal
Look at your backend terminal where you ran `python run.py`. You should see error logs like:
```
❌ Failed to create workflow: <error message>
Create workflow error: <error details>
```

### 3. Common Issues

#### Issue 1: Workflow Name Too Short
- **Error**: "Workflow name must be at least 3 characters long"
- **Fix**: Make sure your workflow name is at least 3 characters

#### Issue 2: User Document Doesn't Exist
- **Error**: "User document not found" (this should be handled now)
- **Fix**: The backend should create the user document automatically

#### Issue 3: Firestore Connection
- **Error**: Connection errors or permission denied
- **Fix**: Check Firebase credentials in `.env` file

#### Issue 4: Authentication Token
- **Error**: 401 Unauthorized
- **Fix**: Make sure you're signed in and the token is valid

### 4. Test the Backend Directly

You can test the backend API directly using curl or Postman:

```bash
# Get your Firebase ID token from browser console:
# In browser console, run:
# firebase.auth().currentUser.getIdToken().then(token => console.log(token))

# Then use it in curl:
curl -X POST http://localhost:8000/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "name": "Test Workflow",
    "description": "Test",
    "canBeListed": false,
    "nodes": [],
    "edges": [],
    "variables": {}
  }'
```

### 5. Check Backend Logs

The backend should log:
- ✅ Workflow created: {workflow_id} for user {user_id}
- OR
- ❌ Failed to create workflow: {error}

Look for these logs in your backend terminal.

## What to Share

If the error persists, please share:
1. **Browser Console Error** - The full error object from the console
2. **Backend Terminal Logs** - The error logs from your backend
3. **Workflow Name** - What name you're trying to use
4. **Network Tab** - In browser DevTools, check the Network tab for the failed request and share:
   - Request URL
   - Request Payload
   - Response Status
   - Response Body


