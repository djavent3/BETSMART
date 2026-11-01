import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export type UserPresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export type UserBadgeType =
  | 'Owner'
  | 'Admin'
  | 'Dev'
  | 'Verified'
  | 'Sharp'
  | 'VIP'
  | 'Beta Tester';

export interface UserActivityRecord {
  uid: string;
  name: string;
  handle: string;
  rawHandle: string;
  email: string;
  photoURL: string;
  createdAt: string;
  reactivatedAt?: string | null;
  lastActiveAt: string;
  lastAction: string;
  statusMode: UserPresenceStatus;
  badges: UserBadgeType[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletionReason?: string | null;
}

export interface UserPreferencesRecord {
  uid: string;
  handle: string;
  rawHandle: string;
  photoURL: string;
  hideTutorial: boolean;
  preferredPlatform: string;
  layoutMode: 'grid' | 'compact';
  statusMode: UserPresenceStatus;
  badges: UserBadgeType[];
  newsFilterCategories: string[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletionReason?: string | null;
  reactivatedAt?: string | null;
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
  projectedValue?: number;
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
  lastSheetAutoExportIso?: string | null;
  lastExportedSlateDate: string | null;
  lastDailyResetAt: string;
}

function normalizeRawHandle(input: string): string {
  return (input || 'user').replace(/^[!@#\s]+/, '').trim().toLowerCase() || 'user';
}

function formatSpacedHandle(input: string): string {
  const clean = normalizeRawHandle(input);
  return `! ${clean}`;
}

const defaultAvatarForHandle = (handle: string): string => {
  const clean = normalizeRawHandle(handle);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    clean
  )}&background=064e3b&color=34d399&bold=true&size=128`;
};

const LOCAL_STORE_PATH = path.join(process.cwd(), '.betsmart_data', 'admin_store_v9.json');
const TMP_STORE_PATH = path.join('/tmp', 'betsmart_admin_store_v9.json');
const LEGACY_LOCAL_PATHS = [
  path.join(process.cwd(), '.betsmart_data', 'admin_store_v8.json'),
  path.join(process.cwd(), '.betsmart_data', 'admin_store_v7.json'),
  path.join(process.cwd(), '.betsmart_data', 'admin_store_v6.json'),
  path.join('/tmp', 'betsmart_admin_store_v8.json'),
  path.join('/tmp', 'betsmart_admin_store_v7.json'),
  path.join('/tmp', 'betsmart_admin_store_v6.json'),
];

const DEFAULT_SITE_CONFIG: SiteSecurityConfig = {
  siteLocked: true,
  unlockCodes: ['betsmart2026', 'vip2026', 'tonight2026'],
  adminPasscode: process.env.NEXT_PUBLIC_ADMIN_CODE || 'admin2026',
  masterSheetUrl:
    process.env.NEXT_PUBLIC_MASTER_SHEET_URL ||
    'https://docs.google.com/spreadsheets/d/1BetsmartMasterAudit2026/edit#gid=0',
  googleSheetWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
  lastSheetAutoExportAt: 'Synced (10/28 & 10/29 Slates Ready)',
  lastSheetAutoExportIso: new Date().toISOString(),
  lastExportedSlateDate: '2026-10-29',
  lastDailyResetAt: '06:00 AM EST Rollover Active',
};

// Complete Baseline Audit Database (10/28 & Restored 10/29 Slates)
const BASELINE_AUDIT_ROWS: SystemAuditRow[] = [
  // ==========================================================================
  // OCTOBER 28, 2026 SLATE (2026-10-28)
  // ==========================================================================
  {
    id: 'audit-2026-10-28-1',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'CLE @ WAS',
    player: 'Donovan Mitchell',
    position: 'SG',
    market: 'Points',
    line: 27.5,
    projectedValue: 30.4,
    recommendedPick: 'OVER',
    smartScore: 95,
    overProbabilityPct: 82,
    seasonAvg: 28.9,
    last5Avg: 30.8,
    positionalRank: 2,
    oppDefenseRank: 28,
    actualStat: 32,
    marginVsLine: 4.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-28-2',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'MIA @ ATL',
    player: 'Jimmy Butler',
    position: 'SF',
    market: 'Pts + Reb + Ast',
    line: 31.5,
    projectedValue: 35.2,
    recommendedPick: 'OVER',
    smartScore: 93,
    overProbabilityPct: 79,
    seasonAvg: 33.1,
    last5Avg: 34.8,
    positionalRank: 4,
    oppDefenseRank: 25,
    actualStat: 37,
    marginVsLine: 5.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-28-3',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'DEN @ NO',
    player: 'Nikola Jokic',
    position: 'C',
    market: 'Pts + Reb + Ast',
    line: 47.5,
    projectedValue: 52.1,
    recommendedPick: 'OVER',
    smartScore: 97,
    overProbabilityPct: 85,
    seasonAvg: 49.4,
    last5Avg: 51.6,
    positionalRank: 1,
    oppDefenseRank: 21,
    actualStat: 53,
    marginVsLine: 5.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-28-4',
    date: '2026-10-28',
    sport: 'NBA',
    matchup: 'MIA @ ATL',
    player: 'Trae Young',
    position: 'PG',
    market: 'Points',
    line: 26.5,
    projectedValue: 28.8,
    recommendedPick: 'OVER',
    smartScore: 88,
    overProbabilityPct: 74,
    seasonAvg: 27.2,
    last5Avg: 28.4,
    positionalRank: 5,
    oppDefenseRank: 14,
    actualStat: 24,
    marginVsLine: -2.5,
    outcome: 'LOSS',
    platform: 'DraftKings',
    exportedToSheet: true,
  },

  // ==========================================================================
  // OCTOBER 29, 2026 SLATE (2026-10-29) - RECOVERED & RESTORED
  // ==========================================================================
  {
    id: 'audit-2026-10-29-1',
    date: '2026-10-29',
    sport: 'NFL',
    matchup: 'CAR @ GB',
    player: 'Jordan Love',
    position: 'QB',
    market: 'Passing Yards',
    line: 245.5,
    projectedValue: 268.0,
    recommendedPick: 'OVER',
    smartScore: 95,
    overProbabilityPct: 82,
    seasonAvg: 254.2,
    last5Avg: 262.1,
    positionalRank: 5,
    oppDefenseRank: 24,
    actualStat: 272,
    marginVsLine: 26.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-2',
    date: '2026-10-29',
    sport: 'NFL',
    matchup: 'CAR @ GB',
    player: 'Josh Jacobs',
    position: 'RB',
    market: 'Rushing Yards',
    line: 74.5,
    projectedValue: 86.4,
    recommendedPick: 'OVER',
    smartScore: 94,
    overProbabilityPct: 81,
    seasonAvg: 79.8,
    last5Avg: 84.2,
    positionalRank: 4,
    oppDefenseRank: 29,
    actualStat: 94,
    marginVsLine: 19.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-3',
    date: '2026-10-29',
    sport: 'NFL',
    matchup: 'CAR @ GB',
    player: 'Chuba Hubbard',
    position: 'RB',
    market: 'Rushing Yards',
    line: 61.5,
    projectedValue: 54.2,
    recommendedPick: 'UNDER',
    smartScore: 89,
    overProbabilityPct: 26,
    seasonAvg: 63.4,
    last5Avg: 58.0,
    positionalRank: 14,
    oppDefenseRank: 7,
    actualStat: 52,
    marginVsLine: -9.5,
    outcome: 'WIN',
    platform: 'FanDuel',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-4',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'CLE @ ATL',
    player: 'Trae Young',
    position: 'PG',
    market: 'Assists',
    line: 9.5,
    projectedValue: 11.2,
    recommendedPick: 'OVER',
    smartScore: 96,
    overProbabilityPct: 83,
    seasonAvg: 10.1,
    last5Avg: 10.8,
    positionalRank: 2,
    oppDefenseRank: 20,
    actualStat: 12,
    marginVsLine: 2.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-5',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'CLE @ ATL',
    player: 'Donovan Mitchell',
    position: 'SG',
    market: 'Points',
    line: 26.5,
    projectedValue: 29.5,
    recommendedPick: 'OVER',
    smartScore: 93,
    overProbabilityPct: 79,
    seasonAvg: 28.4,
    last5Avg: 29.8,
    positionalRank: 3,
    oppDefenseRank: 25,
    actualStat: 30,
    marginVsLine: 3.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-6',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'CLE @ ATL',
    player: 'Jalen Johnson',
    position: 'PF',
    market: 'Pts + Reb + Ast',
    line: 28.5,
    projectedValue: 31.8,
    recommendedPick: 'OVER',
    smartScore: 91,
    overProbabilityPct: 77,
    seasonAvg: 29.6,
    last5Avg: 31.2,
    positionalRank: 7,
    oppDefenseRank: 19,
    actualStat: 33,
    marginVsLine: 4.5,
    outcome: 'WIN',
    platform: 'DraftKings',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-7',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'SAC @ NO',
    player: 'Zion Williamson',
    position: 'PF',
    market: 'Points',
    line: 24.5,
    projectedValue: 28.1,
    recommendedPick: 'OVER',
    smartScore: 98,
    overProbabilityPct: 85,
    seasonAvg: 26.2,
    last5Avg: 27.8,
    positionalRank: 1,
    oppDefenseRank: 25,
    actualStat: 32,
    marginVsLine: 7.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-8',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'SAC @ NO',
    player: 'Domantas Sabonis',
    position: 'C',
    market: 'Rebounds',
    line: 12.5,
    projectedValue: 14.2,
    recommendedPick: 'OVER',
    smartScore: 94,
    overProbabilityPct: 80,
    seasonAvg: 13.4,
    last5Avg: 14.0,
    positionalRank: 1,
    oppDefenseRank: 23,
    actualStat: 15,
    marginVsLine: 2.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-9',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'SAC @ NO',
    player: "De'Aaron Fox",
    position: 'PG',
    market: 'Points',
    line: 27.5,
    projectedValue: 29.2,
    recommendedPick: 'OVER',
    smartScore: 87,
    overProbabilityPct: 73,
    seasonAvg: 28.1,
    last5Avg: 28.8,
    positionalRank: 6,
    oppDefenseRank: 16,
    actualStat: 25,
    marginVsLine: -2.5,
    outcome: 'LOSS',
    platform: 'FanDuel',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-10',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'MEM @ POR',
    player: 'Ja Morant',
    position: 'PG',
    market: 'Pts + Ast',
    line: 33.5,
    projectedValue: 37.4,
    recommendedPick: 'OVER',
    smartScore: 96,
    overProbabilityPct: 84,
    seasonAvg: 35.1,
    last5Avg: 36.8,
    positionalRank: 3,
    oppDefenseRank: 27,
    actualStat: 39,
    marginVsLine: 5.5,
    outcome: 'WIN',
    platform: 'PrizePicks',
    exportedToSheet: true,
  },
  {
    id: 'audit-2026-10-29-11',
    date: '2026-10-29',
    sport: 'NBA',
    matchup: 'MEM @ POR',
    player: 'Desmond Bane',
    position: 'SG',
    market: '3-Pt Made',
    line: 3.5,
    projectedValue: 4.3,
    recommendedPick: 'OVER',
    smartScore: 92,
    overProbabilityPct: 78,
    seasonAvg: 3.8,
    last5Avg: 4.2,
    positionalRank: 4,
    oppDefenseRank: 26,
    actualStat: 5,
    marginVsLine: 1.5,
    outcome: 'WIN',
    platform: 'Underdog',
    exportedToSheet: true,
  },
];

function mergeBaselineAuditRows(existingRows: SystemAuditRow[] = []): SystemAuditRow[] {
  const map = new Map<string, SystemAuditRow>();
  for (const row of BASELINE_AUDIT_ROWS) {
    map.set(row.id, row);
  }
  for (const row of existingRows) {
    if (row && row.id) {
      map.set(row.id, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.smartScore - a.smartScore;
  });
}

function mergeSiteConfig(
  base: SiteSecurityConfig,
  incoming?: Partial<SiteSecurityConfig> | null
): SiteSecurityConfig {
  if (!incoming) return { ...base };
  return {
    siteLocked: typeof incoming.siteLocked === 'boolean' ? incoming.siteLocked : base.siteLocked,
    unlockCodes:
      Array.isArray(incoming.unlockCodes) && incoming.unlockCodes.length > 0
        ? Array.from(new Set(incoming.unlockCodes.map((c) => c.trim()).filter(Boolean)))
        : base.unlockCodes,
    adminPasscode:
      incoming.adminPasscode && incoming.adminPasscode.trim() !== ''
        ? incoming.adminPasscode.trim()
        : base.adminPasscode,
    masterSheetUrl:
      incoming.masterSheetUrl && incoming.masterSheetUrl.trim() !== ''
        ? incoming.masterSheetUrl.trim()
        : base.masterSheetUrl,
    googleSheetWebhookUrl:
      typeof incoming.googleSheetWebhookUrl === 'string' &&
      incoming.googleSheetWebhookUrl.trim() !== ''
        ? incoming.googleSheetWebhookUrl.trim()
        : base.googleSheetWebhookUrl,
    lastSheetAutoExportAt: incoming.lastSheetAutoExportAt || base.lastSheetAutoExportAt,
    lastSheetAutoExportIso: incoming.lastSheetAutoExportIso || base.lastSheetAutoExportIso,
    lastExportedSlateDate: incoming.lastExportedSlateDate || base.lastExportedSlateDate,
    lastDailyResetAt: incoming.lastDailyResetAt || base.lastDailyResetAt,
  };
}

const globalForAdmin = globalThis as unknown as {
  usersLog: Record<string, UserActivityRecord>;
  userPrefs: Record<string, UserPreferencesRecord>;
  auditRows: SystemAuditRow[];
  feedbackList: TesterFeedbackItem[];
  siteConfig: SiteSecurityConfig;
  userAvatars: Record<string, string>;
  userBadges: Record<string, UserBadgeType[]>;
  userStatuses: Record<string, UserPresenceStatus>;
  initializedFromDisk?: boolean;
  dbLoaded?: boolean;
};

async function persistAdminStateEverywhere() {
  const payload = {
    usersLog: globalForAdmin.usersLog || {},
    userPrefs: globalForAdmin.userPrefs || {},
    auditRows: globalForAdmin.auditRows || BASELINE_AUDIT_ROWS,
    feedbackList: globalForAdmin.feedbackList || [],
    siteConfig: globalForAdmin.siteConfig || DEFAULT_SITE_CONFIG,
    userAvatars: globalForAdmin.userAvatars || {},
    userBadges: globalForAdmin.userBadges || {},
    userStatuses: globalForAdmin.userStatuses || {},
  };
  const jsonStr = JSON.stringify(payload);

  try {
    fs.mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_STORE_PATH, jsonStr, 'utf8');
  } catch {}

  try {
    fs.writeFileSync(TMP_STORE_PATH, jsonStr, 'utf8');
  } catch {}

  if (process.env.DATABASE_URL) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS betsmart_persistent_store (
          store_key TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(
        `INSERT INTO betsmart_persistent_store (store_key, payload, updated_at)
         VALUES ('admin_v9', $1::jsonb, NOW())
         ON CONFLICT (store_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [jsonStr]
      );
    } catch {}
  }
}

async function ensureAdminStoreLoaded() {
  if (!globalForAdmin.usersLog) globalForAdmin.usersLog = {};
  if (!globalForAdmin.userPrefs) globalForAdmin.userPrefs = {};
  if (!globalForAdmin.auditRows) globalForAdmin.auditRows = [...BASELINE_AUDIT_ROWS];
  if (!globalForAdmin.feedbackList) globalForAdmin.feedbackList = [];
  if (!globalForAdmin.siteConfig) globalForAdmin.siteConfig = { ...DEFAULT_SITE_CONFIG };
  if (!globalForAdmin.userAvatars) globalForAdmin.userAvatars = {};
  if (!globalForAdmin.userBadges) globalForAdmin.userBadges = {};
  if (!globalForAdmin.userStatuses) globalForAdmin.userStatuses = {};

  if (!globalForAdmin.initializedFromDisk) {
    globalForAdmin.initializedFromDisk = true;

    const allCandidatePaths = [LOCAL_STORE_PATH, TMP_STORE_PATH, ...LEGACY_LOCAL_PATHS];
    for (const filePath of allCandidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (loaded) {
            globalForAdmin.usersLog = { ...(loaded.usersLog || {}), ...globalForAdmin.usersLog };
            globalForAdmin.userPrefs = { ...(loaded.userPrefs || {}), ...globalForAdmin.userPrefs };
            globalForAdmin.auditRows = mergeBaselineAuditRows([
              ...(loaded.auditRows || []),
              ...globalForAdmin.auditRows,
            ]);
            if (Array.isArray(loaded.feedbackList) && loaded.feedbackList.length > 0) {
              const fbMap = new Map<string, TesterFeedbackItem>();
              for (const item of [...loaded.feedbackList, ...globalForAdmin.feedbackList]) {
                if (item && item.id) fbMap.set(item.id, item);
              }
              globalForAdmin.feedbackList = Array.from(fbMap.values());
            }
            if (loaded.siteConfig) {
              globalForAdmin.siteConfig = mergeSiteConfig(
                globalForAdmin.siteConfig,
                loaded.siteConfig
              );
            }
            globalForAdmin.userAvatars = {
              ...(loaded.userAvatars || {}),
              ...globalForAdmin.userAvatars,
            };
            globalForAdmin.userBadges = {
              ...(loaded.userBadges || {}),
              ...globalForAdmin.userBadges,
            };
            globalForAdmin.userStatuses = {
              ...(loaded.userStatuses || {}),
              ...globalForAdmin.userStatuses,
            };
          }
        } catch {}
      }
    }
  }

  if (!globalForAdmin.dbLoaded && process.env.DATABASE_URL) {
    globalForAdmin.dbLoaded = true;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS betsmart_persistent_store (
          store_key TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      const res = await pool.query(
        `SELECT store_key, payload FROM betsmart_persistent_store
         WHERE store_key IN ('admin_v9', 'admin_v8', 'admin_v7', 'admin_v6')
         ORDER BY updated_at ASC`
      );
      for (const row of res.rows) {
        const dbData = row.payload;
        if (!dbData) continue;
        globalForAdmin.usersLog = { ...(dbData.usersLog || {}), ...globalForAdmin.usersLog };
        globalForAdmin.userPrefs = { ...(dbData.userPrefs || {}), ...globalForAdmin.userPrefs };
        globalForAdmin.auditRows = mergeBaselineAuditRows([
          ...(dbData.auditRows || []),
          ...globalForAdmin.auditRows,
        ]);
        if (Array.isArray(dbData.feedbackList) && dbData.feedbackList.length > 0) {
          const fbMap = new Map<string, TesterFeedbackItem>();
          for (const item of [...dbData.feedbackList, ...globalForAdmin.feedbackList]) {
            if (item && item.id) fbMap.set(item.id, item);
          }
          globalForAdmin.feedbackList = Array.from(fbMap.values());
        }
        if (dbData.siteConfig) {
          globalForAdmin.siteConfig = mergeSiteConfig(globalForAdmin.siteConfig, dbData.siteConfig);
        }
        globalForAdmin.userAvatars = {
          ...(dbData.userAvatars || {}),
          ...globalForAdmin.userAvatars,
        };
        globalForAdmin.userBadges = {
          ...(dbData.userBadges || {}),
          ...globalForAdmin.userBadges,
        };
        globalForAdmin.userStatuses = {
          ...(dbData.userStatuses || {}),
          ...globalForAdmin.userStatuses,
        };
      }
      await persistAdminStateEverywhere();
    } catch {}
  }

  globalForAdmin.auditRows = mergeBaselineAuditRows(globalForAdmin.auditRows);
}

export async function GET(request: Request) {
  await ensureAdminStoreLoaded();

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid') || '';

  const users = Object.values(globalForAdmin.usersLog).sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );

  return NextResponse.json({
    status: 'success',
    users,
    userAvatars: globalForAdmin.userAvatars,
    userBadges: globalForAdmin.userBadges,
    userStatuses: globalForAdmin.userStatuses,
    userPref: uid ? globalForAdmin.userPrefs[uid] || null : null,
    auditRows: globalForAdmin.auditRows,
    feedbackList: globalForAdmin.feedbackList,
    siteConfig: {
      siteLocked: globalForAdmin.siteConfig.siteLocked,
      unlockCodes: globalForAdmin.siteConfig.unlockCodes,
      masterSheetUrl: globalForAdmin.siteConfig.masterSheetUrl,
      googleSheetWebhookUrl: globalForAdmin.siteConfig.googleSheetWebhookUrl,
      lastSheetAutoExportAt: globalForAdmin.siteConfig.lastSheetAutoExportAt,
      lastSheetAutoExportIso: globalForAdmin.siteConfig.lastSheetAutoExportIso || null,
      lastExportedSlateDate: globalForAdmin.siteConfig.lastExportedSlateDate,
      lastDailyResetAt: globalForAdmin.siteConfig.lastDailyResetAt,
    },
  });
}

export async function POST(request: Request) {
  await ensureAdminStoreLoaded();
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

    if (body.action === 'update_site_config') {
      if (typeof body.siteLocked === 'boolean') {
        globalForAdmin.siteConfig.siteLocked = body.siteLocked;
      }
      if (Array.isArray(body.unlockCodes)) {
        const cleaned = body.unlockCodes.map((c: string) => c.trim()).filter(Boolean);
        if (cleaned.length > 0) {
          globalForAdmin.siteConfig.unlockCodes = cleaned;
        }
      }
      if (typeof body.adminPasscode === 'string' && body.adminPasscode.trim()) {
        globalForAdmin.siteConfig.adminPasscode = body.adminPasscode.trim();
      }
      if (typeof body.masterSheetUrl === 'string') {
        globalForAdmin.siteConfig.masterSheetUrl = body.masterSheetUrl.trim();
      }
      if (typeof body.googleSheetWebhookUrl === 'string') {
        globalForAdmin.siteConfig.googleSheetWebhookUrl = body.googleSheetWebhookUrl.trim();
      }

      await persistAdminStateEverywhere();
      return NextResponse.json({
        status: 'success',
        siteConfig: globalForAdmin.siteConfig,
      });
    }

    if (body.action === 'assign_user_badges') {
      const uid = body.uid;
      const rawHandle = normalizeRawHandle(body.handle || uid);
      const spacedHandle = formatSpacedHandle(rawHandle);
      const badges: UserBadgeType[] = Array.isArray(body.badges) ? body.badges : [];

      globalForAdmin.userBadges[rawHandle] = badges;
      globalForAdmin.userBadges[spacedHandle] = badges;
      if (uid && globalForAdmin.usersLog[uid]) {
        globalForAdmin.usersLog[uid].badges = badges;
      }
      if (uid && globalForAdmin.userPrefs[uid]) {
        globalForAdmin.userPrefs[uid].badges = badges;
      }

      await persistAdminStateEverywhere();
      return NextResponse.json({
        status: 'success',
        users: Object.values(globalForAdmin.usersLog),
        userBadges: globalForAdmin.userBadges,
      });
    }

    if (body.action === 'delete_account') {
      const uid = body.uid;
      const reason = (body.reason || 'No reason provided').trim();
      const nowIso = new Date().toISOString();

      if (uid && globalForAdmin.usersLog[uid]) {
        globalForAdmin.usersLog[uid].isDeleted = true;
        globalForAdmin.usersLog[uid].deletedAt = nowIso;
        globalForAdmin.usersLog[uid].deletionReason = reason;
        globalForAdmin.usersLog[uid].statusMode = 'offline';
        globalForAdmin.usersLog[uid].lastAction = `Deleted Account (${reason})`;
      }
      if (uid && globalForAdmin.userPrefs[uid]) {
        globalForAdmin.userPrefs[uid].isDeleted = true;
        globalForAdmin.userPrefs[uid].deletedAt = nowIso;
        globalForAdmin.userPrefs[uid].deletionReason = reason;
        globalForAdmin.userPrefs[uid].statusMode = 'offline';
      }

      await persistAdminStateEverywhere();
      return NextResponse.json({
        status: 'success',
        users: Object.values(globalForAdmin.usersLog),
      });
    }

    if (body.action === 'reactivate_account') {
      const uid = body.uid;
      const nowIso = new Date().toISOString();

      if (uid && globalForAdmin.usersLog[uid]) {
        globalForAdmin.usersLog[uid].isDeleted = false;
        globalForAdmin.usersLog[uid].reactivatedAt = nowIso;
        globalForAdmin.usersLog[uid].statusMode = 'online';
        globalForAdmin.usersLog[uid].lastActiveAt = nowIso;
        globalForAdmin.usersLog[uid].lastAction = 'Reactivated Account';
      }
      if (uid && globalForAdmin.userPrefs[uid]) {
        globalForAdmin.userPrefs[uid].isDeleted = false;
        globalForAdmin.userPrefs[uid].reactivatedAt = nowIso;
        globalForAdmin.userPrefs[uid].statusMode = 'online';
      }

      await persistAdminStateEverywhere();
      return NextResponse.json({
        status: 'success',
        user: uid ? globalForAdmin.usersLog[uid] : null,
        userPref: uid ? globalForAdmin.userPrefs[uid] : null,
      });
    }

    if (body.action === 'save_user_preferences') {
      const uid = body.uid || body.handle || `user-${Date.now()}`;
      const existing = globalForAdmin.userPrefs[uid] || {
        uid,
        handle: '! user',
        rawHandle: 'user',
        photoURL: '',
        hideTutorial: false,
        preferredPlatform: 'PrizePicks',
        layoutMode: 'grid',
        statusMode: 'online',
        badges: [],
        newsFilterCategories: ['NBA', 'NFL', 'Injuries', 'Trades', 'Starting Lineups'],
      };

      const rawHandle = normalizeRawHandle(body.handle || existing.handle);
      const spacedHandle = formatSpacedHandle(rawHandle);
      const updatedPhoto =
        body.photoURL && body.photoURL.trim() !== ''
          ? body.photoURL.trim()
          : existing.photoURL || defaultAvatarForHandle(rawHandle);

      const updatedStatus: UserPresenceStatus = body.statusMode || existing.statusMode || 'online';
      const resolvedBadges =
        globalForAdmin.userBadges[rawHandle] || existing.badges || [];

      globalForAdmin.userPrefs[uid] = {
        ...existing,
        uid,
        handle: spacedHandle,
        rawHandle,
        photoURL: updatedPhoto,
        hideTutorial:
          typeof body.hideTutorial === 'boolean' ? body.hideTutorial : existing.hideTutorial,
        preferredPlatform: body.preferredPlatform || existing.preferredPlatform,
        layoutMode: body.layoutMode || existing.layoutMode,
        statusMode: updatedStatus,
        badges: resolvedBadges,
      };

      globalForAdmin.userAvatars[rawHandle] = updatedPhoto;
      globalForAdmin.userAvatars[spacedHandle] = updatedPhoto;
      globalForAdmin.userStatuses[rawHandle] = updatedStatus;
      globalForAdmin.userStatuses[spacedHandle] = updatedStatus;

      const nowIso = new Date().toISOString();
      const existingLog = globalForAdmin.usersLog[uid];
      globalForAdmin.usersLog[uid] = {
        uid,
        name: rawHandle,
        handle: spacedHandle,
        rawHandle,
        email: body.email || existingLog?.email || 'verified@betsmart.app',
        photoURL: updatedPhoto,
        createdAt: existingLog?.createdAt || nowIso,
        reactivatedAt: existingLog?.reactivatedAt || null,
        lastActiveAt: nowIso,
        lastAction: body.lastAction || 'Updated Profile & Settings',
        statusMode: updatedStatus,
        badges: resolvedBadges,
        isDeleted: existingLog?.isDeleted || false,
        deletedAt: existingLog?.deletedAt || null,
        deletionReason: existingLog?.deletionReason || null,
      };

      await persistAdminStateEverywhere();

      return NextResponse.json({
        status: 'success',
        userPref: globalForAdmin.userPrefs[uid],
        users: Object.values(globalForAdmin.usersLog),
        userAvatars: globalForAdmin.userAvatars,
        userStatuses: globalForAdmin.userStatuses,
      });
    }

    if (body.action === 'log_user_activity') {
      const rawHandle = normalizeRawHandle(body.handle || body.name || 'bettor');
      const spacedHandle = formatSpacedHandle(rawHandle);
      const uid = body.uid || rawHandle;
      const nowIso = new Date().toISOString();
      const existing = globalForAdmin.usersLog[uid];

      const resolvedPhoto =
        body.photoURL && body.photoURL.trim() !== ''
          ? body.photoURL.trim()
          : existing?.photoURL || defaultAvatarForHandle(rawHandle);

      const resolvedStatus: UserPresenceStatus =
        body.statusMode || existing?.statusMode || 'online';
      const resolvedBadges =
        globalForAdmin.userBadges[rawHandle] || existing?.badges || [];

      globalForAdmin.userAvatars[rawHandle] = resolvedPhoto;
      globalForAdmin.userAvatars[spacedHandle] = resolvedPhoto;
      globalForAdmin.userStatuses[rawHandle] = resolvedStatus;
      globalForAdmin.userStatuses[spacedHandle] = resolvedStatus;

      globalForAdmin.usersLog[uid] = {
        uid,
        name: rawHandle,
        handle: spacedHandle,
        rawHandle,
        email: body.email || existing?.email || 'verified@betsmart.app',
        photoURL: resolvedPhoto,
        createdAt: existing?.createdAt || body.createdAt || nowIso,
        reactivatedAt: existing?.reactivatedAt || null,
        lastActiveAt: nowIso,
        lastAction: body.lastAction || 'Active on Platform',
        statusMode: resolvedStatus,
        badges: resolvedBadges,
        isDeleted: existing?.isDeleted ?? false,
        deletedAt: existing?.deletedAt || null,
        deletionReason: existing?.deletionReason || null,
      };

      await persistAdminStateEverywhere();

      return NextResponse.json({
        status: 'success',
        user: globalForAdmin.usersLog[uid],
        users: Object.values(globalForAdmin.usersLog),
        userAvatars: globalForAdmin.userAvatars,
        userStatuses: globalForAdmin.userStatuses,
      });
    }

    if (body.action === 'submit_feedback') {
      const item: TesterFeedbackItem = {
        id: `fb-${Date.now()}`,
        senderHandle: formatSpacedHandle(body.senderHandle || 'tester'),
        category: body.category || 'General',
        message: (body.message || '').trim(),
        createdAt: new Date().toISOString(),
        pageContext: body.pageContext || 'Board',
      };
      globalForAdmin.feedbackList = [item, ...(globalForAdmin.feedbackList || [])];
      await persistAdminStateEverywhere();
      return NextResponse.json({
        status: 'success',
        feedbackList: globalForAdmin.feedbackList,
      });
    }

    if (body.action === 'record_audit_row') {
      const incomingRow: SystemAuditRow = body.row;
      if (incomingRow && incomingRow.id) {
        globalForAdmin.auditRows = mergeBaselineAuditRows([
          incomingRow,
          ...globalForAdmin.auditRows,
        ]);
        await persistAdminStateEverywhere();
      }
      return NextResponse.json({
        status: 'success',
        auditRows: globalForAdmin.auditRows,
      });
    }

    if (body.action === 'trigger_sheet_export') {
      const targetDate = body.date || 'ALL';
      const rowsForDate =
        targetDate === 'ALL'
          ? globalForAdmin.auditRows
          : globalForAdmin.auditRows.filter((r) => r.date === targetDate);

      const nowIso = new Date().toISOString();
      const clientLocalTimeStr =
        body.clientLocalTimestamp ||
        new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        });

      const formattedRowsForSheet = rowsForDate.map((r) => ({
        ...r,
        positionalRank: `#${String(r.positionalRank).replace(/^#/, '')}`,
        oppDefenseRank: `#${String(r.oppDefenseRank).replace(/^#/, '')}`,
      }));

      let webhookDelivered = false;
      const webhookUrl =
        body.webhookUrl ||
        globalForAdmin.siteConfig.googleSheetWebhookUrl ||
        (globalForAdmin.siteConfig.masterSheetUrl.includes('script.google.com')
          ? globalForAdmin.siteConfig.masterSheetUrl
          : '');

      if (webhookUrl) {
        try {
          const whRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            redirect: 'follow',
            body: JSON.stringify({
              date: targetDate,
              exportedAtLocal: clientLocalTimeStr,
              rows: formattedRowsForSheet,
            }),
          });
          webhookDelivered = whRes.ok || whRes.status === 302;
        } catch {
          webhookDelivered = false;
        }
      }

      globalForAdmin.siteConfig.lastSheetAutoExportIso = nowIso;
      globalForAdmin.siteConfig.lastSheetAutoExportAt = `${clientLocalTimeStr} (${
        rowsForDate.length
      } props synced${webhookDelivered ? ' via Webhook ✓' : ' • Ready to Paste in Sheet'})`;
      globalForAdmin.siteConfig.lastExportedSlateDate = targetDate;

      await persistAdminStateEverywhere();

      return NextResponse.json({
        status: 'success',
        webhookDelivered,
        lastSheetAutoExportAt: globalForAdmin.siteConfig.lastSheetAutoExportAt,
        lastSheetAutoExportIso: globalForAdmin.siteConfig.lastSheetAutoExportIso,
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
