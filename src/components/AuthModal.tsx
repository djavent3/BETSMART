'use client';

import React, { useState } from 'react';
import {
  auth,
  googleProvider,
  appleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@/lib/firebase';
import { User } from 'firebase/auth';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const cleanHandle = username.replace(/^[!@\s]+/, '').replace(/\s+/g, '').toLowerCase();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cleanHandle) {
          await updateProfile(cred.user, { displayName: `!${cleanHandle}` });
        }
        onSuccess({ ...cred.user, displayName: cleanHandle ? `!${cleanHandle}` : cred.user.displayName });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(cred.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: typeof googleProvider | typeof appleProvider) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, provider);
      onSuccess(cred.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Pop-up sign-in cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
      >
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">
              {mode === 'login' ? 'Welcome Back to BETSMART' : 'Create Your !Handle'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {mode === 'login'
                ? 'Sign in to access custom filters and profile settings.'
                : 'Claim your unique !username and customize your prop feed.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              mode === 'login' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              mode === 'signup' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* OAuth Providers */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleOAuth(googleProvider)}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleOAuth(appleProvider)}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-extrabold rounded-xl border border-neutral-700 transition cursor-pointer"
          >
             Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-[1px] bg-neutral-800 flex-1"></div>
          <span className="text-[10px] font-bold uppercase text-neutral-500">or with email</span>
          <div className="h-[1px] bg-neutral-800 flex-1"></div>
        </div>

        {/* Email & !Username Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                Username Handle
              </label>
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <span className="pl-3.5 pr-1 text-sm font-extrabold text-emerald-400">!</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^[!@]+/, ''))}
                  placeholder="username"
                  className="w-full bg-transparent px-2 py-2.5 text-sm text-white focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Log In to Account' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
