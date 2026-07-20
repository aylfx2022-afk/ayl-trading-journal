import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { LogOut, Plus, X, Download, Upload, Calendar, Trash2, Cpu, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, where, query, writeBatch, Timestamp } from 'firebase/firestore';
import { Trade } from '../types';
import { getSafeDate } from '../lib/dateUtils';

interface SettingsProps {
  trades?: Trade[];
  journals?: any[];
  activeAccountId: string | null;
}

export default function Settings({ trades = [], journals = [], activeAccountId }: SettingsProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // AI Configuration State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);
  
  // Bulk Delete State
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2020-01-31');
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic filter lists
  const tradesInRange = trades.filter(t => {
    const d = getSafeDate(t.openTime);
    if (!d) return false;
    const tradeTime = d.getTime();
    const start = new Date(startDate + 'T00:00:00').getTime();
    const end = new Date(endDate + 'T23:59:59').getTime();
    return tradeTime >= start && tradeTime <= end;
  });

  const journalsInRange = journals.filter(j => {
    if (!j.dateYMD) return false;
    return j.dateYMD >= startDate && j.dateYMD <= endDate;
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'userSettings', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTags(data.customTags || []);
          setAiProvider(data.aiProvider || 'gemini');
          setGeminiApiKey(data.geminiApiKey || '');
          setOpenRouterApiKey(data.openRouterApiKey || '');
        }
      }
    };
    fetchSettings();
  }, []);

  const handleSaveAISettings = async () => {
    if (!auth.currentUser) return;
    setIsSavingAI(true);
    setAiSaveSuccess(false);
    try {
      await setDoc(
        doc(db, 'userSettings', auth.currentUser.uid),
        {
          aiProvider,
          geminiApiKey,
          openRouterApiKey
        },
        { merge: true }
      );
      setAiSaveSuccess(true);
      setTimeout(() => setAiSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save AI settings:", err);
      alert("Failed to save AI settings.");
    } finally {
      setIsSavingAI(false);
    }
  };

  const saveTags = async (newTags: string[]) => {
    if (auth.currentUser) {
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), { customTags: newTags }, { merge: true });
      setTags(newTags);
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

  const exportTrades = async () => {
    if (!auth.currentUser || !activeAccountId) return;
    const q = query(
      collection(db, 'trades'), 
      where('userId', '==', auth.currentUser.uid),
      where('accountId', '==', activeAccountId)
    );
    const querySnapshot = await getDocs(q);
    const trades = querySnapshot.docs.map(doc => doc.data());
    
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trades_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseToTimestamp = (value: any): Timestamp | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
      return value;
    }
    if (typeof value === 'object') {
      const seconds = value.seconds !== undefined ? value.seconds : value._seconds;
      const nanoseconds = value.nanoseconds !== undefined ? value.nanoseconds : (value._nanoseconds || 0);
      if (seconds !== undefined) {
        return new Timestamp(seconds, nanoseconds);
      }
    }
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const importTrades = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser || !activeAccountId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const tradesData = JSON.parse(e.target?.result as string);
        const tradesArray = Array.isArray(tradesData) ? tradesData : [tradesData];
        const batch = writeBatch(db);
        
        tradesArray.forEach((trade: any) => {
          const cleanTrade: any = { ...trade };
          cleanTrade.userId = auth.currentUser!.uid;
          cleanTrade.accountId = activeAccountId;

          // Convert specific timestamp fields if present
          if (trade.openTime) {
            cleanTrade.openTime = parseToTimestamp(trade.openTime) || Timestamp.now();
          } else {
            cleanTrade.openTime = Timestamp.now();
          }

          if (trade.closeTime !== undefined) {
            cleanTrade.closeTime = parseToTimestamp(trade.closeTime);
          }

          if (trade.createdAt) {
            cleanTrade.createdAt = parseToTimestamp(trade.createdAt) || Timestamp.now();
          } else {
            cleanTrade.createdAt = Timestamp.now();
          }

          if (trade.entryDateTime !== undefined) {
            cleanTrade.entryDateTime = parseToTimestamp(trade.entryDateTime);
          }
          if (trade.exitDateTime !== undefined) {
            cleanTrade.exitDateTime = parseToTimestamp(trade.exitDateTime);
          }

          // Ensure mandatory trade schema fields comply with Firebase Rules
          if (cleanTrade.pair === undefined) cleanTrade.pair = cleanTrade.item || 'N/A';
          if (cleanTrade.type === undefined) cleanTrade.type = trade.type === 'buy' || trade.type === 'sell' ? trade.type : 'buy';
          if (cleanTrade.entryPrice === undefined) cleanTrade.entryPrice = cleanTrade.openPrice !== undefined ? Number(cleanTrade.openPrice) : 1;
          if (cleanTrade.slPrice === undefined) cleanTrade.slPrice = 0;
          if (cleanTrade.tpPrice === undefined) cleanTrade.tpPrice = 0;

          // Remove doc ID field if present inside payload
          delete cleanTrade.id;

          const newTradeRef = doc(collection(db, 'trades'));
          batch.set(newTradeRef, cleanTrade);
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

  const handleBulkDelete = async () => {
    if (!auth.currentUser) return;

    if (tradesInRange.length === 0 && journalsInRange.length === 0) {
      alert("No records found in this date range.");
      return;
    }

    const confirmText = `Are you absolutely sure you want to delete ${tradesInRange.length} trades and ${journalsInRange.length} journal entries between ${startDate} and ${endDate}? This action cannot be undone.`;
    
    if (!window.confirm(confirmText)) return;

    setIsDeleting(true);
    try {
      const deletions: any[] = [];
      tradesInRange.forEach(t => {
        if (t.id) deletions.push(doc(db, 'trades', t.id));
      });
      journalsInRange.forEach(j => {
        if (j.id) deletions.push(doc(db, 'journals', j.id));
      });

      const CHUNK_SIZE = 400;
      for (let i = 0; i < deletions.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = deletions.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(ref => {
          batch.delete(ref);
        });
        
        await batch.commit();
      }

      alert("Successfully deleted specified data range!");
    } catch (error) {
      console.error("Bulk deletion failed:", error);
      alert("Bulk deletion failed! " + (error instanceof Error ? error.message : ""));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 col-span-2">
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

      {/* AI Integrations Configuration Card */}
      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 text-emerald-500">
          <Cpu size={24} />
          <h2 className="text-xl font-bold text-white">AI Chart Analysis (မြန်မာ/English)</h2>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed">
          TradingView screenshot သို့မဟုတ် image URL မှ Long/Short tool ရဲ့ ဈေးနှုန်းများ (Entry, SL, TP) ကို AI အသုံးပြုပြီး Auto-analyze လုပ်ကာ ဖြည့်ပေးမည့် စနစ်ဖြစ်ပါသည်။ သင့်ကိုယ်ပိုင် Gemini သို့မဟုတ် OpenRouter API Key ကို အသုံးပြုနိုင်ပါသည်။
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 font-bold tracking-wider uppercase">Choose AI Provider / AI အမျိုးအစား</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAiProvider('gemini')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  aiProvider === 'gemini'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-[#141414] border-white/10 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span>Google Gemini API</span>
                <span className="text-[10px] font-medium opacity-80">(Recommended / အကြံပြုချက်)</span>
              </button>
              <button
                type="button"
                onClick={() => setAiProvider('openrouter')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  aiProvider === 'openrouter'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-[#141414] border-white/10 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span>OpenRouter API</span>
                <span className="text-[10px] font-medium opacity-80">(Supports multiple models)</span>
              </button>
            </div>
          </div>

          {aiProvider === 'gemini' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-500 font-bold tracking-wider uppercase">Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-emerald-500 hover:underline uppercase tracking-wider"
                >
                  Get Gemini Key ↗
                </a>
              </div>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIStudio မှ ရရှိသော API Key ကို ဖြည့်ပါ..."
                  className="w-full bg-[#141414] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-500 font-bold tracking-wider uppercase">OpenRouter API Key</label>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-emerald-500 hover:underline uppercase tracking-wider"
                >
                  Get OpenRouter Key ↗
                </a>
              </div>
              <div className="relative">
                <input
                  type={showOpenRouterKey ? 'text' : 'password'}
                  value={openRouterApiKey}
                  onChange={(e) => setOpenRouterApiKey(e.target.value)}
                  placeholder="sk-or-v1-... စသည့် OpenRouter API Key ကို ဖြည့်ပါ..."
                  className="w-full bg-[#141414] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  {showOpenRouterKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {aiSaveSuccess ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={14} />
              AI Settings saved!
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleSaveAISettings}
            disabled={isSavingAI}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              isSavingAI
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95'
            }`}
          >
            {isSavingAI ? 'Saving...' : 'Save AI Config'}
          </button>
        </div>
      </div>

      {/* Bulk Delete Section */}
      <div className="bg-[#0F0F0F] border border-red-500/15 rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 text-red-500">
          <Trash2 size={24} />
          <h2 className="text-xl font-bold">Bulk Delete Data by Date Range</h2>
        </div>
        
        <p className="text-sm text-zinc-400">
          Select a date range to permanently delete your trade logs and daily journal logs. 
          Use this to clear old or experimental data.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-bold">START DATE</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-bold">END DATE</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>

        {/* Dynamic Match Count */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-white/5 space-y-3">
          <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Matching Records for Deletion</h4>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Trade logs found:</span>
            <span className={`font-mono font-bold px-3 py-1 rounded-md text-sm ${tradesInRange.length > 0 ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 bg-zinc-800/10'}`}>
              {tradesInRange.length}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Journal entries found:</span>
            <span className={`font-mono font-bold px-3 py-1 rounded-md text-sm ${journalsInRange.length > 0 ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 bg-zinc-800/10'}`}>
              {journalsInRange.length}
            </span>
          </div>
        </div>

        <button
          onClick={handleBulkDelete}
          disabled={isDeleting || (tradesInRange.length === 0 && journalsInRange.length === 0)}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all cursor-pointer ${
            isDeleting || (tradesInRange.length === 0 && journalsInRange.length === 0)
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95'
          }`}
        >
          {isDeleting ? 'Deleting Selected Data...' : 'Delete Selected Range'}
        </button>
      </div>

      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Tag Management</h2>
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newTag} 
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm"
            placeholder="Add new tag..."
          />
          <button onClick={addTag} className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
            <Plus size={20} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs">
              #{tag}
              <button onClick={() => removeTag(tag)}><X size={12} /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Account Settings</h2>
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
