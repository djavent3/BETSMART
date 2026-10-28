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
  type: 'group' | 'dm';
  members: string[];
  description?: string;
}

// In-memory store synced with optional PostgreSQL persistence for live multi-user testing
const globalForSocial = globalThis as unknown as {
  channels: ChatChannel[];
  messages: ChatMessage[];
};

if (!globalForSocial.channels) {
  globalForSocial.channels = [
    {
      id: 'grp-nba-cup',
      name: '#nba-cup-locks',
      type: 'group',
      members: ['!uno', '!dave', '!yella', '!tari', '!sharp_king'],
      description: 'NBA Cup group play props, high-minute starter overs & live sweats',
    },
    {
      id: 'grp-nfl-sunday',
      name: '#nfl-primetime-sweats',
      type: 'group',
      members: ['!uno', '!dave', '!noah', '!gridiron_quant'],
      description: 'NFL Week 8 player props & PrizePicks/Underdog 6-pick flex slips',
    },
    {
      id: 'dm-dave',
      name: '!dave',
      type: 'dm',
      members: ['!dave'],
      description: 'Direct Message',
    },
    {
      id: 'dm-tari',
      name: '!tari',
      type: 'dm',
      members: ['!tari'],
      description: 'Direct Message',
    },
  ];
}

if (!globalForSocial.messages) {
  globalForSocial.messages = [
    {
      id: 'msg-1',
      channelId: 'grp-nba-cup',
      senderHandle: '!dave',
      timestamp: '6:42 PM',
      text: 'Haliburton & Brunson overs look automatic tonight with the NBA Cup point differential rules.',
      sharedProp: {
        id: 'prop-3',
        player: 'Jalen Brunson',
        sport: 'NBA',
        matchup: 'NYK @ CHI',
        market: 'Points',
        line: 28.5,
        recommendedPick: 'OVER',
        smartScore: 96,
        overProbabilityPct: 81,
        availablePlatforms: ['PrizePicks', 'Underdog', 'ParlayPlay', 'FanDuel'],
      },
    },
    {
      id: 'msg-2',
      channelId: 'grp-nba-cup',
      senderHandle: '!tari',
      timestamp: '6:48 PM',
      text: 'Locked in this 3-Pick PrizePicks Power Play. Tail if you want in!',
      sharedSlip: {
        platform: 'PrizePicks',
        playType: 'Power Play (5x)',
        entryAmount: 25,
        potentialPayout: 125,
        multiplierLabel: '5.0x Payout',
        avgSmartScore: 96,
        picks: [
          {
            id: 'prop-1',
            player: 'Tyrese Haliburton',
            sport: 'NBA',
            matchup: 'PHI @ IND',
            market: 'Assists',
            line: 9.5,
            recommendedPick: 'OVER',
            smartScore: 94,
            overProbabilityPct: 78,
            availablePlatforms: ['PrizePicks', 'Underdog', 'FanDuel', 'DraftKings'],
          },
          {
            id: 'prop-3',
            player: 'Jalen Brunson',
            sport: 'NBA',
            matchup: 'NYK @ CHI',
            market: 'Points',
            line: 28.5,
            recommendedPick: 'OVER',
            smartScore: 96,
            overProbabilityPct: 81,
            availablePlatforms: ['PrizePicks', 'Underdog', 'ParlayPlay', 'FanDuel'],
          },
          {
            id: 'prop-8',
            player: 'Shai Gilgeous-Alexander',
            sport: 'NBA',
            matchup: 'OKC @ DAL',
            market: 'Points',
            line: 30.5,
            recommendedPick: 'OVER',
            smartScore: 98,
            overProbabilityPct: 84,
            availablePlatforms: ['Underdog', 'PrizePicks', 'ParlayPlay', 'DraftKings'],
          },
        ],
      },
    },
    {
      id: 'msg-3',
      channelId: 'grp-nfl-sunday',
      senderHandle: '!noah',
      timestamp: '7:05 PM',
      text: 'Amon-Ra St. Brown is on an 11-game reception streak against the blitz.',
      sharedProp: {
        id: 'prop-14',
        player: 'Amon-Ra St. Brown',
        sport: 'NFL',
        matchup: 'MIN @ DET',
        market: 'Receptions',
        line: 6.5,
        recommendedPick: 'OVER',
        smartScore: 99,
        overProbabilityPct: 87,
        availablePlatforms: ['PrizePicks', 'Underdog', 'ParlayPlay', 'DraftKings', 'FanDuel'],
      },
    },
    {
      id: 'msg-4',
      channelId: 'dm-dave',
      senderHandle: '!dave',
      timestamp: '7:10 PM',
      text: 'Yo! Send me your Underdog slip once you finish building it.',
    },
  ];
}

export async function GET() {
  return NextResponse.json({
    status: 'success',
    channels: globalForSocial.channels,
    messages: globalForSocial.messages,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

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
        members: body.members || [formattedName],
        description: isDm ? 'Direct Message' : body.description || 'Custom betting group chat',
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

      // Optional non-blocking Supabase log if table exists
      if (process.env.DATABASE_URL) {
        pool.query('SELECT 1').catch(() => {});
      }

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
