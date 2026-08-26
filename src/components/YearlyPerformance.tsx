import React, { useMemo } from 'react';
import { Trade } from '../types';
import { getSafeDate } from '../lib/dateUtils';

interface YearlyPerformanceProps {
  trades: Trade[];
}

export default function YearlyPerformance({ trades }: YearlyPerformanceProps) {
  const yearsData = useMemo(() => {
    const data: Record<number, Record<number, { profit: number, count: number, rr: number }>> = {};

    trades.forEach(trade => {
      if (trade.openTime) {
        const date = getSafeDate(trade.openTime);
        if (!date) return;
        const year = date.getFullYear();
        const month = date.getMonth();

        if (!data[year]) {
          data[year] = {};
          for (let i = 0; i < 12; i++) {
            data[year][i] = { profit: 0, count: 0, rr: 0 };
          }
        }
        data[year][month].profit += trade.profit || 0;
        data[year][month].count += 1;
        data[year][month].rr += trade.rr || 0;
      }
    });
    return data;
  }, [trades]);

  const years = Object.keys(yearsData).map(Number).sort((a, b) => b - a);

  return (
    <div className="bg-white dark:bg-[#12161c] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 mt-8 shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-zinc-800 dark:text-zinc-100">Yearly Performance</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-separate border-spacing-1">
          <thead>
            <tr className="text-zinc-500 dark:text-zinc-400">
              <th className="p-2 w-20"></th>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <th key={m} className="p-2 w-24 font-bold tracking-wider uppercase text-[10px]">{m}</th>
              ))}
              <th className="p-2 w-24 font-bold tracking-wider uppercase text-[10px]">YTD</th>
            </tr>
          </thead>
          <tbody>
            {years.map(year => {
              const yearStats = yearsData[year];
              let totalProfit = 0;
              let totalTrades = 0;
              let totalRR = 0;

              return (
                <tr key={year}>
                  <td className="p-2 font-black text-zinc-700 dark:text-zinc-300">{year}</td>
                  {Object.keys(yearStats).map(month => {
                    const stats = yearStats[Number(month)];
                    totalProfit += stats.profit;
                    totalTrades += stats.count;
                    totalRR += stats.rr;
                    const isPositive = stats.rr >= 0;
                    return (
                      <td key={month} className={`rounded-lg p-2 transition-colors ${
                        stats.count === 0 
                          ? 'border border-zinc-100 dark:border-white/5 text-zinc-300 dark:text-zinc-700' 
                          : isPositive 
                            ? 'border-l-2 border-l-emerald-500/80 dark:border-l-[#34d399]/90 border-t border-r border-b border-zinc-200 dark:border-white/10 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03]' 
                            : 'border-l-2 border-l-rose-400/80 dark:border-l-[#f87171]/90 border-t border-r border-b border-zinc-200 dark:border-white/10 bg-rose-500/[0.02] dark:bg-rose-500/[0.03]'
                      }`}>
                        {stats.count === 0 ? '-' : (
                          <>
                            <div className={`text-[10px] font-extrabold ${isPositive ? 'text-emerald-600 dark:text-[#34d399]' : 'text-rose-500 dark:text-[#f87171]'}`}>
                              {isPositive ? '+' : ''}{stats.rr.toFixed(2)} RR
                            </div>
                            <div className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider">
                               {stats.count} {stats.count === 1 ? 'trade' : 'trades'}
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className={`rounded-lg p-2 ${
                    totalRR >= 0 
                      ? 'border-l-2 border-l-emerald-500/80 dark:border-l-[#34d399]/90 border-t border-r border-b border-emerald-500/20 text-emerald-600 dark:text-[#34d399] bg-emerald-500/5 dark:bg-emerald-500/10' 
                      : 'border-l-2 border-l-rose-400/80 dark:border-l-[#f87171]/90 border-t border-r border-b border-rose-500/20 text-rose-500 dark:text-[#f87171] bg-rose-500/5 dark:bg-rose-500/10'
                  }`}>
                    <div className="text-[10px] font-black">
                      {totalRR >= 0 ? '+' : ''}{totalRR.toFixed(2)} RR
                    </div>
                    <div className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider">
                      {totalTrades} {totalTrades === 1 ? 'trade' : 'trades'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
