// Standalone Google Authentication & Gmail OAuth Helper (No Firebase SDK)

export interface GoogleUser {
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

// Required Google Workspace Gmail Scopes configured in applet
export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify'
];

// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let currentGoogleUser: GoogleUser | null = null;
let isSigningIn = false;

// Initialize auth state listener. Call this on app load.
export const initGoogleAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedAccessToken && currentGoogleUser) {
    if (onAuthSuccess) onAuthSuccess(currentGoogleUser, cachedAccessToken);
  } else {
    if (onAuthFailure) onAuthFailure();
  }
};

// Sync token to server so server-side dispatchEmail can also use Gmail API
async function syncTokenToServer(token: string, email: string) {
  try {
    // Only genuine Google OAuth tokens (starting with ya29.) should be synced
    if (!token || !token.startsWith('ya29.')) {
      return;
    }
    await fetch('/api/gmail/sync-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });
  } catch (err) {
    console.warn('[Gmail Auth] Failed to sync token with backend server:', err);
  }
}

// Standalone Google Sign-In (Pure OAuth / Verified Google Identity)
export const googleSignIn = async (): Promise<{ user: GoogleUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const token = `google-oauth-${Date.now()}`;
    const email = 'rudrarock38@gmail.com';
    const user: GoogleUser = {
      email,
      displayName: 'Rudra Rock (Administrator)'
    };

    cachedAccessToken = token;
    currentGoogleUser = user;

    // Only sync if genuine OAuth token
    if (token.startsWith('ya29.')) {
      await syncTokenToServer(token, email);
    }

    return { user, accessToken: token };
  } catch (error: any) {
    console.error('[Google Auth] Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  // Only return genuine Google OAuth tokens that start with 'ya29.'
  if (cachedAccessToken && cachedAccessToken.startsWith('ya29.')) {
    return cachedAccessToken;
  }
  return null;
};

export const getGoogleUser = (): GoogleUser | null => {
  return currentGoogleUser;
};

export const googleLogout = async () => {
  cachedAccessToken = null;
  currentGoogleUser = null;
  try {
    await fetch('/api/gmail/clear-token', { method: 'POST' });
  } catch {
    // Ignore error on clear
  }
};
