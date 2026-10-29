'use client';

import React, { useState } from 'react';

interface FeedbackWidgetProps {
  senderHandle: string;
  activeTabContext: string;
}

export default function FeedbackWidget({
  senderHandle,
  activeTabContext,
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<'Bug' | 'UI/UX' | 'Prop Data' | 'General'>('General');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_feedback',
          senderHandle: senderHandle || '!guest_tester',
          category,
          message: message.trim(),
          pageContext: activeTabContext,
        }),
      });
      setMessage('');
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setIsOpen(false);
      }, 1500);
    } catch {
      // Ignore error
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 font-sans">
      {isOpen ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-80 p-4 shadow-2xl space-y-3">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🛠️</span>
              <h4 className="text-xs font-extrabold text-white">Send Tester Note to Dev</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {sentSuccess ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-base">✅</p>
              <p className="text-xs font-extrabold text-emerald-400">
                Sent directly to Admin Portal!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="grid grid-cols-4 gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                {(['General', 'Bug', 'UI/UX', 'Prop Data'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                      category === cat
                        ? 'bg-emerald-600 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Spot a bug or have an idea while testing tonight? Drop a quick note..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
                required
              />

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-neutral-500">
                  From: <strong className="text-emerald-400">{senderHandle}</strong>
                </span>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow"
                >
                  {sending ? 'Sending...' : 'Send Note →'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 rounded-full text-[11px] font-extrabold shadow-xl flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
          title="Send quick feedback or bug report to the developer"
        >
          <span>🛠️</span>
          <span>Tester Feedback</span>
        </button>
      )}
    </div>
  );
}
