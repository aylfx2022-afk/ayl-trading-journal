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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-1 mb-8 text-left">
        <h2 className="text-3xl font-bold">
          Daily Summary
        </h2>
        <p className="text-zinc-500 text-lg">
          {date.format('MMMM DD, YYYY')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col justify-between h-32">
          <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">Total Trades</p>
          <p className="text-4xl font-bold">{tradesForDate.length}</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col justify-between h-32">
          <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">Net RR</p>
          <p className={`text-4xl font-bold ${totalRR >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalRR >= 0 ? '+' : ''}{totalRR.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="p-8 rounded-[40px] bg-[#0F0F0F] border border-white/5 min-h-[400px]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold">Trade List</h3>
          <span className="px-3 py-1 rounded-full bg-white/5 text-zinc-500 text-xs font-bold">
            {tradesForDate.length} {tradesForDate.length === 1 ? 'Trade' : 'Trades'}
          </span>
        </div>

        {tradesForDate.length > 0 ? (
          <div className="space-y-4">
            {tradesForDate.map(trade => (
              <div 
                key={trade.id} 
                onClick={() => onSelectTrade(trade)}
                className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex justify-between items-center group hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    <span className="text-[10px] font-black uppercase">{trade.type}</span>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200 text-lg group-hover:text-emerald-400 transition-colors">{trade.item}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] font-medium text-zinc-500">Entry: {trade.entryPrice}</span>
                      {trade.tags?.map((tag, i) => (
                        <span key={i} className="text-[9px] font-bold text-emerald-500/60 flex items-center">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-xl ${(trade.rr || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {(trade.rr || 0) >= 0 ? '+' : ''}{trade.rr?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">RR Achieved</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 grayscale opacity-20">
              <CalendarDays className="text-zinc-400 w-10 h-10" />
            </div>
            <p className="text-zinc-500 text-lg font-medium">No trading activity recorded for this date.</p>
            <p className="text-zinc-600 text-sm mt-2">Take a break, markets will still be there tomorrow.</p>
          </div>
        )}
      </div>
    </div>
  );
}
