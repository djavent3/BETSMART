'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { auth, signOut, formatBangUsername } from '@/lib/firebase';
import ProfileModal from '@/components/ProfileModal';
import AuthModal from '@/components/AuthModal';
import SlipDrawer from '@/components/SlipDrawer';
import SocialHub from '@/components/SocialHub';
import {
  ChatChannel,
  ChatMessage,
  SharedPropPayload,
  SharedSlipPayload,
} from '@/app/api/social/route';

export default function Home() {
  // Explicit Manual Session State (Never auto-logs user in on load)
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // 1. TOP-LEVEL GLOBAL NAVIGATION ('NBA' | 'NFL' | 'hit-rate' | 'nba-cup' | 'nfl-primetime' | 'social')
  const [topCategory, setTopCategory] = useState<
    'NBA' | 'NFL' | 'hit-rate' | 'nba-cup' | 'nfl-primetime' | 'social'
  >('NBA');

  // 2. SECONDARY FILTER BAR STATE
  const [activePlatform, setActivePlatform] = useState<string>('ALL');
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
  const [selectedGameId, setSelectedGameId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'compact'>('grid');

  // 3. MULTI-TAB MODAL DEEP-DIVE STATE
  const [selectedPropModal, setSelectedPropModal] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'rankings' | 'metrics'>('overview');

  // 4. SLIP MAKER STATE
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);
  const [slipPlatform, setSlipPlatform] = useState<string>('PrizePicks');
  const [slipPicks, setSlipPicks] = useState<SharedPropPayload[]>([]);

  // 5. SOCIAL HUB & SHARE PICKER MODAL STATE
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('grp-nba-cup');
  const [pendingShareItem, setPendingShareItem] = useState<{
    prop?: SharedPropPayload;
    slip?: SharedSlipPayload;
  } | null>(null);
  const [shareNote, setShareNote] = useState<string>('');
  const [targetShareChannelId, setTargetShareChannelId] = useState<string>('grp-nba-cup');

  // API Data
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const currentUserHandle = useMemo(() => formatBangUsername(user), [user]);

  useEffect(() => {
    signOut(auth).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [oddsRes, socialRes] = await Promise.all([
        fetch('/api/fetch-odds', { cache: 'no-store' }),
        fetch('/api/social', { cache: 'no-store' }),
      ]);
      const oddsJson = await oddsRes.json();
      const socialJson = await socialRes.json();

      if (oddsJson.status === 'success') {
        setData(oddsJson);
      }
      if (socialJson.status === 'success') {
        setChannels(socialJson.channels || []);
        setMessages(socialJson.messages || []);
      }
    } catch (err) {
      console.error('Error loading platform data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Slip Maker Helpers
  const toggleSlipPick = (prop: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exists = slipPicks.some((p) => p.id === prop.id);
    if (exists) {
      setSlipPicks((prev) => prev.filter((p) => p.id !== prop.id));
    } else {
      if (slipPicks.length >= 6) return;
      const formatted: SharedPropPayload = {
        id: prop.id,
        player: prop.player,
        sport: prop.sport,
        matchup: prop.matchup,
        market: prop.market,
        line: prop.line,
        recommendedPick: prop.recommendedPick,
        smartScore: prop.smartScore,
        overProbabilityPct: prop.overProbabilityPct,
        availablePlatforms: prop.availablePlatforms,
      };
      setSlipPicks((prev) => [...prev, formatted]);
    }
  };

  // Social Actions
  const handleSendSocialMessage = async (
    channelId: string,
    text: string,
    sharedProp?: SharedPropPayload,
    sharedSlip?: SharedSlipPayload
  ) => {
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          channelId,
          senderHandle: currentUserHandle,
          text,
          sharedProp,
          sharedSlip,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setMessages(json.messages);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleCreateSocialChannel = async (
    name: string,
    type: 'group' | 'dm',
    description?: string
  ) => {
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_channel',
          name,
          type,
          description,
          members: [currentUserHandle, name.startsWith('!') ? name : `!${name}`],
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setChannels(json.channels);
        setActiveChannelId(json.channel.id);
      }
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  const handleConfirmShareToChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingShareItem) return;
    await handleSendSocialMessage(
      targetShareChannelId,
      shareNote ||
        (pendingShareItem.slip
          ? `Check out my ${pendingShareItem.slip.platform} slip!`
          : `What do we think of this ${pendingShareItem.prop?.player} line?`),
      pendingShareItem.prop,
      pendingShareItem.slip
    );
    setPendingShareItem(null);
    setShareNote('');
    setActiveChannelId(targetShareChannelId);
    setIsSlipOpen(false);
    setTopCategory('social');
  };

  const handleTailSharedSlip = (sharedSlip: SharedSlipPayload) => {
    setSlipPlatform(sharedSlip.platform);
    setSlipPicks(sharedSlip.picks);
    setIsSlipOpen(true);
  };

  const openPropDetails = (prop: any) => {
    setSelectedPropModal(prop);
    setActiveModalTab('overview');
  };

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

  const handleAvatarFallback = (e: React.SyntheticEvent<HTMLImageElement, Event>, playerName: string) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=064e3b&color=34d399&bold=true`;
  };

  const availableMarkets = useMemo(() => {
    if (!data?.playerProps) return ['ALL'];
    let poolProps = data.playerProps;
    if (topCategory === 'NBA' || topCategory === 'NFL') {
      poolProps = poolProps.filter((p: any) => p.sport === topCategory);
    }
    const unique = Array.from(new Set(poolProps.map((p: any) => p.market))) as string[];
    return ['ALL', ...unique];
  }, [data, topCategory]);

  const availableGames = useMemo(() => {
    if (!data?.games) return [];
    if (topCategory === 'NBA' || topCategory === 'NFL') {
      return data.games.filter((g: any) => g.sport === topCategory);
    }
    return [];
  }, [data, topCategory]);

  const filteredProps = useMemo(() => {
    if (!data?.playerProps) return [];
    let list = [...data.playerProps];

    if (topCategory === 'NBA' || topCategory === 'NFL') {
      list = list.filter((p) => p.sport === topCategory);
    } else if (topCategory === 'hit-rate') {
      list = list.filter((p) => p.is100HitRate);
    } else if (topCategory === 'nba-cup') {
      list = list.filter((p) => p.customTags?.includes('nba-cup'));
    } else if (topCategory === 'nfl-primetime') {
      list = list.filter((p) => p.customTags?.includes('nfl-primetime'));
    }

    if (activePlatform !== 'ALL') {
      list = list.filter((p) => p.availablePlatforms?.includes(activePlatform));
    }

    if (selectedMarket !== 'ALL') {
      list = list.filter((p) => p.market === selectedMarket);
    }

    if (selectedGameId !== 'ALL') {
      list = list.filter((p) => p.gameId === selectedGameId);
    }

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

  const handleSelectTopCategory = (
    cat: 'NBA' | 'NFL' | 'hit-rate' | 'nba-cup' | 'nfl-primetime' | 'social'
  ) => {
    setTopCategory(cat);
    setSelectedMarket('ALL');
    setSelectedGameId('ALL');
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ================================================================= */}
        {/* HEADER WITH SLIP BUILDER BUTTON, SOCIAL & !USERNAME AUTH          */}
        {/* ================================================================= */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">BETSMART</h1>
              <span className="text-[11px] font-semibold bg-neutral-900 text-emerald-400 border border-neutral-800 px-2.5 py-0.5 rounded-full">
                Connected
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Player Prop Intelligence, Platform Slip Maker & !Handle Social Groups
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Persistent Slip Maker Trigger */}
            <button
              onClick={() => setIsSlipOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg flex items-center gap-2"
            >
              <span>🧾 Slip Maker ({slipPlatform})</span>
              <span className="bg-white text-purple-950 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                {slipPicks.length}
              </span>
            </button>

            {user ? (
              <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-3.5 py-1.5 rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="w-7 h-7 rounded-full border border-emerald-500/50 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-extrabold text-xs text-white">
                    !
                  </div>
                )}
                <span className="text-xs font-extrabold text-emerald-400 tracking-wide">
                  {currentUserHandle}
                </span>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  Edit !Handle
                </button>
                <button
                  onClick={() => {
                    signOut(auth);
                    setUser(null);
                  }}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </header>

        {/* ================================================================= */}
        {/* 1. TOP BAR: LEFT = SPORTS | RIGHT = SPECIALS & SOCIAL HUB         */}
        {/* ================================================================= */}
        <nav className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-neutral-900 p-2.5 rounded-2xl border border-neutral-800 shadow-lg">
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

          <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-neutral-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 px-2">
              Specials & Social
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
            <button
              onClick={() => handleSelectTopCategory('social')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                topCategory === 'social'
                  ? 'bg-sky-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-950 text-sky-400 border border-sky-500/30 hover:bg-neutral-800'
              }`}
            >
              <span>💬 Social & Groups</span>
              <span className="bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded-full text-[10px]">
                {messages.length}
              </span>
            </button>
          </div>
        </nav>

        {/* ================================================================= */}
        {/* IF SOCIAL TAB ACTIVE -> RENDER SOCIAL HUB                         */}
        {/* ================================================================= */}
        {topCategory === 'social' ? (
          <SocialHub
            currentUserHandle={currentUserHandle}
            channels={channels}
            messages={messages}
            activeChannelId={activeChannelId}
            setActiveChannelId={setActiveChannelId}
            onSendMessage={(chanId, text) => handleSendSocialMessage(chanId, text)}
            onCreateChannel={handleCreateSocialChannel}
            onTailSlip={handleTailSharedSlip}
            onInspectProp={(propId) => {
              const found = data?.playerProps?.find((p: any) => p.id === propId);
              if (found) openPropDetails(found);
            }}
          />
        ) : (
          <>
            {/* ============================================================= */}
            {/* 2. SECONDARY BAR: FILTERS & GRID/COMPACT TOGGLE               */}
            {/* ============================================================= */}
            <section className="bg-neutral-900/60 border border-neutral-800/90 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-neutral-400 mr-1">Apps:</span>
                  {['ALL', 'PrizePicks', 'Underdog', 'ParlayPlay', 'FanDuel', 'DraftKings', 'ESPN Bet'].map((plat) => (
                    <button
                      key={plat}
                      onClick={() => {
                        setActivePlatform(plat);
                        if (plat !== 'ALL') setSlipPlatform(plat);
                      }}
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

            {/* ============================================================= */}
            {/* 3. WORKSPACE: GRID OR COMPACT WITH SLIP & SHARE BUTTONS       */}
            {/* ============================================================= */}
            {loading ? (
              <div className="text-center py-20 text-neutral-500 text-sm">
                Loading player props & SmartScore™ projections...
              </div>
            ) : layoutMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProps.map((prop: any) => {
                  const badge = getSmartScoreBadge(prop.smartScore);
                  const inSlip = slipPicks.some((p) => p.id === prop.id);
                  return (
                    <div
                      key={prop.id}
                      onClick={() => openPropDetails(prop)}
                      className={`bg-neutral-900/90 hover:bg-neutral-900 border rounded-2xl p-5 transition cursor-pointer flex flex-col justify-between gap-4 shadow-lg group ${
                        inSlip ? 'border-purple-500 ring-1 ring-purple-500/40' : 'border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={prop.playerImage}
                            alt={prop.player}
                            onError={(e) => handleAvatarFallback(e, prop.player)}
                            className="w-12 h-12 rounded-full bg-neutral-950 border border-neutral-700 object-cover shrink-0"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                              {prop.matchup} • {prop.position}
                            </span>
                            <h3 className="text-base font-extrabold text-white leading-tight group-hover:text-emerald-400 transition">
                              {prop.player}
                            </h3>
                            <span className="text-[10px] text-emerald-400/90 font-semibold">
                              Pos Rank: #{prop.positionalRanking?.offensiveRank} {prop.position}
                            </span>
                          </div>
                        </div>

                        <div className={`px-2.5 py-1 rounded-xl border text-right shrink-0 ${badge.bg}`}>
                          <p className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">SmartScore</p>
                          <p className="text-sm font-extrabold">{badge.dot} {prop.smartScore}</p>
                        </div>
                      </div>

                      <div className="bg-neutral-950 border border-neutral-800/90 rounded-xl p-3.5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-neutral-400 uppercase font-bold">{prop.market}</p>
                          <p className="text-xl font-extrabold text-white mt-0.5">
                            <span className="text-emerald-400">{prop.recommendedPick}</span> {prop.line}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-neutral-400">Market Projection</p>
                          <p className="text-sm font-extrabold text-emerald-400">{prop.overProbabilityPct}% Over</p>
                        </div>
                      </div>

                      {/* Platform Pills + Quick Slip & Chat Share Actions */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
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
                          </div>
                          <span className="text-[11px] text-neutral-400 group-hover:text-white font-semibold">
                            Details →
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80">
                          <button
                            type="button"
                            onClick={(e) => toggleSlipPick(prop, e)}
                            className={`py-1.5 px-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                              inSlip
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800'
                            }`}
                          >
                            {inSlip ? '✓ In Slip' : '+ Add to Slip'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingShareItem({ prop });
                            }}
                            className="py-1.5 px-2.5 rounded-xl text-xs font-extrabold bg-neutral-950 hover:bg-neutral-800 text-sky-400 border border-neutral-800 transition cursor-pointer"
                          >
                            💬 Send Prop
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT VIEW */
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 bg-neutral-950 border-b border-neutral-800 text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                  <div className="col-span-3">Player & Matchup</div>
                  <div className="col-span-2">Prop Line</div>
                  <div className="col-span-2">Platform Agreement</div>
                  <div className="col-span-2">Available On</div>
                  <div className="col-span-1">SmartScore</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="divide-y divide-neutral-800/80">
                  {filteredProps.map((prop: any) => {
                    const badge = getSmartScoreBadge(prop.smartScore);
                    const inSlip = slipPicks.some((p) => p.id === prop.id);
                    return (
                      <div
                        key={prop.id}
                        onClick={() => openPropDetails(prop)}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-3.5 items-center hover:bg-neutral-800/70 transition cursor-pointer"
                      >
                        <div className="md:col-span-3 flex items-center gap-3">
                          <img
                            src={prop.playerImage}
                            alt={prop.player}
                            onError={(e) => handleAvatarFallback(e, prop.player)}
                            className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-700 object-cover shrink-0"
                          />
                          <div>
                            <p className="text-sm font-extrabold text-white">{prop.player}</p>
                            <p className="text-[11px] text-neutral-400">
                              {prop.sport} • {prop.matchup}
                            </p>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <span className="inline-block bg-neutral-950 border border-neutral-800 px-3 py-1 rounded-lg text-xs font-extrabold text-white">
                            <span className="text-emerald-400">{prop.recommendedPick}</span> {prop.line} {prop.market}
                          </span>
                        </div>

                        <div className="md:col-span-2">
                          <span className="text-xs font-extrabold text-emerald-400">
                            {prop.overProbabilityPct}% {prop.recommendedPick}
                          </span>
                        </div>

                        <div className="md:col-span-2 flex items-center gap-1 flex-wrap">
                          {prop.availablePlatforms?.map((plat: string) => {
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
                        </div>

                        <div className="md:col-span-1">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs font-extrabold ${badge.bg}`}>
                            {badge.dot} {prop.smartScore}
                          </span>
                        </div>

                        <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => toggleSlipPick(prop, e)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                              inSlip ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-white hover:bg-neutral-700'
                            }`}
                          >
                            {inSlip ? '✓ Slip' : '+ Slip'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingShareItem({ prop });
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-neutral-800 text-sky-400 hover:bg-neutral-700 cursor-pointer"
                          >
                            💬
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* SHARE PROP OR SLIP TO FRIEND / GROUP MODAL                        */}
      {/* ================================================================= */}
      {pendingShareItem && (
        <div
          onClick={() => setPendingShareItem(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-extrabold text-white">
                💬 Send to Friend or Group Chat
              </h3>
              <button
                onClick={() => setPendingShareItem(null)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmShareToChat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5">
                  Choose Destination Chat (!Friend or #Group)
                </label>
                <select
                  value={targetShareChannelId}
                  onChange={(e) => setTargetShareChannelId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'dm' ? 'Direct Message' : 'Group Chat'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5">
                  Add a Message (Optional)
                </label>
                <input
                  type="text"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="e.g. Lock this in before the line bumps!"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-lg"
              >
                Post to Chat Now →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. MULTI-TAB PLAYER PROFILE MODAL                                 */}
      {/* ================================================================= */}
      {selectedPropModal && (
        <div
          onClick={() => setSelectedPropModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4 gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedPropModal.playerImage}
                  alt={selectedPropModal.player}
                  onError={(e) => handleAvatarFallback(e, selectedPropModal.player)}
                  className="w-16 h-16 rounded-full bg-neutral-950 border-2 border-emerald-500/60 object-cover shrink-0"
                />
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                    {selectedPropModal.sport} • {selectedPropModal.team} ({selectedPropModal.position})
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-1">
                    {selectedPropModal.player}
                  </h2>
                  <p className="text-sm font-bold text-emerald-400">
                    {selectedPropModal.recommendedPick} {selectedPropModal.line} {selectedPropModal.market}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
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

            <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
              <button
                onClick={() => setActiveModalTab('overview')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  activeModalTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                📊 Overview & Logs
              </button>
              <button
                onClick={() => setActiveModalTab('rankings')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  activeModalTab === 'rankings'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🏆 Positional Rank
              </button>
              <button
                onClick={() => setActiveModalTab('metrics')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  activeModalTab === 'metrics'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ⚡ Advanced Metrics
              </button>
            </div>

            {activeModalTab === 'overview' && (
              <div className="space-y-4">
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
                      +{(selectedPropModal.seasonAvg - selectedPropModal.line).toFixed(1)} vs Line
                    </p>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">Last 5 Avg</p>
                    <p className="text-xl font-extrabold text-emerald-400 mt-1">{selectedPropModal.last5Avg}</p>
                    <p className="text-[10px] text-emerald-500 font-bold">Recent Form</p>
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-2.5">
                  <div className="flex justify-between text-xs font-extrabold">
                    <span className="text-emerald-400">
                      MARKET PROJECTION OVER: {selectedPropModal.overProbabilityPct}%
                    </span>
                    <span className="text-rose-400">
                      UNDER: {selectedPropModal.underProbabilityPct}%
                    </span>
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
              </div>
            )}

            {activeModalTab === 'rankings' && selectedPropModal.positionalRanking && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-emerald-400">
                      {selectedPropModal.positionalRanking.positionGroup}
                    </p>
                    <h4 className="text-lg font-extrabold text-white mt-0.5">
                      Ranked #{selectedPropModal.positionalRanking.offensiveRank} of{' '}
                      {selectedPropModal.positionalRanking.totalInPosition} Offensively
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {selectedPropModal.positionalRanking.primaryStatCategory}
                    </p>
                  </div>
                  <div className="bg-emerald-950/70 border border-emerald-700/70 px-3.5 py-2 rounded-xl text-center">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase">Efficiency</p>
                    <p className="text-xl font-extrabold text-white">
                      {selectedPropModal.positionalRanking.efficiencyGrade}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">Category Rank</p>
                    <p className="text-lg font-extrabold text-emerald-400 mt-1">
                      #{selectedPropModal.positionalRanking.primaryStatRank} at Position
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {selectedPropModal.positionalRanking.percentile}th Percentile League-Wide
                    </p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">
                      Opponent Defense vs {selectedPropModal.position}
                    </p>
                    <p className="text-lg font-extrabold text-amber-400 mt-1">
                      Ranked #{selectedPropModal.positionalRanking.oppPositionalDefenseRank}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Higher rank = softer positional matchup
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-2">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    🏅 {selectedPropModal.positionalRanking.summaryNote}
                  </p>
                </div>
              </div>
            )}

            {activeModalTab === 'metrics' && selectedPropModal.advancedMetrics && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">
                      Usage / Target Share
                    </p>
                    <p className="text-sm font-extrabold text-white mt-1">
                      {selectedPropModal.advancedMetrics.usageOrTargetRate}
                    </p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">
                      Pace / Volume Floor
                    </p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-1">
                      {selectedPropModal.advancedMetrics.paceOrSnapShare}
                    </p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">
                      Location / Division Split
                    </p>
                    <p className="text-sm font-extrabold text-white mt-1">
                      {selectedPropModal.advancedMetrics.homeAwayDifferential}
                    </p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">
                      Clutch / Red Zone Conversion
                    </p>
                    <p className="text-sm font-extrabold text-amber-400 mt-1">
                      {selectedPropModal.advancedMetrics.clutchOrRedZoneRate}
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                  <p className="text-[10px] text-emerald-400 uppercase font-extrabold mb-1">
                    Defensive Scheme Breakdown
                  </p>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {selectedPropModal.advancedMetrics.schemeMatchupNote}
                  </p>
                </div>
              </div>
            )}

            {/* Modal Action Footer: Add to Slip or Send to Chat */}
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedPropModal.availablePlatforms?.map((plat: string) => (
                  <span
                    key={plat}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-neutral-800 text-white"
                  >
                    {plat}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSlipPick(selectedPropModal)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  {slipPicks.some((p) => p.id === selectedPropModal.id)
                    ? '✓ Added to Slip'
                    : '+ Add to Slip'}
                </button>
                <button
                  onClick={() => {
                    const propToShare = selectedPropModal;
                    setSelectedPropModal(null);
                    setPendingShareItem({ prop: propToShare });
                  }}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  💬 Send to Friend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Slip Maker Drawer */}
      <SlipDrawer
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        slipPlatform={slipPlatform}
        setSlipPlatform={setSlipPlatform}
        slipPicks={slipPicks}
        onRemovePick={(id) => setSlipPicks((prev) => prev.filter((p) => p.id !== id))}
        onClearSlip={() => setSlipPicks([])}
        onShareSlipToChat={(slipPayload) => setPendingShareItem({ slip: slipPayload })}
      />

      {/* Auth Pop-up Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={(loggedInUser) => setUser(loggedInUser)}
        />
      )}

      {/* Edit !Profile Pop-up Modal */}
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
