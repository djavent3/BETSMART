'use client';

import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface Opportunity {
  eventId: string;
  league: string;
  matchup: string;
  marketType: string;
  selection: string;
  sharpBook: string;
  sharpOverOdds: number;
  sharpUnderOdds: number;
  targetBook: string;
  targetOdds: number;
  sharpVigPct: number;
  noVigFairOdds: number;
  trueWinProbabilityPct: number;
  evPercentage: number;
  recommendedBetSize: number;
  isPositiveEV: boolean;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  const [oddsLoading, setOddsLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    databaseConnected: boolean;
    activeSportsbooksCount: number;
    sportsbooks: Array<{ display_name: string; book_type: string }>;
    evFeed: Opportunity[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchOddsFeed = async () => {
    setOddsLoading(true);
    try {
      const res = await fetch('/api/fetch-odds');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
        setError(null);
      } else {
        setError(json.message || 'Failed to fetch odds');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
    } finally {
      setOddsLoading(false);
    }
  };

  useEffect(() => {
    fetchOddsFeed();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Authentication error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-neutral-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            BETSMART // +EV Companion
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time market inefficiency scanner & sharp consensus engine.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {authLoading ? (
            <div className="text-xs text-neutral-500">Loading session...</div>
          ) : user ? (
            <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl">
              {user.photoURL && (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-neutral-700" />
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-white">{user.displayName || 'User'}</p>
                <p className="text-[10px] text-neutral-400">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-3 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 rounded-lg transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-sm font-semibold rounded-xl transition shadow-lg cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign in with Google
            </button>
          )}

          <button
            onClick={fetchOddsFeed}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-xl transition border border-neutral-700 cursor-pointer"
          >
            {oddsLoading ? 'Scanning...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Database Status</p>
            <p className="text-lg font-bold mt-1 flex items-center gap-2">
              {data?.databaseConnected ? (
                <span className="text-emerald-400">Connected (Supabase)</span>
              ) : (
                <span className="text-amber-400">Connecting...</span>
              )}
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Active Books Monitored</p>
            <p className="text-lg font-bold mt-1 text-white">
              {data?.activeSportsbooksCount || 0} Books (Sharp & Square)
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Live +EV Edges Found</p>
            <p className="text-lg font-bold mt-1 text-emerald-400">
              {data?.evFeed?.filter(o => o.isPositiveEV).length || 0} Opportunities
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-4 rounded-xl mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {oddsLoading && !data && (
          <div className="text-center py-20 text-neutral-500">
            Analyzing sharp bookmaker consensus and running de-vig algorithms...
          </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
            <h2 className="font-semibold text-white">Live Positive Expected Value Feed (+EV)</h2>
            <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md">
              Sorted by Edge %
            </span>
          </div>

          <div className="divide-y divide-neutral-800">
            {data?.evFeed?.map((item, idx) => (
              <div key={idx} className="p-5 hover:bg-neutral-850/50 transition flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                      {item.league}
                    </span>
                    <span className="text-xs text-neutral-400">{item.matchup}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{item.selection}</h3>
                  <div className="text-xs text-neutral-400 flex gap-4">
                    <span>Sharp Book ({item.sharpBook}): <strong className="text-neutral-200">{item.sharpOverOdds}</strong></span>
                    <span>No-Vig Fair Odds: <strong className="text-emerald-400">{item.noVigFairOdds}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end">
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-neutral-400">Play at {item.targetBook}</p>
                    <p className="text-lg font-bold text-white">{item.targetOdds}</p>
                  </div>
                  
                  <div className="text-left lg:text-right bg-neutral-950 px-4 py-2 rounded-lg border border-neutral-800">
                    <p className="text-xs text-neutral-400">Edge (+EV)</p>
                    <p className="text-lg font-bold text-emerald-400">+{item.evPercentage}%</p>
                  </div>

                  <div className="text-left lg:text-right bg-emerald-950/30 px-4 py-2 rounded-lg border border-emerald-900/50">
                    <p className="text-xs text-emerald-400 font-medium">Rec. Stake (0.25K)</p>
                    <p className="text-lg font-bold text-emerald-300">${item.recommendedBetSize}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
