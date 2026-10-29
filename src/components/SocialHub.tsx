'use client';

import React, { useState, useMemo } from 'react';
import {
  ChatChannel,
  ChatMessage,
  SharedSlipPayload,
} from '@/app/api/social/route';

interface SocialHubProps {
  currentUserHandle: string;
  currentUserAvatar: string;
  userAvatars: Record<string, string>;
  channels: ChatChannel[];
  messages: ChatMessage[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  friends: string[];
  onSendMessage: (channelId: string, text: string) => Promise<void>;
  onCreateChannel: (name: string, type: 'group' | 'dm', description?: string) => Promise<void>;
  onAddFriend: (friendHandle: string) => Promise<void>;
  onTailSlip: (slip: SharedSlipPayload) => void;
  onInspectProp: (propId: string) => void;
  isExpandedWindow: boolean;
  setIsExpandedWindow: (val: boolean) => void;
  onCloseWidget: () => void;
}

export default function SocialHub({
  currentUserHandle,
  currentUserAvatar,
  userAvatars,
  channels,
  messages,
  activeChannelId,
  setActiveChannelId,
  friends,
  onSendMessage,
  onCreateChannel,
  onAddFriend,
  onTailSlip,
  onInspectProp,
  isExpandedWindow,
  setIsExpandedWindow,
  onCloseWidget,
}: SocialHubProps) {
  const [messageInput, setMessageInput] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'group' | 'dm'>('group');
  const [showNewModal, setShowNewModal] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const channelMessages = messages.filter((m) => m.channelId === activeChannel?.id);

  const discussions = channels.filter((c) => c.type === 'discussion');
  const userGroups = channels.filter((c) => c.type === 'group');
  const dms = channels.filter((c) => c.type === 'dm');

  const getAvatarForHandle = (handle: string) => {
    if (handle === currentUserHandle && currentUserAvatar) return currentUserAvatar;
    if (userAvatars && userAvatars[handle]) return userAvatars[handle];
    const clean = (handle || 'user').replace(/^[!@#\s]+/, '') || 'user';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      clean
    )}&background=064e3b&color=34d399&bold=true&size=128`;
  };

  const formatLocalMessageTime = (msg: ChatMessage) => {
    if (msg.timestampIso) {
      try {
        return new Date(msg.timestampIso).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });
      } catch {
        return msg.timestamp;
      }
    }
    return msg.timestamp;
  };

  const autocompleteSuggestions = useMemo(() => {
    if (!messageInput.includes('@') && !messageInput.includes('!')) return [];
    const query = messageInput.split(/[@!]/).pop()?.toLowerCase() || '';
    if (!query) return friends;
    return friends.filter((f) => f.toLowerCase().includes(query));
  }, [messageInput, friends]);

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

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendInput.trim()) return;
    await onAddFriend(friendInput);
    setFriendInput('');
    setShowAddFriend(false);
  };

  return (
    <div
      className={`bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        isExpandedWindow
          ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] max-w-7xl mx-auto'
          : 'w-full h-[520px]'
      }`}
    >
      <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <img
            src={currentUserAvatar}
            alt={currentUserHandle}
            onError={(e) => {
              e.currentTarget.src = getAvatarForHandle(currentUserHandle);
            }}
            className="w-7 h-7 rounded-full object-cover border border-emerald-500/70"
          />
          <span className="text-sm font-extrabold text-white">💬 BETSMART Social & Discussions</span>
          <span className="text-[10px] font-bold bg-neutral-900 text-emerald-400 border border-neutral-800 px-2 py-0.5 rounded-full">
            {currentUserHandle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 rounded-lg cursor-pointer"
          >
            + Add Friend
          </button>
          <button
            onClick={() => setIsExpandedWindow(!isExpandedWindow)}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 rounded-lg cursor-pointer"
          >
            {isExpandedWindow ? '↙ Collapse Widget' : '↗ Full Window Expand'}
          </button>
          <button
            onClick={onCloseWidget}
            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {showAddFriend && (
        <form
          onSubmit={handleAddFriendSubmit}
          className="bg-neutral-950 border-b border-neutral-800 px-4 py-2.5 flex items-center gap-2"
        >
          <input
            type="text"
            value={friendInput}
            onChange={(e) => setFriendInput(e.target.value)}
            placeholder="Enter friend !handle"
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1 text-xs text-white focus:outline-none"
            required
          />
          <button
            type="submit"
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Save Friend
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
        <div className="lg:col-span-4 bg-neutral-950 border-r border-neutral-800 p-3.5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1.5 px-1">
                Public Discussions (All Users)
              </p>
              <div className="space-y-1">
                {discussions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveChannelId(d.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                      activeChannel?.id === d.id
                        ? 'bg-amber-950/70 text-amber-300 border border-amber-700/60'
                        : 'text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <span>{d.name}</span>
                    <span className="text-[10px] text-amber-500 font-semibold">Public</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                  Private Groups & DMs
                </p>
                <button
                  onClick={() => setShowNewModal(!showNewModal)}
                  className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  + New
                </button>
              </div>

              {showNewModal && (
                <form
                  onSubmit={handleCreate}
                  className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl space-y-2 mb-2"
                >
                  <div className="grid grid-cols-2 gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setNewChannelType('group')}
                      className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                        newChannelType === 'group' ? 'bg-emerald-600 text-white' : 'text-neutral-400'
                      }`}
                    >
                      # Group Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChannelType('dm')}
                      className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                        newChannelType === 'dm' ? 'bg-emerald-600 text-white' : 'text-neutral-400'
                      }`}
                    >
                      ! DM
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder={newChannelType === 'dm' ? 'Friend !handle' : 'Group name'}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-1 bg-white text-neutral-950 text-xs font-extrabold rounded-lg cursor-pointer"
                  >
                    Create
                  </button>
                </form>
              )}

              {[...userGroups, ...dms].length === 0 ? (
                <p className="text-[11px] text-neutral-500 px-2 py-2">
                  No private chats yet. Click <strong className="text-emerald-400">+ New</strong> to start a DM or group chat with friends.
                </p>
              ) : (
                <div className="space-y-1">
                  {[...userGroups, ...dms].map((chan) => (
                    <button
                      key={chan.id}
                      onClick={() => setActiveChannelId(chan.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                        activeChannel?.id === chan.id
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                          : 'text-neutral-300 hover:bg-neutral-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {chan.type === 'dm' && (
                          <img
                            src={getAvatarForHandle(chan.name)}
                            alt={chan.name}
                            className="w-5 h-5 rounded-full object-cover border border-emerald-500/50"
                          />
                        )}
                        {chan.name}
                      </span>
                      {chan.type === 'group' && chan.members && (
                        <span className="text-[10px] text-neutral-500 font-semibold">
                          {chan.members.length} members
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col justify-between bg-neutral-900">
          <div className="px-4 py-2.5 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-extrabold text-white">{activeChannel?.name}</h4>
              <p className="text-[11px] text-neutral-400">{activeChannel?.description}</p>
            </div>
            {activeChannel?.type === 'group' && activeChannel?.members && (
              <span className="text-[11px] text-emerald-400 font-bold">
                {activeChannel.members.length} Members
              </span>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 space-y-1">
                <p className="text-xs font-bold text-neutral-300">No messages in {activeChannel?.name} yet</p>
                <p className="text-[11px]">Start the conversation or share a prop/slip below!</p>
              </div>
            ) : (
              channelMessages.map((msg) => {
                const isMe = msg.senderHandle === currentUserHandle;
                const avatarSrc = getAvatarForHandle(msg.senderHandle);
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={avatarSrc}
                        alt={msg.senderHandle}
                        onError={(e) => {
                          e.currentTarget.src = getAvatarForHandle(msg.senderHandle);
                        }}
                        className="w-5 h-5 rounded-full object-cover border border-emerald-500/60"
                      />
                      <span className="text-xs font-extrabold text-emerald-400">{msg.senderHandle}</span>
                      <span className="text-[10px] text-neutral-500">{formatLocalMessageTime(msg)}</span>
                    </div>

                    <div
                      className={`max-w-md rounded-2xl p-3.5 space-y-2 border ${
                        isMe
                          ? 'bg-emerald-950/40 border-emerald-800/70 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                      }`}
                    >
                      {msg.text && <p className="text-xs leading-relaxed">{msg.text}</p>}

                      {msg.sharedProp && (
                        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 space-y-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-neutral-400">
                            {msg.sharedProp.sport} • {msg.sharedProp.matchup}
                          </span>
                          <p className="text-xs font-extrabold text-white">
                            {msg.sharedProp.player} —{' '}
                            <span className="text-emerald-400">
                              {msg.sharedProp.recommendedPick} {msg.sharedProp.line} {msg.sharedProp.market}
                            </span>
                          </p>
                          <button
                            onClick={() => onInspectProp(msg.sharedProp!.id)}
                            className="text-[10px] text-emerald-400 font-bold underline cursor-pointer"
                          >
                            Inspect Prop →
                          </button>
                        </div>
                      )}

                      {msg.sharedSlip && (
                        <div className="bg-neutral-900 border border-emerald-700/60 rounded-xl p-3 space-y-2">
                          <div className="flex justify-between items-center border-b border-neutral-800 pb-1.5">
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-emerald-600 text-white rounded">
                              {msg.sharedSlip.platform} SLIP
                            </span>
                            <span className="text-xs font-extrabold text-emerald-400">
                              ${msg.sharedSlip.entryAmount} → ${msg.sharedSlip.potentialPayout}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {msg.sharedSlip.picks.map((p) => (
                              <div key={p.id} className="flex justify-between text-[11px] bg-neutral-950 px-2 py-1 rounded">
                                <span className="text-white font-bold">{p.player}</span>
                                <span className="text-emerald-400 font-bold">
                                  {p.recommendedPick} {p.line} {p.market}
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => onTailSlip(msg.sharedSlip!)}
                            className="w-full py-1 bg-emerald-600 text-white text-[11px] font-extrabold rounded-lg cursor-pointer"
                          >
                            ⚡ Tail This Slip
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center gap-2 relative"
          >
            {autocompleteSuggestions.length > 0 && (
              <div className="absolute bottom-14 left-3 bg-neutral-900 border border-neutral-700 rounded-xl p-1.5 shadow-xl space-y-1 z-10">
                <p className="text-[9px] uppercase font-bold text-neutral-400 px-2">Friends Matching:</p>
                {autocompleteSuggestions.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      const lastWord = messageInput.split(/\s+/).pop() || '';
                      setMessageInput(messageInput.replace(lastWord, f));
                    }}
                    className="flex items-center gap-2 w-full text-left px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-neutral-800 rounded-lg cursor-pointer"
                  >
                    <img
                      src={getAvatarForHandle(f)}
                      alt={f}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span>{f}</span>
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type message or !friend..."
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
