import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  inMemoryPersistence,
  signOut,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCWVOrZQGJXpGwRxK6D7yc6cuqunDbYOcQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "betsmart-2fc51.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "betsmart-2fc51",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "betsmart-2fc51.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "504035893043",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:504035893043:web:4d8c6eb1319a286e56a846",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Enforce in-memory persistence so users are never automatically re-logged in on page load
if (typeof window !== 'undefined') {
  setPersistence(auth, inMemoryPersistence).catch((err) => {
    console.warn('Auth persistence setup warning:', err);
  });
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const appleProvider = new OAuthProvider('apple.com');

export function formatBangUsername(user: User | null): string {
  if (!user) return '!guest';
  const raw = user.displayName || user.email?.split('@')[0] || 'bettor';
  const cleaned = raw.replace(/^[!@\s]+/, '').replace(/\s+/g, '').toLowerCase();
  return `!${cleaned || 'bettor'}`;
}

export {
  app,
  auth,
  googleProvider,
  appleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
};
