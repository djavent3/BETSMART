'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import ProfileModal from '@/components/ProfileModal';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // 1. TOP-LEVEL GLOBAL NAVIGATION
  // Left side: 'NBA' | 'NFL'
  // Right side specials: 'hit-rate' | 'nba-cup' | 'nfl-primetime'
  const [topCategory, setTopCategory] = useState<'NBA' | 'NFL' | 'hit-rate' | 'nba-cup' | 'nfl-primetime'>('NBA');

  // 2. SECONDARY FILTER BAR STATE
  const [activePlatform, setActivePlatform] = useState<string>('ALL');
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
  const [selectedGameId, setSelectedGameId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'compact'>('grid');

  // 3. MODAL DEEP-DIVE STATE
  const [selectedPropModal, setSelectedPropModal] = useState<any | null>(null);

  // API Data
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fetch-odds', { cache: 'no-store' });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      }
    } catch (err) {
      console.error('Error loading props:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // SmartScore Badge Styling (90-100 Emerald, 75-89 Blue, <75 Amber)
  const getSmartScoreBadge = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300',
        dot: '🔥',
        label: 'ELITE',
      };
    }
    if (score >= 75) {
      return {
        bg: 'bg-sky-950/90 border-sky-500/60 text-sky-300',
        dot: '🔵',
        label: 'STRONG',
      };
    }
    return {
      bg: 'bg-amber-950/90 border-amber-500/60 text-amber-300',
      dot: '🟡',
      label: 'SOLID',
    };
  };

  // Short Platform Pill Abbreviations for Compact View
  const getPlatformShort = (name: string) => {
    switch (name) {
      case 'PrizePicks': return { code: 'PP', cls: 'bg-purple-950 text-purple-300 border-purple-700/60' };
      case 'Underdog': return { code: 'UD', cls: 'bg-amber-950 text-amber-300 border-amber-700/60' };
      case 'ParlayPlay': return { code: 'PPlay', cls: 'bg-pink-950 text-pink-300 border-pink-700/60' };
      case 'FanDuel': return { code: 'FD', cls: 'bg-sky-950 text-sky-300 border-sky-700/60' };
      case 'DraftKings': return { code: 'DK', cls: 'bg-emerald-950 text-emerald-300 border-emerald-700/60' };
      case 'ESPN Bet': return { code: 'ESPN', cls: 'bg-teal-950 text-teal-300 border-teal-700/60' };
      default: return { code: name.slice(0, 3), cls: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    }
  };

  // Dynamic Markets based on current top selection
  const availableMarkets = useMemo(() => {
    if (!data?.playerProps) return ['ALL'];
    let poolProps = data.playerProps;
    if (topCategory === 'NBA' || topCategory === 'NFL') {
      poolProps = poolProps.filter((p: any) => p.sport === topCategory);
    }
    const unique = Array.from(new Set(poolProps.map((p: any) => p.market))) as string[];
    return ['ALL', ...unique];
  }, [data, topCategory]);

  // Dynamic Games when viewing NBA or NFL
  const availableGames = useMemo(() => {
    if (!data?.games) return [];
    if (topCategory === 'NBA' || topCategory === 'NFL') {
      return data.games.filter((g: any) => g.sport === topCategory);
    }
    return [];
  }, [data, topCategory]);

  // Filtered Props List
  const filteredProps = useMemo(() => {
    if (!data?.playerProps) return [];
    let list = [...data.playerProps];

    // 1. Top Bar Category Filter
    if (topCategory === 'NBA' || topCategory === 'NFL') {
      list = list.filter((p) => p.sport === topCategory);
    } else if (topCategory === 'hit-rate') {
      list = list.filter((p) => p.is100HitRate);
    } else if (topCategory === 'nba-cup') {
      list = list.filter((p) => p.customTags?.includes('nba-cup'));
    } else if (topCategory === 'nfl-primetime') {
      list = list.filter((p) => p.customTags?.includes('nfl-primetime'));
    }

    // 2. Secondary Bar: Platform Filter
    if (activePlatform !== 'ALL') {
      list = list.filter((p) => p.availablePlatforms?.includes(activePlatform));
    }

    // 3. Secondary Bar: Market Filter
    if (selectedMarket !== 'ALL') {
      list = list.filter((p) => p.market === selectedMarket);
    }

    // 4. Secondary Bar: Game Filter
    if (selectedGameId !== 'ALL') {
      list = list.filter((p) => p.gameId === selectedGameId);
    }

    // 5. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.player.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          p.market.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.smartScore - a.smartScore);
  }, [data, topCategory, activePlatform, selectedMarket, selectedGameId, searchQuery]);

  const handleSelectTopCategory = (cat: 'NBA' | 'NFL' | 'hit-rate' | 'nba-cup' | 'nfl-primetime') => {
    setTopCategory(cat);
    setSelectedMarket('ALL');
    setSelectedGameId('ALL');
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                BETSMART
              </h1>
              <span className="text-[11px] font-semibold bg-neutral-900 text-emerald-400 border border-neutral-800 px-2.5 py-0.5 rounded-full">
                Connected
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Simplified Player Prop Intelligence & SmartScore™ Consensus
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-white">{user.displayName || user.email}</span>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => signOut(auth)}
                    className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                  >
                    Exit
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signInWithPopup(auth, googleProvider)}
                  className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </header>

        {/* ================================================================= */}
        {/* 1. TOP BAR: LEFT = SPORTS | RIGHT = SPECIALS                      */}
        {/* ================================================================= */}
        <nav className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-neutral-900 p-2.5 rounded-2xl border border-neutral-800 shadow-lg">
          {/* LEFT: SPORTS */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 px-2">
              Sports
            </span>
            <button
              onClick={() => handleSelectTopCategory('NBA')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                topCategory === 'NBA'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              🏀 NBA
            </button>
            <button
              onClick={() => handleSelectTopCategory('NFL')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                topCategory === 'NFL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              🏈 NFL
            </button>
          </div>

          {/* RIGHT: SPECIALS */}
          <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-neutral-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 px-2">
              Specials
            </span>
            <button
              onClick={() => handleSelectTopCategory('hit-rate')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                topCategory === 'hit-rate'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-950 text-amber-400 border border-amber-500/20 hover:bg-neutral-800'
              }`}
            >
              🎯 100% Hit Rate
            </button>
            <button
              onClick={() => handleSelectTopCategory('nba-cup')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                topCategory === 'nba-cup'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-950 text-amber-400 border border-amber-500/20 hover:bg-neutral-800'
              }`}
            >
              🏆 NBA Cup Specials
            </button>
            <button
              onClick={() => handleSelectTopCategory('nfl-primetime')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                topCategory === 'nfl-primetime'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-950 text-amber-400 border border-amber-500/20 hover:bg-neutral-800'
              }`}
            >
              ⚡ NFL Primetime
            </button>
          </div>
        </nav>

        {/* ================================================================= */}
        {/* 2. SECONDARY BAR: FURTHER FILTERS & GRID/COMPACT TOGGLE           */}
        {/* ================================================================= */}
        <section className="bg-neutral-900/60 border border-neutral-800/90 rounded-2xl p-4 space-y-3.5">
          {/* Row 1: Platform Filter + Search + Layout Toggle */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-neutral-400 mr-1">Apps:</span>
              {['ALL', 'PrizePicks', 'Underdog', 'ParlayPlay', 'FanDuel', 'DraftKings', 'ESPN Bet'].map((plat) => (
                <button
                  key={plat}
                  onClick={() => setActivePlatform(plat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activePlatform === plat
                      ? 'bg-white text-neutral-950 shadow'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  {plat === 'ALL' ? 'All Platforms' : plat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player or stat..."
                className="w-full sm:w-56 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />

              {/* View Mode Toggle: Grid vs Compact */}
              <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    layoutMode === 'grid'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ⊞ Grid
                </button>
                <button
                  onClick={() => setLayoutMode('compact')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    layoutMode === 'compact'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ☰ Compact
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Prop Market & Matchup Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/70">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-neutral-400 mr-1">Market:</span>
              {availableMarkets.map((mkt) => (
                <button
                  key={mkt}
                  onClick={() => setSelectedMarket(mkt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedMarket === mkt
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/70'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  {mkt === 'ALL' ? 'All Markets' : mkt}
                </button>
              ))}
            </div>

            {availableGames.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-neutral-400">Game:</span>
                <select
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All {topCategory} Matchups</option>
                  {availableGames.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.matchup} ({g.startTime})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. FULL-WIDTH WORKSPACE: GRID VIEW OR COMPACT LIST VIEW           */}
        {/* ================================================================= */}
        {loading ? (
          <div className="text-center py-20 text-neutral-500 text-sm">
            Loading player props & SmartScore™ projections...
          </div>
        ) : filteredProps.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
            <p className="text-sm text-neutral-400">No player props match these filters.</p>
            <button
              onClick={() => {
                setActivePlatform('ALL');
                setSelectedMarket('ALL');
                setSelectedGameId('ALL');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-xl cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : layoutMode === 'grid' ? (
          /* --------------------------------------------------------------- */
          /* VIEW MODE A: SIMPLIFIED GRID / TILE FORMAT                      */
          /* --------------------------------------------------------------- */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProps.map((prop: any) => {
              const badge = getSmartScoreBadge(prop.smartScore);
              return (
                <div
                  key={prop.id}
                  onClick={() => setSelectedPropModal(prop)}
                  className="bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-2xl p-5 transition cursor-pointer flex flex-col justify-between gap-4 shadow-lg group"
                >
                  {/* Top Row: Player & SmartScore */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        {prop.matchup} • {prop.position}
                      </span>
                      <h3 className="text-base font-extrabold text-white mt-0.5 group-hover:text-emerald-400 transition">
                        {prop.player}
                      </h3>
                    </div>
                    <div className={`px-2.5 py-1 rounded-xl border text-right shrink-0 ${badge.bg}`}>
                      <p className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">SmartScore</p>
                      <p className="text-sm font-extrabold">{badge.dot} {prop.smartScore}</p>
                    </div>
                  </div>

                  {/* Center: Clean Prop Line Display */}
                  <div className="bg-neutral-950 border border-neutral-800/90 rounded-xl p-3.5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">{prop.market}</p>
                      <p className="text-xl font-extrabold text-white mt-0.5">
                        <span className="text-emerald-400">{prop.recommendedPick}</span> {prop.line}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400">Consensus</p>
                      <p className="text-sm font-extrabold text-emerald-400">{prop.overProbabilityPct}% Over</p>
                    </div>
                  </div>

                  {/* Footer: Platform Pills & Click Prompt */}
                  <div className="flex justify-between items-center pt-1 text-xs">
                    <div className="flex items-center gap-1 flex-wrap">
                      {prop.availablePlatforms?.slice(0, 3).map((plat: string) => {
                        const tag = getPlatformShort(plat);
                        return (
                          <span
                            key={plat}
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${tag.cls}`}
                          >
                            {tag.code}
                          </span>
                        );
                      })}
                      {prop.availablePlatforms?.length > 3 && (
                        <span className="text-[10px] text-neutral-500 font-bold">
                          +{prop.availablePlatforms.length - 3}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-neutral-400 group-hover:text-white font-semibold">
                      Details →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* --------------------------------------------------------------- */
          /* VIEW MODE B: SLEEK COMPACT LIST FORMAT                          */
          /* --------------------------------------------------------------- */
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 bg-neutral-950 border-b border-neutral-800 text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              <div className="col-span-4">Player & Matchup</div>
              <div className="col-span-3">Prop Line</div>
              <div className="col-span-2">Avg Consensus</div>
              <div className="col-span-2">Available On</div>
              <div className="col-span-1 text-right">SmartScore</div>
            </div>

            <div className="divide-y divide-neutral-800/80">
              {filteredProps.map((prop: any) => {
                const badge = getSmartScoreBadge(prop.smartScore);
                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedPropModal(prop)}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-3.5 items-center hover:bg-neutral-800/70 transition cursor-pointer"
                  >
                    {/* Player */}
                    <div className="md:col-span-4 flex items-center gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-white">{prop.player}</p>
                        <p className="text-[11px] text-neutral-400">
                          {prop.sport} • {prop.matchup} ({prop.startTime})
                        </p>
                      </div>
                    </div>

                    {/* Prop Line */}
                    <div className="md:col-span-3">
                      <span className="inline-block bg-neutral-950 border border-neutral-800 px-3 py-1 rounded-lg text-xs font-extrabold text-white">
                        <span className="text-emerald-400">{prop.recommendedPick}</span> {prop.line} {prop.market}
                      </span>
                    </div>

                    {/* Consensus Probability */}
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-emerald-400">
                          {prop.overProbabilityPct}% {prop.recommendedPick}
                        </span>
                      </div>
                      <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
                        <div
                          style={{ width: `${prop.overProbabilityPct}%` }}
                          className="bg-emerald-500 h-full"
                        ></div>
                      </div>
                    </div>

                    {/* Available Platforms */}
                    <div className="md:col-span-2 flex items-center gap-1 flex-wrap">
                      {prop.availablePlatforms?.map((plat: string) => {
                        const tag = getPlatformShort(plat);
                        return (
                          <span
                            key={plat}
                            title={plat}
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${tag.cls}`}
                          >
                            {tag.code}
                          </span>
                        );
                      })}
                    </div>

                    {/* SmartScore */}
                    <div className="md:col-span-1 flex md:justify-end">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-extrabold ${badge.bg}`}>
                        {badge.dot} {prop.smartScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 4. CENTERED PROP DETAILS POP-UP MODAL                             */}
      {/* ================================================================= */}
      {selectedPropModal && (
        <div
          onClick={() => setSelectedPropModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                  {selectedPropModal.sport} • {selectedPropModal.matchup}
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-1.5">
                  {selectedPropModal.player}
                </h2>
                <p className="text-sm font-bold text-emerald-400">
                  {selectedPropModal.recommendedPick} {selectedPropModal.line} {selectedPropModal.market}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl border text-right ${getSmartScoreBadge(selectedPropModal.smartScore).bg}`}>
                  <p className="text-[9px] font-extrabold uppercase">SmartScore™</p>
                  <p className="text-base font-extrabold">
                    {getSmartScoreBadge(selectedPropModal.smartScore).dot} {selectedPropModal.smartScore}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPropModal(null)}
                  className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Season vs Line Stat Comparison */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                <p className="text-[10px] text-neutral-400 uppercase font-bold">Prop Line</p>
                <p className="text-xl font-extrabold text-white mt-1">{selectedPropModal.line}</p>
                <p className="text-[10px] text-neutral-500">{selectedPropModal.market}</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                <p className="text-[10px] text-neutral-400 uppercase font-bold">Season Avg</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">{selectedPropModal.seasonAvg}</p>
                <p className="text-[10px] text-emerald-500 font-bold">
                  +{(selectedPropModal.seasonAvg - selectedPropModal.line).toFixed(1)} Diff
                </p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                <p className="text-[10px] text-neutral-400 uppercase font-bold">Last 5 Avg</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">{selectedPropModal.last5Avg}</p>
                <p className="text-[10px] text-emerald-500 font-bold">Recent Form</p>
              </div>
            </div>

            {/* Over vs Under Probability Bar */}
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-2.5">
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-emerald-400">OVER CHANCE: {selectedPropModal.overProbabilityPct}%</span>
                <span className="text-rose-400">UNDER CHANCE: {selectedPropModal.underProbabilityPct}%</span>
              </div>
              <div className="w-full h-3 bg-rose-950 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${selectedPropModal.overProbabilityPct}%` }}
                  className="bg-emerald-500 h-full"
                ></div>
              </div>
              <p className="text-xs text-neutral-300 pt-1 leading-relaxed">
                💡 {selectedPropModal.matchupIntel}
              </p>
            </div>

            {/* Last 5 Game Logs */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-extrabold text-neutral-300 uppercase">
                  Last 5 Games vs. {selectedPropModal.line} Line
                </p>
                <span className="text-xs font-bold text-amber-400">
                  {selectedPropModal.seasonHitRecord}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {selectedPropModal.last5Logs?.map((val: number, idx: number) => {
                  const hit = val > selectedPropModal.line;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-center ${
                        hit
                          ? 'bg-emerald-950/50 border-emerald-700/80 text-emerald-300'
                          : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
                      }`}
                    >
                      <p className="text-sm font-extrabold">{val}</p>
                      <p className="text-[9px] font-extrabold uppercase mt-0.5">
                        {hit ? 'HIT ✓' : 'MISS'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Available Platforms Footer */}
            <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-neutral-400 mr-1">Available on:</span>
                {selectedPropModal.availablePlatforms?.map((plat: string) => (
                  <span
                    key={plat}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-800 text-white"
                  >
                    {plat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updated) => setUser(updated)}
        />
      )}
    </main>
  );
}
