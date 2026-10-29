'use client';

import React from 'react';
import Link from 'next/link';
import AdminDashboard from '@/components/AdminDashboard';
import PasswordGate from '@/components/PasswordGate';

export default function AdminPage() {
  return (
    <PasswordGate>
      <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-extrabold text-emerald-400"
            >
              ← Back to BETSMART Analyzer
            </Link>
          </div>
          <AdminDashboard />
        </div>
      </main>
    </PasswordGate>
  );
}
