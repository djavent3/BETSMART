import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export interface SharedPropPayload {
  id: string;
  player: string;
  sport: string;
  matchup: string;
  market: string;
  line: number;
  recommendedPick: 'OVER' | 'UNDER';
  smartScore: number;
  overProbabilityPct: number;
  availablePlatforms: string[];
}

export interface SharedSlipPayload {
  platform: string;
  playType: string;
  entryAmount: number;
  potentialPayout: number;
  multiplierLabel: string;
  avgSmartScore: number;
  picks: SharedPropPayload[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderHandle: string;
  timestamp: string;
  timestampIso?: string;
  text?: string;
  sharedProp?: SharedPropPayload;
  sharedSlip?: SharedSlipPayload;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'discussion' | 'group' | 'dm';
  members?: string[];
  description?: string;
}

const SOCIAL_STORE_PATH = path.join('/tmp', 'betsmart_social_store_v2.json');

const globalForSocial = globalThis as unknown as {
  channels: ChatChannel[];
  messages: ChatMessage[];
  friends: Record<string, string[]>;
  registeredHandles: string[];
  socialLoaded?: boolean;
};

function saveSocialStore() {
  try {
    fs.writeFileSync(
      SOCIAL_STORE_PATH,
      JSON.stringify({
        channels: globalForSocial.channels,
        messages: globalForSocial.messages,
        friends: globalForSocial.friends,
        registeredHandles: globalForSocial.registeredHandles,
      }),
      'utf8'
    );
  } catch {
    // Ignore write errors
  }
}

function initSocialStore() {
  if (globalForSocial.socialLoaded) return;
  globalForSocial.socialLoaded = true;

  try {
    if (fs.existsSync(SOCIAL_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SOCIAL_STORE_PATH, 'utf8'));
      globalForSocial.channels = parsed.channels || [];
      globalForSocial.messages = parsed.messages || [];
      globalForSocial.friends = parsed.friends || {};
      globalForSocial.registeredHandles = parsed.registeredHandles || [];
      return;
    }
  } catch {
    // Fallback to default discussions
  }

  globalForSocial.channels = [
    {
      id: 'disc-nba-cup',
      name: '🏆 NBA Cup Specials Discussion',
      type: 'discussion',
      description: 'Public community discussion for NBA Cup matchups — open to all registered accounts',
    },
    {
      id: 'disc-nfl-primetime',
      name: '⚡ NFL Primetime Discussion',
      type: 'discussion',
      description: 'Public community discussion for NFL Primetime props — open to all registered accounts',
    },
    {
      id: 'disc-hit-rate',
      name: '🎯 100% Hit Rate Discussion',
      type: 'discussion',
      description: 'Public community discussion for active 100% hit-rate streaks',
    },
  ];
  globalForSocial.messages = [];
  globalForSocial.friends = {};
  globalForSocial.registeredHandles = [];
}

initSocialStore();

export async function GET(request: Request) {
  initSocialStore();
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle') || '';

  if (handle && handle !== '!guest' && !globalForSocial.registeredHandles.includes(handle)) {
    globalForSocial.registeredHandles.push(handle);
    saveSocialStore();
  }

  const userFriends = globalForSocial.friends[handle] || [];
  const directoryHandles = globalForSocial.registeredHandles.filter((h) => h !== handle);

  return NextResponse.json({
    status: 'success',
    channels: globalForSocial.channels,
    messages: globalForSocial.messages,
    friends: Array.from(new Set([...userFriends, ...directoryHandles])),
  });
}

export async function POST(request: Request) {
  initSocialStore();
  try {
    const body = await request.json();

    if (body.action === 'add_friend') {
      const userHandle = body.userHandle || '!bettor';
      const friendHandle = `!${(body.friendHandle || '').replace(/^[!@#\s]+/, '').toLowerCase()}`;
      if (!globalForSocial.friends[userHandle]) {
        globalForSocial.friends[userHandle] = [];
      }
      if (friendHandle !== '!' && !globalForSocial.friends[userHandle].includes(friendHandle)) {
        globalForSocial.friends[userHandle].push(friendHandle);
      }
      if (!globalForSocial.registeredHandles.includes(friendHandle)) {
        globalForSocial.registeredHandles.push(friendHandle);
      }
      saveSocialStore();

      return NextResponse.json({
        status: 'success',
        friends: globalForSocial.friends[userHandle],
      });
    }

    if (body.action === 'create_channel') {
      const rawName = (body.name || '').trim();
      if (!rawName) {
        return NextResponse.json({ status: 'error', message: 'Channel name required' }, { status: 400 });
      }
      const isDm = body.type === 'dm';
      const formattedName = isDm
        ? `!${rawName.replace(/^[!@#\s]+/, '').toLowerCase()}`
        : `#${rawName.replace(/^[!@#\s]+/, '').toLowerCase().replace(/\s+/g, '-')}`;

      const creator: string = body.creator || '!bettor';
      const rawMembers: string[] = body.members || (isDm ? [creator, formattedName] : [creator]);
      const members: string[] = Array.from(new Set(rawMembers));

      const newChan: ChatChannel = {
        id: `${isDm ? 'dm' : 'grp'}-${Date.now()}`,
        name: formattedName,
        type: isDm ? 'dm' : 'group',
        members,
        description: isDm ? `Direct Message with ${formattedName}` : body.description || 'User-created group chat',
      };

      globalForSocial.channels.push(newChan);
      saveSocialStore();

      return NextResponse.json({
        status: 'success',
        channel: newChan,
        channels: globalForSocial.channels,
      });
    }

    if (body.action === 'send_message') {
      const sender = body.senderHandle || '!bettor';
      if (!globalForSocial.registeredHandles.includes(sender)) {
        globalForSocial.registeredHandles.push(sender);
      }

      const now = new Date();
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        channelId: body.channelId,
        senderHandle: sender,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampIso: now.toISOString(),
        text: body.text || '',
        sharedProp: body.sharedProp || undefined,
        sharedSlip: body.sharedSlip || undefined,
      };

      globalForSocial.messages.push(newMsg);
      saveSocialStore();

      return NextResponse.json({
        status: 'success',
        message: newMsg,
        messages: globalForSocial.messages,
      });
    }

    return NextResponse.json({ status: 'error', message: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message || 'Server error' }, { status: 500 });
  }
}
