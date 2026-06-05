import React from 'react';
import { LayoutDashboard, History, LogOut, TrendingUp, Settings as SettingsIcon, CalendarDays, Plus, Briefcase, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  headerActions?: React.ReactNode;
}

export default function Layout({ children, activeTab, setActiveTab, user, headerActions }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar-collapsed', String(newState));
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full border-r border-white/5 bg-[#0F0F0F] z-20 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-[26px] bg-[#0F0F0F] hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-zinc-100 p-1 rounded-full cursor-pointer z-30 transition-all active:scale-95 shadow-md flex items-center justify-center"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-4 mt-2 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
          <div className={`rounded-2xl bg-white/5 border border-white/5 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center gap-0' : ''}`}>
              <img 
                src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full border border-white/10 shrink-0"
              />
              {!isCollapsed && (
                <div className="overflow-hidden transition-all duration-300">
                  <p className="text-sm font-medium truncate">{user?.displayName || 'Trader'}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className={`mt-4 space-y-2 transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-4'}`}>
          <button
            onClick={() => setActiveTab('add-trade')}
            className={`flex items-center bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl mb-4' 
                : 'w-full gap-3 px-4 py-3 rounded-xl mb-6'
            }`}
            title={isCollapsed ? 'New Trade' : undefined}
          >
            <Plus size={20} className={isCollapsed ? 'stroke-[3]' : ''} />
            {!isCollapsed && <span className="font-medium">New Trade</span>}
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl' 
                : 'w-full gap-3 px-4 py-3 rounded-xl'
            } ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
            title={isCollapsed ? 'Dashboard' : undefined}
          >
            <LayoutDashboard size={20} />
            {!isCollapsed && <span className="font-medium">Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab('opening-positions')}
            className={`flex items-center transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl' 
                : 'w-full gap-3 px-4 py-3 rounded-xl'
            } ${
              activeTab === 'opening-positions' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
            title={isCollapsed ? 'Opening Positions' : undefined}
          >
            <Briefcase size={20} />
            {!isCollapsed && <span className="font-medium">Opening Positions</span>}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl' 
                : 'w-full gap-3 px-4 py-3 rounded-xl'
            } ${
              activeTab === 'history' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
            title={isCollapsed ? 'Trade History' : undefined}
          >
            <History size={20} />
            {!isCollapsed && <span className="font-medium">Trade History</span>}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl' 
                : 'w-full gap-3 px-4 py-3 rounded-xl'
            } ${
              activeTab === 'calendar' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
            title={isCollapsed ? 'Calendar' : undefined}
          >
            <CalendarDays size={20} />
            {!isCollapsed && <span className="font-medium">Calendar</span>}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl' 
                : 'w-full gap-3 px-4 py-3 rounded-xl'
            } ${
              activeTab === 'settings' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <SettingsIcon size={20} />
            {!isCollapsed && <span className="font-medium">Settings</span>}
          </button>

          <button
            onClick={() => setActiveTab('trash')}
            className={`flex items-center transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl' 
                : 'w-full gap-3 px-4 py-3 rounded-xl'
            } ${
              activeTab === 'trash' 
                ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                : 'text-zinc-500 hover:text-red-400 hover:bg-white/5 border border-transparent'
            }`}
            title={isCollapsed ? 'Trash' : undefined}
          >
            <Trash2 size={20} />
            {!isCollapsed && <span className="font-medium">Trash</span>}
          </button>
        </nav>

        <div className={`absolute bottom-8 left-0 w-full transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-4'}`}>
          <button
            onClick={() => signOut(auth)}
            className={`flex items-center text-zinc-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 ${
              isCollapsed 
                ? 'w-12 h-12 justify-center mx-auto rounded-xl' 
                : 'w-full gap-3 px-4 py-3 rounded-xl'
            }`}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'pl-20' : 'pl-64'}`}>
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
          {headerActions ? <div>{headerActions}</div> : <div />}
          <h1 className="text-xl font-semibold capitalize">
            {activeTab === 'calendar' ? 'Trading Calendar' : activeTab.replace('-', ' ')}
          </h1>
        </header>
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
