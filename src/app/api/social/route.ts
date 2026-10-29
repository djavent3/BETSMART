import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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

const globalForSocial = globalThis as unknown as {
  channels: ChatChannel[];
  messages: ChatMessage[];
  friends: Record<string, string[]>;
};

if (!globalForSocial.channels) {
  globalForSocial.channels = [
    {
      id: 'disc-nba-cup',
      name: '🏆 NBA Cup Specials Discussion',
      type: 'discussion',
      description: 'Public community discussion for tonight’s In-Season Tournament matchups',
    },
    {
      id: 'disc-nfl-primetime',
      name: '⚡ NFL Primetime Discussion',
      type: 'discussion',
      description: 'Public community discussion for prime island-game props',
    },
    {
      id: 'grp-nba-locks',
      name: '#nba-cup-locks',
      type: 'group',
      members: ['!uno', '!dave', '!yella', '!tari'],
      description: 'Private group chat for high-minute player overs',
    },
    {
      id: 'grp-nfl-sunday',
      name: '#nfl-sunday-slips',
      type: 'group',
      members: ['!uno', '!dave', '!noah', '!gridiron_quant'],
      description: 'Sunday NFL flex entries and parlay sweats',
    },
    {
      id: 'dm-dave',
      name: '!dave',
      type: 'dm',
      members: ['!uno', '!dave'],
      description: 'Direct Message',
    },
    {
      id: 'dm-tari',
      name: '!tari',
      type: 'dm',
      members: ['!uno', '!tari'],
      description: 'Direct Message',
    },
  ];
}

if (!globalForSocial.messages) {
  globalForSocial.messages = [
    {
      id: 'msg-disc-1',
      channelId: 'disc-nba-cup',
      senderHandle: '!sharp_king',
      timestamp: '6:30 PM',
      text: 'Haliburton’s assist line at 9.5 is looking like the lock of the night.',
    },
    {
      id: 'msg-grp-1',
      channelId: 'grp-nba-locks',
      senderHandle: '!dave',
      timestamp: '6:45 PM',
      text: 'Locked in this 3-pick slip for the cup games!',
    },
  ];
}

if (!globalForSocial.friends) {
  globalForSocial.friends = {
    '!uno': ['!dave', '!tari', '!yella', '!noah', '!gridiron_quant'],
    '!dave': ['!uno', '!tari'],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle') || '!uno';

  const userFriends = globalForSocial.friends[handle] || ['!dave', '!tari', '!yella', '!noah'];

  return NextResponse.json({
    status: 'success',
    channels: globalForSocial.channels,
    messages: globalForSocial.messages,
    friends: userFriends,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'add_friend') {
      const userHandle = body.userHandle || '!uno';
      const friendHandle = `!${(body.friendHandle || '').replace(/^[!@#\s]+/, '').toLowerCase()}`;
      if (!globalForSocial.friends[userHandle]) {
        globalForSocial.friends[userHandle] = [];
      }
      if (!globalForSocial.friends[userHandle].includes(friendHandle)) {
        globalForSocial.friends[userHandle].push(friendHandle);
      }
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

      const newChan: ChatChannel = {
        id: `${isDm ? 'dm' : 'grp'}-${Date.now()}`,
        name: formattedName,
        type: isDm ? 'dm' : 'group',
        members: body.members || [body.creator || '!uno', formattedName],
        description: isDm ? 'Direct Message' : body.description || 'User-created betting group chat',
      };

      globalForSocial.channels.push(newChan);
      return NextResponse.json({ status: 'success', channel: newChan, channels: globalForSocial.channels });
    }

    if (body.action === 'send_message') {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        channelId: body.channelId,
        senderHandle: body.senderHandle || '!guest_tester',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: body.text || '',
        sharedProp: body.sharedProp || undefined,
        sharedSlip: body.sharedSlip || undefined,
      };

      globalForSocial.messages.push(newMsg);
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
