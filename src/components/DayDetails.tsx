import React from 'react';
import { Trade } from '../types';
import { format } from 'date-fns';
import { CalendarDays, Badge } from 'lucide-react';
import { Dayjs } from 'dayjs';

interface DayDetailsProps {
  date: Dayjs;
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onBack: () => void;
}

export default function DayDetails({ date, trades, onSelectTrade, onBack }: DayDetailsProps) {
  const dateKey = date.format('YYYY-MM-DD');
  
  const tradesForDate = trades.filter(trade => {
    if (!trade.openTime) return false;
    return format(trade.openTime.toDate(), 'yyyy-MM-dd') === dateKey;
  });

  const totalRR = tradesForDate.reduce((acc, t) => acc + (t.rr || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="text-left">
          <h2 className="text-xl font-bold tracking-tight">Daily Summary</h2>
          <p className="text-zinc-500 text-sm font-medium">
            {date.format('MMMM DD, YYYY')}
          </p>
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
                  <th className="px-5 py-3 font-black">Type</th>
                  <th className="px-5 py-3 font-black">Pair / Tags</th>
                  <th className="px-5 py-3 font-black text-right">RR Achieved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {tradesForDate.map(trade => (
                  <tr 
                    key={trade.id} 
                    onClick={() => onSelectTrade(trade)}
                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase ${
                        trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                          {trade.item}
                        </span>
                        {trade.tags && trade.tags.length > 0 && (
                          <div className="flex gap-1.5 mt-0.5">
                            {trade.tags.map((tag, i) => (
                              <span key={i} className="text-[9px] font-bold text-zinc-600 group-hover:text-emerald-500/50 transition-colors">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-sm font-black ${(trade.rr || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(trade.rr || 0) >= 0 ? '+' : ''}{trade.rr?.toFixed(2) || '0.00'}
                      </span>
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
