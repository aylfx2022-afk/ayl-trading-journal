import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { LogOut, Plus, X, Download, Upload, Briefcase, Trash2, ShieldAlert } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, where, query, writeBatch } from 'firebase/firestore';
import { TradingAccount } from '../types';

export default function Settings() {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Trading accounts state
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'live' | 'backtesting' | 'other'>('live');
  const [newAccountDesc, setNewAccountDesc] = useState('');
  const [loading, setLoading] = useState(true);

  const defaultAccounts: TradingAccount[] = [
    { id: 'live', name: 'Live Account', type: 'live', description: 'ပြည့်စုံသော Live Trading မှတ်တမ်း' },
    { id: 'backtesting', name: 'Backtesting Account', type: 'backtesting', description: 'လေ့ကျင့်မှုနှင့် နည်းဗျူဟာစမ်းသပ်မှု မှတ်တမ်း' }
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      if (auth.currentUser) {
        setLoading(true);
        try {
          const docRef = doc(db, 'userSettings', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTags(data.customTags || []);
            setTradingAccounts(data.tradingAccounts || defaultAccounts);
          } else {
            setTradingAccounts(defaultAccounts);
          }
        } catch (e) {
          console.error("Error reading user settings:", e);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchSettings();
  }, []);

  const saveTags = async (newTags: string[]) => {
    if (auth.currentUser) {
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), { customTags: newTags }, { merge: true });
      setTags(newTags);
    }
  };

  const saveAccounts = async (newAccounts: TradingAccount[]) => {
    if (auth.currentUser) {
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), { tradingAccounts: newAccounts }, { merge: true });
      setTradingAccounts(newAccounts);
    }
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      saveTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    saveTags(tags.filter(t => t !== tag));
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;
    const newAcc: TradingAccount = {
      id: 'acc_' + Date.now(),
      name: newAccountName.trim(),
      type: newAccountType,
      description: newAccountDesc.trim(),
    };
    const updated = [...tradingAccounts, newAcc];
    await saveAccounts(updated);
    setNewAccountName('');
    setNewAccountDesc('');
  };

  const handleRemoveAccount = async (id: string) => {
    if (id === 'live' || id === 'backtesting') {
      alert("လက်ရှိ ပင်မအကောင့်များကို ဖျက်၍မရပါ / Standard live and backtesting accounts cannot be deleted.");
      return;
    }
    
    const activeId = localStorage.getItem('trading_journal_active_account_id') || 'live';
    if (activeId === id) {
      alert("ဤအကောင့်မှာ လက်ရှိအသုံးပြုနေသော အကောင့်ဖြစ်နေသဖြင့် ဖျက်၍မရပါ၊ ပထမဦးစွာ အခြားအကောင့်တစ်ခုသို့ ပြောင်းလဲပေးပါ / This account is currently active. Switch to another account first.");
      return;
    }

    if (window.confirm("ဤ Trading Account Profile ကိုဖျက်ရန် သေချာပါသလား? သင့်ရဲ့ trade မှတ်တမ်းများ ပျက်သွားမည်မဟုတ်သော်လည်း access လုပ်ရခက်သွားနိုင်ပါသည်။ / Are you sure you want to delete this trading profile? This will not delete actual trades but you won't be able to switch to this account.")) {
      const updated = tradingAccounts.filter(acc => acc.id !== id);
      await saveAccounts(updated);
    }
  };

  const exportTrades = async () => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'trades'), where('userId', '==', auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    const trades = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trades_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTrades = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const trades = JSON.parse(e.target?.result as string);
        const batch = writeBatch(db);
        
        trades.forEach((trade: any) => {
          const newTradeRef = doc(collection(db, 'trades'));
          batch.set(newTradeRef, {
            ...trade,
            userId: auth.currentUser!.uid,
            accountId: trade.accountId || 'live'
          });
        });
        
        await batch.commit();
        alert('Trades imported successfully!');
      } catch (error) {
        console.error('Error importing trades:', error);
        alert('Failed to import trades. Please ensure the file is a valid JSON export.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Trading Accounts/Profiles section */}
      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 text-left">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Briefcase className="text-emerald-500" size={20} />
          Trading Accounts (အကောင့်များ)
        </h2>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          သင်၏ Live Trading Records နှင့် Backtesting Records များကို တစ်ခုနှင့်တစ်ခု မရောထွေးစေရန် အကောင့်သီးသန့်ခွဲ၍ မှတ်တမ်းတင်နိုင်ပါသည်။
        </p>

        {loading ? (
          <div className="py-4 text-center">
            <span className="text-sm text-zinc-500 italic">လုပ်ဆောင်နေပါသည်...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Account list */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {tradingAccounts.map((acc) => (
                <div 
                  key={acc.id} 
                  className="flex items-center justify-between p-3.5 bg-zinc-900/60 border border-white/5 rounded-2xl group hover:border-white/10 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100">{acc.name}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        acc.type === 'live' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : acc.type === 'backtesting'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {acc.type}
                      </span>
                    </div>
                    {acc.description && (
                      <p className="text-[11px] text-zinc-500 mt-0.5 description-text mb-0 leading-relaxed truncate max-w-md">
                        {acc.description}
                      </p>
                    )}
                  </div>

                  {acc.id !== 'live' && acc.id !== 'backtesting' && (
                    <button
                      onClick={() => handleRemoveAccount(acc.id)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                      title="ဖျက်ရန်"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add new account form */}
            <div className="bg-zinc-900/30 border border-dashed border-white/10 rounded-2xl p-5 space-y-3.5 mt-4">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                အကောင့်အသစ်ထည့်ရန် / Add New Account
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">အကောင့်အမည် / Name</label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="ဥပမာ - Prop Fund / FTMO"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">အမျိုးအစား / Account Type</label>
                  <select
                    value={newAccountType}
                    onChange={(e: any) => setNewAccountType(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-500 text-zinc-300"
                  >
                    <option value="live">Live Trading (တကယ့်အကောင့်)</option>
                    <option value="backtesting">Backtesting (နည်းဗျူဟာစမ်းသပ်မှု)</option>
                    <option value="other">Other (အခြား)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">အတိုချုံးဖော်ပြချက် (Optional)</label>
                <input
                  type="text"
                  value={newAccountDesc}
                  onChange={(e) => setNewAccountDesc(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="ဥပမာ - 100K Strategy Backtest or Personal Live Acc"
                />
              </div>

              <button
                type="button"
                onClick={handleAddAccount}
                disabled={!newAccountName.trim()}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all self-end disabled:opacity-30 disabled:hover:bg-white cursor-pointer active:scale-95"
              >
                <Plus size={14} />
                Create Account Profile
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 text-left">
        <h2 className="text-xl font-bold mb-4">Data Management</h2>
        <div className="flex gap-4">
          <button 
            onClick={exportTrades}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
          >
            <Download size={18} />
            Export Trades
          </button>
          <label className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500/10 text-blue-500 font-bold hover:bg-blue-500/20 transition-all cursor-pointer">
            <Upload size={18} />
            Import Trades
            <input type="file" accept=".json" onChange={importTrades} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 text-left">
        <h2 className="text-xl font-bold mb-4">Tag Management</h2>
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newTag} 
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
            placeholder="Add new tag..."
          />
          <button onClick={addTag} className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl cursor-pointer">
            <Plus size={20} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs">
              #{tag}
              <button onClick={() => removeTag(tag)} className="cursor-pointer hover:text-red-400 ml-1"><X size={12} /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 text-left">
        <h2 className="text-xl font-bold mb-4">Account Settings</h2>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all cursor-pointer"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
