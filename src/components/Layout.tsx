import React from 'react';
import { LayoutDashboard, History, LogOut, TrendingUp, Settings as SettingsIcon, CalendarDays, Plus, Briefcase, Trash2, ChevronLeft, ChevronRight, UserPlus, X, Repeat, ChevronDown, Image as ImageIcon, PanelLeft, PanelLeftClose, NotebookPen, Sun, Moon } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

import { TradingAccount } from '../types';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  // Multi-account (Trading Profiles)
  tradingAccounts?: TradingAccount[];
  activeAccountId?: string | null;
  onSwitchTradingAccount?: (id: string) => void;
  onDeleteTradingAccount?: (id: string) => void;
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
  tradingAccounts = [],
  activeAccountId,
  onSwitchTradingAccount,
  onDeleteTradingAccount
}: LayoutProps) {
  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Notion-style sidebar state: userPinned determines if sidebar is permanently docked open.
  const [userPinned, setUserPinned] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-pinned');
      if (stored !== null) return stored === 'true';
    }
    return true; // Default pinned open
  });

  // Hover state when sidebar is unpinned
  const [isHovered, setIsHovered] = React.useState(false);

  const [showAccountSwitcher, setShowAccountSwitcher] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState('');
  const [newProfileType, setNewProfileType] = React.useState<'live' | 'backtest'>('live');
  const [isCreatingProfile, setIsCreatingProfile] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [profileToDelete, setProfileToDelete] = React.useState<{ id: string; name: string } | null>(null);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Special pages rule: add-trade & trade-details automatically collapse sidebar.
  // Returning to other pages restores userPinned preference.
  const isSpecialPage = activeTab === 'trade-details' || activeTab === 'add-trade';
  const effectivePinned = !isSpecialPage && userPinned;
  const isVisible = effectivePinned || isHovered;

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const activeAccount = tradingAccounts.find(a => a.id === activeAccountId);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProfileName.trim() || isCreatingProfile) return;

    setIsCreatingProfile(true);
    try {
      const docRef = await addDoc(collection(db, 'tradingAccounts'), {
        name: newProfileName.trim(),
        userId: user.uid,
        type: newProfileType,
        createdAt: serverTimestamp(),
        isDefault: false
      });
      onSwitchTradingAccount?.(docRef.id);
      setNewProfileName('');
      setShowProfileModal(false);
    } catch (error) {
      console.error("Error creating profile:", error);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const togglePin = () => {
    setUserPinned(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar-pinned', String(newState));
      }
      return newState;
    });
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsHovered(false);
  };

  return (
    <div className="min-h-screen bg-[#12161c] text-[#e8ebf2] font-sans selection:bg-[#4d8fe0]/30">
      {/* Invisible Hover Trigger Zone on screen left edge when unpinned */}
      {!effectivePinned && (
        <div 
          onMouseEnter={() => setIsHovered(true)}
          className="fixed left-0 top-0 bottom-0 w-3 z-40 pointer-events-auto"
        />
      )}

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#181d26] z-50 transition-transform duration-300 ease-in-out flex flex-col ${
          isVisible ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full shadow-none pointer-events-none'
        }`}
      >
        {/* Scrollable Containment area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pb-6 scrollbar-none">
          <div className="p-4 mt-2">
            <button
              onClick={() => setShowAccountSwitcher(true)}
              className="w-full text-left rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 p-4 transition-all duration-300 cursor-pointer group relative pr-10"
              title="အကောင့်ပြောင်းရန် / Switch Account"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img 
                    src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full border border-white/10 block"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#4d8fe0] rounded-full border border-[#181d26]" />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-[#7ba8e8] transition-colors">{user?.displayName || 'Trader'}</p>
                  <p className="text-[10px] text-[#8b93a1] truncate">{user?.email}</p>
                </div>
                <Repeat size={14} className="text-[#8b93a1] group-hover:text-[#7ba8e8] shrink-0 transition-all opacity-0 group-hover:opacity-100 group-hover:rotate-180 duration-500" />
              </div>
            </button>
          </div>

          {/* Trading Profile Selector */}
          {user && (
            <div className="px-4 mb-4 relative font-sans" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[9px] font-black uppercase text-[#8b93a1] tracking-widest flex items-center gap-1.5">
                  <Briefcase size={11} className="text-[#4d8fe0]" />
                  Profiles
                </span>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-5 h-5 flex items-center justify-center text-[#8b93a1] hover:text-[#7ba8e8] hover:bg-white/5 rounded-md transition-all cursor-pointer"
                  title="Add New Profile"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Dropdown Trigger */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 shadow-lg transition-all duration-200 cursor-pointer text-zinc-200 focus:outline-none"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full ${activeAccount?.type === 'backtest' ? 'bg-sky-400' : 'bg-[#4d8fe0]'}`} />
                  <span className="truncate max-w-[110px]">{activeAccount?.name || 'Select Profile'}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                    activeAccount?.type === 'backtest' 
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                      : 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20'
                  }`}>
                    {activeAccount?.type === 'backtest' ? 'BT' : 'LIVE'}
                  </span>
                  <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#7ba8e8]' : ''}`} />
                </div>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 3 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-4 right-4 mt-1 bg-[#181d26] border border-white/10 rounded-xl p-1.5 shadow-2xl z-45 max-h-[180px] overflow-y-auto space-y-0.5 backdrop-blur-md"
                  >
                    {tradingAccounts.map(acc => (
                      <div
                        key={acc.id}
                        className={`w-full flex items-center justify-between rounded-xl transition-all ${
                          activeAccountId === acc.id
                            ? 'bg-[#4d8fe0] text-white font-bold shadow-md shadow-[#4d8fe0]/20'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onSwitchTradingAccount?.(acc.id!);
                            setIsDropdownOpen(false);
                          }}
                          className="flex-1 text-left px-3 py-2 text-xs font-semibold truncate cursor-pointer focus:outline-none"
                        >
                          <span className="truncate block max-w-[115px]">{acc.name}</span>
                        </button>
                        <div className="flex items-center gap-1.5 pr-2.5 shrink-0">
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            activeAccountId === acc.id
                              ? 'bg-black/20 text-white' 
                              : acc.type === 'backtest' 
                                ? 'bg-sky-500/10 text-sky-400' 
                                : 'bg-[#1e2733] text-[#7ba8e8]'
                          }`}>
                            {acc.type === 'backtest' ? 'BT' : 'LIVE'}
                          </span>
                          {!acc.isDefault && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileToDelete({ id: acc.id!, name: acc.name });
                              }}
                              className={`p-1 rounded-md transition-colors ${
                                activeAccountId === acc.id
                                  ? 'text-white/70 hover:text-red-200 hover:bg-black/10'
                                  : 'text-zinc-500 hover:text-red-400 hover:bg-white/10'
                              }`}
                              title="Delete Profile"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <nav className="mt-4 space-y-2 px-4">
            <button
              onClick={() => handleTabClick('add-trade')}
              className="flex items-center w-full gap-3 px-4 py-3 rounded-xl mb-6 bg-[#4d8fe0] hover:bg-[#3a6fc4] text-white font-bold transition-all duration-200 cursor-pointer shadow-lg shadow-[#4d8fe0]/20 active:scale-[0.98]"
            >
              <Plus size={20} />
              <span className="font-medium">New Trade</span>
            </button>

            <button
              onClick={() => handleTabClick('dashboard')}
              className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/30 font-semibold' 
                  : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent'
              }`}
            >
              <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-[#4d8fe0]' : ''} />
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick('opening-positions')}
              className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'opening-positions' 
                  ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/30 font-semibold' 
                  : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent'
              }`}
            >
              <Briefcase size={20} className={activeTab === 'opening-positions' ? 'text-[#4d8fe0]' : ''} />
              <span className="font-medium">Opening Positions</span>
            </button>

            <button
              onClick={() => handleTabClick('history')}
              className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'history' 
                  ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/30 font-semibold' 
                  : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent'
              }`}
            >
              <History size={20} className={activeTab === 'history' ? 'text-[#4d8fe0]' : ''} />
              <span className="font-medium">Trade History</span>
            </button>

            <button
              onClick={() => handleTabClick('calendar')}
              className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'calendar' 
                  ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/30 font-semibold' 
                  : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent'
              }`}
            >
              <CalendarDays size={20} className={activeTab === 'calendar' ? 'text-[#4d8fe0]' : ''} />
              <span className="font-medium">Calendar</span>
            </button>

            <button
              onClick={() => handleTabClick('review')}
              className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'review' 
                  ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/30 font-semibold' 
                  : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent'
              }`}
            >
              <NotebookPen size={20} className={activeTab === 'review' ? 'text-[#4d8fe0]' : ''} />
              <span className="font-medium">Review</span>
            </button>

            <button
              onClick={() => handleTabClick('gallery')}
              className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'gallery' 
                  ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/30 font-semibold' 
                  : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent'
              }`}
            >
              <ImageIcon size={20} className={activeTab === 'gallery' ? 'text-[#4d8fe0]' : ''} />
              <span className="font-medium">Chart Gallery</span>
            </button>

            <button
              onClick={() => handleTabClick('settings')}
              className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/30 font-semibold' 
                  : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent'
              }`}
            >
              <SettingsIcon size={20} className={activeTab === 'settings' ? 'text-[#4d8fe0]' : ''} />
              <span className="font-medium">Settings</span>
            </button>
          </nav>
        </div>

        {/* Fixed Bottom Container for Sidebar Controls & Logout */}
        <div className="mt-auto shrink-0 pb-6 pt-[15px] border-t border-white/5 bg-[#181d26] px-4 flex items-center gap-2">
          <button
            onClick={() => signOut(auth)}
            className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#8b93a1] hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 cursor-pointer"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200 cursor-pointer shrink-0 group flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <Sun size={20} className="text-amber-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Moon size={20} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            )}
          </button>

          <button
            onClick={togglePin}
            className="p-2.5 rounded-xl text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200 cursor-pointer shrink-0 group flex items-center justify-center"
            title={userPinned ? 'Unpin Sidebar (Collapse)' : 'Pin Sidebar (Keep Open)'}
          >
            {userPinned ? (
              <PanelLeftClose size={20} className="text-[#8b93a1] group-hover:text-[#7ba8e8] transition-colors" />
            ) : (
              <PanelLeft size={20} className="text-[#4d8fe0] transition-colors" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-300 ease-in-out ${effectivePinned ? 'pl-64' : 'pl-0'}`}>
        <header className="h-14 border-b border-white/5 grid grid-cols-3 items-center px-6 bg-[#12161c]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-start gap-3">
            {headerActions || <div />}
          </div>
          
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-semibold capitalize text-center select-none whitespace-nowrap flex items-center gap-3">
              {activeTab === 'calendar' ? 'Trading Calendar' : activeTab === 'gallery' ? 'Chart Gallery' : activeTab.replace('-', ' ')}
              {activeAccount && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20 px-2.5 py-0.5 rounded-full">
                  {activeAccount.name}
                </span>
              )}
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

      {/* Create Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowProfileModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#181d26] border border-white/10 rounded-3xl p-8 shadow-2xl z-[111]"
            >
              <h3 className="text-xl font-bold mb-2 text-[#e8ebf2]">New Trading Profile</h3>
              <p className="text-[#8b93a1] text-sm mb-6">Create a separate profile for backtesting or live accounts.</p>
              
              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Profile Name</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    placeholder="e.g. Backtesting 2024"
                    className="w-full bg-[#12161c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4d8fe0]/50 text-[#e8ebf2] placeholder-[#8b93a1]/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewProfileType('live')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        newProfileType === 'live' 
                          ? 'bg-[#1e2733] border-[#4d8fe0]/40 text-[#7ba8e8]' 
                          : 'bg-white/5 border-transparent text-[#8b93a1]'
                      }`}
                    >
                      Live / Real
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProfileType('backtest')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        newProfileType === 'backtest' 
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                          : 'bg-white/5 border-transparent text-[#8b93a1]'
                      }`}
                    >
                      Backtesting
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    disabled={isCreatingProfile}
                    type="submit"
                    className="flex-1 py-3 bg-[#4d8fe0] text-white font-bold rounded-xl hover:bg-[#3a6fc4] disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-[#4d8fe0]/20"
                  >
                    {isCreatingProfile ? 'Creating...' : 'Create Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-3 bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] font-bold rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-sm bg-[#181d26] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-[101]"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#e8ebf2] flex items-center gap-2">
                    <Repeat size={16} className="text-[#4d8fe0] animate-pulse" />
                    အကောင့်ပြောင်းရန် / Switch Account
                  </h3>
                  <p className="text-[10px] text-[#8b93a1] mt-0.5">
                    ဝင်ထားပြီးသား အခြားအကောင့်တစ်ခုသို့ တိုက်ရိုက်ပြောင်းရန် ရွေးချယ်ပါ
                  </p>
                </div>
                <button
                  onClick={() => setShowAccountSwitcher(false)}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
                {/* Active Current Account */}
                <div className="p-3 bg-[#1e2733] border border-[#4d8fe0]/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                      alt="Active Avatar"
                      className="w-10 h-10 rounded-full border border-[#4d8fe0]/30 animate-none"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#7ba8e8] tracking-wide truncate">
                        {user?.displayName || 'Trader'}
                      </p>
                      <p className="text-[10px] text-[#8b93a1] truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#7ba8e8] bg-[#1e2733] border border-[#4d8fe0]/30 px-2.5 py-0.5 rounded-full select-none">
                    Active (လက်ရှိ)
                  </span>
                </div>

                {/* Other Saved Accounts */}
                {savedAccounts.filter(acc => acc.email !== user?.email).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-[#8b93a1] tracking-widest px-1 pt-1">
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
                                <p className="text-xs font-bold text-[#e8ebf2] group-hover:text-[#7ba8e8] transition-colors truncate">
                                  {acc.displayName}
                                </p>
                                <p className="text-[10px] text-[#8b93a1] truncate">
                                  {acc.email}
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveSavedAccount?.(acc.email);
                              }}
                              className="p-1.5 text-[#8b93a1] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
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
                    <p className="text-[10px] text-[#8b93a1] italic select-none">
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

      {/* Delete Profile Confirmation Modal */}
      <AnimatePresence>
        {profileToDelete && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => setProfileToDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#181d26] border border-white/10 rounded-3xl p-8 shadow-2xl z-[116]"
            >
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <Trash2 size={24} />
                <h3 className="text-lg font-bold">Delete Trading Profile</h3>
              </div>
              <p className="text-[#8b93a1] text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <span className="text-[#e8ebf2] font-bold">"{profileToDelete.name}"</span>? 
                All trades in this profile will be permanently deleted. This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (onDeleteTradingAccount) {
                      await onDeleteTradingAccount(profileToDelete.id);
                    }
                    setProfileToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setProfileToDelete(null)}
                  className="flex-1 py-3 bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] font-bold rounded-xl hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

