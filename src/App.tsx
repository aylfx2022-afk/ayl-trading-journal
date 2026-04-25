import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  User
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
import { Trade } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TradeList from './components/TradeList';
import CalendarView from './components/CalendarView';
import Settings from './components/Settings';
import TradeDetails from './components/TradeDetails';
import DayDetails from './components/DayDetails';
import AddTrade from './components/AddTrade';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { TrendingUp, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedDay, setSelectedDay] = useState<Dayjs>(dayjs());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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

  useEffect(() => {
    if (!user) {
      setTrades([]);
      return;
    }

    const q = query(
      collection(db, 'trades'),
      where('userId', '==', user.uid),
      orderBy('closeTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tradeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trade[];
      setTrades(tradeData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    setIsDeletingAll(true);
    
    try {
      const q = query(collection(db, 'trades'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting all trades:", error);
      alert("Failed to delete trades. Please check your permissions.");
    } finally {
      setIsDeletingAll(false);
    }
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

          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 rounded-2xl bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Get Started with Google
          </button>
          
          <p className="mt-6 text-xs text-zinc-600">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
  }

  const headerActions = activeTab === 'history' && trades.length > 0 ? (
    <button 
      onClick={() => setShowDeleteConfirm(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-widest border border-red-500/20 group"
    >
      <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
      Clear All History
    </button>
  ) : (activeTab === 'trade-details' || activeTab === 'add-trade' || activeTab === 'day-details') ? (
    <button 
      onClick={() => setActiveTab(activeTab === 'add-trade' ? 'dashboard' : previousTab)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest border border-white/10 group"
    >
      <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
      Back
    </button>
  ) : null;

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={(tab) => {
        if (tab !== 'trade-details') setPreviousTab(tab);
        setActiveTab(tab);
      }} 
      user={user}
      headerActions={headerActions}
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
          {activeTab === 'opening-positions' && <TradeList trades={trades.filter(t => !t.exitPrice)} onSelectTrade={(trade) => { setSelectedTrade(trade); setActiveTab('trade-details'); }} />}
          {activeTab === 'history' && <TradeList trades={trades.filter(t => t.exitPrice)} onSelectTrade={(trade) => { setSelectedTrade(trade); setActiveTab('trade-details'); }} />}
          {activeTab === 'calendar' && <CalendarView trades={trades} onSelectTrade={(trade) => { setSelectedTrade(trade); setActiveTab('trade-details'); }} onSelectDay={(day) => { setSelectedDay(day); setActiveTab('day-details'); }} />}
          {activeTab === 'day-details' && <DayDetails date={selectedDay} trades={trades} onSelectTrade={(trade) => { setSelectedTrade(trade); setActiveTab('trade-details'); }} onBack={() => setActiveTab('calendar')} />}
          {activeTab === 'add-trade' && <AddTrade onBack={() => setActiveTab('dashboard')} />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'trade-details' && selectedTrade && <TradeDetails trade={selectedTrade} onBack={() => setActiveTab(previousTab)} />}
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
