import React from 'react';
import { LayoutDashboard, History, Upload, LogOut, TrendingUp, Settings as SettingsIcon, BookOpen } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
}

export default function Layout({ children, activeTab, setActiveTab, user }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#0F0F0F] z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <TrendingUp className="text-black w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">AYL Trading Journal</span>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'history' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <History size={20} />
            <span className="font-medium">Trade History</span>
          </button>
          <button
            onClick={() => setActiveTab('daily-journal')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'daily-journal' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <BookOpen size={20} />
            <span className="font-medium">Daily Journal</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'upload' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Upload size={20} />
            <span className="font-medium">Import History</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 'settings' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <SettingsIcon size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4">
            <div className="flex items-center gap-3 mb-1">
              <img 
                src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full border border-white/10"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.displayName || 'Trader'}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64 min-h-screen">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-2xl font-semibold capitalize">{activeTab.replace('-', ' ')}</h1>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              Live Market Data Active
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
