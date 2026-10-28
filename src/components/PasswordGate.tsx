'use client';

import React, { useState, useEffect } from 'react';

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const expectedPassword = process.env.NEXT_PUBLIC_TEST_PASSWORD || 'betsmart2026';

  useEffect(() => {
    const saved = sessionStorage.getItem('betsmart_unlocked');
    if (saved === 'true') {
      setIsUnlocked(true);
    }
    setCheckingSession(false);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim().toLowerCase() === expectedPassword.toLowerCase()) {
      sessionStorage.setItem('betsmart_unlocked', 'true');
      setIsUnlocked(true);
      setError(null);
    } else {
      setError('Invalid tester access code. Ask the host for tonight’s password.');
      setPasswordInput('');
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-neutral-950" />;
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 text-center">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/70 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Private Beta Slate
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">
            BETSMART
          </h1>
          <p className="text-xs text-neutral-400">
            Enter the private tester password to unlock tonight&apos;s live game slate, Slipmaker, and group chats.
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs font-semibold">
            🔒 {error}
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 mb-1.5">
              Tester Access Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter access code..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/60"
          >
            Unlock Tonight&apos;s Slate →
          </button>
        </form>

        <p className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-800/80">
          Authorized friends & beta testers only • Session remains unlocked until browser tab closes
        </p>
      </div>
    </div>
  );
}
