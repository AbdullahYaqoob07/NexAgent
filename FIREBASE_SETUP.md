# Firebase Setup Guide

This guide will help you set up Firebase for your NexAgent project.

## 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDuJDldiipKP8J3Y75aPKbl-YWOJXZgfK4
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nexagent-90391.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nexagent-90391
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nexagent-90391.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1046484949871
NEXT_PUBLIC_FIREBASE_APP_ID=1:1046484949871:web:f36f1aa6fb7f49953ea69a
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-CGDZL03W91
```

## 2. Firebase Configuration

The Firebase configuration is set up in `lib/firebase.ts` with the following features:

- **Environment-based configuration**: Uses environment variables for security
- **Singleton pattern**: Prevents multiple Firebase app initializations
- **Browser-safe analytics**: Only initializes analytics in browser environment
- **Exported services**: Auth, Firestore, Storage, and Analytics are ready to use

## 3. Usage

Import and use Firebase services in your components:

```typescript
import { auth, db, storage, analytics } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

// Authentication
const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
  }
};

// Firestore
const addData = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error('Error adding document:', error);
  }
};

// Storage
const uploadFile = async (file: File, path: string) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return snapshot.ref;
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};
```

## 4. Available Services

- **Authentication**: `auth` - User authentication and management
- **Firestore**: `db` - NoSQL database for storing and syncing data
- **Storage**: `storage` - File storage and management
- **Analytics**: `analytics` - User behavior analytics (browser only)

## 5. Security Notes

- All environment variables are prefixed with `NEXT_PUBLIC_` to make them available in the browser
- The `.env.local` file is already included in `.gitignore` to prevent committing secrets
- Never commit your actual Firebase configuration to version control

## 6. Next Steps

1. Create your `.env.local` file with the provided configuration
2. Restart your development server: `npm run dev`
3. Start using Firebase services in your components
4. Configure Firebase Authentication rules in the Firebase Console
5. Set up Firestore security rules as needed

## 7. Firebase Console

Access your Firebase project at: https://console.firebase.google.com/project/nexagent-90391
