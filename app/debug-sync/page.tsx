'use client';

import { useAuth } from '@/lib/AuthContext';
import { userSyncService } from '@/lib/userSync';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugSyncPage() {
  const { user } = useAuth();
  const [syncResult, setSyncResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleManualSync = async () => {
    if (!user) {
      setSyncResult('❌ No user logged in');
      return;
    }

    setLoading(true);
    setSyncResult('🔄 Starting manual sync...');

    try {
      console.log('🚀 Manual sync started for user:', user.email);
      const syncedUser = await userSyncService.syncUser(user);
      console.log('✅ Manual sync completed:', syncedUser);
      setSyncResult(`✅ User synced successfully!\nUID: ${syncedUser.uid}\nEmail: ${syncedUser.email}\nProfile: ${syncedUser.profile.firstName} ${syncedUser.profile.lastName}`);
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setSyncResult(`❌ Sync failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetUser = async () => {
    if (!user) {
      setSyncResult('❌ No user logged in');
      return;
    }

    setLoading(true);
    setSyncResult('🔍 Checking if user exists in Firestore...');

    try {
      const firestoreUser = await userSyncService.getUser(user.uid);
      if (firestoreUser) {
        setSyncResult(`✅ User found in Firestore!\n${JSON.stringify({
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          profile: firestoreUser.profile,
          subscription: firestoreUser.subscription,
          createdAt: firestoreUser.createdAt
        }, null, 2)}`);
      } else {
        setSyncResult('❌ User NOT found in Firestore');
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
      setSyncResult(`❌ Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConnection = async () => {
    setLoading(true);
    setSyncResult('🔍 Checking Firebase connection...');

    try {
      // Try to get all users (this will test the connection)
      const users = await userSyncService.getAllUsers();
      setSyncResult(`✅ Firebase connection working!\nFound ${users.length} users in database`);
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      setSyncResult(`❌ Firebase connection failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Debug User Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">Please sign in to test user sync.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white">Debug User Sync</h1>
        
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Current User (Firebase Auth)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Display Name:</strong> {user.displayName}</p>
            <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
            <p><strong>Photo URL:</strong> {user.photoURL || 'None'}</p>
            <p><strong>Provider Data:</strong> {JSON.stringify(user.providerData, null, 2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Debug Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={handleCheckConnection} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Check Firebase Connection
              </Button>
              <Button 
                onClick={handleGetUser} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Check User in Firestore
              </Button>
              <Button 
                onClick={handleManualSync} 
                disabled={loading}
                className="bg-[#FF6900] hover:bg-[#E55D00]"
              >
                Manual Sync User
              </Button>
            </div>

            {syncResult && (
              <div className="mt-4 p-4 bg-black/50 rounded-lg">
                <h3 className="font-bold mb-2">Result:</h3>
                <pre className="text-sm whitespace-pre-wrap">{syncResult}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}