import { NextRequest } from 'next/server';

export interface ServerAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

/**
 * Get authenticated user from Authorization header
 * For now, this is a simplified version that trusts the token
 * In production, you should verify tokens using Firebase Admin SDK
 */
export async function getServerAuthUser(request: NextRequest): Promise<ServerAuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    if (!token) {
      return null;
    }

    // TODO: Implement proper Firebase Admin SDK token verification
    // For now, decode the token client-side (NOT SECURE for production)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      return {
        uid: payload.user_id || payload.sub,
        email: payload.email || null,
        displayName: payload.name || null,
        photoURL: payload.picture || null,
        emailVerified: payload.email_verified || false,
      };
    } catch (tokenError) {
      console.error('Error parsing token:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}

/**
 * Get authenticated user ID from request
 */
export async function getServerAuthUserId(request: NextRequest): Promise<string | null> {
  const user = await getServerAuthUser(request);
  return user?.uid || null;
}

/**
 * Middleware helper to ensure user is authenticated
 */
export async function requireAuth(request: NextRequest): Promise<ServerAuthUser> {
  const user = await getServerAuthUser(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}
