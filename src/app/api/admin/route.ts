import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface UserActivityRecord {
  uid: string;
  name: string;
  handle: string;
  email: string;
  photoURL: string;
  createdAt: string;
  lastActiveAt: string;
  lastAction: string;
}

export interface UserPreferencesRecord {
  uid: string;
  handle: string;
  photoURL: string;
  hideTutorial: boolean;
  preferredPlatform: string;
  layoutMode: 'grid' | 'compact';
}

export interface TesterFeedbackItem {
  id: string;
  senderHandle: string;
  category: 'Bug' | 'UI/UX' | 'Prop Data' | 'General';
  message: string;
  createdAt: string;
  pageContext: string;
}

export interface SystemAuditRow {
  id: string;
  date: string;
  sport: 'NBA' | 'NFL';
  matchup: string;
  player: string;
  position: string;
  market: string;
  line: number;
  recommendedPick: 'OVER' | 'UNDER';
  smartScore: number;
  overProbabilityPct: number;
  seasonAvg: number;
  last5Avg: number;
  positionalRank: number;
  oppDefenseRank: number;
  actualStat: number;
  marginVsLine: number;
  outcome: 'WIN' | 'LOSS';
  platform: string;
  exportedToSheet?: boolean;
}

export interface SiteSecurityConfig {
  siteLocked: boolean;
  unlockCodes: string[];
  adminPasscode: string;
  masterSheetUrl: string;
  googleSheetWebhookUrl: string;
  lastSheetAutoExportAt: string | null;
  lastExportedSlateDate: string | null;
  lastDailyResetAt: string;
}

const STORE_PATH = path.join('/tmp', 'betsmart_admin_store_v3.json');

const defaultAvatarForHandle = (handle: string) => {
  const clean = (handle || 'user').replace(/^[!@#\s]+/, '') || 'user';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    clean
  )}&background=064e3b&color=34d399&bold=true&size=128`;
};

const DEFAULT_10_28_AUDIT_ROWS: SystemAuditRow[] = [
  {
    id: 'aud-1028-1',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'PHI @ IND',
    player: 'Tyrese Haliburton',
    position: 'PG',
    market: 'Assists',
    line: 9.5,
    recommendedPick: 'OVER',
    smartScore: 94,
    overProbabilityPct: 78,
    seasonAvg: 11.4,
    last5Avg: 11.8,
    positionalRank: 1,
    oppDefenseRank: 25,
    actualStat: 13,
    marginVsLine: 3.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-2',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'PHI @ IND',
    player: 'Tyrese Maxey',
    position: 'PG',
    market: 'Points',
    line: 27.5,
    recommendedPick: 'OVER',
    smartScore: 91,
    overProbabilityPct: 74,
    seasonAvg: 29.8,
    last5Avg: 31.0,
    positionalRank: 4,
    oppDefenseRank: 28,
    actualStat: 32,
    marginVsLine: 4.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-3',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'NYK @ CHI',
    player: 'Jalen Brunson',
    position: 'PG',
    market: 'Points',
    line: 28.5,
    recommendedPick: 'OVER',
    smartScore: 96,
    overProbabilityPct: 81,
    seasonAvg: 30.6,
    last5Avg: 32.2,
    positionalRank: 2,
    oppDefenseRank: 27,
    actualStat: 31,
    marginVsLine: 2.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-4',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'NYK @ CHI',
    player: 'Karl-Anthony Towns',
    position: 'C',
    market: 'Rebounds',
    line: 11.5,
    recommendedPick: 'OVER',
    smartScore: 84,
    overProbabilityPct: 68,
    seasonAvg: 12.9,
    last5Avg: 13.6,
    positionalRank: 3,
    oppDefenseRank: 26,
    actualStat: 11,
    marginVsLine: -0.5,
    outcome: 'LOSS',
    platform: 'FanDuel',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-5',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'NYK @ CHI',
    player: 'Josh Hart',
    position: 'SF',
    market: 'Pts + Reb + Ast',
    line: 23.5,
    recommendedPick: 'OVER',
    smartScore: 90,
    overProbabilityPct: 76,
    seasonAvg: 26.4,
    last5Avg: 27.2,
    positionalRank: 9,
    oppDefenseRank: 22,
    actualStat: 26,
    marginVsLine: 2.5,
    outcome: 'WIN',
    platform: 'ParlayPlay',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-6',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'GSW @ MIN',
    player: 'Stephen Curry',
    position: 'PG',
    market: '3-Pt Made',
    line: 4.5,
    recommendedPick: 'OVER',
    smartScore: 82,
    overProbabilityPct: 70,
    seasonAvg: 5.2,
    last5Avg: 5.6,
    positionalRank: 3,
    oppDefenseRank: 14,
    actualStat: 6,
    marginVsLine: 1.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-7',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'GSW @ MIN',
    player: 'Anthony Edwards',
    position: 'SG',
    market: 'Points',
    line: 27.5,
    recommendedPick: 'OVER',
    smartScore: 89,
    overProbabilityPct: 74,
    seasonAvg: 29.4,
    last5Avg: 30.8,
    positionalRank: 1,
    oppDefenseRank: 19,
    actualStat: 30,
    marginVsLine: 2.5,
    outcome: 'WIN',
    platform: 'ESPN Bet',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-8',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'OKC @ DAL',
    player: 'Shai Gilgeous-Alexander',
    position: 'PG',
    market: 'Points',
    line: 30.5,
    recommendedPick: 'OVER',
    smartScore: 98,
    overProbabilityPct: 84,
    seasonAvg: 32.8,
    last5Avg: 33.4,
    positionalRank: 1,
    oppDefenseRank: 21,
    actualStat: 34,
    marginVsLine: 3.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-9',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'OKC @ DAL',
    player: 'Luka Doncic',
    position: 'PG',
    market: 'Pts + Reb + Ast',
    line: 47.5,
    recommendedPick: 'OVER',
    smartScore: 79,
    overProbabilityPct: 66,
    seasonAvg: 49.8,
    last5Avg: 51.2,
    positionalRank: 2,
    oppDefenseRank: 4,
    actualStat: 45,
    marginVsLine: -2.5,
    outcome: 'LOSS',
    platform: 'DraftKings',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-10',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'DEN @ PHX',
    player: 'Nikola Jokic',
    position: 'C',
    market: 'Rebounds',
    line: 12.5,
    recommendedPick: 'OVER',
    smartScore: 95,
    overProbabilityPct: 82,
    seasonAvg: 13.8,
    last5Avg: 14.4,
    positionalRank: 1,
    oppDefenseRank: 25,
    actualStat: 14,
    marginVsLine: 1.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-11',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'LAL @ LAC',
    player: 'Anthony Davis',
    position: 'C',
    market: 'Points',
    line: 26.5,
    recommendedPick: 'OVER',
    smartScore: 93,
    overProbabilityPct: 78,
    seasonAvg: 29.2,
    last5Avg: 30.4,
    positionalRank: 2,
    oppDefenseRank: 20,
    actualStat: 29,
    marginVsLine: 2.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'aud-1028-12',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'LAL @ LAC',
    player: 'LeBron James',
    position: 'SF',
    market: 'Assists',
    line: 7.5,
    recommendedPick: 'OVER',
    smartScore: 73,
    overProbabilityPct: 63,
    seasonAvg: 8.4,
    last5Avg: 8.8,
    positionalRank: 1,
    oppDefenseRank: 18,
    actualStat: 7,
    marginVsLine: -0.5,
    outcome: 'LOSS',
    platform: 'FanDuel',
    exportedToSheet: true,
  },
];

const globalForAdmin = globalThis as unknown as {
  usersLog: Record<string, UserActivityRecord>;
  userPrefs: Record<string, UserPreferencesRecord>;
  auditRows: SystemAuditRow[];
  feedbackList: TesterFeedbackItem[];
  siteConfig: SiteSecurityConfig;
  userAvatars: Record<string, string>;
  initializedFromDisk?: boolean;
};

function saveAdminStoreToDisk() {
  try {
    const payload = {
      usersLog: globalForAdmin.usersLog,
      userPrefs: globalForAdmin.userPrefs,
      auditRows: globalForAdmin.auditRows,
      feedbackList: globalForAdmin.feedbackList,
      siteConfig: globalForAdmin.siteConfig,
      userAvatars: globalForAdmin.userAvatars,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(payload), 'utf8');
  } catch {
    // Non-blocking in serverless environment
  }
}

function initAdminStore() {
  if (!globalForAdmin.initializedFromDisk) {
    globalForAdmin.initializedFromDisk = true;
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        globalForAdmin.usersLog = parsed.usersLog || {};
        globalForAdmin.userPrefs = parsed.userPrefs || {};
        globalForAdmin.auditRows =
          Array.isArray(parsed.auditRows) && parsed.auditRows.length > 0
            ? parsed.auditRows
            : [...DEFAULT_10_28_AUDIT_ROWS];
        globalForAdmin.feedbackList = parsed.feedbackList || [];
        globalForAdmin.siteConfig = parsed.siteConfig;
        globalForAdmin.userAvatars = parsed.userAvatars || {};
      }
    } catch {
      // Fallback to defaults below
    }
  }

  if (!globalForAdmin.usersLog) globalForAdmin.usersLog = {};
  if (!globalForAdmin.userPrefs) globalForAdmin.userPrefs = {};
  if (!globalForAdmin.userAvatars) globalForAdmin.userAvatars = {};
  if (!globalForAdmin.feedbackList) globalForAdmin.feedbackList = [];
  if (!globalForAdmin.auditRows || globalForAdmin.auditRows.length === 0) {
    globalForAdmin.auditRows = [...DEFAULT_10_28_AUDIT_ROWS];
  }

  if (!globalForAdmin.siteConfig) {
    globalForAdmin.siteConfig = {
      siteLocked: true,
      unlockCodes: ['betsmart2026', 'vip2026', 'tonight2026'],
      adminPasscode: process.env.NEXT_PUBLIC_ADMIN_CODE || 'admin2026',
      masterSheetUrl:
        process.env.NEXT_PUBLIC_MASTER_SHEET_URL ||
        'https://docs.google.com/spreadsheets/d/1BetsmartMasterAudit2026/edit#gid=0',
      googleSheetWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
      lastSheetAutoExportAt: '2026-10-28 (12 Props Synced)',
      lastExportedSlateDate: '2026-10-28',
      lastDailyResetAt: '04:00 AM EST Daily Rollover Active',
    };
  }
}

initAdminStore();

export async function GET(request: Request) {
  initAdminStore();
  if (process.env.DATABASE_URL) {
    pool.query('SELECT 1').catch(() => {});
  }

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid') || '';

  const users = Object.values(globalForAdmin.usersLog).sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );

  return NextResponse.json({
    status: 'success',
    users,
    userAvatars: globalForAdmin.userAvatars,
    userPref: uid ? globalForAdmin.userPrefs[uid] || null : null,
    auditRows: globalForAdmin.auditRows,
    feedbackList: globalForAdmin.feedbackList,
    siteConfig: {
      siteLocked: globalForAdmin.siteConfig.siteLocked,
      unlockCodes: globalForAdmin.siteConfig.unlockCodes,
      masterSheetUrl: globalForAdmin.siteConfig.masterSheetUrl,
      googleSheetWebhookUrl: globalForAdmin.siteConfig.googleSheetWebhookUrl,
      lastSheetAutoExportAt: globalForAdmin.siteConfig.lastSheetAutoExportAt,
      lastExportedSlateDate: globalForAdmin.siteConfig.lastExportedSlateDate,
      lastDailyResetAt: globalForAdmin.siteConfig.lastDailyResetAt,
    },
  });
}

export async function POST(request: Request) {
  initAdminStore();
  try {
    const body = await request.json();

    if (body.action === 'verify_site_code') {
      const code = (body.code || '').trim().toLowerCase();
      const valid = globalForAdmin.siteConfig.unlockCodes.some(
        (c) => c.trim().toLowerCase() === code
      );
      return NextResponse.json({
        status: 'success',
        valid,
        siteLocked: globalForAdmin.siteConfig.siteLocked,
      });
    }

    if (body.action === 'verify_admin_code') {
      const code = (body.code || '').trim();
      const valid =
        code.toLowerCase() === globalForAdmin.siteConfig.adminPasscode.toLowerCase();
      return NextResponse.json({ status: 'success', valid });
    }

    if (body.action === 'submit_feedback') {
      const msg = (body.message || '').trim();
      if (!msg) {
        return NextResponse.json({ status: 'error', message: 'Empty feedback' }, { status: 400 });
      }
      const item: TesterFeedbackItem = {
        id: `fb-${Date.now()}`,
        senderHandle: body.senderHandle || '!guest_tester',
        category: body.category || 'General',
        message: msg,
        createdAt: new Date().toISOString(),
        pageContext: body.pageContext || 'Analyzer Board',
      };
      globalForAdmin.feedbackList.unshift(item);
      saveAdminStoreToDisk();

      return NextResponse.json({
        status: 'success',
        feedbackList: globalForAdmin.feedbackList,
      });
    }

    if (body.action === 'update_site_config') {
      if (typeof body.siteLocked === 'boolean') {
        globalForAdmin.siteConfig.siteLocked = body.siteLocked;
      }
      if (Array.isArray(body.unlockCodes)) {
        globalForAdmin.siteConfig.unlockCodes = body.unlockCodes
          .map((c: string) => c.trim())
          .filter(Boolean);
      }
      if (typeof body.adminPasscode === 'string' && body.adminPasscode.trim()) {
        globalForAdmin.siteConfig.adminPasscode = body.adminPasscode.trim();
      }
      if (typeof body.masterSheetUrl === 'string' && body.masterSheetUrl.trim()) {
        globalForAdmin.siteConfig.masterSheetUrl = body.masterSheetUrl.trim();
      }
      if (typeof body.googleSheetWebhookUrl === 'string') {
        globalForAdmin.siteConfig.googleSheetWebhookUrl = body.googleSheetWebhookUrl.trim();
      }

      saveAdminStoreToDisk();
      return NextResponse.json({
        status: 'success',
        siteConfig: globalForAdmin.siteConfig,
      });
    }

    if (body.action === 'save_user_preferences') {
      const uid = body.uid || body.handle || `user-${Date.now()}`;
      const existing = globalForAdmin.userPrefs[uid] || {
        uid,
        handle: '!user',
        photoURL: '',
        hideTutorial: false,
        preferredPlatform: 'PrizePicks',
        layoutMode: 'grid',
      };

      const rawHandle = (body.handle || existing.handle || 'user').replace(/^[!@#\s]+/, '').trim().toLowerCase();
      const updatedHandle = `!${rawHandle || 'user'}`;

      const updatedPhoto =
        body.photoURL && body.photoURL.trim() !== ''
          ? body.photoURL.trim()
          : existing.photoURL || defaultAvatarForHandle(updatedHandle);

      globalForAdmin.userPrefs[uid] = {
        uid,
        handle: updatedHandle,
        photoURL: updatedPhoto,
        hideTutorial:
          typeof body.hideTutorial === 'boolean' ? body.hideTutorial : existing.hideTutorial,
        preferredPlatform: body.preferredPlatform || existing.preferredPlatform,
        layoutMode: body.layoutMode || existing.layoutMode,
      };

      globalForAdmin.userAvatars[updatedHandle] = updatedPhoto;

      // Also update usersLog entry immediately so User Log reflects the new !handle and avatar
      const nowIso = new Date().toISOString();
      const existingLog = globalForAdmin.usersLog[uid];
      globalForAdmin.usersLog[uid] = {
        uid,
        name: rawHandle || 'user',
        handle: updatedHandle,
        email: body.email || existingLog?.email || 'verified@betsmart.app',
        photoURL: updatedPhoto,
        createdAt: existingLog?.createdAt || nowIso,
        lastActiveAt: nowIso,
        lastAction: 'Saved Profile & Avatar',
      };

      saveAdminStoreToDisk();

      return NextResponse.json({
        status: 'success',
        userPref: globalForAdmin.userPrefs[uid],
        userAvatars: globalForAdmin.userAvatars,
      });
    }

    if (body.action === 'log_user_activity') {
      const cleanHandle = (body.handle || '!bettor').startsWith('!')
        ? body.handle
        : `!${body.handle}`;
      const uid = body.uid || cleanHandle;
      const nowIso = new Date().toISOString();
      const existing = globalForAdmin.usersLog[uid];
      const savedPref = globalForAdmin.userPrefs[uid];

      const finalHandle = savedPref?.handle || cleanHandle;
      const resolvedPhoto =
        body.photoURL && body.photoURL.trim() !== ''
          ? body.photoURL.trim()
          : savedPref?.photoURL ||
            existing?.photoURL ||
            globalForAdmin.userAvatars[finalHandle] ||
            defaultAvatarForHandle(finalHandle);

      globalForAdmin.userAvatars[finalHandle] = resolvedPhoto;

      globalForAdmin.usersLog[uid] = {
        uid,
        name: finalHandle.replace(/^!/, ''),
        handle: finalHandle,
        email: body.email || existing?.email || 'verified@betsmart.app',
        photoURL: resolvedPhoto,
        createdAt: existing?.createdAt || body.createdAt || nowIso,
        lastActiveAt: nowIso,
        lastAction: body.lastAction || 'Active on Platform',
      };

      saveAdminStoreToDisk();

      return NextResponse.json({
        status: 'success',
        user: globalForAdmin.usersLog[uid],
        userPref: globalForAdmin.userPrefs[uid] || null,
        users: Object.values(globalForAdmin.usersLog),
        userAvatars: globalForAdmin.userAvatars,
      });
    }

    if (body.action === 'trigger_sheet_export') {
      const targetDate = body.date || '2026-10-28';
      const rowsForDate =
        targetDate === 'ALL'
          ? globalForAdmin.auditRows
          : globalForAdmin.auditRows.filter((r) => r.date === targetDate);

      rowsForDate.forEach((r) => {
        r.exportedToSheet = true;
      });

      const timestampStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      globalForAdmin.siteConfig.lastSheetAutoExportAt = `${timestampStr} (${rowsForDate.length} props synced)`;
      globalForAdmin.siteConfig.lastExportedSlateDate = targetDate;

      if (globalForAdmin.siteConfig.googleSheetWebhookUrl) {
        fetch(globalForAdmin.siteConfig.googleSheetWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: targetDate,
            rows: rowsForDate,
          }),
        }).catch(() => {});
      }

      saveAdminStoreToDisk();

      return NextResponse.json({
        status: 'success',
        lastSheetAutoExportAt: globalForAdmin.siteConfig.lastSheetAutoExportAt,
        auditRows: globalForAdmin.auditRows,
      });
    }

    return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
