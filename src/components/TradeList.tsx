import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trade } from '../types';
import { format } from 'date-fns';
import { Trash2, Search, MessageSquare, ChevronUp, ChevronDown, Edit3, Calendar as CalendarIcon, X, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getSafeDate } from '../lib/dateUtils';

import DateRangePicker from './ui/DateRangePicker';

interface TradeListProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  isTrash?: boolean;
  onClearHistory?: () => void;
}

type SortField = 'date' | 'pair' | 'rr' | 'type' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const MENTAL_STATES: Record<string, { label: string; tooltip: string; bg: string; text: string; border: string }> = {
  neutral: { label: 'Neutral 😐', tooltip: 'Neutral 😐 (သာမန်/ပုံမှန်)', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/10' },
  focused: { label: 'Focused 🎯', tooltip: 'Focused 🎯 (အာရုံစူးစိုက်မှုရှိသော)', bg: 'bg-emerald-500/10', text: 'text-emerald-400/90', border: 'border-emerald-500/15' },
  calm: { label: 'Calm 🧘', tooltip: 'Calm 🧘 (တည်ငြိမ်ခြင်း)', bg: 'bg-teal-500/10', text: 'text-teal-400/90', border: 'border-teal-500/15' },
  disciplined: { label: 'Disciplined 📜', tooltip: 'Disciplined 📜 (စည်းကမ်းစနစ်ကျသော)', bg: 'bg-cyan-500/10', text: 'text-cyan-400/90', border: 'border-cyan-500/15' },
  fomo: { label: 'FOMO 🚀', tooltip: 'FOMO 🚀 (အခွင့်အရေးလွတ်သွားမည်စိုးရိမ်ခြင်း)', bg: 'bg-purple-500/10', text: 'text-purple-400/90', border: 'border-purple-500/15' },
  revenge: { label: 'Revenge Trade 😡', tooltip: 'Revenge Trade 😡 (ရှုံးမဲမဲ၍ ပြန်လိုက်ဆော့ခြင်း)', bg: 'bg-red-500/10', text: 'text-red-400/90', border: 'border-red-500/15' },
  overconfident: { label: 'Overconfident 😎', tooltip: 'Overconfident 😎 (ယုံကြည်မှုလွန်ကဲခြင်း)', bg: 'bg-indigo-500/10', text: 'text-indigo-400/90', border: 'border-indigo-500/15' },
  anxious: { label: 'Anxious 😟', tooltip: 'Anxious 😟 (စိုးရိမ်ပူပန်သော)', bg: 'bg-orange-500/10', text: 'text-orange-400/90', border: 'border-orange-500/15' },
  greedy: { label: 'Greedy 🤑', tooltip: 'Greedy 🤑 (လောဘဇောတက်ကြွသော)', bg: 'bg-yellow-500/10', text: 'text-yellow-400/90', border: 'border-yellow-500/15' },
  impatient: { label: 'Impatient ⏳', tooltip: 'Impatient ⏳ (စိတ်မရှည်စောဒကတက်သော)', bg: 'bg-amber-500/10', text: 'text-amber-400/90', border: 'border-amber-500/15' },
  hesitant: { label: 'Hesitant 😨', tooltip: 'Hesitant 😨 (တွေဝေတုံ့ဆိုင်းသော)', bg: 'bg-pink-500/10', text: 'text-pink-400/90', border: 'border-pink-500/15' },
  excited: { label: 'Excited ⚡', tooltip: 'Excited ⚡ (စိတ်လှုပ်ရှားတက်ကြွသော)', bg: 'bg-violet-500/10', text: 'text-violet-400/90', border: 'border-violet-500/15' },
  frustrated: { label: 'Frustrated 😫', tooltip: 'Frustrated 😫 (စိတ်တို/စိတ်ပျက်အားလျော့သော)', bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400/90', border: 'border-fuchsia-500/15' },
  bored: { label: 'Bored 🥱', tooltip: 'Bored 🥱 (ပျင်းရိငြီးငွေ့သော)', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/15' },
};

const PHYSICAL_STATES: Record<string, { label: string; tooltip: string; bg: string; text: string; border: string }> = {
  energetic: { label: 'Energetic ⚡', tooltip: 'Energetic ⚡ (အင်အားပြည့်ဝသော)', bg: 'bg-amber-500/10', text: 'text-amber-400/90', border: 'border-amber-500/15' },
  neutral: { label: 'Neutral 😐', tooltip: 'Neutral 😐 (ပုံမှန်/အလယ်အလတ်)', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/10' },
  tired: { label: 'Tired 😴', tooltip: 'Tired 😴 (နုံးခွေပင်ပန်းသော)', bg: 'bg-orange-500/10', text: 'text-orange-400/90', border: 'border-orange-500/15' },
  sick: { label: 'Sick 🤒', tooltip: 'Sick 🤒 (နေမကောင်းဖြစ်သော)', bg: 'bg-red-500/10', text: 'text-red-400/90', border: 'border-red-500/15' },
  sleepy: { label: 'Sleepy 💤', tooltip: 'Sleepy 💤 (အိပ်ငိုက်သော)', bg: 'bg-blue-500/10', text: 'text-blue-400/90', border: 'border-blue-500/15' },
};

const PRE_TRADE_EMOTIONS: Record<string, { label: string; tooltip: string; bg: string; text: string; border: string }> = {
  calm: { label: '🧘 Calm', tooltip: 'Calm / တည်ငြိမ်မှုရှိ', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/15' },
  excited: { label: '⚡ Excited', tooltip: 'Excited / စိတ်လှုပ်ရှားနေ', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/15' },
  confident: { label: '💪 Confident', tooltip: 'Confident / ယုံကြည်မှုရှိ', bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/15' },
  hesitant: { label: '😟 Hesitant', tooltip: 'Hesitant / တွန့်ဆုတ်နေ', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/15' },
  fomo: { label: '🚀 FOMO', tooltip: 'FOMO / နောက်ကျကျန်စိုးရိမ်', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/15' },
  impatient: { label: '⏳ Impatient', tooltip: 'Impatient / စိတ်မရှည်ဖြစ်နေ', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/15' },
  bored: { label: '🥱 Bored', tooltip: 'Bored / ပျင်းရိနေ', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/15' }
};

const DURING_TRADE_EMOTIONS: Record<string, { label: string; tooltip: string; bg: string; text: string; border: string }> = {
  peaceful: { label: '🕊️ Peaceful', tooltip: 'Peaceful / စိတ်အေးချမ်း', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/15' },
  anxious: { label: '😰 Anxious', tooltip: 'Anxious / စိုးရိမ်ပူပန်', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/15' },
  relaxed: { label: '🍹 Relaxed', tooltip: 'Relaxed / စိတ်ပေါ့ပါး', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/15' },
  obsessive: { label: '👁️ Obsessive', tooltip: 'Obsessive Screen watching / စခရင်အမြဲကြည့်နေ', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/15' },
  fearing_loss: { label: '📉 Fear Loss', tooltip: 'Fearing Loss / ရှုံးမှာကြောက်နေ', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/15' },
  greed_surge: { label: '🤑 Greed Surge', tooltip: 'Greed Surge / ပိုလိုချင်စိတ်စွတ်', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/15' },
  confident: { label: '🛡️ Confident', tooltip: 'Confident / ယုံကြည်မှုအတိုင်း', bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/15' }
};

const POST_TRADE_EMOTIONS: Record<string, { label: string; tooltip: string; bg: string; text: string; border: string }> = {
  satisfied_disciplined: { label: '🏆 Disciplined', tooltip: 'Satisfied & Disciplined / စည်းကမ်းလိုက်နာခဲ့၍ကျေနပ်', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/15' },
  satisfied_lucky: { label: '🍀 Lucky Win', tooltip: 'Satisfied but Lucky / ကံကောင်း၍ကျေနပ်', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/15' },
  relieved: { label: '😌 Relieved', tooltip: 'Relieved / သက်ပြင်းချနိုင်ခဲ့', bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/15' },
  frustrated: { label: '😫 Frustrated', tooltip: 'Frustrated / စိတ်ပျက်ဒေါသထွက်', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/15' },
  regretful_sl: { label: '🤦 Regret SL', tooltip: 'Regretful SL / ရှုံး၍နောင်တရ', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/15' },
  regretful_early_exit: { label: '😢 Early Exit', tooltip: 'Regretful Early Exit / စောထွက်မိ၍နောင်တရ', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/15' },
  neutral_accepting: { label: '🤝 Neutral', tooltip: 'Neutral & Accepting / ရလဒ်ကိုသာမန်အတိုင်းလက်ခံ', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/15' }
};

export default function TradeList({ trades, onSelectTrade, isTrash, onClearHistory }: TradeListProps) {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const [selectedNote, setSelectedNote] = useState<{ note: string, pair: string } | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'buy' | 'sell'>('all');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [sortConfig, setSortConfig] = React.useState<{ field: SortField, order: SortOrder }>({ field: 'createdAt', order: 'desc' });
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 20;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, startDate, endDate, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleDeleteTrade = async (e: React.MouseEvent, tradeId: string) => {
    e.stopPropagation();
    setConfirmModal({
       isOpen: true,
       message: 'Are you sure you want to permanently delete this trade?',
       onConfirm: async () => {
         setConfirmModal(prev => ({ ...prev, isOpen: false }));
         try {
           await deleteDoc(doc(db, 'trades', tradeId));
         } catch (error) {
           console.error("Error permanently deleting trade:", error);
           handleFirestoreError(error, OperationType.DELETE, 'trades/' + tradeId);
         }
       }
    });
  };

  const filteredTrades = React.useMemo(() => {
    return trades.filter(t => {
      const pair = t.pair || t.item || '';
      const tagsStr = (t.tags || []).join(' ');
      const matchesSearch = pair.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           tagsStr.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      
      const tradeDate = getSafeDate(t.openTime) || getSafeDate(t.createdAt) || new Date();
      
      const matchesStartDate = !startDate || tradeDate >= startDate;
      
      let matchesEndDate = true;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        matchesEndDate = tradeDate <= endOfDay;
      }
      
      return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case 'createdAt':
          const createA = getSafeDate(a.createdAt)?.getTime() || 0;
          const createB = getSafeDate(b.createdAt)?.getTime() || 0;
          if (createA !== createB) {
            comparison = createA - createB;
          } else {
            const timeA = getSafeDate(a.openTime)?.getTime() || 0;
            const timeB = getSafeDate(b.openTime)?.getTime() || 0;
            comparison = timeA - timeB;
          }
          break;
        case 'date':
          const timeA = getSafeDate(a.openTime)?.getTime() || 0;
          const timeB = getSafeDate(b.openTime)?.getTime() || 0;
          if (timeA !== timeB) {
            comparison = timeA - timeB;
          } else {
            const createA_f = getSafeDate(a.createdAt)?.getTime() || 0;
            const createB_f = getSafeDate(b.createdAt)?.getTime() || 0;
            if (createA_f !== createB_f) {
              comparison = createA_f - createB_f;
            } else {
              comparison = (a.ticket || '').localeCompare(b.ticket || '');
            }
          }
          break;
        case 'pair':
          comparison = (a.pair || a.item || '').localeCompare(b.pair || b.item || '');
          break;
        case 'rr':
          comparison = (a.rr || 0) - (b.rr || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortConfig.order === 'desc' ? -comparison : comparison;
    });
  }, [trades, searchTerm, typeFilter, startDate, endDate, sortConfig]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize);
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (rr: number) => {
    if (rr > 0) return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">PROFIT</span>;
    if (rr < 0) return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold">LOSS</span>;
    return <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-bold">BE</span>;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.order === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  return (
    <div className="space-y-6">
      {/* Modal for notes */}
      {selectedNote && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedNote(null)}>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-zinc-500 mb-4">{selectedNote.pair} Journal</h3>
            <p className="text-zinc-300 text-sm whitespace-pre-wrap">{selectedNote.note}</p>
            <button onClick={() => setSelectedNote(null)} className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">Close</button>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-zinc-500 mb-4">Confirm Action</h3>
            <p className="text-zinc-300 text-sm mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-xs font-bold text-white transition-colors">Confirm</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold capitalize">Trade History</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Search Symbol */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search pair..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:outline-none text-sm w-48 transition-all"
            />
          </div>

          {/* Type Filter */}
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:outline-none text-sm text-zinc-300 transition-all cursor-pointer h-10"
          >
            <option value="all">All Types</option>
            <option value="buy">Buy Only</option>
            <option value="sell">Sell Only</option>
          </select>

          {/* Created Time Filter */}
          <DateRangePicker 
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            placeholderStart="Start"
            placeholderEnd="End"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0F0F0F]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase tracking-wider">
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('pair')}>
                <div className="flex items-center gap-1">Pair <SortIcon field="pair" /></div>
              </th>
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">Type <SortIcon field="type" /></div>
              </th>
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">Entry Date <SortIcon field="date" /></div>
              </th>
              <th className="px-6 py-4 font-bold">Entry Price</th>
              <th className="px-6 py-4 font-bold">Exit Price</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('rr')}>
                <div className="flex items-center gap-1">RR <SortIcon field="rr" /></div>
              </th>
              <th className="px-6 py-4 font-bold">Journal</th>
              <th className="px-6 py-4 font-bold text-emerald-500/90 whitespace-nowrap">Pre-Trade Feel</th>
              <th className="px-6 py-4 font-bold text-emerald-500/90 whitespace-nowrap">Mid-Trade Feel</th>
              <th className="px-6 py-4 font-bold text-emerald-500/90 whitespace-nowrap">Post-Trade Feel</th>
              <th className="px-6 py-4 font-bold">Tags</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedTrades.map((trade) => (
              <tr 
                key={trade.id} 
                onClick={() => onSelectTrade(trade)}
                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4">
                  <span className="font-bold text-zinc-200">{trade.pair || trade.item}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {trade.type === 'buy' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {trade.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">
                  {trade.openTime && getSafeDate(trade.openTime) ? format(getSafeDate(trade.openTime)!, 'dd/MM/yyyy') : '-'}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">{trade.entryPrice?.toFixed(5)}</td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">{trade.exitPrice?.toFixed(5) || '-'}</td>
                <td className="px-6 py-4">
                  {getStatusBadge(trade.rr || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-black text-zinc-200">{trade.rr?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4">
                  {trade.notes && (
                    <button
                       onClick={(e) => { e.stopPropagation(); setSelectedNote({ note: trade.notes!, pair: trade.pair || trade.item || 'Trade' }); }}
                      className="flex items-center gap-1.5 text-emerald-500/50 group hover:text-emerald-500 transition-colors"
                    >
                      <MessageSquare size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {trade.preTradeEmotion ? (
                    (() => {
                      const emo = PRE_TRADE_EMOTIONS[trade.preTradeEmotion];
                      return emo ? (
                        <span 
                          title={emo.tooltip}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold border cursor-help whitespace-nowrap ${emo.bg} ${emo.text} ${emo.border}`}
                        >
                          {emo.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium capitalize bg-white/5 border border-white/5 px-2 py-0.5 rounded whitespace-nowrap">{trade.preTradeEmotion}</span>
                      );
                    })()
                  ) : (
                    <span className="text-zinc-600 text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {trade.duringTradeEmotion ? (
                    (() => {
                      const emo = DURING_TRADE_EMOTIONS[trade.duringTradeEmotion];
                      return emo ? (
                        <span 
                          title={emo.tooltip}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold border cursor-help whitespace-nowrap ${emo.bg} ${emo.text} ${emo.border}`}
                        >
                          {emo.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium capitalize bg-white/5 border border-white/5 px-2 py-0.5 rounded whitespace-nowrap">{trade.duringTradeEmotion}</span>
                      );
                    })()
                  ) : (
                    <span className="text-zinc-600 text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {trade.postTradeEmotion ? (
                    (() => {
                      const emo = POST_TRADE_EMOTIONS[trade.postTradeEmotion];
                      return emo ? (
                        <span 
                          title={emo.tooltip}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold border cursor-help whitespace-nowrap ${emo.bg} ${emo.text} ${emo.border}`}
                        >
                          {emo.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium capitalize bg-white/5 border border-white/5 px-2 py-0.5 rounded whitespace-nowrap">{trade.postTradeEmotion}</span>
                      );
                    })()
                  ) : (
                    <span className="text-zinc-600 text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {trade.tags && trade.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {trade.tags.map((tag, i) => (
                        <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400/70 border border-zinc-500/10 transition-colors hover:bg-zinc-500/20">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      className="p-2 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                      title="View Details"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteTrade(e, trade.id!)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                      title="Delete Permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTrades.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Search className="text-zinc-700 w-6 h-6" />
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredTrades.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 pt-2">
          <div className="text-xs text-zinc-500 font-medium flex flex-wrap items-center gap-3">
            <span>
              Showing <span className="text-zinc-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-zinc-300">{Math.min(currentPage * pageSize, filteredTrades.length)}</span> of <span className="text-zinc-300">{filteredTrades.length}</span> results
            </span>
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                <Trash2 size={12} />
                Clear All History
              </button>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Only show a limited range of page numbers if there are many pages
                  if (
                    totalPages <= 7 || 
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                          currentPage === pageNum 
                            ? 'bg-emerald-500 text-black' 
                            : 'bg-white/5 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === 2 && currentPage > 3) || 
                    (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return <span key={pageNum} className="text-zinc-700 text-xs px-1">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
