'use client';

import React, { useState } from 'react';

interface TutorialModalProps {
  userHandle: string;
  onClose: (neverShowAgain: boolean) => void;
}

export default function TutorialModal({ userHandle, onClose }: TutorialModalProps) {
  const [neverShowAgain, setNeverShowAgain] = useState<boolean>(false);

  const features = [
    {
      icon: '🔥',
      title: 'SmartScore™ (0–100 Grade)',
      desc: 'Every prop is graded on a 0–100 scale combining true market probabilities, matchup pace, and hit streaks. Look for 🔥 90+ (Elite) and 🔵 75–89 (Strong).',
    },
    {
      icon: '📊',
      title: '3-Tab Player Profiles & Side Arrows',
      desc: 'Click any prop card to inspect Last-5 game logs, Positional Offensive Rankings, and Advanced Metrics. Use the ← and → side arrows to flip between players.',
    },
    {
      icon: '🧾',
      title: 'Quick "+" Add & Platform Slipmaker',
      desc: 'Tap the "+" button on any prop card to add legs, then click "🧾 Slipmaker" in the top bar to compare PrizePicks/Underdog Power vs. Flex payouts or sportsbook parlays.',
    },
    {
      icon: '💬',
      title: 'Social Hub, Public Discussions & !Handles',
      desc: 'Open "💬 Social Hub" to join public NBA Cup & NFL Primetime discussions, create private group chats, add friends by their !username, and share props or slips.',
    },
    {
      icon: '🔴',
      title: 'Live Stat Tracker (W/L System Audit)',
      desc: 'Once a game tips off, props automatically move off the pre-game board into the "Live Stat Tracker" tab to compare live box-score stats against BETSMART predictions.',
    },
  ];

  return (
    <div
      onClick={() => onClose(neverShowAgain)}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60">
              Welcome {userHandle}
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-2">
              Quick Guide to BETSMART
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Here is a quick rundown of the tools, buttons, and live features on tonight&apos;s slate.
            </p>
          </div>
          <button
            onClick={() => onClose(neverShowAgain)}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Feature List */}
        <div className="space-y-3">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="bg-neutral-950 border border-neutral-800/90 rounded-xl p-3.5 flex items-start gap-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-base shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">{item.title}</h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Never Show Again Option + Action Buttons */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={neverShowAgain}
              onChange={(e) => setNeverShowAgain(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
            />
            <span>Never show this tutorial again</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onClose(true)}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Don&apos;t Show Again
            </button>
            <button
              type="button"
              onClick={() => onClose(neverShowAgain)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/60"
            >
              Got It, Let&apos;s Go →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
