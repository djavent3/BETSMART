'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SystemAuditRow, UserActivityRecord } from '@/app/api/admin/route';

interface AdminDashboardProps {
  onClose?: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  // Passcode Protection State
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);
  const [adminCodeInput, setAdminCodeInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'security'>('audit');
  const [users, setUsers] = useState<UserActivityRecord[]>([]);
  const [auditRows, setAuditRows] = useState<SystemAuditRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Site Security & Google Sheet Config
  const [siteLocked, setSiteLocked] = useState<boolean>(true);
  const [unlockCodes, setUnlockCodes] = useState<string[]>(['betsmart2026']);
  const [newUnlockCode, setNewUnlockCode] = useState<string>('');
  const [masterSheetUrl, setMasterSheetUrl] = useState<string>(
    'https://docs.google.com/spreadsheets/d/1BetsmartMasterAudit2026/edit#gid=0'
  );
  const [googleSheetWebhookUrl, setGoogleSheetWebhookUrl] = useState<string>('');
  const [newAdminPasscode, setNewAdminPasscode] = useState<string>('');
  const [lastSheetAutoExportAt, setLastSheetAutoExportAt] = useState<string | null>(null);

  // User Log Search
  const [userSearch, setUserSearch] = useState<string>('');

  // System W/L Table Filters & Date Filter (Starts 2026-10-28)
  const [dateFilter, setDateFilter] = useState<string>('2026-10-28');
  const [sportFilter, setSportFilter] = useState<'ALL' | 'NBA' | 'NFL'>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [marketFilter, setMarketFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<
    'smartScore' | 'overProbabilityPct' | 'marginVsLine' | 'positionalRank' | 'date'
  >('smartScore');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Trend Table Sorting
  const [trendSortField, setTrendSortField] = useState<
    'scoreBand' | 'winRatePct' | 'totalProps' | 'avgMargin'
  >('scoreBand');
  const [trendSortDir, setTrendSortDir] = useState<'desc' | 'asc'>('desc');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('betsmart_admin_unlocked') === 'true') {
      setAdminUnlocked(true);
    }
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', { cache: 'no-store' });
      const json = await res.json();
      if (json.status === 'success') {
        setUsers(json.users || []);
        setAuditRows(json.auditRows || []);
        if (json.siteConfig) {
          setSiteLocked(json.siteConfig.siteLocked);
          setUnlockCodes(json.siteConfig.unlockCodes || ['betsmart2026']);
          setMasterSheetUrl(json.siteConfig.masterSheetUrl || '');
          setGoogleSheetWebhookUrl(json.siteConfig.googleSheetWebhookUrl || '');
          setLastSheetAutoExportAt(json.siteConfig.lastSheetAutoExportAt || null);
        }
      }
    } catch (err) {
      console.error('Failed to load admin database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUnlocked) {
      fetchAdminData();
    }
  }, [adminUnlocked]);

  const handleVerifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_admin_code', code: adminCodeInput }),
      });
      const json = await res.json();
      if (json.valid || adminCodeInput.trim().toLowerCase() === 'admin2026') {
        sessionStorage.setItem('betsmart_admin_unlocked', 'true');
        setAdminUnlocked(true);
        setAuthError(null);
      } else {
        setAuthError('Invalid admin passcode.');
        setAdminCodeInput('');
      }
    } catch {
      if (adminCodeInput.trim().toLowerCase() === 'admin2026') {
        sessionStorage.setItem('betsmart_admin_unlocked', 'true');
        setAdminUnlocked(true);
      } else {
        setAuthError('Invalid admin passcode.');
      }
    }
  };

  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(auditRows.map((r) => r.date))).sort((a, b) =>
      b.localeCompare(a)
    );
    if (!dates.includes('2026-10-28')) dates.unshift('2026-10-28');
    return ['ALL', ...dates];
  }, [auditRows]);

  const availableMarkets = useMemo(() => {
    const set = new Set(auditRows.map((r) => r.market));
    return ['ALL', ...Array.from(set)];
  }, [auditRows]);

  const filteredAuditRows = useMemo(() => {
    let list = [...auditRows];
    if (dateFilter !== 'ALL') list = list.filter((r) => r.date === dateFilter);
    if (sportFilter !== 'ALL') list = list.filter((r) => r.sport === sportFilter);
    if (outcomeFilter !== 'ALL') list = list.filter((r) => r.outcome === outcomeFilter);
    if (marketFilter !== 'ALL') list = list.filter((r) => r.market === marketFilter);

    list.sort((a, b) => {
      if (sortField === 'date') {
        return sortDir === 'desc'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      }
      const valA = a[sortField];
      const valB = b[sortField];
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [auditRows, dateFilter, sportFilter, outcomeFilter, marketFilter, sortField, sortDir]);

  const scoreTrendBands = useMemo(() => {
    const bands = [
      { id: '95-100', min: 95, max: 100, label: '95 – 99 SmartScore' },
      { id: '92-94', min: 92, max: 94, label: '92 – 94 SmartScore' },
      { id: '90-91', min: 90, max: 91, label: '90 – 91 SmartScore' },
      { id: '85-89', min: 85, max: 89, label: '85 – 89 SmartScore' },
      { id: '80-84', min: 80, max: 84, label: '80 – 84 SmartScore' },
      { id: '0-79', min: 0, max: 79, label: 'Under 80 SmartScore' },
    ];

    const computed = bands.map((b) => {
      const matching = auditRows.filter(
        (r) =>
          (dateFilter === 'ALL' || r.date === dateFilter) &&
          (sportFilter === 'ALL' || r.sport === sportFilter) &&
          r.smartScore >= b.min &&
          r.smartScore <= b.max
      );
      const wins = matching.filter((r) => r.outcome === 'WIN').length;
      const losses = matching.filter((r) => r.outcome === 'LOSS').length;
      const total = wins + losses;
      const winRatePct = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
      const avgProb =
        total > 0
          ? Math.round(
              matching.reduce((acc, item) => acc + item.overProbabilityPct, 0) / total
            )
          : 0;
      const avgMargin =
        total > 0
          ? Math.round(
              (matching.reduce((acc, item) => acc + item.marginVsLine, 0) / total) * 10
            ) / 10
          : 0;

      return {
        ...b,
        wins,
        losses,
        totalProps: total,
        winRatePct,
        avgProb,
        avgMargin,
      };
    });

    return computed.sort((a, b) => {
      if (trendSortField === 'scoreBand') {
        return trendSortDir === 'desc' ? b.min - a.min : a.min - b.min;
      }
      const valA = a[trendSortField];
      const valB = b[trendSortField];
      return trendSortDir === 'desc' ? valB - valA : valA - valB;
    });
  }, [auditRows, dateFilter, sportFilter, trendSortField, trendSortDir]);

  const summaryStats = useMemo(() => {
    const wins = filteredAuditRows.filter((r) => r.outcome === 'WIN');
    const losses = filteredAuditRows.filter((r) => r.outcome === 'LOSS');
    const total = wins.length + losses.length;
    const winRate = total > 0 ? Math.round((wins.length / total) * 1000) / 10 : 0;
    const avgWinScore =
      wins.length > 0
        ? Math.round((wins.reduce((acc, r) => acc + r.smartScore, 0) / wins.length) * 10) / 10
        : 0;
    const avgLossScore =
      losses.length > 0
        ? Math.round(
            (losses.reduce((acc, r) => acc + r.smartScore, 0) / losses.length) * 10
          ) / 10
        : 0;

    return {
      wins: wins.length,
      losses: losses.length,
      total,
      winRate,
      avgWinScore,
      avgLossScore,
    };
  }, [filteredAuditRows]);

  const handleExportAuditCsv = () => {
    const headers = [
      'Date',
      'Sport',
      'Matchup',
      'Player',
      'Position',
      'Market',
      'Line',
      'Pick',
      'SmartScore',
      'Model Prob (%)',
      'Season Avg',
      'Last 5 Avg',
      'Pos Off Rank',
      'Opp Def Rank',
      'Actual Stat',
      'Margin vs Line',
      'Outcome',
      'Platform',
    ];
    const rows = filteredAuditRows.map((r) => [
      r.date,
      r.sport,
      `"${r.matchup}"`,
      `"${r.player}"`,
      r.position,
      `"${r.market}"`,
      r.line,
      r.recommendedPick,
      r.smartScore,
      r.overProbabilityPct,
      r.seasonAvg,
      r.last5Avg,
      r.positionalRank,
      r.oppDefenseRank,
      r.actualStat,
      r.marginVsLine,
      r.outcome,
      `"${r.platform}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BETSMART_System_WL_Audit_${dateFilter === 'ALL' ? 'All_Dates' : dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyForGoogleSheets = () => {
    const headers = [
      'Date',
      'Sport',
      'Matchup',
      'Player',
      'Position',
      'Market',
      'Line',
      'Pick',
      'SmartScore',
      'Model Prob (%)',
      'Season Avg',
      'Last 5 Avg',
      'Pos Off Rank',
      'Opp Def Rank',
      'Actual Stat',
      'Margin vs Line',
      'Outcome',
      'Platform',
    ];
    const rows = filteredAuditRows.map((r) => [
      r.date,
      r.sport,
      r.matchup,
      r.player,
      r.position,
      r.market,
      r.line,
      r.recommendedPick,
      r.smartScore,
      r.overProbabilityPct,
      r.seasonAvg,
      r.last5Avg,
      r.positionalRank,
      r.oppDefenseRank,
      r.actualStat,
      r.marginVsLine,
      r.outcome,
      r.platform,
    ]);
    const tsv = [headers.join('\t'), ...rows.map((e) => e.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv);
    setStatusBanner('Copied tab-separated table! Open your Master Google Sheet and press Cmd+V / Ctrl+V.');
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleManualGoogleSheetSync = async () => {
    const targetDate = dateFilter === 'ALL' ? '2026-10-28' : dateFilter;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trigger_sheet_export', date: targetDate }),
    });
    const json = await res.json();
    if (json.status === 'success') {
      setLastSheetAutoExportAt(json.lastSheetAutoExportAt);
      setAuditRows(json.auditRows);
      setStatusBanner(`Synced ${targetDate} graded slate to Master Google Sheet!`);
      setTimeout(() => setStatusBanner(null), 4000);
    }
  };

  const handleSaveSecuritySettings = async (
    updatedLocked = siteLocked,
    updatedCodes = unlockCodes
  ) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_site_config',
        siteLocked: updatedLocked,
        unlockCodes: updatedCodes,
        masterSheetUrl,
        googleSheetWebhookUrl,
        adminPasscode: newAdminPasscode.trim() || undefined,
      }),
    });
    const json = await res.json();
    if (json.status === 'success') {
      setSiteLocked(json.siteConfig.siteLocked);
      setUnlockCodes(json.siteConfig.unlockCodes);
      setNewAdminPasscode('');
      setStatusBanner('Updated site lock & Master Google Sheet settings!');
      setTimeout(() => setStatusBanner(null), 3500);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const toggleSort = (
    field: 'smartScore' | 'overProbabilityPct' | 'marginVsLine' | 'positionalRank' | 'date'
  ) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Passcode Lock Screen for Admin Portal
  if (!adminUnlocked) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md mx-auto my-6 shadow-2xl space-y-5 text-center">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
            🔒 Restricted Admin Portal
          </span>
          <h3 className="text-xl font-extrabold text-white mt-2">
            Enter Admin Access Code
          </h3>
          <p className="text-xs text-neutral-400">
            Protected system W/L database, Google Sheet sync, and site unlock code manager.
          </p>
        </div>

        {authError && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-2.5 rounded-xl text-xs font-bold">
            {authError}
          </div>
        )}

        <form onSubmit={handleVerifyAdmin} className="space-y-3">
          <input
            type="password"
            value={adminCodeInput}
            onChange={(e) => setAdminCodeInput(e.target.value)}
            placeholder="Admin passcode (default: admin2026)..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            autoFocus
            required
          />
          <div className="flex gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold rounded-xl cursor-pointer"
            >
              Unlock Admin →
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6 text-neutral-100">
      {/* Top Admin Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
              🛡️ Admin Control Center
            </span>
            <h2 className="text-xl font-extrabold text-white">
              BETSMART System W/L Database, User Log & Site Gate
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Auto-exports completed daily slates to Google Sheets • Daily Live Tracker reset at 4:00 AM EST
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {masterSheetUrl && (
            <a
              href={masterSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/60 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <span>📊 Open Master Google Sheet ↗</span>
            </a>
          )}
          <button
            onClick={fetchAdminData}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-xl cursor-pointer"
          >
            🔄 Refresh DB
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            📊 System W/L Database & Trends ({ filteredAuditRows.length })
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            👥 User Log ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🔒 Site Lock & Unlock Codes ({unlockCodes.length})
          </button>
        </div>

        {activeTab === 'audit' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualGoogleSheetSync}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow"
            >
              ☁️ Sync Slate to Google Sheet Now
            </button>
            <button
              onClick={handleExportAuditCsv}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow"
            >
              📥 Export .CSV / Excel
            </button>
            <button
              onClick={handleCopyForGoogleSheets}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              📋 Copy for Google Sheets
            </button>
          </div>
        )}
      </div>

      {statusBanner && (
        <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold">
          ✓ {statusBanner}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-neutral-400 text-sm">
          Loading Admin Database...
        </div>
      ) : activeTab === 'audit' ? (
        /* ================================================================= */
        /* TAB 1: SYSTEM W/L DATABASE (STARTS 10/28) & SMARTSCORE TRENDS     */
        /* ================================================================= */
        <div className="space-y-6">
          {/* Auto-Export Status Bar */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-neutral-300 font-semibold">
                Master Google Sheet Auto-Export Status:
              </span>
              <strong className="text-emerald-400">
                {lastSheetAutoExportAt || 'Waiting for final game of the night to finish'}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-bold">Filter by Slate Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-neutral-900 border border-emerald-600/60 rounded-lg px-3 py-1 text-xs font-extrabold text-emerald-400"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Dates (Since 10/28)' : `Slate: ${d}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <p className="text-[10px] font-extrabold uppercase text-neutral-400">
                Graded Record ({dateFilter})
              </p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                {summaryStats.wins}W - {summaryStats.losses}L ({summaryStats.winRate}%)
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {summaryStats.total} completed props logged
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <p className="text-[10px] font-extrabold uppercase text-neutral-400">
                Avg Winning SmartScore™
              </p>
              <p className="text-2xl font-extrabold text-white mt-1">
                🔥 {summaryStats.avgWinScore}
              </p>
              <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                Mean score on winning props
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <p className="text-[10px] font-extrabold uppercase text-neutral-400">
                Avg Losing SmartScore™
              </p>
              <p className="text-2xl font-extrabold text-rose-400 mt-1">
                {summaryStats.avgLossScore}
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Mean score on missed props
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <p className="text-[10px] font-extrabold uppercase text-neutral-400">
                Score Spread Differential
              </p>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">
                +{(summaryStats.avgWinScore - summaryStats.avgLossScore).toFixed(1)} pts
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Separation between W & L cohorts
              </p>
            </div>
          </div>

          {/* 1. SmartScore™ Tier vs. Prop Success Rate Trend Matrix */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  1. SmartScore™ vs. Prop Success Rate Trend Matrix
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Sort by SmartScore # or Prop Success Rate (%) to spot confidence thresholds.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  onClick={() => {
                    setTrendSortField('scoreBand');
                    setTrendSortDir(trendSortDir === 'desc' ? 'asc' : 'desc');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    trendSortField === 'scoreBand'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-900 text-neutral-300'
                  }`}
                >
                  SmartScore # {trendSortField === 'scoreBand' ? (trendSortDir === 'desc' ? '↓' : '↑') : ''}
                </button>
                <button
                  onClick={() => {
                    setTrendSortField('winRatePct');
                    setTrendSortDir(trendSortDir === 'desc' ? 'asc' : 'desc');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    trendSortField === 'winRatePct'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-900 text-neutral-300'
                  }`}
                >
                  Success Rate % {trendSortField === 'winRatePct' ? (trendSortDir === 'desc' ? '↓' : '↑') : ''}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/90 border-b border-neutral-800 text-[10px] font-extrabold uppercase text-neutral-400">
                    <th className="py-3 px-4">SmartScore™ Band</th>
                    <th className="py-3 px-4">W - L Record</th>
                    <th className="py-3 px-4">Sample Size</th>
                    <th className="py-3 px-4">Prop Success Rate (%)</th>
                    <th className="py-3 px-4">Avg Market Prob (%)</th>
                    <th className="py-3 px-4 text-right">Avg Margin vs. Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  {scoreTrendBands.map((band) => (
                    <tr key={band.id} className="hover:bg-neutral-900/60">
                      <td className="py-3 px-4 font-extrabold text-white">{band.label}</td>
                      <td className="py-3 px-4 font-bold text-neutral-200">
                        {band.wins}W - {band.losses}L
                      </td>
                      <td className="py-3 px-4 text-neutral-400">{band.totalProps} props</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`font-extrabold ${
                              band.winRatePct >= 80
                                ? 'text-emerald-400'
                                : band.winRatePct >= 60
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {band.winRatePct}%
                          </span>
                          <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${band.winRatePct}%` }}
                              className={`h-full ${
                                band.winRatePct >= 80
                                  ? 'bg-emerald-500'
                                  : band.winRatePct >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-300 font-semibold">{band.avgProb}%</td>
                      <td
                        className={`py-3 px-4 text-right font-extrabold ${
                          band.avgMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {band.avgMargin >= 0 ? `+${band.avgMargin}` : band.avgMargin}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Detailed Parameterized System W/L Database Table */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  2. Detailed Parameterized System W/L Database (Starting 10/28)
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Every completed prop is automatically graded and added here once a game reaches FINAL.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                >
                  <option value="ALL">All Sports</option>
                  <option value="NBA">NBA Only</option>
                  <option value="NFL">NFL Only</option>
                </select>

                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                >
                  {availableMarkets.map((m) => (
                    <option key={m} value={m}>
                      {m === 'ALL' ? 'All Markets' : m}
                    </option>
                  ))}
                </select>

                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                >
                  <option value="ALL">All Outcomes (W & L)</option>
                  <option value="WIN">Wins Only (W)</option>
                  <option value="LOSS">Losses Only (L)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/90 border-b border-neutral-800 text-[10px] font-extrabold uppercase text-neutral-400">
                    <th
                      onClick={() => toggleSort('date')}
                      className="py-3 px-3.5 cursor-pointer hover:text-white"
                    >
                      Date {sortField === 'date' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th className="py-3 px-3.5">Sport / Matchup</th>
                    <th className="py-3 px-3.5">Player</th>
                    <th className="py-3 px-3.5">Prop Pick</th>
                    <th
                      onClick={() => toggleSort('smartScore')}
                      className="py-3 px-3.5 cursor-pointer hover:text-white text-emerald-400"
                    >
                      SmartScore™ {sortField === 'smartScore' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th
                      onClick={() => toggleSort('overProbabilityPct')}
                      className="py-3 px-3.5 cursor-pointer hover:text-white"
                    >
                      Proj % {sortField === 'overProbabilityPct' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th className="py-3 px-3.5">Szn / L5 Avg</th>
                    <th
                      onClick={() => toggleSort('positionalRank')}
                      className="py-3 px-3.5 cursor-pointer hover:text-white"
                    >
                      Pos / Opp Rank
                    </th>
                    <th className="py-3 px-3.5">Final Stat</th>
                    <th
                      onClick={() => toggleSort('marginVsLine')}
                      className="py-3 px-3.5 cursor-pointer hover:text-white"
                    >
                      Diff {sortField === 'marginVsLine' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th className="py-3 px-3.5 text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  {filteredAuditRows.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-900/60">
                      <td className="py-3 px-3.5 text-neutral-400 whitespace-nowrap">{row.date}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-white">{row.sport}</span>{' '}
                        <span className="text-neutral-400">• {row.matchup}</span>
                      </td>
                      <td className="py-3 px-3.5 font-extrabold text-white whitespace-nowrap">
                        {row.player} <span className="text-neutral-500 font-normal">({row.position})</span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-emerald-400 whitespace-nowrap">
                        {row.recommendedPick} {row.line} {row.market}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 font-extrabold text-white">
                          {row.smartScore}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-neutral-200">
                        {row.overProbabilityPct}%
                      </td>
                      <td className="py-3 px-3.5 text-neutral-300 whitespace-nowrap">
                        {row.seasonAvg} / {row.last5Avg}
                      </td>
                      <td className="py-3 px-3.5 text-neutral-300 whitespace-nowrap">
                        #{row.positionalRank} Off / #{row.oppDefenseRank} Def
                      </td>
                      <td className="py-3 px-3.5 font-extrabold text-white">{row.actualStat}</td>
                      <td
                        className={`py-3 px-3.5 font-extrabold ${
                          row.marginVsLine > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {row.marginVsLine > 0 ? `+${row.marginVsLine}` : row.marginVsLine}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            row.outcome === 'WIN'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {row.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        /* ================================================================= */
        /* TAB 2: REGISTERED USER LOG (WITH WORKING AVATAR IMAGES)           */
        /* ================================================================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-extrabold text-white">Registered User Log</h3>
              <p className="text-[11px] text-neutral-400">
                Search users by name or !handle. Shows profile picture, account creation timestamp, and latest activity.
              </p>
            </div>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user name or !handle..."
              className="w-full sm:w-64 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-10 text-center space-y-1">
              <p className="text-sm font-bold text-white">No users match your search yet</p>
              <p className="text-xs text-neutral-400">
                When users sign in or register, their profile picture, account creation date, and last activity appear here.
              </p>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 border-b border-neutral-800 text-[10px] font-extrabold uppercase text-neutral-400">
                    <th className="py-3 px-4">User & !Handle</th>
                    <th className="py-3 px-4">Account Created</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4 text-right">Latest Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-neutral-900/60">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img
                          src={u.photoURL}
                          alt={u.name}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              u.name || 'User'
                            )}&background=064e3b&color=34d399&bold=true`;
                          }}
                          className="w-9 h-9 rounded-full bg-neutral-900 border border-emerald-500/50 object-cover shrink-0"
                        />
                        <div>
                          <p className="font-extrabold text-white">{u.name}</p>
                          <p className="text-[11px] font-bold text-emerald-400">{u.handle}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        {new Date(u.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                        {new Date(u.lastActiveAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
                          {u.lastAction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ================================================================= */
        /* TAB 3: SITE LOCK, ACCEPTABLE UNLOCK CODES & GOOGLE SHEET CONFIG   */
        /* ================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Site Lock & Acceptable Unlock Codes */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Site Password Gate & Unlock Codes
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Lock the site for beta testing and manage acceptable unlock codes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !siteLocked;
                  setSiteLocked(next);
                  handleSaveSecuritySettings(next, unlockCodes);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                  siteLocked
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {siteLocked ? '🔒 Site Lock: ON' : '🔓 Site Lock: OFF'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-400">
                Acceptable Tester Unlock Codes ({unlockCodes.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {unlockCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-extrabold text-emerald-400"
                  >
                    {code}
                    {unlockCodes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = unlockCodes.filter((c) => c !== code);
                          setUnlockCodes(updated);
                          handleSaveSecuritySettings(siteLocked, updated);
                        }}
                        className="text-neutral-500 hover:text-rose-400 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newUnlockCode.trim()) return;
                const updated = Array.from(
                  new Set([...unlockCodes, newUnlockCode.trim()])
                );
                setUnlockCodes(updated);
                setNewUnlockCode('');
                handleSaveSecuritySettings(siteLocked, updated);
              }}
              className="flex gap-2 pt-2"
            >
              <input
                type="text"
                value={newUnlockCode}
                onChange={(e) => setNewUnlockCode(e.target.value)}
                placeholder="Add new unlock code (e.g. squad2026)..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
              >
                + Add Code
              </button>
            </form>
          </div>

          {/* Master Google Sheet Link & Admin Passcode Config */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">
                Master Google Sheet Link & Admin Access Code
              </h3>
              <p className="text-[11px] text-neutral-400">
                Configure your Master Google Sheet URL and Admin Portal passcode.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                Master Google Sheet URL (Displayed in Admin Header)
              </label>
              <input
                type="url"
                value={masterSheetUrl}
                onChange={(e) => setMasterSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                Google Apps Script Auto-Export Webhook URL (Optional)
              </label>
              <input
                type="url"
                value={googleSheetWebhookUrl}
                onChange={(e) => setGoogleSheetWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                Change Admin Portal Passcode (Leave blank to keep current)
              </label>
              <input
                type="password"
                value={newAdminPasscode}
                onChange={(e) => setNewAdminPasscode(e.target.value)}
                placeholder="New admin passcode..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleSaveSecuritySettings(siteLocked, unlockCodes)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold rounded-xl cursor-pointer shadow"
            >
              Save Sheet & Security Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
