import React from 'react';
import { auth } from '../firebase';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Account Settings</h2>
        <p className="text-zinc-500 text-sm mb-8">Manage your account preferences.</p>
        
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
