'use client';

import React, { useState } from 'react';
import { auth, updateProfile, formatBangUsername } from '@/lib/firebase';
import { User } from 'firebase/auth';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

export default function ProfileModal({ user, onClose, onUpdate }: ProfileModalProps) {
  const initialClean = formatBangUsername(user).replace(/^!/, '');
  const [handleInput, setHandleInput] = useState(initialClean);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);

    const formattedHandle = `!${handleInput.replace(/^[!@\s]+/, '').replace(/\s+/g, '').toLowerCase()}`;

    try {
      await updateProfile(auth.currentUser, {
        displayName: formattedHandle,
        photoURL,
      });
      onUpdate({ ...auth.currentUser, displayName: formattedHandle, photoURL });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold text-white">Edit !Profile</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm cursor-pointer">✕</button>
        </div>

        {error && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-3 rounded-xl mb-4 text-xs">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1">Display Handle (!username)</label>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden focus-within:border-emerald-500">
              <span className="pl-4 pr-1 text-sm font-extrabold text-emerald-400">!</span>
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value.replace(/^[!@]+/, ''))}
                className="w-full bg-transparent px-2 py-2.5 text-sm text-white focus:outline-none"
                placeholder="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1">Profile Picture URL</label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save !Handle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
