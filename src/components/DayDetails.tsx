import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trade } from '../types';
import { format } from 'date-fns';
import { CalendarDays, StickyNote, Trash2, Plus, PenSquare } from 'lucide-react';
import { Dayjs } from 'dayjs';
import { getSafeDate } from '../lib/dateUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MarkdownEditor from './MarkdownEditor';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface DayDetailsProps {
  date: Dayjs;
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onBack: () => void;
  onAddTrade: () => void;
  journals?: any[];
  activeAccountId?: string | null;
  activeAccountIsDefault?: boolean;
}

export default function DayDetails({ 
  date, 
  trades, 
  onSelectTrade, 
  onBack, 
  onAddTrade, 
  journals,
  activeAccountId,
  activeAccountIsDefault
}: DayDetailsProps) {
  const [selectedNote, setSelectedNote] = useState<{ note: string, pair: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });
  const dateKey = date.format('YYYY-MM-DD');

  const journalForDate = journals?.find(j => j.dateYMD === dateKey);
  const [isEditingJournal, setIsEditingJournal] = useState(false);
  const [journalText, setJournalText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load journal text when date changes or journals load (if not currently focused/editing)
  useEffect(() => {
    if (!isEditingJournal) {
      setJournalText(journalForDate?.content || '');
    }
  }, [dateKey, journalForDate, isEditingJournal]);

  // Debounced auto-save effect
  useEffect(() => {
    const currentDbText = journalForDate?.content || '';
    if (journalText === currentDbText) {
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      const user = auth.currentUser;
      if (!user) {
        setSaveStatus('idle');
        return;
      }

      try {
        const journalId = activeAccountIsDefault 
          ? `${user.uid}_${dateKey}` 
          : `${user.uid}_${activeAccountId}_${dateKey}`;
        const journalRef = doc(db, 'journals', journalId);
        
        await setDoc(journalRef, {
          dateYMD: dateKey,
          content: journalText,
          userId: user.uid,
          updatedAt: new Date().toISOString(),
          accountId: activeAccountId || null
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error("Error auto-saving journal:", error);
        setSaveStatus('idle');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [journalText, dateKey, journalForDate, activeAccountId, activeAccountIsDefault]);
  
  const tradesForDate = trades
    .filter(trade => {
      if (!trade.openTime) return false;
      const date = getSafeDate(trade.openTime);
      return date && format(date, 'yyyy-MM-dd') === dateKey;
    })
    .sort((a, b) => {
      const timeA = getSafeDate(a.openTime)?.getTime() || getSafeDate(a.createdAt)?.getTime() || 0;
      const timeB = getSafeDate(b.openTime)?.getTime() || getSafeDate(b.createdAt)?.getTime() || 0;
      return timeA - timeB;
    });

  const totalRR = tradesForDate.reduce((acc, t) => acc + (t.rr || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Confirmation Modal */}
      {confirmModal.isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-[#181d26] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-[#8b93a1] mb-4">Confirm Action</h3>
            <p className="text-[#e8ebf2] text-sm mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors cursor-pointer text-[#8b93a1]">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal for notes */}
      {selectedNote && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedNote(null)}>
          <div className="bg-[#181d26] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-[#8b93a1] mb-4">{selectedNote.pair} Journal</h3>
            <p className="text-[#e8ebf2] text-sm whitespace-pre-wrap">{selectedNote.note}</p>
            <button onClick={() => setSelectedNote(null)} className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors cursor-pointer text-[#e8ebf2]">Close</button>
          </div>
        </div>,
        document.body
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="text-left flex flex-col gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#e8ebf2]">Daily Summary</h2>
            <p className="text-[#8b93a1] text-sm font-medium">
              {date.format('MMMM DD, YYYY')}
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <div className="px-4 py-2 rounded-xl bg-[#181d26] border border-white/5 flex flex-col items-center min-w-[100px] h-[46px] justify-center shadow-md">
            <p className="text-[9px] text-[#8b93a1] uppercase font-black tracking-widest leading-none mb-1">Trades</p>
            <p className="text-lg font-bold leading-none text-[#e8ebf2]">{tradesForDate.length}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#181d26] border border-white/5 flex flex-col items-center min-w-[100px] h-[46px] justify-center shadow-md">
            <p className="text-[9px] text-[#8b93a1] uppercase font-black tracking-widest leading-none mb-1">Net RR</p>
            <p className={`text-lg font-bold leading-none ${totalRR >= 0 ? 'text-emerald-400' : 'text-[#c96a63]'}`}>
              {totalRR >= 0 ? '+' : ''}{totalRR.toFixed(2)}
            </p>
          </div>
          <button 
            onClick={onAddTrade}
            className="px-5 h-[46px] rounded-xl bg-[#4d8fe0] text-white hover:bg-[#3a6fc4] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-lg hover:shadow-[#4d8fe0]/20 cursor-pointer active:scale-95"
          >
            <Plus size={14} className="stroke-[3]" />
            New Trade
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#181d26] border border-white/5 overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-white/5 bg-[#12161c]/50 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-[#8b93a1] tracking-widest">Day Activity</h3>
          <span className="text-[10px] font-bold text-[#8b93a1]">
            {tradesForDate.length} {tradesForDate.length === 1 ? 'Trade' : 'Trades'} Found
          </span>
        </div>

        {tradesForDate.length > 0 ? (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.02] text-[10px] font-black text-[#8b93a1] uppercase tracking-widest">
                  <th className="px-5 py-3 font-black">Entry Time</th>
                  <th className="px-5 py-3 font-black">Exit Time</th>
                  <th className="px-5 py-3 font-black">Pair</th>
                  <th className="px-5 py-3 font-black">Type</th>
                  <th className="px-5 py-3 font-black">Timeframe</th>
                  <th className="px-5 py-3 font-black">Entry Price</th>
                  <th className="px-5 py-3 font-black">Exit Price</th>
                  <th className="px-5 py-3 font-black">Status</th>
                  <th className="px-5 py-3 font-black">RR</th>
                  <th className="px-5 py-3 font-black">Journal</th>
                  <th className="px-5 py-3 font-black">Tags</th>
                  <th className="px-5 py-3 font-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {tradesForDate.map(trade => (
                  <tr 
                    key={trade.id} 
                    onClick={() => onSelectTrade(trade)}
                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer text-[11px]"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-[#8b93a1] font-mono text-[11px] font-bold">
                      {trade.openTime && getSafeDate(trade.openTime) ? format(getSafeDate(trade.openTime)!, 'hh:mm a') : '-'}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-[#8b93a1] font-mono text-[11px] font-bold">
                      {(trade.closeTime || trade.exitDateTime) && getSafeDate(trade.closeTime || trade.exitDateTime) ? (
                        format(getSafeDate(trade.closeTime || trade.exitDateTime)!, 'hh:mm a')
                      ) : (
                        <span className="text-zinc-600 font-medium">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-bold text-[#e8ebf2]">{trade.pair || trade.item}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase ${
                        trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {trade.entryTimeframe ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1e2733] border border-[#4d8fe0]/30 text-xs text-[#7ba8e8] font-bold">
                          {trade.entryTimeframe}
                        </span>
                      ) : (
                        <span className="text-[#8b93a1] font-medium">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono whitespace-nowrap text-[#e8ebf2]">{trade.entryPrice?.toFixed(5) || trade.openPrice?.toFixed(5) || '-'}</td>
                    <td className="px-5 py-3 font-mono whitespace-nowrap text-[#e8ebf2]">{trade.exitPrice?.toFixed(5) || trade.closePrice?.toFixed(5) || '-'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {(() => {
                        const rr = trade.rr || 0;
                        const exitPrice = trade.exitPrice || trade.closePrice;
                        let status = 'Open';
                        let statusClass = 'bg-[#1e2733] text-[#7ba8e8]';

                        if (exitPrice) {
                          if (rr > 0) {
                            status = 'Profit';
                            statusClass = 'bg-emerald-500/10 text-emerald-400';
                          } else if (rr < 0) {
                            status = 'Loss';
                            statusClass = 'bg-red-500/10 text-red-400';
                          } else {
                            status = 'BE';
                            statusClass = 'bg-zinc-500/10 text-zinc-400';
                          }
                        }
                        return (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase ${statusClass}`}>
                            {status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className={`px-5 py-3 font-black whitespace-nowrap ${(trade.rr || 0) > 0 ? 'text-emerald-400' : (trade.rr || 0) < 0 ? 'text-[#c96a63]' : 'text-[#e8ebf2]'}`}>
                      {(trade.rr || 0).toFixed(2)}R
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {trade.notes ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedNote({ note: trade.notes!, pair: trade.pair || trade.item || 'Trade' }); }}
                          className="group"
                        >
                          <StickyNote className="w-4 h-4 text-[#8b93a1] group-hover:text-[#4d8fe0] transition-colors" />
                        </button>
                      ) : <span className="text-[#8b93a1]/40">-</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {trade.tags && trade.tags.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto max-w-[120px] no-scrollbar">
                          {trade.tags.map((tag, i) => (
                            <span key={i} className="text-[8px] font-bold px-1 py-0 rounded-sm bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20 whitespace-nowrap">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setConfirmModal({
                          isOpen: true,
                          message: 'Are you sure you want to permanently delete this trade?',
                          onConfirm: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            try {
                              await deleteDoc(doc(db, 'trades', trade.id!));
                            } catch (e) {
                              console.error("Error deleting trade:", e);
                              handleFirestoreError(e, OperationType.DELETE, 'trades/' + trade.id);
                            }
                          }
                        });
                      }} className="text-[#8b93a1] hover:text-red-400 transition-colors cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 grayscale opacity-10">
              <CalendarDays className="text-[#8b93a1] w-6 h-6" />
            </div>
            <p className="text-[#8b93a1] text-sm font-medium">No trading activity recorded for this date.</p>
          </div>
        )}
      </div>

      {/* Daily Journal Section */}
      <div className="rounded-2xl bg-[#181d26] border border-white/5 overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-white/5 bg-[#12161c]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-black uppercase text-[#8b93a1] tracking-widest">Daily Journal</h3>
            {saveStatus === 'saving' && (
              <span className="text-[10px] text-amber-400 font-bold animate-pulse">Auto-saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[10px] text-[#7ba8e8] font-bold">Saved ✔</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsEditingJournal(!isEditingJournal)}
            className="text-[#4d8fe0] hover:text-[#7ba8e8] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <PenSquare size={12} />
            {isEditingJournal ? 'Done' : 'Write'}
          </button>
        </div>

        <div className="p-5">
          {isEditingJournal ? (
            <MarkdownEditor 
              value={journalText} 
              onChange={setJournalText}
              placeholder="How was your trading day? Jot down insights, emotions, market behavior..."
              minHeight="140px"
            />
          ) : (
            <div className={`min-h-[140px] w-full p-5 bg-[#12161c] rounded-xl border border-white/5 text-sm text-[#e8ebf2] markdown-preview leading-relaxed ${!journalText ? 'flex items-center justify-center' : ''}`}>
              {journalText ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{journalText}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-[#8b93a1]/60 italic">No journal entries recorded for today. Click 'Write' to add notes...</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
