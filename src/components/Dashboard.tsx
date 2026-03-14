import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Target, Zap, BrainCircuit } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
  trades: Trade[];
  insights: string;
}

const COLORS = ['#10b981', '#ef4444'];

export default function Dashboard({ trades, insights }: DashboardProps) {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    const totalProfit = trades.reduce((acc, t) => acc + t.profit, 0);
    const wins = trades.filter(t => t.profit > 0);
    const losses = trades.filter(t => t.profit <= 0);
    const winRate = (wins.length / trades.length) * 100;
    
    // Equity curve data
    let currentEquity = 0;
    const equityData = trades
      .sort((a, b) => a.closeTime.toMillis() - b.closeTime.toMillis())
      .map(t => {
        currentEquity += t.profit;
        return {
          date: format(t.closeTime.toDate(), 'MMM dd'),
          equity: currentEquity
        };
      });

    return {
      totalProfit,
      winRate,
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      equityData,
      avgProfit: totalProfit / trades.length
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Profit" 
          value={`$${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={<TrendingUp className={stats.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} />}
          trend={stats.totalProfit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard 
          title="Win Rate" 
          value={`${stats.winRate.toFixed(1)}%`} 
          icon={<Target className="text-blue-500" />}
        />
        <StatCard 
          title="Total Trades" 
          value={stats.totalTrades.toString()} 
          icon={<Zap className="text-amber-500" />}
        />
        <StatCard 
          title="Avg. Trade" 
          value={`$${stats.avgProfit.toFixed(2)}`} 
          icon={<TrendingUp className="text-purple-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Equity Curve */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0F0F0F] border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold">Equity Growth</h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Cumulative Profit
            </div>
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
                <XAxis 
                  dataKey="date" 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEquity)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Ratio */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col">
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
      <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <BrainCircuit className="text-emerald-500 w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-emerald-400">AI Trading Insights</h3>
        </div>
        <div className="prose prose-invert max-w-none text-zinc-400 leading-relaxed">
          {insights.split('\n').map((line, i) => (
            <p key={i} className="mb-2">{line}</p>
          ))}
        </div>
      </div>
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
