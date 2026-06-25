import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  User,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  writeBatch,
  getDocs,
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Trade, TradingAccount } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TradeList from './components/TradeList';
import CalendarView from './components/CalendarView';
import Settings from './components/Settings';
import TradeDetails from './components/TradeDetails';
import DayDetails from './components/DayDetails';
import AddTrade from './components/AddTrade';
import GalleryView from './components/GalleryView';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { TrendingUp, Trash2, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('trading_journal_saved_accounts');
      try {
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [calendarPanelDate, setCalendarPanelDate] = useState<Dayjs>(dayjs());
  const [previousTab, setPreviousTab] = useState('dashboard');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedDay, setSelectedDay] = useState<Dayjs>(dayjs());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('active_trading_account_id');
    }
    return null;
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [addTradeInitialDate, setAddTradeInitialDate] = useState<Date | undefined>(undefined);

  // Navigation lists for trade-details Previous / Next functionality
  const navTrades = React.useMemo(() => {
    let list: Trade[] = [];
    if (previousTab === 'opening-positions') {
      list = trades.filter(t => !t.exitPrice);
    } else if (previousTab === 'history') {
      list = trades.filter(t => t.exitPrice);
    } else {
      list = trades;
    }

    // Sort chronologically ascending (oldest first, so Next navigates to newer dates)
    return [...list].sort((a, b) => {
      const timeA = a.openTime?.toMillis ? a.openTime.toMillis() : (a.openTime?.seconds ? a.openTime.seconds * 1000 : 0);
      const timeB = b.openTime?.toMillis ? b.openTime.toMillis() : (b.openTime?.seconds ? b.openTime.seconds * 1000 : 0);
      return timeA - timeB;
    });
  }, [trades, previousTab]);

  const currentTradeIndex = selectedTrade ? navTrades.findIndex(t => t.id === selectedTrade.id) : -1;
  const totalNavTrades = navTrades.length;
  const hasPrev = currentTradeIndex > 0;
  const hasNext = currentTradeIndex !== -1 && currentTradeIndex < totalNavTrades - 1;

  const handlePrevTrade = () => {
    if (hasPrev) {
      setSelectedTrade(navTrades[currentTradeIndex - 1]);
    }
  };

  const handleNextTrade = () => {
    if (hasNext) {
      setSelectedTrade(navTrades[currentTradeIndex + 1]);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Initialize user profile if it doesn't exist
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'user',
              createdAt: serverTimestamp()
            });
          }
        } catch (error: any) {
          if (!error.message?.includes('offline')) {
            console.error("Error initializing user profile:", error);
          }
        }

        unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data());
          }
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Trading Accounts Listener
  useEffect(() => {
    if (!user) {
      setTradingAccounts([]);
      return;
    }

    const q = query(
      collection(db, 'tradingAccounts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TradingAccount[];
      
      setTradingAccounts(accounts);

      // If no accounts exist, create a default one
      if (accounts.length === 0 && !loading) {
        try {
          const newAccountRef = doc(collection(db, 'tradingAccounts'));
          const defaultAccount: TradingAccount = {
            name: 'Default Account',
            userId: user.uid,
            type: 'live',
            createdAt: serverTimestamp() as any,
            isDefault: true
          };
          await setDoc(newAccountRef, defaultAccount);
          setActiveAccountId(newAccountRef.id);
          localStorage.setItem('active_trading_account_id', newAccountRef.id);

          // Migration: Link existing trades with no accountId to this default account
          const legacyQuery = query(
            collection(db, 'trades'),
            where('userId', '==', user.uid)
          );
          const legacySnapshot = await getDocs(legacyQuery);
          const migrationBatch = writeBatch(db);
          let hasMigration = false;
          legacySnapshot.docs.forEach(docSnap => {
            if (!docSnap.data().accountId) {
              migrationBatch.update(docSnap.ref, { accountId: newAccountRef.id });
              hasMigration = true;
            }
          });
          if (hasMigration) {
            await migrationBatch.commit();
          }
        } catch (error) {
          console.error("Error creating default account:", error);
        }
      } else if (accounts.length > 0) {
        // If current active ID is not in accounts, reset to first account
        if (!activeAccountId || !accounts.find(a => a.id === activeAccountId)) {
          const firstAccount = accounts[0].id || null;
          setActiveAccountId(firstAccount);
          if (firstAccount) localStorage.setItem('active_trading_account_id', firstAccount);
        }
      }
    }, (error) => {
      console.error("Snapshot error:", error);
    });
  }, [user, loading]);

  useEffect(() => {
    if (!user || !activeAccountId) {
      setTrades([]);
      return;
    }

    const q = query(
      collection(db, 'trades'),
      where('userId', '==', user.uid),
      where('accountId', '==', activeAccountId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tradeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trade[];

      // Sort client-side by closeTime desc to avoid composite index requirements
      tradeData.sort((a, b) => {
        const getMillis = (timeVal: any): number => {
          if (!timeVal) return 0;
          if (typeof timeVal.toMillis === 'function') return timeVal.toMillis();
          if (typeof timeVal.toDate === 'function') return timeVal.toDate().getTime();
          if (timeVal.seconds !== undefined) return timeVal.seconds * 1000;
          if (timeVal instanceof Date) return timeVal.getTime();
          const d = new Date(timeVal);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };

        return getMillis(b.closeTime) - getMillis(a.closeTime);
      });

      setTrades(tradeData);
    }, (error) => {
      console.error("Trades snapshot listener error:", error);
    });

    return () => unsubscribe();
  }, [user, activeAccountId]);

  useEffect(() => {
    if (!user) {
      setJournals([]);
      return;
    }

    const q = query(
      collection(db, 'journals'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const journalData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJournals(journalData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user) {
      setSavedAccounts(prev => {
        let updated = prev.filter(acc => acc.uid !== user.uid && acc.email !== user.email);
        updated.unshift({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Trader',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          lastActive: Date.now()
        });
        updated = updated.slice(0, 5); // Limit to max 5 accounts
        localStorage.setItem('trading_journal_saved_accounts', JSON.stringify(updated));
        return updated;
      });
    }
  }, [user]);

  const handleRemoveSavedAccount = (email: string) => {
    setSavedAccounts(prev => {
      const updated = prev.filter(acc => acc.email !== email);
      localStorage.setItem('trading_journal_saved_accounts', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLoginWithHint = async (emailHint?: string) => {
    const provider = new GoogleAuthProvider();
    const params: any = { prompt: 'select_account' };
    if (emailHint) {
      params.login_hint = emailHint;
    }
    provider.setCustomParameters(params);
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed with hint", error);
    }
  };

  const handleSwitchAccount = async (emailHint?: string) => {
    setLoading(true);
    try {
      await signOut(auth);
      await handleLoginWithHint(emailHint);
    } catch (error) {
      console.error("Error switching account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!user || !activeAccountId) return;
    setIsDeletingAll(true);
    
    try {
      const q = query(
        collection(db, 'trades'), 
        where('userId', '==', user.uid),
        where('accountId', '==', activeAccountId)
      );
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting all trades:", error);
      alert("Failed to delete all trades. Please check your permissions.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const navigateTo = (tab: string) => {
    if (activeTab !== 'trade-details') {
      setPreviousTab(activeTab);
    }
    if (tab !== 'add-trade') {
      setAddTradeInitialDate(undefined);
    }
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center relative z-10"
        >
          <div className="w-20 h-20 rounded-3xl bg-emerald-500 mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-8">
            <TrendingUp className="text-black w-10 h-10" />
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight mb-4">Trading Journal</h1>
          <p className="text-zinc-500 text-lg mb-12">
            သင့်ရဲ့ Trading ခရီးလမ်းကို ပိုမိုကောင်းမွန်စေမယ့် အဆင့်မြင့် Trading Journal။
          </p>

          {savedAccounts.length > 0 ? (
            <div className="space-y-4 mb-8">
              <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 text-left">
                <p className="text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest px-1">
                  ယခင်ဝင်ထားသော အကောင့်များ (Saved Accounts)
                </p>
                <div className="space-y-1.5">
                  {savedAccounts.map((acc) => (
                    <div 
                      key={acc.email} 
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 group transition-all"
                    >
                      <button
                        onClick={() => handleLoginWithHint(acc.email)}
                        className="flex items-center gap-3 text-left flex-1 cursor-pointer min-w-0"
                      >
                        <img 
                          src={acc.photoURL} 
                          alt={acc.displayName} 
                          className="w-9 h-9 rounded-full border border-white/10 bg-zinc-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
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
                          handleRemoveSavedAccount(acc.email);
                        }}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="ဖယ်ရှားရန် / Remove account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleLogin}
                className="w-full py-4 px-6 rounded-2xl bg-white text-black font-bold text-base hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                အကောင့်အသစ်ဖြင့်ဝင်မည် / Use another account
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full py-4 px-6 rounded-2xl bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Get Started with Google
            </button>
          )}
          
          <p className="mt-6 text-xs text-zinc-600">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
  }

  const headerActions = activeTab === 'add-trade' ? (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setActiveTab('dashboard')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest border border-white/10 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back
      </button>
      <button 
        type="submit"
        form="add-trade-form"
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-all text-xs font-bold uppercase tracking-widest group"
      >
        <TrendingUp size={16} className="group-hover:scale-110 transition-transform" />
        Save Trade
      </button>
    </div>
  ) : activeTab === 'day-details' ? (
    <button 
      onClick={() => navigateTo('calendar')}
      className="flex items-center justify-center gap-2 h-[32px] w-[221.016px] rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-[12px] font-bold uppercase tracking-widest border border-white/10 group text-center"
    >
      <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
      Back to Calendar
    </button>
  ) : activeTab === 'trade-details' ? (
    <button 
      onClick={() => {
        if (previousTab === 'day-details' || previousTab === 'calendar') {
          navigateTo(previousTab);
        } else {
          setActiveTab(previousTab);
        }
      }}
      className="flex items-center justify-center gap-2 h-[32px] w-[221.016px] rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-[12px] font-bold uppercase tracking-widest border border-white/10 group cursor-pointer text-center"
    >
      <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
      Back
    </button>
  ) : null;

  const headerRightActions = activeTab === 'trade-details' && totalNavTrades > 1 ? (
    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden divide-x divide-white/10 h-8 self-center">
      <button
        onClick={handlePrevTrade}
        disabled={!hasPrev}
        className="flex items-center gap-1 px-3 h-full text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-300 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:cursor-not-allowed group"
        title="Previous Trade"
      >
        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Prev
      </button>
      
      <span className="px-3 h-full flex items-center text-[10px] font-mono text-zinc-500 font-bold bg-white/[0.01]">
        {currentTradeIndex + 1} / {totalNavTrades}
      </span>

      <button
        onClick={handleNextTrade}
        disabled={!hasNext}
        className="flex items-center gap-1 px-3 h-full text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-300 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:cursor-not-allowed group"
        title="Next Trade"
      >
        Next
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  ) : null;

  const defaultAccount = tradingAccounts.find(a => a.isDefault);
  const filteredJournals = journals.filter(j => {
    if (j.accountId) {
      return j.accountId === activeAccountId;
    }
    return defaultAccount && activeAccountId === defaultAccount.id;
  });

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={navigateTo} 
      user={user}
      headerActions={headerActions}
      headerRightActions={headerRightActions}
      savedAccounts={savedAccounts}
      onSwitchAccount={handleSwitchAccount}
      onRemoveSavedAccount={handleRemoveSavedAccount}
      // New props for multi-account
      tradingAccounts={tradingAccounts}
      activeAccountId={activeAccountId}
      onSwitchTradingAccount={(id) => {
        setActiveAccountId(id);
        localStorage.setItem('active_trading_account_id', id);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <Dashboard trades={trades} />}
          {activeTab === 'opening-positions' && <TradeList trades={trades.filter(t => !t.exitPrice)} onSelectTrade={(trade) => { setSelectedTrade(trade); navigateTo('trade-details'); }} />}
          {activeTab === 'history' && (
            <TradeList 
              trades={trades.filter(t => t.exitPrice)} 
              onSelectTrade={(trade) => { setSelectedTrade(trade); navigateTo('trade-details'); }} 
              onClearHistory={() => setShowDeleteConfirm(true)} 
            />
          )}
          {activeTab === 'calendar' && <CalendarView trades={trades} onSelectTrade={(trade) => { setSelectedTrade(trade); navigateTo('trade-details'); }} onSelectDay={(day) => { setSelectedDay(day); navigateTo('day-details'); }} panelDate={calendarPanelDate} setPanelDate={setCalendarPanelDate} journals={filteredJournals} />}
          {activeTab === 'day-details' && (
            <DayDetails 
              date={selectedDay} 
              trades={trades} 
              onSelectTrade={(trade) => { setSelectedTrade(trade); navigateTo('trade-details'); }} 
              onBack={() => navigateTo('calendar')} 
              onAddTrade={() => {
                setAddTradeInitialDate(selectedDay.toDate());
                navigateTo('add-trade');
              }}
              journals={filteredJournals}
              activeAccountId={activeAccountId}
              activeAccountIsDefault={!!defaultAccount && activeAccountId === defaultAccount.id}
            />
          )}
          {activeTab === 'add-trade' && (
            <AddTrade 
              onBack={() => {
                if (previousTab === 'day-details') {
                  navigateTo('day-details');
                } else {
                  navigateTo('dashboard');
                }
              }} 
              initialDate={addTradeInitialDate}
              activeAccountId={activeAccountId}
            />
          )}
          {activeTab === 'settings' && <Settings trades={trades} journals={filteredJournals} activeAccountId={activeAccountId} />}
          {activeTab === 'gallery' && (
            <GalleryView 
              trades={trades} 
              onSelectTrade={(trade) => { setSelectedTrade(trade); navigateTo('trade-details'); }} 
              onAddTrade={() => navigateTo('add-trade')}
            />
          )}
          {activeTab === 'trade-details' && selectedTrade && (
            <TradeDetails 
              key={selectedTrade.id}
              trade={selectedTrade} 
              onBack={() => {
                // If previous tab was calendar, user probably came from calendar or day-details
                if (previousTab === 'day-details' || previousTab === 'calendar') {
                  navigateTo(previousTab);
                } else {
                  setActiveTab(previousTab);
                }
              }} 
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="text-red-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Clear All History?</h3>
              <p className="text-zinc-500 text-center text-sm mb-8">
                This action cannot be undone. All your trading history will be permanently deleted.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleClearAll}
                  disabled={isDeletingAll}
                  className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingAll ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Yes, Delete Everything'
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeletingAll}
                  className="w-full py-3 rounded-xl bg-white/5 text-zinc-300 font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
