import React, { useState } from 'react';
import { Trade } from '../types';
import { format } from 'date-fns';
import { CalendarDays, StickyNote, Trash2 } from 'lucide-react';
import { Dayjs } from 'dayjs';
import { getSafeDate } from '../lib/dateUtils';

interface DayDetailsProps {
  date: Dayjs;
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onBack: () => void;
}

export default function DayDetails({ date, trades, onSelectTrade, onBack }: DayDetailsProps) {
  const [selectedNote, setSelectedNote] = useState<{ note: string, pair: string } | null>(null);
  const dateKey = date.format('YYYY-MM-DD');
  
  const tradesForDate = trades.filter(trade => {
    if (!trade.openTime) return false;
    const date = getSafeDate(trade.openTime);
    return date && format(date, 'yyyy-MM-dd') === dateKey;
  });

  const totalRR = tradesForDate.reduce((acc, t) => acc + (t.rr || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Modal for notes */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedNote(null)}>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-zinc-500 mb-4">{selectedNote.pair} Journal</h3>
            <p className="text-zinc-300 text-sm whitespace-pre-wrap">{selectedNote.note}</p>
            <button onClick={() => setSelectedNote(null)} className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">Close</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="text-left flex flex-col gap-2">
          <button 
            onClick={onBack}
            className="flex items-center text-xs font-bold text-zinc-500 hover:text-white transition-colors w-fit"
          >
            ← Back to Calendar
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Daily Summary</h2>
            <p className="text-zinc-500 text-sm font-medium">
              {date.format('MMMM DD, YYYY')}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#0F0F0F] border border-white/5 flex flex-col items-center min-w-[100px]">
            <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest leading-none mb-1">Trades</p>
            <p className="text-lg font-bold leading-none">{tradesForDate.length}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#0F0F0F] border border-white/5 flex flex-col items-center min-w-[100px]">
            <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest leading-none mb-1">Net RR</p>
            <p className={`text-lg font-bold leading-none ${totalRR >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalRR >= 0 ? '+' : ''}{totalRR.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0F0F0F] border border-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest">Day Activity</h3>
          <span className="text-[10px] font-bold text-zinc-600">
            {tradesForDate.length} {tradesForDate.length === 1 ? 'Trade' : 'Trades'} Found
          </span>
        </div>

        {tradesForDate.length > 0 ? (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.02] text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  <th className="px-5 py-3 font-black">Pair</th>
                  <th className="px-5 py-3 font-black">Type</th>
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
                    <td className="px-5 py-3">
                      <span className="font-bold text-zinc-300">{trade.pair || trade.item}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase ${
                        trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono">{trade.entryPrice?.toFixed(5) || trade.openPrice.toFixed(5)}</td>
                    <td className="px-5 py-3 font-mono">{trade.exitPrice?.toFixed(5) || trade.closePrice?.toFixed(5) || '-'}</td>
                    <td className="px-5 py-3">
                      {(() => {
                        const rr = trade.rr || 0;
                        const exitPrice = trade.exitPrice || trade.closePrice;
                        let status = 'Open';
                        let statusClass = 'bg-emerald-500/10 text-emerald-400';

                        if (exitPrice) {
                          if (rr > 0) {
                            status = 'Profit';
                            statusClass = 'bg-emerald-500/10 text-emerald-500';
                          } else if (rr < 0) {
                            status = 'Loss';
                            statusClass = 'bg-red-500/10 text-red-500';
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
                    <td className={`px-5 py-3 font-black ${(trade.rr || 0) > 0 ? 'text-emerald-500' : (trade.rr || 0) < 0 ? 'text-red-500' : 'text-zinc-300'}`}>
                      {(trade.rr || 0).toFixed(2)}R
                    </td>
                    <td className="px-5 py-3">
                      {trade.notes ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedNote({ note: trade.notes!, pair: trade.pair || trade.item || 'Trade' }); }}
                          className="group"
                        >
                          <StickyNote className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                        </button>
                      ) : <span className="text-zinc-700">-</span>}
                    </td>
                    <td className="px-5 py-3">
                      {trade.tags && trade.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {trade.tags.map((tag, i) => (
                            <span key={i} className="text-[8px] font-bold px-1 py-0 rounded-sm bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={async (e) => { 
                        e.stopPropagation(); 
                        if (!window.confirm('Are you sure you want to move this trade to trash?')) return;
                        try {
                          await import('firebase/firestore').then(({ doc, updateDoc }) => {
                            import('../firebase').then(({ db }) => updateDoc(doc(db, 'trades', trade.id!), { isDeleted: true }));
                          });
                        } catch (e) {
                          console.error("Error moving trade to trash:", e);
                        }
                      }} className="text-zinc-500 hover:text-red-500 transition-colors">
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
              <CalendarDays className="text-zinc-400 w-6 h-6" />
            </div>
            <p className="text-zinc-500 text-sm font-medium">No trading activity recorded for this date.</p>
          </div>
        )}
      </div>
    </div>
  );
}
