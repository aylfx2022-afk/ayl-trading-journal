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
  orderBy
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Trade } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TradeList from './components/TradeList';
import TradeUpload from './components/TradeUpload';
import Settings from './components/Settings';
import TradeDetails from './components/TradeDetails';
import DailyJournal from './components/DailyJournal';
import { getTradeInsights } from './services/geminiService';
import { TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [insights, setInsights] = useState<string>('Analyzing your trading performance...');

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
        } catch (error) {
          console.error("Error initializing user profile:", error);
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

  useEffect(() => {
    if (trades.length > 0) {
      const fetchInsights = async () => {
        const text = await getTradeInsights(trades, userProfile?.geminiApiKey);
        setInsights(text);
      };
      fetchInsights();
    } else {
      setInsights('Import your trading history to get AI-powered insights.');
    }
  }, [trades.length, userProfile?.geminiApiKey]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
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
          
          <h1 className="text-5xl font-bold tracking-tight mb-4">AYL Trading Journal</h1>
          <p className="text-zinc-500 text-lg mb-12">
            The modern trading journal. Automated logging with AI parsing for MT4/5 history.
          </p>

          <div className="space-y-4 mb-12">
            <FeatureItem icon={<Zap className="text-emerald-500" />} text="Instant MT4/5 HTML parsing" />
            <FeatureItem icon={<ShieldCheck className="text-emerald-500" />} text="Secure cloud storage" />
            <FeatureItem icon={<TrendingUp className="text-emerald-500" />} text="AI-powered performance insights" />
          </div>

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

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <Dashboard trades={trades} insights={insights} />}
          {activeTab === 'history' && <TradeList trades={trades} onSelectTrade={(trade) => { setSelectedTrade(trade); setActiveTab('trade-details'); }} />}
          {activeTab === 'daily-journal' && <DailyJournal user={user} />}
          {activeTab === 'upload' && <TradeUpload geminiApiKey={userProfile?.geminiApiKey} />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'trade-details' && selectedTrade && <TradeDetails trade={selectedTrade} onBack={() => setActiveTab('history')} />}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 text-zinc-400 justify-center">
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
