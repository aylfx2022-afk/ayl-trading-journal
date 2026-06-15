import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { LogOut, Plus, X, Download, Upload, Calendar, Trash2 } from 'lucide-react';
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
    const fetchTags = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'userSettings', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTags(docSnap.data().customTags || []);
        }
      }
    };
    fetchTags();
  }, []);

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
