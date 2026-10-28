'use client';

import React, { useState, useMemo } from 'react';
import { SharedPropPayload, SharedSlipPayload } from '@/app/api/social/route';

interface SlipDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slipPlatform: string;
  setSlipPlatform: (plat: string) => void;
  slipPicks: SharedPropPayload[];
  onRemovePick: (id: string) => void;
  onClearSlip: () => void;
  onShareSlipToChat: (slipPayload: SharedSlipPayload) => void;
}

const PLATFORMS = ['PrizePicks', 'Underdog', 'ParlayPlay', 'FanDuel', 'DraftKings', 'ESPN Bet'];

export default function SlipDrawer({
  isOpen,
  onClose,
  slipPlatform,
  setSlipPlatform,
  slipPicks,
  onRemovePick,
  onClearSlip,
  onShareSlipToChat,
}: SlipDrawerProps) {
  const [entryAmount, setEntryAmount] = useState<number>(25);
  const [dfsPlayMode, setDfsPlayMode] = useState<'power' | 'flex'>('power');

  const isDFS = ['PrizePicks', 'Underdog', 'ParlayPlay'].includes(slipPlatform);

  const calculation = useMemo(() => {
    const count = slipPicks.length;
    if (count === 0) {
      return {
        multiplier: 0,
        multiplierLabel: '0x',
        payout: 0,
        avgSmartScore: 0,
        combinedProbPct: 0,
      };
    }

    const avgSmartScore = Math.round(
      slipPicks.reduce((acc, item) => acc + item.smartScore, 0) / count
    );

    const combinedProb = slipPicks.reduce(
      (acc, item) => acc * (item.overProbabilityPct / 100),
      1
    );
    const combinedProbPct = Math.round(combinedProb * 1000) / 10;

    if (isDFS) {
      // Standard DFS Multipliers (Power vs Flex)
      const powerMap: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 10, 5: 20, 6: 37.5 };
      const flexMap: Record<number, number> = { 1: 1, 2: 2, 3: 2.25, 4: 5, 5: 10, 6: 25 };
      const mult = dfsPlayMode === 'power' ? (powerMap[count] || 37.5) : (flexMap[count] || 25);
      return {
        multiplier: mult,
        multiplierLabel: `${mult}x (${dfsPlayMode === 'power' ? 'Power/Standard' : 'Flex/Insured'})`,
        payout: Math.round(entryAmount * mult * 100) / 100,
        avgSmartScore,
        combinedProbPct,
      };
    } else {
      // Sportsbook Parlay Calculation (Standard -110 / 1.9091 decimal per leg)
      const decimalMultiplier = Math.pow(1.9091, count);
      const americanOdds =
        decimalMultiplier >= 2
          ? `+${Math.round((decimalMultiplier - 1) * 100)}`
          : `${Math.round(-100 / (decimalMultiplier - 1))}`;
      return {
        multiplier: Math.round(decimalMultiplier * 100) / 100,
        multiplierLabel: `${americanOdds} Parlay Odds (${decimalMultiplier.toFixed(2)}x)`,
        payout: Math.round(entryAmount * decimalMultiplier * 100) / 100,
        avgSmartScore,
        combinedProbPct,
      };
    }
  }, [slipPicks, isDFS, dfsPlayMode, entryAmount]);

  if (!isOpen) return null;

  const handleShare = () => {
    if (slipPicks.length === 0) return;
    onShareSlipToChat({
      platform: slipPlatform,
      playType: calculation.multiplierLabel,
      entryAmount,
      potentialPayout: calculation.payout,
      multiplierLabel: calculation.multiplierLabel,
      avgSmartScore: calculation.avgSmartScore,
      picks: slipPicks,
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-900 border-l border-neutral-800 w-full max-w-md h-full flex flex-col justify-between p-6 overflow-y-auto shadow-2xl"
      >
        {/* Top Section */}
        <div className="space-y-5">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧾</span>
                <h2 className="text-xl font-extrabold text-white">Platform Slip Maker</h2>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Build DFS entries or sportsbook parlays & share with friends
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 1. Select Platform for Slip */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 mb-2">
              1. Select Slip Platform
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PLATFORMS.map((plat) => (
                <button
                  key={plat}
                  onClick={() => setSlipPlatform(plat)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                    slipPlatform === plat
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>
          </div>

          {/* DFS Play Type Toggle (Power vs Flex) */}
          {isDFS && (
            <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setDfsPlayMode('power')}
                className={`py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  dfsPlayMode === 'power'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ⚡ Power / Standard Play
              </button>
              <button
                onClick={() => setDfsPlayMode('flex')}
                className={`py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  dfsPlayMode === 'flex'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🛡️ Flex / Insured Play
              </button>
            </div>
          )}

          {/* Picks List */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase text-neutral-300">
                Active Legs ({slipPicks.length}/6)
              </span>
              {slipPicks.length > 0 && (
                <button
                  onClick={onClearSlip}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {slipPicks.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-8 text-center space-y-2">
                <p className="text-2xl">➕</p>
                <p className="text-xs font-bold text-white">Your {slipPlatform} slip is empty</p>
                <p className="text-[11px] text-neutral-400">
                  Click &ldquo;+ Slip&rdquo; on any player prop card in the board to add legs to your entry.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {slipPicks.map((pick) => {
                  const isAvailableOnSelected = pick.availablePlatforms?.includes(slipPlatform);
                  return (
                    <div
                      key={pick.id}
                      className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex justify-between items-center gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">{pick.player}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                            🔥 {pick.smartScore}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-emerald-400 mt-0.5">
                          {pick.recommendedPick} {pick.line} {pick.market}
                        </p>
                        {!isAvailableOnSelected && (
                          <p className="text-[10px] text-amber-400 mt-0.5">
                            ⚠️ Alt line on {slipPlatform} (Primary: {pick.availablePlatforms[0]})
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemovePick(pick.id)}
                        className="text-xs text-neutral-500 hover:text-rose-400 px-2 py-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Summary & Share Controls */}
        <div className="pt-4 border-t border-neutral-800 space-y-4 mt-6">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-neutral-400">Entry Stake ($)</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={entryAmount}
              onChange={(e) => setEntryAmount(Math.max(1, Number(e.target.value)))}
              className="w-28 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-sm font-extrabold text-white text-right focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Platform Format:</span>
              <span className="font-bold text-white">{calculation.multiplierLabel}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Slip Avg SmartScore™:</span>
              <span className="font-extrabold text-emerald-400">
                🔥 {calculation.avgSmartScore} / 100
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Combined Hit Probability:</span>
              <span className="font-bold text-neutral-200">{calculation.combinedProbPct}%</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
              <span className="text-xs font-extrabold uppercase text-emerald-400">
                Projected Payout
              </span>
              <span className="text-xl font-extrabold text-white">
                ${calculation.payout.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            disabled={slipPicks.length === 0}
            onClick={handleShare}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            💬 Share {slipPlatform} Slip to Friend / Group Chat
          </button>
        </div>
      </div>
    </div>
  );
}
