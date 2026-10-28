import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { deVigMultiplicative, calculateEVAndKelly } from '@/lib/math';

export async function GET() {
  try {
    // 1. Verify Supabase PostgreSQL connection & fetch registered sportsbooks
    const dbRes = await pool.query(
      'SELECT book_key, display_name, book_type, sharp_weight FROM sportsbooks WHERE is_active = true ORDER BY sharp_weight DESC;'
    );

    // 2. Mock Sharp vs. Square Market Feed (Simulating Pinnacle vs. DraftKings & PrizePicks)
    const mockMarkets = [
      {
        eventId: 'nba-bos-nyk-2026',
        league: 'NBA',
        matchup: 'Boston Celtics @ New York Knicks',
        marketType: 'player_points',
        selection: 'Jalen Brunson Over 27.5 Pts',
        sharpBook: 'Pinnacle',
        sharpOverOdds: -142,
        sharpUnderOdds: +112,
        targetBook: 'DraftKings',
        targetOdds: -105,
      },
      {
        eventId: 'nfl-kc-buf-2026',
        league: 'NFL',
        matchup: 'Kansas City Chiefs @ Buffalo Bills',
        marketType: 'player_pass_yds',
        selection: 'Josh Allen Over 254.5 Pass Yds',
        sharpBook: 'Pinnacle',
        sharpOverOdds: -155,
        sharpUnderOdds: +122,
        targetBook: 'PrizePicks (5-Flex)',
        targetOdds: -119, // Fixed implied odds for 5-Pick Flex
      },
      {
        eventId: 'nba-lal-den-2026',
        league: 'NBA',
        matchup: 'Los Angeles Lakers @ Denver Nuggets',
        marketType: 'spreads',
        selection: 'Denver Nuggets -4.5',
        sharpBook: 'Pinnacle',
        sharpOverOdds: -128,
        sharpUnderOdds: +106,
        targetBook: 'FanDuel',
        targetOdds: -102,
      },
    ];

    // 3. Run each market through the De-Vig & +EV Engine
    const evaluatedOpportunities = mockMarkets.map((m) => {
      const deVigged = deVigMultiplicative(m.sharpOverOdds, m.sharpUnderOdds);
      const evMetrics = calculateEVAndKelly(deVigged.trueProbSideA, m.targetOdds, 1000, 0.25);

      return {
        ...m,
        sharpVigPct: deVigged.vigPercentage,
        noVigFairOdds: deVigged.fairAmericanSideA,
        trueWinProbabilityPct: Number((deVigged.trueProbSideA * 100).toFixed(2)),
        evPercentage: evMetrics.evPercentage,
        recommendedBetSize: evMetrics.recommendedStakeQuarterKelly,
        isPositiveEV: evMetrics.evPercentage > 0,
      };
    });

    return NextResponse.json({
      status: 'success',
      databaseConnected: true,
      activeSportsbooksCount: dbRes.rowCount,
      sportsbooks: dbRes.rows,
      evFeed: evaluatedOpportunities.sort((a, b) => b.evPercentage - a.evPercentage),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json(
      {
        status: 'error',
        databaseConnected: false,
        message: errMessage,
      },
      { status: 500 }
    );
  }
}
