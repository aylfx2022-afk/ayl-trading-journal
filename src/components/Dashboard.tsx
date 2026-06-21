import React, { useMemo, useState } from 'react';
import { getSafeDate } from '../lib/dateUtils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import DateRangePicker from './ui/DateRangePicker';
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
        const createA = getSafeDate(a.createdAt)?.getTime() || 0;
        const createB = getSafeDate(b.createdAt)?.getTime() || 0;
        if (createA !== createB) return createA - createB;

        const timeA = getSafeDate(a.openTime)?.getTime() || 0;
        const timeB = getSafeDate(b.openTime)?.getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;

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
    const monthlyRR: Record<string, { rr: number; orderDate: Date }> = {};
    closedTrades.forEach(t => {
      const d = getSafeDate(t.openTime);
      const month = d ? format(d, 'MMM yyyy') : 'N/A';
      if (!monthlyRR[month]) {
        const orderDate = d ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date(0);
        monthlyRR[month] = { rr: 0, orderDate };
      }
      monthlyRR[month].rr += (t.rr || 0);
    });
    const monthlyRRData = Object.entries(monthlyRR)
      .map(([month, { rr, orderDate }]) => ({ month, rr, orderDate }))
      .sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime())
      .map(({ month, rr }) => ({ month, rr }));

    // Mental State Performance Aggregation
    const mentalStatsMap: Record<string, { wins: number; total: number; totalRR: number }> = {
      neutral: { wins: 0, total: 0, totalRR: 0 },
      focused: { wins: 0, total: 0, totalRR: 0 },
      calm: { wins: 0, total: 0, totalRR: 0 },
      disciplined: { wins: 0, total: 0, totalRR: 0 },
      fomo: { wins: 0, total: 0, totalRR: 0 },
      revenge: { wins: 0, total: 0, totalRR: 0 },
      overconfident: { wins: 0, total: 0, totalRR: 0 },
      anxious: { wins: 0, total: 0, totalRR: 0 },
      greedy: { wins: 0, total: 0, totalRR: 0 },
      impatient: { wins: 0, total: 0, totalRR: 0 },
      hesitant: { wins: 0, total: 0, totalRR: 0 },
      excited: { wins: 0, total: 0, totalRR: 0 },
      frustrated: { wins: 0, total: 0, totalRR: 0 },
      bored: { wins: 0, total: 0, totalRR: 0 },
    };

    closedTrades.forEach(t => {
      const state = t.mentalState ? t.mentalState.toLowerCase() : 'neutral';
      if (mentalStatsMap[state] !== undefined) {
        mentalStatsMap[state].total += 1;
        mentalStatsMap[state].totalRR += (t.rr || 0);
        if ((t.rr || 0) > 0) {
          mentalStatsMap[state].wins += 1;
        }
      }
    });

    const mentalLabels: Record<string, string> = {
      neutral: 'Neutral 😐',
      focused: 'Focused 🎯',
      calm: 'Calm 🧘',
      disciplined: 'Disciplined 📜',
      fomo: 'FOMO 🚀',
      revenge: 'Revenge Trade 😡',
      overconfident: 'Overconfident 😎',
      anxious: 'Anxious 😟',
      greedy: 'Greedy 🤑',
      impatient: 'Impatient ⏳',
      hesitant: 'Hesitant 😨',
      excited: 'Excited ⚡',
      frustrated: 'Frustrated 😫',
      bored: 'Bored 🥱'
    };

    const radarData = Object.entries(mentalStatsMap).map(([key, data]) => {
      const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
      const avgRR = data.total > 0 ? data.totalRR / data.total : 0;
      return {
        key,
        subject: mentalLabels[key] || key,
        'Win Rate (%)': Math.round(winRate),
        'Avg RR': Number(avgRR.toFixed(2)),
        'RR Score': Math.max(0, Math.min(100, Math.round(avgRR * 20))),
        trades: data.total,
        wins: data.wins
      };
    });
    
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
      radarData,
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
                <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tick={false} />
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
                <defs>
                  {stats.monthlyRRData.map((entry, index) => {
                    const isPos = entry.rr >= 0;
                    const ratio = Math.min(Math.abs(entry.rr) / 50, 1);
                    const intensity = 0.3 + (ratio * 0.7);
                    return (
                      <linearGradient key={`grad-${index}`} id={`colorRR-${index}`} x1="0" y1="0" x2="0" y2="1">
                        {isPos ? (
                          <>
                            <stop offset="0%" stopColor="#38d178" stopOpacity={intensity} />
                            <stop offset="100%" stopColor="#38d178" stopOpacity={0.05} />
                          </>
                        ) : (
                          <>
                            <stop offset="0%" stopColor="#9b2a2a" stopOpacity={0.05} />
                            <stop offset="100%" stopColor="#9b2a2a" stopOpacity={intensity} />
                          </>
                        )}
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="month" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={false}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const rr = Number(payload[0].value);
                      const color = rr >= 0 ? '#38d178' : '#9b2a2a';
                      return (
                        <div style={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px', padding: '10px' }}>
                          <p style={{ color, fontSize: '12px', margin: 0 }}>RR: {rr.toFixed(2)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="rr" radius={[4, 4, 0, 0]} barSize={40}>
                  {stats.monthlyRRData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#colorRR-${index})`} />
                  ))}
                  <LabelList 
                    dataKey="rr" 
                    position="insideTop" 
                    fill="#ffffff" 
                    fontSize={10} 
                    formatter={(value: any) => Number(value).toFixed(1)}
                    offset={10}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Win/Loss Ratio */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
          <h3 className="text-lg font-semibold mb-8">Win/Loss Ratio</h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: stats.wins },
                      { name: 'Losses', value: stats.losses }
                    ]}
                    innerRadius={70}
                    outerRadius={100}
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

        {/* Mental State Radar Chart */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
          <h3 className="text-lg font-semibold">Performance by Mental State</h3>
          <h4 className="text-xs text-zinc-500 mb-6">စိတ်လှုပ်ရှားမှုနှင့် စိတ်ဓာတ်အခြေအနေအလိုက် Performance အန်နလစ်တစ်စ်</h4>
          
          <div className="flex-1 flex items-center justify-center">
            {stats.radarData && stats.radarData.some(d => d.trades > 0) ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.radarData}>
                    <PolarGrid stroke="#ffffff08" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: '#52525b', fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Radar 
                      name="Win Rate (%)" 
                      dataKey="Win Rate (%)" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.15} 
                    />
                    <Radar 
                      name="Avg RR Score" 
                      dataKey="RR Score" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.1} 
                    />
                    <Tooltip content={<RadarTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', paddingTop: '10px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-600">
                <p className="text-sm">No mental state data found in filtered range.</p>
                <p className="text-xs mt-1">Add mental state logs when editing trades to view emotional performance!</p>
              </div>
            )}
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
    <div className="flex flex-wrap items-center justify-end gap-4 bg-[#0F0F0F] border border-white/5 rounded-3xl p-4">
      <h4 className="text-sm font-bold text-zinc-300">Filter:</h4>
      <DateRangePicker 
        startDate={startDate}
        endDate={endDate}
        onChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
        placeholderStart="Start Date"
        placeholderEnd="End Date"
      />
    </div>
  );
}

function RadarTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#18181b] border border-white/10 rounded-2xl p-4 shadow-2xl max-w-[240px] text-zinc-200">
        <p className="font-bold text-sm text-zinc-100 mb-2 border-b border-white/5 pb-1 flex items-center justify-between">
          <span>{data.subject}</span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-black">
            {data.trades} {data.trades === 1 ? 'Trade' : 'Trades'}
          </span>
        </p>
        <div className="space-y-1.5 text-xs font-bold">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">Win Rate:</span>
            <span className="text-emerald-400">{data['Win Rate (%)']}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">Average RR:</span>
            <span className={data['Avg RR'] >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {data['Avg RR'] >= 0 ? '+' : ''}{data['Avg RR'].toFixed(2)} R
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">Wins/Losses:</span>
            <span className="text-zinc-300">{data.wins}W - {data.trades - data.wins}L</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
