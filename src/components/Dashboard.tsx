import React, { useMemo, useState } from 'react';
import { getSafeDate } from '../lib/dateUtils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LabelList
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

    // Pre-Trade Emotion Data Aggregation
    const preTradeMap: Record<string, { label: string; count: number; color: string }> = {
      calm: { label: '🧘 Calm / တည်ငြိမ်မှု', count: 0, color: '#10b981' },
      excited: { label: '⚡ Excited / စိတ်လှုပ်ရှား', count: 0, color: '#8b5cf6' },
      confident: { label: '💪 Confident / ယုံကြည်မှု', count: 0, color: '#0d9488' },
      hesitant: { label: '😟 Hesitant / တွန့်ဆုတ်', count: 0, color: '#d97706' },
      fomo: { label: '🚀 FOMO / နောက်ကျစိုးရိမ်', count: 0, color: '#a855f7' },
      impatient: { label: '⏳ Impatient / စိတ်မရှည်', count: 0, color: '#ea580c' },
      bored: { label: '🥱 Bored / ပျင်းရိ', count: 0, color: '#71717a' }
    };

    // During-Trade Emotion Data Aggregation
    const duringTradeMap: Record<string, { label: string; count: number; color: string }> = {
      peaceful: { label: '🕊️ Peaceful / စိတ်အေးချမ်း', count: 0, color: '#0ea5e9' },
      anxious: { label: '😰 Anxious / စိုးရိမ်ပူပန်', count: 0, color: '#ef4444' },
      relaxed: { label: '🍹 Relaxed / စိတ်ပေါ့ပါး', count: 0, color: '#6366f1' },
      obsessive: { label: '👁️ Obsessive / စခရင်ကြည့်', count: 0, color: '#d97706' },
      fearing_loss: { label: '📉 Fear Loss / ရှုံးမည်စိုး', count: 0, color: '#f43f5e' },
      greed_surge: { label: '🤑 Greed / ပိုလိုချင်စိတ်', count: 0, color: '#eab308' },
      confident: { label: '🛡️ Confident / ယုံကြည်မှုအတိုင်း', count: 0, color: '#0d9488' }
    };

    // Post-Trade Emotion Data Aggregation
    const postTradeMap: Record<string, { label: string; count: number; color: string }> = {
      satisfied_disciplined: { label: '🏆 Disciplined / စည်းကမ်း', count: 0, color: '#10b981' },
      satisfied_lucky: { label: '🍀 Lucky Win / ကံကောင်းမှု', count: 0, color: '#eab308' },
      relieved: { label: '😌 Relieved / သက်ပြင်းချနိုင်', count: 0, color: '#0d9488' },
      frustrated: { label: '😫 Frustrated / စိတ်ပျက်ဒေါသ', count: 0, color: '#ec4899' },
      regretful_sl: { label: '🤦 Regret SL / ရှုံး၍နောင်တ', count: 0, color: '#ef4444' },
      regretful_early_exit: { label: '😢 Early Exit / စောထွက်မိနောင်တ', count: 0, color: '#f97316' },
      neutral_accepting: { label: '🤝 Neutral / အေးဆေးလက်ခံ', count: 0, color: '#71717a' }
    };

    filteredTrades.forEach(t => {
      if (t.preTradeEmotion && preTradeMap[t.preTradeEmotion]) {
        preTradeMap[t.preTradeEmotion].count += 1;
      }
      if (t.duringTradeEmotion && duringTradeMap[t.duringTradeEmotion]) {
        duringTradeMap[t.duringTradeEmotion].count += 1;
      }
      if (t.postTradeEmotion && postTradeMap[t.postTradeEmotion]) {
        postTradeMap[t.postTradeEmotion].count += 1;
      }
    });

    const preTradeData = Object.values(preTradeMap);
    const duringTradeData = Object.values(duringTradeMap);
    const postTradeData = Object.values(postTradeMap);

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
      preTradeData,
      duringTradeData,
      postTradeData,
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

      <div className="grid grid-cols-1 gap-8">
        {/* Win/Loss Ratio */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
          <h3 className="text-lg font-semibold mb-8">Win/Loss Ratio</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[300px] w-full max-w-sm">
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
            <div className="w-full max-w-xs mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-sans">Wins</span>
                <span className="text-emerald-500 font-medium font-sans">{stats.wins}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-sans">Losses</span>
                <span className="text-red-500 font-medium font-sans">{stats.losses}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trader Psychology Analysis */}
      <div className="space-y-6">
        <div className="border-t border-white/5 pt-6">
          <h3 className="text-lg font-semibold text-emerald-500">Trader Psychology (စိတ်ပိုင်းဆိုင်ရာဆန်းစစ်ချက်များ)</h3>
          <p className="text-xs text-zinc-500 mt-1">
            ပရီ-ထရိတ် (မဝင်ခင်) ၊ မစ်-ထရိတ် (ဝင်ထားစဉ်) နှင့် ပို့စ်-ထရိတ် (ထွက်ပြီးနောက်) ခံစားချက်များအပေါ်အခြေခံ၍ ရရှိလာသည့် စိတ်ခံစားမှုပုံစံများ
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pre-Trade Emotions Chart */}
          <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-zinc-300">Feeling BEFORE Entry</h4>
              <p className="text-[11px] text-zinc-500 font-medium font-sans">Trade မဝင်ခင် ခံစားရသော စိတ်အခြေအနေ</p>
            </div>
            <div className="flex-1 py-1">
              {stats.preTradeData.some(d => d.count > 0) ? (
                <div className="space-y-4">
                  {stats.preTradeData.map((item, index) => {
                    const maxCount = Math.max(...stats.preTradeData.map(d => d.count), 1);
                    const widthPercent = (item.count / maxCount) * 100;
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="text-[11px] font-bold text-zinc-300 flex justify-between items-center px-1">
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3.5">
                            <div 
                              className="h-full rounded-full transition-all duration-500 shadow-sm"
                              style={{ 
                                width: `${widthPercent}%`, 
                                backgroundColor: item.color,
                                opacity: item.count > 0 ? 1 : 0 
                              }}
                            />
                          </div>
                          <span className="text-xs font-black min-w-[20px] text-right font-mono" style={{ color: item.count > 0 ? item.color : '#3f3f46' }}>
                            {item.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-center p-4">
                  <p className="text-xs text-zinc-600 font-sans">Trade မဝင်ခင် စိတ်အခြေအနေ ဒေတာမရှိသေးပါ</p>
                </div>
              )}
            </div>
          </div>

          {/* During-Trade Emotions Chart */}
          <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-zinc-300">Feeling DURING Active Trade</h4>
              <p className="text-[11px] text-zinc-500 font-medium font-sans">Trade ဝင်ထားစဉ် ဖြစ်ပေါ်သော စိတ်အခြေအနေ</p>
            </div>
            <div className="flex-1 py-1">
              {stats.duringTradeData.some(d => d.count > 0) ? (
                <div className="space-y-4">
                  {stats.duringTradeData.map((item, index) => {
                    const maxCount = Math.max(...stats.duringTradeData.map(d => d.count), 1);
                    const widthPercent = (item.count / maxCount) * 100;
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="text-[11px] font-bold text-zinc-300 flex justify-between items-center px-1">
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3.5">
                            <div 
                              className="h-full rounded-full transition-all duration-500 shadow-sm"
                              style={{ 
                                width: `${widthPercent}%`, 
                                backgroundColor: item.color,
                                opacity: item.count > 0 ? 1 : 0 
                              }}
                            />
                          </div>
                          <span className="text-xs font-black min-w-[20px] text-right font-mono" style={{ color: item.count > 0 ? item.color : '#3f3f46' }}>
                            {item.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-center p-4">
                  <p className="text-xs text-zinc-600 font-sans">Trade ဝင်ထားစဉ် စိတ်အခြေအနေ ဒေတာမရှိသေးပါ</p>
                </div>
              )}
            </div>
          </div>

          {/* Post-Trade Emotions Chart */}
          <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-zinc-300">Feeling AFTER Exit</h4>
              <p className="text-[11px] text-zinc-500 font-medium font-sans">Trade ထွက်ပြီးနောက် ကြုံရသော စိတ်အခြေအနေ</p>
            </div>
            <div className="flex-1 py-1">
              {stats.postTradeData.some(d => d.count > 0) ? (
                <div className="space-y-4">
                  {stats.postTradeData.map((item, index) => {
                    const maxCount = Math.max(...stats.postTradeData.map(d => d.count), 1);
                    const widthPercent = (item.count / maxCount) * 100;
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="text-[11px] font-bold text-zinc-300 flex justify-between items-center px-1">
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3.5">
                            <div 
                              className="h-full rounded-full transition-all duration-500 shadow-sm"
                              style={{ 
                                width: `${widthPercent}%`, 
                                backgroundColor: item.color,
                                opacity: item.count > 0 ? 1 : 0 
                              }}
                            />
                          </div>
                          <span className="text-xs font-black min-w-[20px] text-right font-mono" style={{ color: item.count > 0 ? item.color : '#3f3f46' }}>
                            {item.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-center p-4">
                  <p className="text-xs text-zinc-600 font-sans">Trade ထွက်ပြီးနောက် စိတ်အခြေအနေ ဒေတာမရှိသေးပါ</p>
                </div>
              )}
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


