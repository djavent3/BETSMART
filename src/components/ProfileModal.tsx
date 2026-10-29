'use client';

import React, { useState } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { formatBangUsername } from '@/lib/firebase';

interface ProfileModalProps {
  user: User;
  currentAvatarUrl: string;
  onClose: () => void;
  onUpdate: (updatedUser: User, newAvatarUrl: string, newHandle: string) => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=SharpKing&backgroundColor=064e3b',
  'https://api.dicebear.com/7.x/bottts/svg?seed=HoopsQuant&backgroundColor=1e1b4b',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GridironPro&backgroundColor=3b0764',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ParlayBoss&backgroundColor=0f172a',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=UnoBets&backgroundColor=065f46',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=LockSmith&backgroundColor=1e293b',
];

export default function ProfileModal({
  user,
  currentAvatarUrl,
  onClose,
  onUpdate,
}: ProfileModalProps) {
  const initialClean = formatBangUsername(user).replace(/^!/, '');
  const [username, setUsername] = useState(initialClean);
  const [photoURL, setPhotoURL] = useState(currentAvatarUrl);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    username || 'User'
  )}&background=064e3b&color=34d399&bold=true&size=128`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoURL(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const clean = username.replace(/^[!@#\s]+/, '').trim().toLowerCase();
      if (!clean) {
        throw new Error('Username cannot be empty.');
      }
      const formattedBang = `!${clean}`;
      const finalAvatar =
        customUrlInput.trim() !== ''
          ? customUrlInput.trim()
          : photoURL || fallbackAvatar;

      // Persist in localStorage by UID & Handle so it always renders immediately
      localStorage.setItem(`betsmart_avatar_${user.uid}`, finalAvatar);
      localStorage.setItem(`betsmart_avatar_${formattedBang}`, finalAvatar);
      localStorage.setItem(`betsmart_handle_${user.uid}`, formattedBang);

      // Update Firebase displayName (avoid storing huge base64 strings in Firebase photoURL field)
      await updateProfile(user, {
        displayName: formattedBang,
        photoURL: finalAvatar.startsWith('data:') ? fallbackAvatar : finalAvatar,
      });

      onUpdate(user, finalAvatar, formattedBang);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
      >
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-white">Your !Profile & Avatar</h3>
            <p className="text-xs text-neutral-400">
              Customize your !username and profile picture across BETSMART
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Live Profile Picture Preview */}
        <div className="flex items-center gap-4 bg-neutral-950 border border-neutral-800 p-4 rounded-2xl">
          <img
            src={customUrlInput.trim() || photoURL || fallbackAvatar}
            alt="Profile Preview"
            onError={(e) => {
              e.currentTarget.src = fallbackAvatar;
            }}
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 bg-neutral-900 shrink-0"
          />
          <div className="space-y-1">
            <p className="text-base font-extrabold text-emerald-400">
              !{username.replace(/^[!@#\s]+/, '').toLowerCase() || 'username'}
            </p>
            <p className="text-[11px] text-neutral-400">
              Shown in top header, group chats, and shared prop slips
            </p>
            <label className="inline-block mt-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-white rounded-lg cursor-pointer">
              📷 Upload Photo From Device
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1">
              Username Handle (! automatic)
            </label>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 focus-within:border-emerald-500">
              <span className="text-emerald-400 font-extrabold text-sm mr-1">!</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="uno"
                className="bg-transparent text-sm text-white focus:outline-none w-full font-semibold"
                required
              />
            </div>
          </div>

          {/* Instant Avatar Presets */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1.5">
              Quick Choose Avatar Preset
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPhotoURL(preset);
                    setCustomUrlInput('');
                  }}
                  className={`p-1 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                    photoURL === preset && !customUrlInput
                      ? 'border-emerald-500 bg-emerald-950/50 scale-105'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                  }`}
                >
                  <img
                    src={preset}
                    alt={`Preset ${idx + 1}`}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-1">
              Or Paste Custom Image URL (Optional)
            </label>
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="https://example.com/my-avatar.png"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer shadow-lg"
            >
              {saving ? 'Saving...' : 'Save !Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
