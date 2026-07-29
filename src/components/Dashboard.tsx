import React, { useMemo, useState } from 'react';
import { getSafeDate } from '../lib/dateUtils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, BarChart, Bar, Legend, LabelList, ReferenceLine
} from 'recharts';
import DateRangePicker from './ui/DateRangePicker';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

interface DashboardProps {
  trades: Trade[];
}

const COLORS = ['#10b981', '#ef4444'];

function cleanEmotionLabel(key: string, label: string): string {
  const labelMap: Record<string, string> = {
    calm: 'Calm (တည်ငြိမ်မှုရှိ)',
    excited: 'Excited (စိတ်လှုပ်ရှားနေ)',
    confident: 'Confident (ယုံကြည်မှုရှိ)',
    hesitant: 'Hesitant (တွန့်ဆုတ်နေ)',
    fomo: 'FOMO (နောက်ကျကျန်စိုးရိမ်)',
    impatient: 'Impatient (စိတ်မရှည်ဖြစ်နေ)',
    bored: 'Bored (ပျင်းရိနေ)',
    peaceful: 'Peaceful (စိတ်အေးချမ်း)',
    anxious: 'Anxious (စိုးရိမ်ပူပန်)',
    relaxed: 'Relaxed (စိတ်ပေါ့ပါး)',
    obsessive: 'Obsessive (စခရင်အမြဲကြည့်နေ)',
    fearing_loss: 'Fear loss (ရှုံးမှာကြောက်နေ)',
    greed_surge: 'Greed (ပိုလိုချင်စိတ်စွတ်)',
    satisfied_disciplined: 'Disciplined (စည်းကမ်းလိုက်နာခဲ့၍ကျေနပ်)',
    satisfied_lucky: 'Lucky win (ကံကောင်း၍ကျေနပ်)',
    relieved: 'Relieved (သက်ပြင်းချနိုင်ခဲ့)',
    frustrated: 'Frustrated (စိတ်ပျက်ဒေါသထွက်)',
    regretful_sl: 'Regret SL (ရှုံး၍နောင်တရ)',
    regretful_early_exit: 'Early exit (စောထွက်မိ၍နောင်တရ)',
    neutral_accepting: 'Neutral (ရလဒ်ကိုလက်ခံ)'
  };
  if (labelMap[key]) return labelMap[key];
  if (label.includes('/')) {
    const parts = label.split('/');
    const eng = parts[0].replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();
    const mm = parts[1] ? parts[1].trim() : '';
    return mm ? `${eng} (${mm})` : eng;
  }
  return label;
}

export default function Dashboard({ trades }: DashboardProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [growthTimeframe, setGrowthTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const growthData = useMemo(() => {
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

    const closedTrades = filteredTrades.filter(t => t.exitPrice !== null && t.exitPrice !== undefined && t.rr !== undefined && t.rr !== null);

    const agg: Record<string, { periodRR: number; dateObj: Date; label: string; count: number }> = {};

    closedTrades.forEach(t => {
      const d = getSafeDate(t.openTime);
      if (!d) return;

      let key = '';
      let label = '';
      let dateObj = d;

      if (growthTimeframe === 'daily') {
        key = format(d, 'yyyy-MM-dd');
        label = format(d, 'MMM dd');
        dateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      } else if (growthTimeframe === 'weekly') {
        const sOfWeek = startOfWeek(d, { weekStartsOn: 1 });
        key = format(sOfWeek, 'yyyy-MM-dd');
        label = `W${format(sOfWeek, 'w')} (${format(sOfWeek, 'MMM dd')})`;
        dateObj = sOfWeek;
      } else if (growthTimeframe === 'monthly') {
        const sOfMonth = startOfMonth(d);
        key = format(sOfMonth, 'yyyy-MM');
        label = format(sOfMonth, 'MMM yyyy');
        dateObj = sOfMonth;
      } else if (growthTimeframe === 'yearly') {
        const sOfYear = startOfYear(d);
        key = format(sOfYear, 'yyyy');
        label = format(sOfYear, 'yyyy');
        dateObj = sOfYear;
      }

      if (!agg[key]) {
        agg[key] = { periodRR: 0, dateObj, label, count: 0 };
      }
      agg[key].periodRR += (t.rr || 0);
      agg[key].count += 1;
    });

    const sortedGroups = Object.values(agg).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    let cumulativeRR = 0;
    return sortedGroups.map(item => {
      cumulativeRR += item.periodRR;
      return {
        period: item.label,
        rr: Number(cumulativeRR.toFixed(2)),
        periodRR: Number(item.periodRR.toFixed(2)),
        count: item.count
      };
    });
  }, [trades, startDate, endDate, growthTimeframe]);


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

    const PSYCHOLOGY_COLORS = ['#3b82f6', '#f97316', '#10b981', '#eab308', '#ec4899', '#16a34a', '#6366f1'];

    const preTradeData = Object.entries(preTradeMap)
      .map(([key, item]) => ({
        cleanName: cleanEmotionLabel(key, item.label),
        count: item.count
      }))
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({ ...item, color: PSYCHOLOGY_COLORS[idx % PSYCHOLOGY_COLORS.length] }));

    const duringTradeData = Object.entries(duringTradeMap)
      .map(([key, item]) => ({
        cleanName: cleanEmotionLabel(key, item.label),
        count: item.count
      }))
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({ ...item, color: PSYCHOLOGY_COLORS[idx % PSYCHOLOGY_COLORS.length] }));

    const postTradeData = Object.entries(postTradeMap)
      .map(([key, item]) => ({
        cleanName: cleanEmotionLabel(key, item.label),
        count: item.count
      }))
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({ ...item, color: PSYCHOLOGY_COLORS[idx % PSYCHOLOGY_COLORS.length] }));

    // Day of week calculation (Monday to Friday)
    const dayOfWeekMap: Record<string, { wins: number; losses: number; rawLosses: number }> = {
      'Monday': { wins: 0, losses: 0, rawLosses: 0 },
      'Tuesday': { wins: 0, losses: 0, rawLosses: 0 },
      'Wednesday': { wins: 0, losses: 0, rawLosses: 0 },
      'Thursday': { wins: 0, losses: 0, rawLosses: 0 },
      'Friday': { wins: 0, losses: 0, rawLosses: 0 },
    };

    closedTrades.forEach(t => {
      const d = getSafeDate(t.openTime);
      if (!d) return;
      const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 5 is Friday, 6 is Saturday
      if (dayIndex >= 1 && dayIndex <= 5) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[dayIndex];
        const rr = t.rr || 0;
        if (rr > 0) {
          dayOfWeekMap[dayName].wins += 1;
        } else {
          dayOfWeekMap[dayName].losses += 1; // positive value to stack upwards along with wins
          dayOfWeekMap[dayName].rawLosses += 1; // real count for display
        }
      }
    });

    const dayOfWeekData = [
      { day: 'Monday', wins: dayOfWeekMap['Monday'].wins, losses: dayOfWeekMap['Monday'].losses, rawLosses: dayOfWeekMap['Monday'].rawLosses },
      { day: 'Tuesday', wins: dayOfWeekMap['Tuesday'].wins, losses: dayOfWeekMap['Tuesday'].losses, rawLosses: dayOfWeekMap['Tuesday'].rawLosses },
      { day: 'Wednesday', wins: dayOfWeekMap['Wednesday'].wins, losses: dayOfWeekMap['Wednesday'].losses, rawLosses: dayOfWeekMap['Wednesday'].rawLosses },
      { day: 'Thursday', wins: dayOfWeekMap['Thursday'].wins, losses: dayOfWeekMap['Thursday'].losses, rawLosses: dayOfWeekMap['Thursday'].rawLosses },
      { day: 'Friday', wins: dayOfWeekMap['Friday'].wins, losses: dayOfWeekMap['Friday'].losses, rawLosses: dayOfWeekMap['Friday'].rawLosses },
    ];

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
      dayOfWeekData,
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
          subValue={
            <span className="text-xs font-semibold text-zinc-400">
              (<span className="text-emerald-400">{stats.wins}</span> / <span className="text-red-400">{stats.losses}</span>)
            </span>
          }
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
        {/* Equity Curve / RR Growth */}
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                RR Growth
              </h3>
            </div>

            {/* Timeframe Selector */}
            <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1 gap-1 self-start sm:self-auto">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setGrowthTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                    growthTimeframe === tf
                      ? 'bg-emerald-500 text-black shadow-md font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  {tf === 'daily' && 'Daily'}
                  {tf === 'weekly' && 'Weekly'}
                  {tf === 'monthly' && 'Monthly'}
                  {tf === 'yearly' && 'Yearly'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full">
            {growthData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-2xl">
                No trade data available for this timeframe
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    angle={-90}
                    textAnchor="end"
                    height={55}
                    dy={5}
                  />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const cumRR = Number(data.rr);
                        const pRR = Number(data.periodRR);
                        return (
                          <div className="bg-[#18181b] border border-white/10 rounded-xl p-3 shadow-xl space-y-1 text-xs">
                            <p className="font-bold text-zinc-200 font-sans mb-1">{data.period}</p>
                            <div className="flex justify-between items-center gap-6">
                              <span className="text-zinc-400">Cumulative RR:</span>
                              <span className={`font-mono font-bold ${cumRR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {cumRR >= 0 ? `+${cumRR.toFixed(2)}` : cumRR.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-6">
                              <span className="text-zinc-400">Period RR:</span>
                              <span className={`font-mono font-semibold ${pRR >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                                {pRR >= 0 ? `+${pRR.toFixed(2)}` : pRR.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-6 pt-1 border-t border-white/5 text-[11px]">
                              <span className="text-zinc-500">Trades:</span>
                              <span className="text-zinc-300 font-mono font-medium">{data.count}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="rr" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" activeDot={{ r: 4, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
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

      {/* Day of Week Performance */}
      <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
        <h3 className="text-lg font-semibold mb-2 font-sans">Day of Week Performance</h3>
        <p className="text-xs text-zinc-500 mb-6 font-sans">
          Monday to Friday trade win/loss distribution based on RR value
        </p>
        <div className="flex-1 flex flex-col justify-center">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.dayOfWeekData}
                barSize={14}
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  type="category" 
                  stroke="#52525b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  type="number" 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => Math.abs(value).toString()} // Show absolute count
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#18181b] border border-white/10 rounded-xl p-3 shadow-xl space-y-1">
                          <p className="text-xs font-bold text-zinc-200 mb-1 font-sans">{data.day}</p>
                          <p className="text-xs text-emerald-500 font-medium flex justify-between gap-6">
                            <span className="font-sans">{"Wins (RR > 0):"}</span>
                            <span className="font-mono font-bold">{data.wins}</span>
                          </p>
                          <p className="text-xs text-red-500 font-medium flex justify-between gap-6">
                            <span className="font-sans">{"Losses (RR ≤ 0):"}</span>
                            <span className="font-mono font-bold">{data.rawLosses}</span>
                          </p>
                          <div className="border-t border-white/5 my-1.5 pt-1.5 flex justify-between text-xs font-bold text-zinc-300 gap-6 font-sans">
                            <span>Total Trades:</span>
                            <span className="font-mono text-emerald-400">{data.wins + data.rawLosses}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#ffffff20" />
                <Bar dataKey="losses" fill="#ef4444" stackId="stack" barSize={14} radius={[0, 0, 4, 4]} />
                <Bar dataKey="wins" fill="#10b981" stackId="stack" barSize={14} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-zinc-500 font-sans">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>{"Losses (RR ≤ 0)"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>{"Wins (RR > 0)"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trader Psychology Analysis */}
      <div className="space-y-6">
        <div className="border-t border-white/5 pt-6">
          <h3 className="text-lg font-semibold text-emerald-500">Trader Psychology</h3>
        </div>

        <div className="flex flex-col gap-6">
          <PsychologyHorizontalChart title="Before entry" data={stats.preTradeData} />
          <PsychologyHorizontalChart title="During trade" data={stats.duringTradeData} />
          <PsychologyHorizontalChart title="After exit" data={stats.postTradeData} />
        </div>
      </div>

      {/* AI Insights */}
    </div>
  );
}

function StatCard({ title, value, subValue, icon, trend }: { title: string, value: string, subValue?: React.ReactNode, icon: React.ReactNode, trend?: 'positive' | 'negative' }) {
  return (
    <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-500 text-sm font-medium">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {subValue && (
          <div className="mb-0.5">
            {subValue}
          </div>
        )}
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

function PsychologyHorizontalChart({ title, data }: { title: string; data: { cleanName: string; count: number; color: string }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 0);
  const xDomainMax = Math.max(maxCount + 1, 5);

  return (
    <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-white/5 flex flex-col w-full">
      <h4 className="text-base font-bold text-zinc-100 mb-4">{title}</h4>
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
          >
            <CartesianGrid horizontal={false} stroke="#ffffff10" />
            <XAxis 
              type="number" 
              domain={[0, xDomainMax]}
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={{ stroke: '#ffffff15' }}
              tickLine={{ stroke: '#ffffff15' }}
              allowDecimals={false}
            />
            <YAxis 
              type="category" 
              dataKey="cleanName" 
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={230}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#18181b] border border-white/10 p-2.5 rounded-xl shadow-xl text-xs">
                      <span className="font-bold text-white">{item.cleanName}: </span>
                      <span className="font-mono text-emerald-400 font-black">{item.count}</span>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="count" barSize={16} radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


