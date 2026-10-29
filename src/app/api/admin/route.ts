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

const STORE_PATH = path.join('/tmp', 'betsmart_admin_store_v2.json');

const defaultAvatarForHandle = (handle: string) => {
  const clean = (handle || 'user').replace(/^[!@#\s]+/, '') || 'user';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    clean
  )}&background=064e3b&color=34d399&bold=true&size=128`;
};

const globalForAdmin = globalThis as unknown as {
  usersLog: Record<string, UserActivityRecord>;
  userPrefs: Record<string, UserPreferencesRecord>;
  auditRows: SystemAuditRow[];
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
      siteConfig: globalForAdmin.siteConfig,
      userAvatars: globalForAdmin.userAvatars,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(payload), 'utf8');
  } catch {
    // Ignore read-only fs errors in restricted serverless environments
  }
}

function initAdminStore() {
  if (globalForAdmin.initializedFromDisk) return;
  globalForAdmin.initializedFromDisk = true;

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      globalForAdmin.usersLog = parsed.usersLog || {};
      globalForAdmin.userPrefs = parsed.userPrefs || {};
      globalForAdmin.auditRows = parsed.auditRows || [];
      globalForAdmin.siteConfig = parsed.siteConfig;
      globalForAdmin.userAvatars = parsed.userAvatars || {};
      return;
    }
  } catch {
    // Fallback to clean initialization
  }

  if (!globalForAdmin.usersLog) globalForAdmin.usersLog = {};
  if (!globalForAdmin.userPrefs) globalForAdmin.userPrefs = {};
  if (!globalForAdmin.userAvatars) globalForAdmin.userAvatars = {};
  if (!globalForAdmin.auditRows) globalForAdmin.auditRows = [];

  if (!globalForAdmin.siteConfig) {
    globalForAdmin.siteConfig = {
      siteLocked: true,
      unlockCodes: ['betsmart2026', 'vip2026', 'tonight2026'],
      adminPasscode: process.env.NEXT_PUBLIC_ADMIN_CODE || 'admin2026',
      masterSheetUrl:
        process.env.NEXT_PUBLIC_MASTER_SHEET_URL ||
        'https://docs.google.com/spreadsheets/d/1BetsmartMasterAudit2026/edit#gid=0',
      googleSheetWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
      lastSheetAutoExportAt: null,
      lastExportedSlateDate: null,
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

    // Per-User Profile & Preferences Persistence
    if (body.action === 'save_user_preferences') {
      const uid = body.uid;
      if (!uid) {
        return NextResponse.json({ status: 'error', message: 'Missing uid' }, { status: 400 });
      }
      const existing = globalForAdmin.userPrefs[uid] || {
        uid,
        handle: '!user',
        photoURL: '',
        hideTutorial: false,
        preferredPlatform: 'PrizePicks',
        layoutMode: 'grid',
      };

      const updatedHandle = body.handle
        ? body.handle.startsWith('!')
          ? body.handle
          : `!${body.handle}`
        : existing.handle;

      const updatedPhoto =
        body.photoURL !== undefined
          ? body.photoURL
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

      const resolvedPhoto =
        body.photoURL && body.photoURL.trim() !== ''
          ? body.photoURL.trim()
          : savedPref?.photoURL ||
            existing?.photoURL ||
            globalForAdmin.userAvatars[cleanHandle] ||
            defaultAvatarForHandle(cleanHandle);

      globalForAdmin.userAvatars[cleanHandle] = resolvedPhoto;

      globalForAdmin.usersLog[uid] = {
        uid,
        name: body.name || cleanHandle.replace(/^!/, ''),
        handle: savedPref?.handle || cleanHandle,
        email: body.email || 'verified@betsmart.app',
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
