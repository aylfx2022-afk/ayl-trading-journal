import React, { useMemo, useState } from 'react';
import { getSafeDate } from '../lib/dateUtils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import DatePicker from './ui/DatePicker';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
  trades: Trade[];
}

const COLORS = ['#10b981', '#ef4444'];

export default function Dashboard({ trades }: DashboardProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);


  const streaks = useMemo(() => {
    // Get all trades that have a result to calculate max streaks
    const allClosedTrades = [...trades]
      .filter(t => t.rr !== undefined && t.rr !== null)
      .sort((a, b) => {
        const timeA = getSafeDate(a.openTime)?.getTime() || 0;
        const timeB = getSafeDate(b.openTime)?.getTime() || 0;
        
        if (timeA !== timeB) return timeA - timeB;

        const createA = getSafeDate(a.createdAt)?.getTime() || 0;
        const createB = getSafeDate(b.createdAt)?.getTime() || 0;
        if (createA !== createB) return createA - createB;

        // If timestamps are identical, use a consistent identifier for stability
        return (a.ticket || '').localeCompare(b.ticket || '');
      });

    let currentWin = 0;
    let maxWin = 0;
    let currentLoss = 0;
    let maxLoss = 0;

    allClosedTrades.forEach(t => {
      const rr = Number(t.rr);
      if (rr === 0) return; // Break-even trades do not affect streaks

      if (rr > 0) {
        currentWin += 1;
        currentLoss = 0;
        if (currentWin > maxWin) maxWin = currentWin;
      } else {
        currentLoss += 1;
        currentWin = 0;
        if (currentLoss > maxLoss) maxLoss = currentLoss;
      }
    });

    return { maxWin, maxLoss };
  }, [trades]);

  const stats = useMemo(() => {
    let filteredTrades = trades;
    if (startDate) {
      filteredTrades = filteredTrades.filter(t => {
        const d = getSafeDate(t.openTime);
        return d && d >= startDate;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredTrades = filteredTrades.filter(t => {
        const d = getSafeDate(t.openTime);
        return d && d <= end;
      });
    }
    
    if (filteredTrades.length === 0) return null;

    const totalProfit = filteredTrades.reduce((acc, t) => acc + t.profit, 0);
    const closedTrades = filteredTrades.filter(t => t.exitPrice !== null && t.exitPrice !== undefined);
    
    const totalRR = closedTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
    const wins = closedTrades.filter(t => (t.rr || 0) > 0);
    const losses = closedTrades.filter(t => (t.rr || 0) <= 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    
    // Equity curve data - Aggregated by day
    const dailyAgg: Record<string, { totalRR: number, dateObj: Date }> = {};
    
    closedTrades.forEach(t => {
      const d = getSafeDate(t.openTime);
      if (!d) return;
      const dateKey = format(d, 'yyyy-MM-dd');
      if (!dailyAgg[dateKey]) {
        dailyAgg[dateKey] = { totalRR: 0, dateObj: d };
      }
      dailyAgg[dateKey].totalRR += (t.rr || 0);
    });

    const sortedDates = Object.values(dailyAgg)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    let cumulativeRR = 0;
    const equityData = sortedDates.map(day => {
      cumulativeRR += day.totalRR;
      return {
        date: format(day.dateObj, 'MMM dd'),
        rr: cumulativeRR
      };
    });

    // Monthly RR data
    const monthlyRR: Record<string, number> = {};
    closedTrades.forEach(t => {
      const d = getSafeDate(t.openTime);
      const month = d ? format(d, 'MMM yyyy') : 'N/A';
      monthlyRR[month] = (monthlyRR[month] || 0) + (t.rr || 0);
    });
    const monthlyRRData = Object.entries(monthlyRR).map(([month, rr]) => ({ month, rr }));
    
    return {
      totalProfit,
      totalRR,
      winRate,
      totalTrades: filteredTrades.length,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      equityData,
      monthlyRRData,
      avgProfit: closedTrades.length > 0 ? totalProfit / closedTrades.length : 0
    };
  }, [trades, startDate, endDate]);


  if (!stats) {
    return (
      <div className="space-y-6">
        <DateFilter startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <TrendingUp className="text-zinc-700 w-10 h-10" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Trading Data Yet</h3>
          <p className="text-zinc-500 max-w-xs">Import your trading history to see analytics and AI-powered insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DateFilter startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard 
          title="Total RR" 
          value={stats.totalRR.toFixed(2)} 
          icon={<Target className="text-emerald-500" />}
          trend={stats.totalRR >= 0 ? 'positive' : 'negative'}
        />
        <StatCard 
          title="Closed Trades" 
          value={stats.closedTrades.toString()} 
          icon={<Target className="text-blue-500" />}
        />
        <StatCard 
          title="Win Rate" 
          value={`${stats.winRate.toFixed(1)}%`} 
          icon={<Target className="text-blue-500" />}
        />
        <StatCard 
          title="Max Consec. Win" 
          value={streaks.maxWin.toString()} 
          icon={<Zap className="text-emerald-500" />}
        />
        <StatCard 
          title="Max Consec. Loss" 
          value={streaks.maxLoss.toString()} 
          icon={<Zap className="text-red-500" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Equity Curve */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold">RR Growth</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                  itemStyle={{ color: '#10b981' }}
                  cursor={false}
                  formatter={(value: any) => [Number(value).toFixed(2), "RR"]}
                />
                <Area type="monotone" dataKey="rr" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" activeDot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly RR Chart */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold">Monthly RR</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyRRData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="month" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  cursor={false}
                  formatter={(value: any) => [Number(value).toFixed(2), "RR"]}
                />
                <Bar dataKey="rr" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Win/Loss Ratio */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
          <h3 className="text-lg font-semibold mb-8">Win/Loss Ratio</h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: stats.wins },
                      { name: 'Losses', value: stats.losses }
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Wins</span>
              <span className="text-emerald-500 font-medium">{stats.wins}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Losses</span>
              <span className="text-red-500 font-medium">{stats.losses}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend?: 'positive' | 'negative' }) {
  return (
    <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-500 text-sm font-medium">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {trend && (
          <span className={`text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded ${trend === 'positive' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {trend === 'positive' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}

function DateFilter({ startDate, endDate, setStartDate, setEndDate }: { 
  startDate: Date | null, 
  endDate: Date | null,
  setStartDate: (d: Date | null) => void,
  setEndDate: (d: Date | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-[#0F0F0F] border border-white/5 rounded-3xl p-4">
      <h4 className="text-sm font-bold text-zinc-300">Filter:</h4>
      <div className="w-40">
        <DatePicker 
          value={startDate}
          onChange={setStartDate}
          placeholder="Start date"
          compact={true}
        />
      </div>
      <span className="text-zinc-500">to</span>
      <div className="w-40">
        <DatePicker 
          value={endDate}
          onChange={setEndDate}
          placeholder="End date"
          compact={true}
        />
      </div>
      <button 
        onClick={() => { setStartDate(null); setEndDate(null); }}
        className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
      >
        Clear
      </button>
    </div>
  );
}
