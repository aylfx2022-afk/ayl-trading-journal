import React, { useMemo } from 'react';
import { Trade } from '../types';

interface YearlyPerformanceProps {
  trades: Trade[];
}

export default function YearlyPerformance({ trades }: YearlyPerformanceProps) {
  const yearsData = useMemo(() => {
    const data: Record<number, Record<number, { profit: number, count: number, rr: number }>> = {};

    trades.forEach(trade => {
      if (trade.openTime) {
        const date = trade.openTime.toDate();
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
    <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 mt-8">
      <h2 className="text-xl font-bold mb-6">Yearly Performance</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-separate border-spacing-1">
          <thead>
            <tr className="text-zinc-500">
              <th className="p-2 w-20"></th>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <th key={m} className="p-2 w-24">{m}</th>
              ))}
              <th className="p-2 w-24">YTD</th>
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
                  <td className="p-2 font-bold text-zinc-300">{year}</td>
                  {Object.keys(yearStats).map(month => {
                    const stats = yearStats[Number(month)];
                    totalProfit += stats.profit;
                    totalTrades += stats.count;
                    totalRR += stats.rr;
                    return (
                      <td key={month} className={`border border-white/5 rounded-lg p-2 ${
                        stats.count === 0 
                          ? 'text-zinc-700' 
                          : stats.rr >= 0 
                            ? 'bg-emerald-500/5' 
                            : 'bg-red-500/5'
                      }`}>
                        {stats.count === 0 ? '-' : (
                          <>
                            <div className={`text-[10px] font-normal ${stats.rr >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {stats.rr >= 0 ? '+' : ''}{stats.rr.toFixed(2)} RR
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                               {stats.count} trades
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-emerald-500/20 rounded-lg p-2 text-emerald-500 bg-emerald-500/5">
                    <div className="text-[10px] font-normal text-emerald-500">+{totalRR.toFixed(2)} RR</div>
                    <div className="text-[10px] text-zinc-500">{totalTrades} trades</div>
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
