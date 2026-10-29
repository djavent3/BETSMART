import { NextResponse } from 'next/server';

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
  registeredHandles: Set<string>;
};

if (!globalForSocial.channels || globalForSocial.channels.some((c) => c.id === 'dm-dave')) {
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
  globalForSocial.registeredHandles = new Set<string>();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle') || '';

  if (handle && handle !== '!guest') {
    globalForSocial.registeredHandles.add(handle);
  }

  const userFriends = globalForSocial.friends[handle] || [];
  const directoryHandles = Array.from(globalForSocial.registeredHandles).filter((h) => h !== handle);

  return NextResponse.json({
    status: 'success',
    channels: globalForSocial.channels,
    messages: globalForSocial.messages,
    friends: Array.from(new Set([...userFriends, ...directoryHandles])),
  });
}

export async function POST(request: Request) {
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
      globalForSocial.registeredHandles.add(friendHandle);

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
      return NextResponse.json({
        status: 'success',
        channel: newChan,
        channels: globalForSocial.channels,
      });
    }

    if (body.action === 'send_message') {
      const sender = body.senderHandle || '!bettor';
      globalForSocial.registeredHandles.add(sender);

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        channelId: body.channelId,
        senderHandle: sender,
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
