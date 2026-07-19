import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const isPlaceholderKey = (value: string | undefined | null) => {
  if (!value) return true;
  return /REPLACE_WITH_|MY_[A-Z0-9_]+_API_KEY|YOUR_|CHANGE_ME/i.test(value);
};

const resolvedApiKey = import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
const hasValidApiKey = !isPlaceholderKey(resolvedApiKey);

// Initialize Firebase App
const app = initializeApp(
  hasValidApiKey
    ? {
        ...firebaseConfig,
        apiKey: resolvedApiKey,
      }
    : {
        ...firebaseConfig,
        apiKey: 'demo-mode-disabled',
      }
);
const auth = hasValidApiKey ? getAuth(app) : null;

const provider = new GoogleAuthProvider();
// Request Google Drive Scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

// Set custom parameters to force select account if desired
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => undefined;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // We have a user but no access token cached yet (e.g. from page refresh).
        // Since we store tokens strictly in-memory, they must sign-in again to refresh the Drive token,
        // which is standard for security in this sandbox environment.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth) {
    throw new Error('Firebase Auth is disabled in demo mode. Set VITE_FIREBASE_API_KEY to enable Google Drive.');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  if (!auth) {
    cachedAccessToken = null;
    return;
  }

  await auth.signOut();
  cachedAccessToken = null;
};
