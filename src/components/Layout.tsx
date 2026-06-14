import React from 'react';
import { LayoutDashboard, History, LogOut, TrendingUp, Settings as SettingsIcon, CalendarDays, Plus, Briefcase, Trash2, ChevronLeft, ChevronRight, UserPlus, X, Repeat, ChevronDown } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  headerActions?: React.ReactNode;
  headerRightActions?: React.ReactNode;
  savedAccounts?: any[];
  onSwitchAccount?: (email?: string) => void;
  onRemoveSavedAccount?: (email: string) => void;
  activeAccountId?: string;
  tradingAccounts?: any[];
  onActiveAccountChange?: (id: string) => void;
}

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab, 
  user, 
  headerActions, 
  headerRightActions,
  savedAccounts = [],
  onSwitchAccount,
  onRemoveSavedAccount,
  activeAccountId = 'live',
  tradingAccounts = [],
  onActiveAccountChange
}: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const [showAccountSwitcher, setShowAccountSwitcher] = React.useState(false);

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
          <button
            onClick={() => setShowAccountSwitcher(true)}
            className={`w-full text-left rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300 cursor-pointer group relative ${isCollapsed ? 'p-2' : 'p-4'}`}
            title="အကောင့်ပြောင်းရန် / Switch Account"
          >
            <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center gap-0' : ''}`}>
              <div className="relative shrink-0">
                <img 
                  src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-white/10 block"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#0F0F0F]" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden transition-all duration-300 flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-emerald-400 transition-colors">{user?.displayName || 'Trader'}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                </div>
              )}
              {!isCollapsed && (
                <Repeat size={14} className="text-zinc-500 group-hover:text-emerald-400 shrink-0 transition-all opacity-0 group-hover:opacity-100 group-hover:rotate-185 duration-500" />
              )}
            </div>
          </button>
        </div>

        {/* Trading Account Selector */}
        {!isCollapsed ? (
          <div className="px-4 mb-4 text-left">
            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 px-1">
              Trading Profile (အကောင့်ခွဲ)
            </label>
            <div className="relative">
              <select
                value={activeAccountId}
                onChange={(e) => onActiveAccountChange?.(e.target.value)}
                className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:outline-none appearance-none cursor-pointer pr-8"
              >
                {tradingAccounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-[#121214] text-zinc-300">
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        ) : (
          <div className="px-2 mb-4 flex justify-center">
            <button 
              onClick={() => {
                const nextId = activeAccountId === 'live' ? 'backtesting' : 'live';
                onActiveAccountChange?.(nextId);
              }}
              className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center font-black text-[8px] uppercase cursor-pointer select-none transition-all active:scale-95 duration-200 outline-none ${
                activeAccountId === 'live'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20'
              }`}
              title={`Active: ${activeAccountId === 'live' ? 'Live' : 'Backtest'}. Click to toggle.`}
            >
              <span>{activeAccountId === 'live' ? 'LIVE' : 'BKT'}</span>
            </button>
          </div>
        )}

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
        <header className="h-14 border-b border-white/5 grid grid-cols-3 items-center px-6 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center justify-start">
            {headerActions || <div />}
          </div>
          
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-semibold capitalize text-center select-none whitespace-nowrap">
              {activeTab === 'calendar' ? 'Trading Calendar' : activeTab.replace('-', ' ')}
            </h1>
          </div>
          
          <div className="flex items-center justify-end">
            {headerRightActions || <div />}
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Account Switcher Modal */}
      <AnimatePresence>
        {showAccountSwitcher && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccountSwitcher(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#0E0E10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-[101]"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <Repeat size={16} className="text-emerald-500 animate-pulse" />
                    အကောင့်ပြောင်းရန် / Switch Account
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    ဝင်ထားပြီးသား အခြားအကောင့်တစ်ခုသို့ တိုက်ရိုက်ပြောင်းရန် ရွေးချယ်ပါ
                  </p>
                </div>
                <button
                  onClick={() => setShowAccountSwitcher(false)}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
                {/* Active Current Account */}
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                      alt="Active Avatar"
                      className="w-10 h-10 rounded-full border border-emerald-500/20 animate-none"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-400 tracking-wide truncate">
                        {user?.displayName || 'Trader'}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full select-none">
                    Active (လက်ရှိ)
                  </span>
                </div>

                {/* Other Saved Accounts */}
                {savedAccounts.filter(acc => acc.email !== user?.email).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1 pt-1">
                      အခြားသိမ်းဆည်းထားသောအကောင့်များ (Saved)
                    </p>
                    <div className="space-y-1.5">
                      {savedAccounts
                        .filter(acc => acc.email !== user?.email)
                        .map((acc) => (
                          <div
                            key={acc.email}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/10 group transition-all"
                          >
                            <button
                              onClick={() => {
                                setShowAccountSwitcher(false);
                                onSwitchAccount?.(acc.email);
                              }}
                              className="flex items-center gap-3 text-left flex-1 cursor-pointer min-w-0"
                            >
                              <img
                                src={acc.photoURL}
                                alt={acc.displayName}
                                className="w-8 h-8 rounded-full border border-white/10"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                                  {acc.displayName}
                                </p>
                                <p className="text-[10px] text-zinc-500 truncate">
                                  {acc.email}
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveSavedAccount?.(acc.email);
                              }}
                              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="ဖယ်ရှားရန် / Remove profile"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center border border-dashed border-white/5 bg-white/[0.01] rounded-2xl">
                    <p className="text-[10px] text-zinc-600 italic select-none">
                      အခြားသိမ်းထားသောအကောင့်မရှိသေးပါ
                    </p>
                  </div>
                )}
              </div>

              {/* Add account action */}
              <div className="p-4 bg-white/[0.01] border-t border-white/5 space-y-2">
                <button
                  onClick={() => {
                    setShowAccountSwitcher(false);
                    onSwitchAccount?.();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                >
                  <UserPlus size={14} />
                  အကောင့်အသစ်တစ်ခုထပ်ထည့်ရန် / Add Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
