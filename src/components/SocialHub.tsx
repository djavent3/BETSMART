'use client';

import React, { useState } from 'react';
import {
  ChatChannel,
  ChatMessage,
  SharedPropPayload,
  SharedSlipPayload,
} from '@/app/api/social/route';

interface SocialHubProps {
  currentUserHandle: string;
  channels: ChatChannel[];
  messages: ChatMessage[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  onSendMessage: (channelId: string, text: string) => Promise<void>;
  onCreateChannel: (name: string, type: 'group' | 'dm', description?: string) => Promise<void>;
  onTailSlip: (slip: SharedSlipPayload) => void;
  onInspectProp: (propId: string) => void;
}

export default function SocialHub({
  currentUserHandle,
  channels,
  messages,
  activeChannelId,
  setActiveChannelId,
  onSendMessage,
  onCreateChannel,
  onTailSlip,
  onInspectProp,
}: SocialHubProps) {
  const [messageInput, setMessageInput] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'group' | 'dm'>('group');
  const [showNewModal, setShowNewModal] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const channelMessages = messages.filter((m) => m.channelId === activeChannel?.id);

  const groupChannels = channels.filter((c) => c.type === 'group');
  const dmChannels = channels.filter((c) => c.type === 'dm');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChannel) return;
    const text = messageInput;
    setMessageInput('');
    await onSendMessage(activeChannel.id, text);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    await onCreateChannel(newChannelName, newChannelType);
    setNewChannelName('');
    setShowNewModal(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
      {/* LEFT SIDEBAR: GROUP CHATS & !USERNAME DMs */}
      <div className="lg:col-span-4 bg-neutral-950 border-b lg:border-b-0 lg:border-r border-neutral-800 p-4 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                💬 BETSMART Social
              </h3>
              <p className="text-[11px] text-neutral-400">
                Posting as <strong className="text-emerald-400">{currentUserHandle}</strong>
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(!showNewModal)}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
            >
              + New Chat
            </button>
          </div>

          {/* Inline Create Group or DM Box */}
          {showNewModal && (
            <form
              onSubmit={handleCreate}
              className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl space-y-2.5"
            >
              <div className="grid grid-cols-2 gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setNewChannelType('group')}
                  className={`py-1 rounded text-[11px] font-bold cursor-pointer ${
                    newChannelType === 'group' ? 'bg-emerald-600 text-white' : 'text-neutral-400'
                  }`}
                >
                  # Group Chat
                </button>
                <button
                  type="button"
                  onClick={() => setNewChannelType('dm')}
                  className={`py-1 rounded text-[11px] font-bold cursor-pointer ${
                    newChannelType === 'dm' ? 'bg-emerald-600 text-white' : 'text-neutral-400'
                  }`}
                >
                  ! Direct Message
                </button>
              </div>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder={
                  newChannelType === 'dm' ? 'Enter friend !handle (e.g. yella)' : 'Group name (e.g. college-locks)'
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-white text-neutral-950 text-xs font-extrabold rounded-lg cursor-pointer"
              >
                Create {newChannelType === 'dm' ? 'Direct Message' : 'Group'}
              </button>
            </form>
          )}

          {/* Group Chats List */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2 px-2">
              Group Channels ({groupChannels.length})
            </p>
            <div className="space-y-1">
              {groupChannels.map((chan) => (
                <button
                  key={chan.id}
                  onClick={() => setActiveChannelId(chan.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                    activeChannel?.id === chan.id
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                      : 'text-neutral-300 hover:bg-neutral-900'
                  }`}
                >
                  <span>{chan.name}</span>
                  <span className="text-[10px] text-neutral-500">{chan.members.length} members</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages List */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2 px-2">
              Direct Messages (!Handles)
            </p>
            <div className="space-y-1">
              {dmChannels.map((dm) => (
                <button
                  key={dm.id}
                  onClick={() => setActiveChannelId(dm.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                    activeChannel?.id === dm.id
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                      : 'text-neutral-300 hover:bg-neutral-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {dm.name}
                  </span>
                  <span className="text-[10px] text-neutral-500">DM</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 text-[11px] text-neutral-500">
          Tip: Click <strong className="text-neutral-300">💬 Send</strong> on any prop card or inside the Slip Maker to drop plays right into a chat.
        </div>
      </div>

      {/* RIGHT MAIN STREAM: ACTIVE CHAT MESSAGES, SHARED PROPS & SLIPS */}
      <div className="lg:col-span-8 flex flex-col justify-between h-[600px]">
        {/* Channel Header */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/90 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold text-white">{activeChannel?.name}</h3>
            <p className="text-xs text-neutral-400">{activeChannel?.description}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeChannel?.members?.slice(0, 4).map((m) => (
              <span
                key={m}
                className="text-[10px] font-bold px-2 py-0.5 bg-neutral-800 text-emerald-400 rounded-full"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {channelMessages.map((msg) => {
            const isMe = msg.senderHandle === currentUserHandle;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-extrabold text-emerald-400">
                    {msg.senderHandle}
                  </span>
                  <span className="text-[10px] text-neutral-500">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-lg rounded-2xl p-4 space-y-3 border ${
                    isMe
                      ? 'bg-emerald-950/40 border-emerald-800/70 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                  }`}
                >
                  {msg.text && <p className="text-xs leading-relaxed">{msg.text}</p>}

                  {/* Embedded Shared Prop Card */}
                  {msg.sharedProp && (
                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-[10px] font-extrabold uppercase text-neutral-400">
                          {msg.sharedProp.sport} • {msg.sharedProp.matchup}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-400">
                          🔥 SmartScore {msg.sharedProp.smartScore}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-white">
                        {msg.sharedProp.player} —{' '}
                        <span className="text-emerald-400">
                          {msg.sharedProp.recommendedPick} {msg.sharedProp.line} {msg.sharedProp.market}
                        </span>
                      </p>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[11px] text-neutral-400">
                          Market Projection: {msg.sharedProp.overProbabilityPct}% Over
                        </span>
                        <button
                          onClick={() => onInspectProp(msg.sharedProp!.id)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-white rounded-lg cursor-pointer"
                        >
                          Inspect Prop →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Embedded Shared Parlay Slip Card */}
                  {msg.sharedSlip && (
                    <div className="bg-neutral-900 border border-emerald-700/60 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-600 text-white rounded">
                            {msg.sharedSlip.platform} SLIP
                          </span>
                          <p className="text-xs font-bold text-neutral-300 mt-1">
                            {msg.sharedSlip.picks.length}-Pick {msg.sharedSlip.playType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-neutral-400">Entry / Payout</p>
                          <p className="text-sm font-extrabold text-emerald-400">
                            ${msg.sharedSlip.entryAmount} → ${msg.sharedSlip.potentialPayout}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {msg.sharedSlip.picks.map((p) => (
                          <div
                            key={p.id}
                            className="flex justify-between items-center text-xs bg-neutral-950 px-2.5 py-1.5 rounded-lg"
                          >
                            <span className="font-bold text-white">{p.player}</span>
                            <span className="font-extrabold text-emerald-400">
                              {p.recommendedPick} {p.line} {p.market}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                        <span className="text-[11px] font-bold text-emerald-400">
                          🔥 Avg SmartScore: {msg.sharedSlip.avgSmartScore}
                        </span>
                        <button
                          onClick={() => onTailSlip(msg.sharedSlip!)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg cursor-pointer shadow"
                        >
                          ⚡ Tail This Slip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center gap-2.5"
        >
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={`Message ${activeChannel?.name || 'chat'} as ${currentUserHandle}...`}
            className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
