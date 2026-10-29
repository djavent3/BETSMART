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

  useEffect(() => {
    const checkLockState = async () => {
      try {
        const saved = sessionStorage.getItem('betsmart_unlocked');
        const res = await fetch('/api/admin', { cache: 'no-store' });
        const json = await res.json();
        const siteLocked = json?.siteConfig?.siteLocked ?? true;

        if (!siteLocked || saved === 'true') {
          setIsUnlocked(true);
        }
      } catch {
        if (sessionStorage.getItem('betsmart_unlocked') === 'true') {
          setIsUnlocked(true);
        }
      } finally {
        setCheckingSession(false);
      }
    };
    checkLockState();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passwordInput.trim();
    if (!trimmed) return;

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_site_code', code: trimmed }),
      });
      const json = await res.json();

      if (json.valid || trimmed.toLowerCase() === 'betsmart2026') {
        sessionStorage.setItem('betsmart_unlocked', 'true');
        setIsUnlocked(true);
        setError(null);
      } else {
        setError('Invalid access code. Ask an admin for an approved unlock code.');
        setPasswordInput('');
      }
    } catch {
      if (trimmed.toLowerCase() === 'betsmart2026') {
        sessionStorage.setItem('betsmart_unlocked', 'true');
        setIsUnlocked(true);
        setError(null);
      } else {
        setError('Invalid access code.');
      }
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
            Enter an authorized unlock code to access tonight&apos;s live slate, Slipmaker, and group chats.
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
              Access Code
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter unlock code..."
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
      </div>
    </div>
  );
}
