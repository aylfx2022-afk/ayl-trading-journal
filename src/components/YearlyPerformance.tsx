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
    <div className="bg-white dark:bg-[#0F0F0F] border border-zinc-200 dark:border-white/5 rounded-3xl p-6 mt-8 shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-zinc-800 dark:text-zinc-100">Yearly Performance</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-separate border-spacing-1">
          <thead>
            <tr className="text-zinc-450 dark:text-zinc-500">
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
                      <td key={month} className={`border border-zinc-150/60 dark:border-white/5 rounded-lg p-2 ${
                        stats.count === 0 
                          ? 'text-zinc-300 dark:text-zinc-800' 
                          : isPositive 
                            ? 'bg-emerald-500/5 dark:bg-emerald-500/15' 
                            : 'bg-red-500/5 dark:bg-red-500/15'
                      }`}>
                        {stats.count === 0 ? '-' : (
                          <>
                            <div className={`text-[10px] font-extrabold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {isPositive ? '+' : ''}{stats.rr.toFixed(2)} RR
                            </div>
                            <div className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-0.5">
                               {stats.count} {stats.count === 1 ? 'trade' : 'trades'}
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className={`border rounded-lg p-2 ${
                    totalRR >= 0 
                      ? 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/15' 
                      : 'border-red-500/20 text-red-500 dark:text-red-400 bg-red-500/5 dark:bg-red-500/15'
                  }`}>
                    <div className="text-[10px] font-extrabold">
                      {totalRR >= 0 ? '+' : ''}{totalRR.toFixed(2)} RR
                    </div>
                    <div className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-0.5">
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
