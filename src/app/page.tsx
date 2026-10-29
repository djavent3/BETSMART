'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signOut, formatBangUsername } from '@/lib/firebase';
import ProfileModal from '@/components/ProfileModal';
import AuthModal from '@/components/AuthModal';
import SlipDrawer from '@/components/SlipDrawer';
import SocialHub from '@/components/SocialHub';
import PasswordGate from '@/components/PasswordGate';
import TutorialModal from '@/components/TutorialModal';
import AdminDashboard from '@/components/AdminDashboard';
import {
  ChatChannel,
  ChatMessage,
  SharedPropPayload,
  SharedSlipPayload,
} from '@/app/api/social/route';

type TopCategoryType = 'NBA' | 'NFL' | 'hit-rate' | 'nba-cup' | 'nfl-primetime' | 'live-tracker';

const getFallbackAvatar = (handle: string) => {
  const clean = (handle || 'user').replace(/^[!@#\s]+/, '') || 'user';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    clean
  )}&background=064e3b&color=34d399&bold=true&size=128`;
};

// Format ISO game start times into the viewer's local browser timezone
const formatGameTimeInUserTz = (isoString?: string, fallback?: string): string => {
  if (!isoString) return fallback || 'Scheduled';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return fallback || 'Scheduled';

    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const timePart = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    if (isToday) return timePart;

    const dayPart = date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return `${dayPart} • ${timePart}`;
  } catch {
    return fallback || 'Scheduled';
  }
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [customHandle, setCustomHandle] = useState<string>('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [userAvatarsMap, setUserAvatarsMap] = useState<Record<string, string>>({});

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  // Subtle Admin Logo Triple-Click Counter
  const logoClickCountRef = useRef<number>(0);
  const logoClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Top navigation (Unauthenticated users can only browse 'NBA' and 'NFL')
  const [topCategory, setTopCategory] = useState<TopCategoryType>('NBA');

  // Secondary filters
  const [activePlatform, setActivePlatform] = useState<string>('ALL');
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
  const [selectedGameId, setSelectedGameId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'compact'>('grid');

  // Modal deep-dive
  const [selectedPropModal, setSelectedPropModal] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'rankings' | 'metrics'>('overview');

  // Slip Maker
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);
  const [slipPlatform, setSlipPlatform] = useState<string>('PrizePicks');
  const [slipPicks, setSlipPicks] = useState<SharedPropPayload[]>([]);

  // Social Hub & Collapsible Widget State
  const [isSocialWidgetOpen, setIsSocialWidgetOpen] = useState<boolean>(false);
  const [isExpandedWindow, setIsExpandedWindow] = useState<boolean>(false);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('disc-nba-cup');
  const [pendingShareItem, setPendingShareItem] = useState<{
    prop?: SharedPropPayload;
    slip?: SharedSlipPayload;
  } | null>(null);
  const [shareNote, setShareNote] = useState<string>('');
  const [targetShareChannelId, setTargetShareChannelId] = useState<string>('disc-nba-cup');

  // API Data & Live Engine State
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [liveRefreshRateMs, setLiveRefreshRateMs] = useState<number>(1000);

  const currentUserHandle = useMemo(() => {
    if (customHandle) return customHandle;
    return formatBangUsername(user);
  }, [user, customHandle]);

  const resolvedCurrentUserAvatar = useMemo(() => {
    if (userAvatarUrl) return userAvatarUrl;
    if (user?.photoURL) return user.photoURL;
    return getFallbackAvatar(currentUserHandle);
  }, [userAvatarUrl, user, currentUserHandle]);

  const localLastSyncedLabel = useMemo(() => {
    if (!data?.lastSyncedIso) return 'Now';
    try {
      return new Date(data.lastSyncedIso).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return 'Now';
    }
  }, [data?.lastSyncedIso]);

  // Restore Authenticated User & Per-User Preferences on Session Load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setCustomHandle('');
        setUserAvatarUrl('');
        return;
      }

      setUser(firebaseUser);
      const uid = firebaseUser.uid;
      const localHandle =
        localStorage.getItem(`betsmart_handle_${uid}`) ||
        formatBangUsername(firebaseUser);
      const localAvatar =
        localStorage.getItem(`betsmart_avatar_${uid}`) ||
        localStorage.getItem(`betsmart_avatar_${localHandle}`) ||
        firebaseUser.photoURL ||
        getFallbackAvatar(localHandle);
      const localLayout = localStorage.getItem(`betsmart_layout_${uid}`) as
        | 'grid'
        | 'compact'
        | null;
      const localPlatform = localStorage.getItem(`betsmart_platform_${uid}`);
      const localSlips = localStorage.getItem(`betsmart_slips_${uid}`);

      setCustomHandle(localHandle);
      setUserAvatarUrl(localAvatar);
      if (localLayout === 'grid' || localLayout === 'compact') {
        setLayoutMode(localLayout);
      }
      if (localPlatform) {
        setSlipPlatform(localPlatform);
      }
      if (localSlips) {
        try {
          setSlipPicks(JSON.parse(localSlips));
        } catch {
          // Ignore malformed JSON
        }
      }

      // Sync with server-stored per-user profile & tutorial preferences
      try {
        const res = await fetch(`/api/admin?uid=${encodeURIComponent(uid)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (json.userPref) {
          if (json.userPref.handle) setCustomHandle(json.userPref.handle);
          if (json.userPref.photoURL) setUserAvatarUrl(json.userPref.photoURL);
          if (json.userPref.layoutMode) setLayoutMode(json.userPref.layoutMode);
          if (json.userPref.preferredPlatform) {
            setSlipPlatform(json.userPref.preferredPlatform);
          }
        }
      } catch {
        // Fallback to localStorage preferences
      }
    });

    return () => unsubscribe();
  }, []);

  // Save Slip Picks per user whenever updated
  useEffect(() => {
    if (user?.uid) {
      localStorage.setItem(`betsmart_slips_${user.uid}`, JSON.stringify(slipPicks));
    }
  }, [slipPicks, user]);

  // Subtle Admin Access Hotkey: Ctrl + Shift + A (or Cmd + Shift + A)
  useEffect(() => {
    const handleSecretAdminKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAdminModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleSecretAdminKey);
    return () => window.removeEventListener('keydown', handleSecretAdminKey);
  }, []);

  const handleLogoSecretClick = () => {
    logoClickCountRef.current += 1;
    if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);

    if (logoClickCountRef.current >= 3) {
      logoClickCountRef.current = 0;
      setShowAdminModal((prev) => !prev);
    } else {
      logoClickTimerRef.current = setTimeout(() => {
        logoClickCountRef.current = 0;
      }, 650);
    }
  };

  const requireAuth = (action: () => void) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  const saveUserPrefsToServer = async (
    activeUser: User,
    updates: {
      handle?: string;
      photoURL?: string;
      hideTutorial?: boolean;
      preferredPlatform?: string;
      layoutMode?: 'grid' | 'compact';
    }
  ) => {
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_user_preferences',
          uid: activeUser.uid,
          ...updates,
        }),
      });
    } catch {
      // Non-blocking
    }
  };

  const syncUserActivityToAdmin = async (
    activeUser: User,
    actionLabel: string,
    overrideAvatar?: string,
    overrideHandle?: string
  ) => {
    const handle = overrideHandle || customHandle || formatBangUsername(activeUser);
    const savedAvatar =
      overrideAvatar ||
      localStorage.getItem(`betsmart_avatar_${activeUser.uid}`) ||
      localStorage.getItem(`betsmart_avatar_${handle}`) ||
      activeUser.photoURL ||
      getFallbackAvatar(handle);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_user_activity',
          uid: activeUser.uid,
          name: handle.replace(/^!/, ''),
          handle,
          email: activeUser.email || '',
          photoURL: savedAvatar,
          createdAt: activeUser.metadata?.creationTime || new Date().toISOString(),
          lastAction: actionLabel,
        }),
      });
      const json = await res.json();
      if (json.userAvatars) {
        setUserAvatarsMap(json.userAvatars);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleAuthSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    const uid = loggedInUser.uid;
    const storedHandle =
      localStorage.getItem(`betsmart_handle_${uid}`) ||
      formatBangUsername(loggedInUser);
    const storedAvatar =
      localStorage.getItem(`betsmart_avatar_${uid}`) ||
      localStorage.getItem(`betsmart_avatar_${storedHandle}`) ||
      loggedInUser.photoURL ||
      getFallbackAvatar(storedHandle);

    setCustomHandle(storedHandle);
    setUserAvatarUrl(storedAvatar);
    await syncUserActivityToAdmin(loggedInUser, 'Signed In to Session', storedAvatar, storedHandle);

    // Check per-user tutorial dismissal (by UID and by !handle)
    const hideByUid = localStorage.getItem(`betsmart_hide_tutorial_${uid}`) === 'true';
    const hideByHandle = localStorage.getItem(`betsmart_hide_tutorial_${storedHandle}`) === 'true';
    if (!hideByUid && !hideByHandle) {
      setShowTutorialModal(true);
    }
  };

  const handleCloseTutorial = (neverShowAgain: boolean) => {
    if (neverShowAgain && user) {
      localStorage.setItem(`betsmart_hide_tutorial_${user.uid}`, 'true');
      localStorage.setItem(`betsmart_hide_tutorial_${currentUserHandle}`, 'true');
      saveUserPrefsToServer(user, { hideTutorial: true });
    }
    setShowTutorialModal(false);
  };

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const [oddsRes, socialRes, adminRes] = await Promise.all([
          fetch('/api/fetch-odds', { cache: 'no-store' }),
          fetch(`/api/social?handle=${encodeURIComponent(currentUserHandle)}`, { cache: 'no-store' }),
          fetch('/api/admin', { cache: 'no-store' }),
        ]);
        const oddsJson = await oddsRes.json();
        const socialJson = await socialRes.json();
        const adminJson = await adminRes.json();

        if (oddsJson.status === 'success') setData(oddsJson);
        if (socialJson.status === 'success') {
          setChannels(socialJson.channels || []);
          setMessages(socialJson.messages || []);
          setFriends(socialJson.friends || []);
        }
        if (adminJson.status === 'success' && adminJson.userAvatars) {
          setUserAvatarsMap(adminJson.userAvatars);
        }
      } catch (err) {
        console.error('Error loading platform data:', err);
      } finally {
        setLoading(false);
      }
    },
    [currentUserHandle]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-Time Polling
  useEffect(() => {
    const intervalMs =
      topCategory === 'live-tracker'
        ? liveRefreshRateMs
        : 15000;
    if (intervalMs === 0) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [topCategory, liveRefreshRateMs, fetchData]);

  const toggleSlipPick = (prop: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (prop.gameStatus !== 'PREGAME') return;

    syncUserActivityToAdmin(user, `Updated Slip (${prop.player})`);
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

  const handleSendSocialMessage = async (
    channelId: string,
    text: string,
    sharedProp?: SharedPropPayload,
    sharedSlip?: SharedSlipPayload
  ) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    syncUserActivityToAdmin(user, 'Posted in Social Hub');
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
      if (json.status === 'success') setMessages(json.messages);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleCreateSocialChannel = async (name: string, type: 'group' | 'dm', description?: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    syncUserActivityToAdmin(user, `Created ${type.toUpperCase()} (${name})`);
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_channel',
          name,
          type,
          description,
          creator: currentUserHandle,
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

  const handleAddFriend = async (friendHandle: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    syncUserActivityToAdmin(user, `Added Friend (${friendHandle})`);
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_friend',
          userHandle: currentUserHandle,
          friendHandle,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setFriends(json.friends);
      }
    } catch (err) {
      console.error('Failed to add friend:', err);
    }
  };

  const handleConfirmShareToChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
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
    setIsSocialWidgetOpen(true);
    setIsExpandedWindow(true);
  };

  const handleTailSharedSlip = (sharedSlip: SharedSlipPayload) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSlipPlatform(sharedSlip.platform);
    setSlipPicks(sharedSlip.picks);
    setIsSlipOpen(true);
  };

  const openPropDetails = (prop: any) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    syncUserActivityToAdmin(user, `Inspected ${prop.player}`);
    setSelectedPropModal(prop);
    setActiveModalTab('overview');
  };

  const getSmartScoreBadge = (score: number) => {
    if (score >= 90) return { bg: 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300', dot: '🔥' };
    if (score >= 75) return { bg: 'bg-sky-950/90 border-sky-500/60 text-sky-300', dot: '🔵' };
    return { bg: 'bg-amber-950/90 border-amber-500/60 text-amber-300', dot: '🟡' };
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

  const tabPoolProps = useMemo(() => {
    if (!data?.playerProps) return [];
    const allProps = data.playerProps as any[];

    if (topCategory === 'live-tracker') {
      return allProps.filter((p) => p.gameStatus === 'LIVE' || p.gameStatus === 'FINAL');
    }

    const pregamePool = allProps.filter((p) => p.gameStatus === 'PREGAME');

    if (topCategory === 'NBA') {
      return pregamePool.filter((p) => p.sport === 'NBA');
    }
    if (topCategory === 'NFL') {
      return pregamePool.filter((p) => p.sport === 'NFL');
    }
    if (topCategory === 'nba-cup') {
      return pregamePool.filter((p) => p.sport === 'NBA' && p.customTags?.includes('nba-cup'));
    }
    if (topCategory === 'nfl-primetime') {
      return pregamePool.filter((p) => p.sport === 'NFL' && p.customTags?.includes('nfl-primetime'));
    }
    if (topCategory === 'hit-rate') {
      return pregamePool.filter((p) => p.is100HitRate);
    }

    return pregamePool;
  }, [data, topCategory]);

  const availableMarkets = useMemo(() => {
    const unique = Array.from(new Set(tabPoolProps.map((p: any) => p.market))) as string[];
    return ['ALL', ...unique];
  }, [tabPoolProps]);

  const availableGames = useMemo(() => {
    if (!data?.games) return [];
    const activeGameIds = new Set(tabPoolProps.map((p: any) => p.gameId));
    return data.games.filter((g: any) => activeGameIds.has(g.id));
  }, [data, tabPoolProps]);

  const filteredProps = useMemo(() => {
    let list = [...tabPoolProps];

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
  }, [tabPoolProps, activePlatform, selectedMarket, selectedGameId, searchQuery]);

  // Modal Carousel Navigation (Previous / Next Prop)
  const currentModalPropIndex = useMemo(() => {
    if (!selectedPropModal || filteredProps.length === 0) return -1;
    return filteredProps.findIndex((p: any) => p.id === selectedPropModal.id);
  }, [selectedPropModal, filteredProps]);

  const handlePrevProp = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (filteredProps.length <= 1 || currentModalPropIndex === -1) return;
      const prevIdx = (currentModalPropIndex - 1 + filteredProps.length) % filteredProps.length;
      setSelectedPropModal(filteredProps[prevIdx]);
    },
    [filteredProps, currentModalPropIndex]
  );

  const handleNextProp = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (filteredProps.length <= 1 || currentModalPropIndex === -1) return;
      const nextIdx = (currentModalPropIndex + 1) % filteredProps.length;
      setSelectedPropModal(filteredProps[nextIdx]);
    },
    [filteredProps, currentModalPropIndex]
  );

  useEffect(() => {
    if (!selectedPropModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevProp();
      else if (e.key === 'ArrowRight') handleNextProp();
      else if (e.key === 'Escape') setSelectedPropModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPropModal, handlePrevProp, handleNextProp]);

  const liveAuditSummary = useMemo(() => {
    if (!data?.playerProps) {
      return { totalLive: 0, wins: 0, losses: 0, onPace: 0, winRatePct: 100 };
    }
    const liveList = (data.playerProps as any[]).filter(
      (p) => p.gameStatus === 'LIVE' || p.gameStatus === 'FINAL'
    );
    const wins = liveList.filter((p) => {
      const val = p.currentStat ?? 0;
      return p.recommendedPick === 'OVER' ? val > p.line : val < p.line;
    }).length;
    const losses = liveList.filter((p) => {
      const val = p.currentStat ?? 0;
      const hit = p.recommendedPick === 'OVER' ? val > p.line : val < p.line;
      return p.gameStatus === 'FINAL' && !hit;
    }).length;
    const onPace = liveList.length - wins - losses;
    const gradedTotal = wins + losses;
    const winRatePct = gradedTotal > 0 ? Math.round((wins / gradedTotal) * 1000) / 10 : 100;

    return {
      totalLive: liveList.length,
      wins,
      losses,
      onPace,
      winRatePct,
    };
  }, [data]);

  // Auth Gate on Featured Tabs & Live Stat Tracker: Unauthenticated users can ONLY flip between NBA and NFL
  const handleSelectTopCategory = (cat: TopCategoryType) => {
    const isFeaturedTab =
      cat === 'live-tracker' ||
      cat === 'hit-rate' ||
      cat === 'nba-cup' ||
      cat === 'nfl-primetime';

    if (isFeaturedTab && !user) {
      setShowAuthModal(true);
      if (topCategory !== 'NBA' && topCategory !== 'NFL') {
        setTopCategory('NBA');
      }
      return;
    }

    setTopCategory(cat);
    setSelectedMarket('ALL');
    setSelectedGameId('ALL');
  };

  return (
    <PasswordGate>
      <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans pb-28">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ================================================================= */}
          {/* HEADER: SUBTLE LOGO TRIGGER, SLIPMAKER, SOCIAL & CLICKABLE PROFILE*/}
          {/* ================================================================= */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800/80 pb-5">
            <div
              onClick={handleLogoSecretClick}
              className="select-none cursor-default"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">BETSMART</h1>
                <span className="text-[11px] font-semibold bg-neutral-900 text-emerald-400 border border-neutral-800 px-2.5 py-0.5 rounded-full">
                  Live ESPN Sync
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Real-Time ESPN Prop Intelligence, Live Box-Score Audit & !Handle Social Hub
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => requireAuth(() => setIsSlipOpen(true))}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <span>🧾 Slipmaker</span>
              </button>

              <button
                onClick={() => requireAuth(() => setIsSocialWidgetOpen(!isSocialWidgetOpen))}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <span>💬 Social Hub</span>
              </button>

              {user ? (
                <div className="flex items-center gap-2">
                  {/* Clickable User Profile Pill */}
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/50 px-3 py-1.5 rounded-xl transition cursor-pointer"
                    title="Click to edit your !Profile & Avatar"
                  >
                    <img
                      src={resolvedCurrentUserAvatar}
                      alt={currentUserHandle}
                      onError={(e) => {
                        e.currentTarget.src = getFallbackAvatar(currentUserHandle);
                      }}
                      className="w-7 h-7 rounded-full object-cover border border-emerald-500/70 shrink-0"
                    />
                    <span className="text-xs font-extrabold text-emerald-400">
                      {currentUserHandle}
                    </span>
                  </button>

                  {/* Clean "?" Guide Button */}
                  <button
                    type="button"
                    onClick={() => setShowTutorialModal(true)}
                    className="w-8 h-8 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-extrabold flex items-center justify-center cursor-pointer"
                    title="Platform Guide"
                  >
                    ?
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      signOut(auth);
                      setUser(null);
                      setIsSlipOpen(false);
                      setIsSocialWidgetOpen(false);
                      setSelectedPropModal(null);
                      if (topCategory !== 'NBA' && topCategory !== 'NFL') {
                        setTopCategory('NBA');
                      }
                    }}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer px-2"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </header>

          {/* SUBTLE ADMIN WINDOW */}
          {showAdminModal && (
            <AdminDashboard onClose={() => setShowAdminModal(false)} />
          )}

          {/* ================================================================= */}
          {/* TOP NAV: LEFT = SPORTS (PUBLIC) | RIGHT = FEATURED (AUTH GATED)   */}
          {/* ================================================================= */}
          <nav className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-neutral-900 p-2.5 rounded-2xl border border-neutral-800 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 px-2">
                Sports
              </span>
              <button
                onClick={() => handleSelectTopCategory('NBA')}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  topCategory === 'NBA' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                🏀 NBA
              </button>
              <button
                onClick={() => handleSelectTopCategory('NFL')}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  topCategory === 'NFL' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                🏈 NFL
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-neutral-800">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 px-2">
                Live & Featured {!user ? '🔒' : ''}
              </span>

              <button
                onClick={() => handleSelectTopCategory('live-tracker')}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
                  topCategory === 'live-tracker'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60'
                    : 'bg-neutral-950 text-rose-400 border border-rose-500/30 hover:bg-neutral-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                <span>
                  Live Stat Tracker ({liveAuditSummary.totalLive}) {!user ? '🔒' : ''}
                </span>
              </button>

              <button
                onClick={() => handleSelectTopCategory('hit-rate')}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  topCategory === 'hit-rate'
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'bg-neutral-950 text-amber-400 border border-amber-500/20 hover:bg-neutral-800'
                }`}
              >
                🎯 100% Hit Rate {!user ? '🔒' : ''}
              </button>
              <button
                onClick={() => handleSelectTopCategory('nba-cup')}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  topCategory === 'nba-cup'
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'bg-neutral-950 text-amber-400 border border-amber-500/20 hover:bg-neutral-800'
                }`}
              >
                🏆 NBA Cup Specials {!user ? '🔒' : ''}
              </button>
              <button
                onClick={() => handleSelectTopCategory('nfl-primetime')}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  topCategory === 'nfl-primetime'
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'bg-neutral-950 text-amber-400 border border-amber-500/20 hover:bg-neutral-800'
                }`}
              >
                ⚡ NFL Primetime {!user ? '🔒' : ''}
              </button>
            </div>
          </nav>

          {/* COLLAPSIBLE / EXPANDABLE SOCIAL HUB WIDGET */}
          {isSocialWidgetOpen && user && (
            <SocialHub
              currentUserHandle={currentUserHandle}
              currentUserAvatar={resolvedCurrentUserAvatar}
              userAvatars={userAvatarsMap}
              channels={channels}
              messages={messages}
              activeChannelId={activeChannelId}
              setActiveChannelId={setActiveChannelId}
              friends={friends}
              onSendMessage={(chanId, text) => handleSendSocialMessage(chanId, text)}
              onCreateChannel={handleCreateSocialChannel}
              onAddFriend={handleAddFriend}
              onTailSlip={handleTailSharedSlip}
              onInspectProp={(propId) => {
                const found = data?.playerProps?.find((p: any) => p.id === propId);
                if (found) openPropDetails(found);
              }}
              isExpandedWindow={isExpandedWindow}
              setIsExpandedWindow={setIsExpandedWindow}
              onCloseWidget={() => {
                setIsSocialWidgetOpen(false);
                setIsExpandedWindow(false);
              }}
            />
          )}

          {/* SECONDARY BAR */}
          <section className="bg-neutral-900/60 border border-neutral-800/90 rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-400 mr-1">Apps:</span>
                {['ALL', 'PrizePicks', 'Underdog', 'ParlayPlay', 'FanDuel', 'DraftKings', 'ESPN Bet'].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => {
                      setActivePlatform(plat);
                      if (plat !== 'ALL') {
                        setSlipPlatform(plat);
                        if (user) {
                          localStorage.setItem(`betsmart_platform_${user.uid}`, plat);
                          saveUserPrefsToServer(user, { preferredPlatform: plat });
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activePlatform === plat
                        ? 'bg-white text-neutral-950'
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
                {topCategory !== 'live-tracker' && (
                  <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
                    <button
                      onClick={() => {
                        setLayoutMode('grid');
                        if (user) {
                          localStorage.setItem(`betsmart_layout_${user.uid}`, 'grid');
                          saveUserPrefsToServer(user, { layoutMode: 'grid' });
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        layoutMode === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
                      }`}
                    >
                      ⊞ Grid
                    </button>
                    <button
                      onClick={() => {
                        setLayoutMode('compact');
                        if (user) {
                          localStorage.setItem(`betsmart_layout_${user.uid}`, 'compact');
                          saveUserPrefsToServer(user, { layoutMode: 'compact' });
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        layoutMode === 'compact' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
                      }`}
                    >
                      ☰ Compact
                    </button>
                  </div>
                )}
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
                  <span className="text-[11px] font-bold text-neutral-400">Matchup:</span>
                  <select
                    value={selectedGameId}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Matchups in Tab</option>
                    {availableGames.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.matchup} ({formatGameTimeInUserTz(g.startTimeIso, g.startTime)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Notice Banner When Tonight's Games Have Tipped Off */}
          {topCategory !== 'live-tracker' && liveAuditSummary.totalLive > 0 && (
            <div className="bg-neutral-900/80 border border-rose-500/30 rounded-2xl px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-neutral-300">
                  <strong>{liveAuditSummary.totalLive} props</strong> from started or finished games are removed from the pre-game board and tracked in the <strong>Live Stat Tracker</strong>.
                </span>
              </div>
              <button
                onClick={() => handleSelectTopCategory('live-tracker')}
                className="text-rose-400 hover:text-rose-300 font-extrabold cursor-pointer shrink-0"
              >
                {user ? 'View Live & Final Props →' : 'Sign In to View Live Stat Tracker 🔒'}
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* WORKSPACE: LIVE STAT TRACKER (GREEN WINS / RED LOSSES) OR BOARD   */}
          {/* ================================================================= */}
          {loading ? (
            <div className="text-center py-20 text-neutral-500 text-sm">
              Syncing live ESPN scoreboards, player box scores & local schedules...
            </div>
          ) : topCategory === 'live-tracker' ? (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/40 border border-neutral-800 rounded-2xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                      Live ESPN Box-Score Feed • Synced {localLastSyncedLabel}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-white">
                    Live Stat Tracker & Official Final Grading ({data?.slateDate})
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Winning props highlight <strong className="text-emerald-400">Green</strong> • Losing props highlight <strong className="text-rose-400">Red</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="bg-neutral-950 border border-emerald-700/60 px-3.5 py-2 rounded-xl text-center">
                    <p className="text-[10px] font-bold uppercase text-neutral-400">Graded Record</p>
                    <p className="text-sm font-extrabold">
                      <span className="text-emerald-400">{liveAuditSummary.wins}W</span> -{' '}
                      <span className="text-rose-400">{liveAuditSummary.losses}L</span>{' '}
                      <span className="text-white">({liveAuditSummary.winRatePct}%)</span>
                    </p>
                  </div>

                  <select
                    value={liveRefreshRateMs}
                    onChange={(e) => setLiveRefreshRateMs(Number(e.target.value))}
                    className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-extrabold text-emerald-400"
                  >
                    <option value={1000}>⚡ 1s Real-Time Sync</option>
                    <option value={3000}>🔄 3s Fast Sync</option>
                    <option value={10000}>⏱️ 10s Standard</option>
                    <option value={0}>⏸️ Pause Auto-Sync</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProps.map((prop: any) => {
                  const badge = getSmartScoreBadge(prop.smartScore);
                  const currentVal = prop.currentStat ?? 0;
                  const progressPct = Math.min(100, Math.round((currentVal / prop.line) * 100));
                  const hasCashed =
                    prop.recommendedPick === 'OVER' ? currentVal > prop.line : currentVal < prop.line;
                  const isLoss =
                    (prop.gameStatus === 'FINAL' && !hasCashed) || prop.outcomeGrade === 'LOSS';

                  return (
                    <div
                      key={prop.id}
                      onClick={() => openPropDetails(prop)}
                      className={`border rounded-2xl p-5 space-y-4 transition cursor-pointer shadow-lg ${
                        hasCashed
                          ? 'bg-emerald-950/25 border-emerald-500/80 ring-1 ring-emerald-500/40'
                          : isLoss
                          ? 'bg-rose-950/30 border-rose-500/80 ring-1 ring-rose-500/40'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex justify-between items-center border-b border-neutral-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              prop.gameStatus === 'LIVE'
                                ? 'bg-rose-500 animate-ping'
                                : hasCashed
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                            }`}
                          ></span>
                          <span className="text-[11px] font-extrabold uppercase text-white font-mono">
                            {prop.gameStatus === 'FINAL' ? 'FINAL' : prop.liveClock || 'LIVE'}
                          </span>
                          <span className="text-[11px] text-neutral-300 font-semibold">
                            • {prop.liveScore}
                          </span>
                        </div>

                        {hasCashed ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500 text-neutral-950 shadow">
                            WIN ✓ CASHED
                          </span>
                        ) : isLoss ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-600 text-white shadow">
                            LOSS ✗ MISSED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-950 text-sky-300 border border-sky-700">
                            LIVE • IN PLAY
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={prop.playerImage}
                            alt={prop.player}
                            onError={(e) => handleAvatarFallback(e, prop.player)}
                            className="w-12 h-12 rounded-full bg-neutral-950 border border-neutral-700 object-cover shrink-0"
                          />
                          <div>
                            <h3 className="text-base font-extrabold text-white">{prop.player}</h3>
                            <p className="text-[11px] text-neutral-400">
                              {prop.team} • {formatGameTimeInUserTz(prop.startTimeIso, prop.startTime)}
                            </p>
                          </div>
                        </div>

                        <div className={`px-2.5 py-1 rounded-xl border text-right ${badge.bg}`}>
                          <p className="text-[9px] font-extrabold uppercase">SmartScore</p>
                          <p className="text-sm font-extrabold">
                            {badge.dot} {prop.smartScore}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase text-neutral-400">
                            System Prediction
                          </p>
                          <p className="text-base font-extrabold text-white mt-0.5">
                            <span className="text-emerald-400">{prop.recommendedPick}</span> {prop.line}{' '}
                            {prop.market}
                          </p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            {prop.overProbabilityPct}% Pre-Game Proj
                          </p>
                        </div>

                        <div
                          className={`bg-neutral-950 border rounded-xl p-3 ${
                            hasCashed
                              ? 'border-emerald-500/60'
                              : isLoss
                              ? 'border-rose-500/60'
                              : 'border-neutral-800'
                          }`}
                        >
                          <p className="text-[10px] font-bold uppercase text-neutral-400">
                            {prop.gameStatus === 'FINAL' ? 'Final Box Score' : 'Live Box Score'}
                          </p>
                          <p
                            className={`text-xl font-extrabold mt-0.5 ${
                              hasCashed
                                ? 'text-emerald-400'
                                : isLoss
                                ? 'text-rose-400'
                                : 'text-white'
                            }`}
                          >
                            {currentVal}{' '}
                            <span className="text-xs font-semibold text-neutral-400">
                              {prop.market}
                            </span>
                          </p>
                          <p
                            className={`text-[10px] font-bold mt-0.5 ${
                              hasCashed
                                ? 'text-emerald-400'
                                : isLoss
                                ? 'text-rose-400'
                                : 'text-sky-400'
                            }`}
                          >
                            {prop.gameStatus === 'FINAL'
                              ? hasCashed
                                ? 'Graded WIN ✓'
                                : 'Graded LOSS ✗'
                              : `Pace: ${prop.projectedFinalStat} ${prop.market}`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-neutral-300">
                            Stat: {currentVal} / {prop.line} {prop.market}
                          </span>
                          <span
                            className={
                              hasCashed
                                ? 'text-emerald-400'
                                : isLoss
                                ? 'text-rose-400'
                                : 'text-sky-400'
                            }
                          >
                            {progressPct}% of Line
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                          <div
                            style={{ width: `${progressPct}%` }}
                            className={`h-full transition-all duration-500 ${
                              hasCashed
                                ? 'bg-emerald-500'
                                : isLoss
                                ? 'bg-rose-500'
                                : 'bg-sky-500'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : filteredProps.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800 rounded-2xl space-y-2">
              <p className="text-sm text-neutral-300 font-bold">
                All started or completed games for this filter have moved to the 🔴 Live Stat Tracker.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setActivePlatform('ALL');
                    setSelectedMarket('ALL');
                    setSelectedGameId('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-xl cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => handleSelectTopCategory('live-tracker')}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white rounded-xl cursor-pointer"
                >
                  {user ? 'View 🔴 Live Stat Tracker →' : 'Sign In for Live Stat Tracker 🔒'}
                </button>
              </div>
            </div>
          ) : layoutMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProps.map((prop: any) => {
                const badge = getSmartScoreBadge(prop.smartScore);
                const inSlip = slipPicks.some((p) => p.id === prop.id);
                const localStartTime = formatGameTimeInUserTz(prop.startTimeIso, prop.startTime);

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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                              {prop.matchup}
                            </span>
                            <span className="text-[10px] font-extrabold bg-neutral-800 text-emerald-400 px-1.5 py-0.5 rounded">
                              {localStartTime}
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold text-white leading-tight group-hover:text-emerald-400 transition mt-0.5">
                            {prop.player}
                          </h3>
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-xl border text-right shrink-0 ${badge.bg}`}>
                        <p className="text-[9px] font-extrabold uppercase opacity-80">SmartScore</p>
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
                        <p className="text-[10px] text-neutral-400">Projection</p>
                        <p className="text-sm font-extrabold text-emerald-400">{prop.overProbabilityPct}% Over</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-1 flex-wrap">
                        {prop.availablePlatforms?.slice(0, 3).map((plat: string) => {
                          const tag = getPlatformShort(plat);
                          return (
                            <span key={plat} className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${tag.cls}`}>
                              {tag.code}
                            </span>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => toggleSlipPick(prop, e)}
                        className={`w-8 h-8 rounded-xl text-sm font-extrabold transition cursor-pointer flex items-center justify-center ${
                          inSlip ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                        title={inSlip ? 'Remove from slip' : 'Add to slip'}
                      >
                        {inSlip ? '✓' : '+'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 bg-neutral-950 border-b border-neutral-800 text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                <div className="col-span-4">Player, Matchup & Local Time</div>
                <div className="col-span-3">Prop Line</div>
                <div className="col-span-2">Platform Agreement</div>
                <div className="col-span-2">Available On</div>
                <div className="col-span-1 text-right">SmartScore</div>
              </div>

              <div className="divide-y divide-neutral-800/80">
                {filteredProps.map((prop: any) => {
                  const badge = getSmartScoreBadge(prop.smartScore);
                  const inSlip = slipPicks.some((p) => p.id === prop.id);
                  const localStartTime = formatGameTimeInUserTz(prop.startTimeIso, prop.startTime);

                  return (
                    <div
                      key={prop.id}
                      onClick={() => openPropDetails(prop)}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-3.5 items-center hover:bg-neutral-800/70 transition cursor-pointer"
                    >
                      <div className="md:col-span-4 flex items-center gap-3">
                        <img
                          src={prop.playerImage}
                          alt={prop.player}
                          onError={(e) => handleAvatarFallback(e, prop.player)}
                          className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-700 object-cover shrink-0"
                        />
                        <div>
                          <p className="text-sm font-extrabold text-white">{prop.player}</p>
                          <p className="text-[11px] text-neutral-400">
                            {prop.sport} • {prop.matchup} • <strong className="text-emerald-400">{localStartTime}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="md:col-span-3 flex items-center justify-between">
                        <span className="inline-block bg-neutral-950 border border-neutral-800 px-3 py-1 rounded-lg text-xs font-extrabold text-white">
                          <span className="text-emerald-400">{prop.recommendedPick}</span> {prop.line} {prop.market}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleSlipPick(prop, e)}
                          className={`w-7 h-7 rounded-lg text-xs font-extrabold cursor-pointer flex items-center justify-center ${
                            inSlip ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                          }`}
                        >
                          {inSlip ? '✓' : '+'}
                        </button>
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
                            <span key={plat} className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${tag.cls}`}>
                              {tag.code}
                            </span>
                          );
                        })}
                      </div>

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

        {/* SHARE PROP MODAL */}
        {pendingShareItem && user && (
          <div
            onClick={() => setPendingShareItem(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="text-lg font-extrabold text-white">💬 Send to Chat</h3>
                <button onClick={() => setPendingShareItem(null)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleConfirmShareToChat} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Choose Discussion or Chat</label>
                  <select
                    value={targetShareChannelId}
                    onChange={(e) => setTargetShareChannelId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none"
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'discussion' ? 'Public Discussion' : c.type === 'dm' ? 'DM' : 'Group'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Add a Message (Optional)</label>
                  <input
                    type="text"
                    value={shareNote}
                    onChange={(e) => setShareNote(e.target.value)}
                    placeholder="e.g. Lock this in!"
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

        {/* MULTI-TAB PLAYER PROFILE MODAL WITH LEFT/RIGHT CAROUSEL ARROWS */}
        {selectedPropModal && user && (
          <div
            onClick={() => setSelectedPropModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex items-center justify-center w-full max-w-3xl"
            >
              {filteredProps.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevProp}
                  className="hidden sm:flex w-11 h-11 rounded-full bg-neutral-900/95 hover:bg-emerald-600 text-white border border-neutral-700 hover:border-emerald-400 items-center justify-center text-lg font-extrabold shadow-2xl transition cursor-pointer mr-3 shrink-0"
                  title="Previous Prop (←)"
                >
                  ←
                </button>
              )}

              <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
                <div className="flex justify-between items-start border-b border-neutral-800 pb-4 gap-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={selectedPropModal.playerImage}
                      alt={selectedPropModal.player}
                      onError={(e) => handleAvatarFallback(e, selectedPropModal.player)}
                      className="w-16 h-16 rounded-full bg-neutral-950 border-2 border-emerald-500/60 object-cover shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                          {selectedPropModal.sport} • {selectedPropModal.team} ({selectedPropModal.position}) •{' '}
                          <strong className="text-emerald-400">
                            {selectedPropModal.gameStatus === 'PREGAME'
                              ? formatGameTimeInUserTz(selectedPropModal.startTimeIso, selectedPropModal.startTime)
                              : `${selectedPropModal.liveClock} (${selectedPropModal.liveScore})`}
                          </strong>
                        </span>
                        {currentModalPropIndex !== -1 && (
                          <span className="text-[10px] font-bold text-neutral-500">
                            {currentModalPropIndex + 1} of {filteredProps.length}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-extrabold text-white mt-1">{selectedPropModal.player}</h2>
                      <p className="text-sm font-bold text-emerald-400">
                        {selectedPropModal.recommendedPick} {selectedPropModal.line} {selectedPropModal.market}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className={`px-3 py-1.5 rounded-xl border text-right ${getSmartScoreBadge(selectedPropModal.smartScore).bg}`}>
                      <p className="text-[9px] font-extrabold uppercase">SmartScore™</p>
                      <p className="text-base font-extrabold">{getSmartScoreBadge(selectedPropModal.smartScore).dot} {selectedPropModal.smartScore}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPropModal(null)}
                      className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {filteredProps.length > 1 && (
                  <div className="flex sm:hidden justify-between items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5">
                    <button
                      type="button"
                      onClick={handlePrevProp}
                      className="text-xs font-extrabold text-emerald-400 px-2 py-1 cursor-pointer"
                    >
                      ← Prev Prop
                    </button>
                    <span className="text-[10px] font-bold text-neutral-500">
                      Prop {currentModalPropIndex + 1} / {filteredProps.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextProp}
                      className="text-xs font-extrabold text-emerald-400 px-2 py-1 cursor-pointer"
                    >
                      Next Prop →
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
                  <button
                    onClick={() => setActiveModalTab('overview')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      activeModalTab === 'overview' ? 'bg-emerald-600 text-white' : 'text-neutral-400'
                    }`}
                  >
                    📊 Overview
                  </button>
                  <button
                    onClick={() => setActiveModalTab('rankings')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      activeModalTab === 'rankings' ? 'bg-emerald-600 text-white' : 'text-neutral-400'
                    }`}
                  >
                    🏆 Rankings
                  </button>
                  <button
                    onClick={() => setActiveModalTab('metrics')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      activeModalTab === 'metrics' ? 'bg-emerald-600 text-white' : 'text-neutral-400'
                    }`}
                  >
                    ⚡ Advanced
                  </button>
                </div>

                {activeModalTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Prop Line</p>
                        <p className="text-xl font-extrabold text-white mt-1">{selectedPropModal.line}</p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Season Avg</p>
                        <p className="text-xl font-extrabold text-emerald-400 mt-1">{selectedPropModal.seasonAvg}</p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Last 5 Avg</p>
                        <p className="text-xl font-extrabold text-emerald-400 mt-1">{selectedPropModal.last5Avg}</p>
                      </div>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-2.5">
                      <div className="flex justify-between text-xs font-extrabold">
                        <span className="text-emerald-400">OVER: {selectedPropModal.overProbabilityPct}%</span>
                        <span className="text-rose-400">UNDER: {selectedPropModal.underProbabilityPct}%</span>
                      </div>
                      <div className="w-full h-3 bg-rose-950 rounded-full overflow-hidden flex">
                        <div style={{ width: `${selectedPropModal.overProbabilityPct}%` }} className="bg-emerald-500 h-full"></div>
                      </div>
                      <p className="text-xs text-neutral-300 pt-1 leading-relaxed">💡 {selectedPropModal.matchupIntel}</p>
                    </div>

                    <div>
                      <p className="text-xs font-extrabold text-neutral-300 uppercase mb-2">
                        Recent Games vs. Line ({selectedPropModal.line})
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {selectedPropModal.last5Logs?.map((val: number, idx: number) => {
                          const hit = val > selectedPropModal.line;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border text-center ${
                                hit
                                  ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                                  : 'bg-rose-950/50 border-rose-800 text-rose-300'
                              }`}
                            >
                              <p className="text-sm font-extrabold">{val}</p>
                              <p className="text-[9px] font-extrabold uppercase mt-0.5">{hit ? 'HIT ✓' : 'MISS'}</p>
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
                          Ranked #{selectedPropModal.positionalRanking.offensiveRank} Offensively
                        </h4>
                      </div>
                      <div className="bg-emerald-950/70 border border-emerald-700 px-3.5 py-2 rounded-xl text-center">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase">Efficiency</p>
                        <p className="text-xl font-extrabold text-white">
                          {selectedPropModal.positionalRanking.efficiencyGrade}
                        </p>
                      </div>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
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
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Usage / Target Share</p>
                        <p className="text-sm font-extrabold text-white mt-1">
                          {selectedPropModal.advancedMetrics.usageOrTargetRate}
                        </p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Pace / Volume</p>
                        <p className="text-sm font-extrabold text-emerald-400 mt-1">
                          {selectedPropModal.advancedMetrics.paceOrSnapShare}
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

                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center flex-wrap gap-2">
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
                    {selectedPropModal.gameStatus === 'PREGAME' && (
                      <button
                        onClick={(e) => toggleSlipPick(selectedPropModal, e)}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                      >
                        {slipPicks.some((p) => p.id === selectedPropModal.id) ? '✓ In Slip' : '+ Add to Slip'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const prop = selectedPropModal;
                        setSelectedPropModal(null);
                        setPendingShareItem({ prop });
                      }}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                    >
                      💬 Send Prop to Friend
                    </button>
                  </div>
                </div>
              </div>

              {filteredProps.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextProp}
                  className="hidden sm:flex w-11 h-11 rounded-full bg-neutral-900/95 hover:bg-emerald-600 text-white border border-neutral-700 hover:border-emerald-400 items-center justify-center text-lg font-extrabold shadow-2xl transition cursor-pointer ml-3 shrink-0"
                  title="Next Prop (→)"
                >
                  →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Platform Slip Maker Drawer */}
        <SlipDrawer
          isOpen={isSlipOpen && !!user}
          onClose={() => setIsSlipOpen(false)}
          slipPlatform={slipPlatform}
          setSlipPlatform={(plat) => {
            setSlipPlatform(plat);
            if (user) {
              localStorage.setItem(`betsmart_platform_${user.uid}`, plat);
              saveUserPrefsToServer(user, { preferredPlatform: plat });
            }
          }}
          slipPicks={slipPicks}
          onRemovePick={(id) => setSlipPicks((prev) => prev.filter((p) => p.id !== id))}
          onClearSlip={() => setSlipPicks([])}
          onShareSlipToChat={(slipPayload) => {
            if (!user) {
              setIsSlipOpen(false);
              setShowAuthModal(true);
              return;
            }
            setPendingShareItem({ slip: slipPayload });
          }}
        />

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        )}

        {/* Onboarding Tutorial Modal */}
        {showTutorialModal && user && (
          <TutorialModal
            userHandle={currentUserHandle}
            onClose={handleCloseTutorial}
          />
        )}

        {/* Click-to-Edit !Profile Modal */}
        {showProfileModal && user && (
          <ProfileModal
            user={user}
            currentAvatarUrl={resolvedCurrentUserAvatar}
            onClose={() => setShowProfileModal(false)}
            onUpdate={(updated, newAvatar, newHandle) => {
              setUser(updated);
              setUserAvatarUrl(newAvatar);
              setCustomHandle(newHandle);
              saveUserPrefsToServer(updated, {
                handle: newHandle,
                photoURL: newAvatar,
              });
              syncUserActivityToAdmin(updated, 'Updated !Handle & Avatar', newAvatar, newHandle);
            }}
          />
        )}
      </main>
    </PasswordGate>
  );
}
