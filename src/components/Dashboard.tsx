import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
  trades: Trade[];
}

const COLORS = ['#10b981', '#ef4444'];

export default function Dashboard({ trades }: DashboardProps) {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    const totalProfit = trades.reduce((acc, t) => acc + t.profit, 0);
    const closedTrades = trades.filter(t => t.exitPrice !== null && t.exitPrice !== undefined);
    const totalRR = closedTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
    const wins = closedTrades.filter(t => (t.rr || 0) > 0);
    const losses = closedTrades.filter(t => (t.rr || 0) <= 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    
    // Equity curve data
    let cumulativeRR = 0;
    const equityData = closedTrades
      .sort((a, b) => (a.openTime?.toMillis() || 0) - (b.openTime?.toMillis() || 0))
      .map(t => {
        cumulativeRR += (t.rr || 0);
        return {
          date: t.openTime ? format(t.openTime.toDate(), 'MMM dd') : 'N/A',
          rr: cumulativeRR
        };
      });

    // Monthly RR data
    const monthlyRR: Record<string, number> = {};
    closedTrades.forEach(t => {
      const month = t.openTime ? format(t.openTime.toDate(), 'MMM yyyy') : 'N/A';
      monthlyRR[month] = (monthlyRR[month] || 0) + (t.rr || 0);
    });
    const monthlyRRData = Object.entries(monthlyRR).map(([month, rr]) => ({ month, rr }));

    return {
      totalProfit,
      totalRR,
      winRate,
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      equityData,
      monthlyRRData,
      avgProfit: closedTrades.length > 0 ? totalProfit / closedTrades.length : 0
    };
  }, [trades]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <TrendingUp className="text-zinc-700 w-10 h-10" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Trading Data Yet</h3>
        <p className="text-zinc-500 max-w-xs">Import your trading history to see analytics and AI-powered insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                />
                <Bar dataKey="rr" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
