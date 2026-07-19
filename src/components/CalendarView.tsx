import React, { useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Trade } from '../types';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import YearlyPerformance from './YearlyPerformance';
import { getSafeDate } from '../lib/dateUtils';

interface CalendarViewProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onSelectDay: (date: Dayjs) => void;
  panelDate: Dayjs;
  setPanelDate: (date: Dayjs) => void;
  journals?: any[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CalendarView({ trades, onSelectTrade, onSelectDay, panelDate, setPanelDate, journals }: CalendarViewProps) {

  // Optimize: Group trades by date and pre-calculate totals to avoid repeated iteration in cell renders
  const tradesByDate = useMemo(() => {
    const map: Record<string, { trades: Trade[], totalRR: number, isPositive: boolean }> = {};
    trades.forEach(trade => {
      if (trade.openTime) {
        const date = getSafeDate(trade.openTime);
        if (date) {
          const dateKey = format(date, 'yyyy-MM-dd');
          if (!map[dateKey]) {
            map[dateKey] = { trades: [], totalRR: 0, isPositive: false };
          }
          map[dateKey].trades.push(trade);
          map[dateKey].totalRR += (trade.rr || 0);
        }
      }
    });

    // Finalize isPositive for each day
    Object.values(map).forEach(day => {
      day.isPositive = day.totalRR >= 0;
    });

    return map;
  }, [trades]);

  const monthlyStats = useMemo(() => {
    const currentMonth = panelDate.month();
    const currentYear = panelDate.year();
    
    const monthlyTrades = trades.filter(trade => {
      if (!trade.openTime) return false;
      const date = getSafeDate(trade.openTime);
      return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalTrades = monthlyTrades.length;
    const totalRR = monthlyTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
    const wins = monthlyTrades.filter(t => (t.rr || 0) > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      totalTrades,
      totalRR,
      winRate,
      isPositive: totalRR >= 0
    };
  }, [panelDate, trades]);

  const weeklyData = useMemo(() => {
    if (!panelDate || typeof panelDate.startOf !== 'function') return [];
    
    const startOfMonth = panelDate.startOf('month');
    const startDayOfWeek = startOfMonth.day(); // 0 is Sunday, 1 is Monday, etc.
    const startOfCalendar = startOfMonth.subtract(startDayOfWeek, 'day');
    const weeks = [];
    
    for (let i = 0; i < 6; i++) {
      const weekStart = startOfCalendar.add(i * 7, 'day');
      
      let weeklyTradesCount = 0;
      let weeklyTotalRR = 0;

      // Efficiently aggregate weekly data using pre-calculated map
      for (let d = 0; d < 7; d++) {
        const currentDay = weekStart.add(d, 'day');
        const dateKey = currentDay.format('YYYY-MM-DD');
        const dayData = tradesByDate[dateKey];
        if (dayData) {
          weeklyTradesCount += dayData.trades.length;
          weeklyTotalRR += dayData.totalRR;
        }
      }
      
      weeks.push({
        start: weekStart,
        tradesCount: weeklyTradesCount,
        totalRR: weeklyTotalRR,
        isPositive: weeklyTotalRR >= 0
      });
    }
    return weeks;
  }, [panelDate, tradesByDate]);

  const gridDays = useMemo(() => {
    const startOfMonth = panelDate.startOf('month');
    const startDayOfWeek = startOfMonth.day(); // 0 (Sunday) to 6 (Saturday)
    const startOfGrid = startOfMonth.subtract(startDayOfWeek, 'day');
    
    const days = [];
    let dayPointer = startOfGrid;
    for (let i = 0; i < 42; i++) {
      days.push(dayPointer);
      dayPointer = dayPointer.add(1, 'day');
    }
    return days;
  }, [panelDate]);

  const yearOptions = useMemo(() => {
    const years = [];
    const currentYearVal = dayjs().year();
    const startYear = currentYearVal - 10;
    const endYear = currentYearVal + 10;
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-2xl bg-white dark:bg-[#0F0F0F] border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm">
        
        {/* Custom Header Render */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.01]">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* View Month Title & Arrow Controls */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">
                {panelDate.format('MMMM, YYYY')}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setPanelDate(panelDate.subtract(1, 'month'))}
                  className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer border border-zinc-200 dark:border-white/5"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setPanelDate(dayjs())}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer border border-zinc-200 dark:border-white/5"
                >
                  Today
                </button>
                <button 
                  onClick={() => setPanelDate(panelDate.add(1, 'month'))}
                  className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer border border-zinc-200 dark:border-white/5"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Middle/Right: stats and selectors */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Monthly Stats */}
              <div className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-450 dark:text-zinc-500 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-1.5 bg-white dark:bg-transparent">
                <span>Tr: <span className="text-zinc-800 dark:text-zinc-300">{monthlyStats.totalTrades}</span></span>
                <span>WR: <span className="text-zinc-800 dark:text-zinc-300">{monthlyStats.winRate.toFixed(0)}%</span></span>
                <span>RR: <span className={`${monthlyStats.isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {monthlyStats.isPositive ? '+' : ''}{monthlyStats.totalRR.toFixed(1)}R
                </span></span>
              </div>

              {/* Year Selector */}
              <select
                value={panelDate.year()}
                onChange={(e) => setPanelDate(panelDate.year(parseInt(e.target.value)))}
                className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y} className="bg-white dark:bg-[#121214] text-zinc-800 dark:text-zinc-200">
                    {y}
                  </option>
                ))}
              </select>

              {/* Month Selector */}
              <select
                value={panelDate.month()}
                onChange={(e) => setPanelDate(panelDate.month(parseInt(e.target.value)))}
                className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx} className="bg-white dark:bg-[#121214] text-zinc-800 dark:text-zinc-200">
                    {m}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Custom Calendar Grid & Weekly Summary */}
        <div className="flex">
          <div className="flex-1">
            {/* Weekdays Row */}
            <div className="grid grid-cols-7 border-b border-zinc-150/50 dark:border-white/[0.03] bg-zinc-50/50 dark:bg-white/[0.01] h-10">
              {WEEKDAYS.map(day => (
                <div key={day} className="flex items-center justify-center text-[10px] font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Days Grid (6 rows of 7 days) */}
            <div className="grid grid-cols-7 bg-zinc-100/30 dark:bg-transparent gap-px">
              {gridDays.map((value, index) => {
                const isCurrentMonth = value.month() === panelDate.month() && value.year() === panelDate.year();
                const currentKey = value.format('YYYY-MM-DD');
                const dayData = tradesByDate[currentKey];
                const tradesOnDay = dayData?.trades || [];
                const totalRR = dayData ? dayData.totalRR : null;
                const isPositive = dayData ? dayData.isPositive : false;
                const isToday = value.isSame(dayjs(), 'day');
                const hasNotes = tradesOnDay.some(t => t.notes);
                const hasJournal = journals?.some(j => j.dateYMD === currentKey && j.content?.trim() !== '');

                return (
                  <div
                    key={currentKey}
                    onClick={() => isCurrentMonth && onSelectDay(value)}
                    className={`transition-all duration-300 ease-out h-[84px] flex flex-col justify-between p-2 relative group hover:z-20 border border-zinc-150/45 dark:border-white/[0.01] hover:border-zinc-300 dark:hover:border-white/[0.1]
                      ${!isCurrentMonth ? 'opacity-20 pointer-events-none grayscale' : 'cursor-pointer hover:scale-[1.03] hover:shadow-lg'}
                      ${totalRR !== null 
                        ? (isPositive 
                            ? 'bg-emerald-500/5 dark:bg-emerald-500/15 shadow-[inset_0_0_15px_rgba(16,185,129,0.03)] hover:shadow-emerald-500/20 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20' 
                            : 'bg-red-500/5 dark:bg-red-500/15 shadow-[inset_0_0_15px_rgba(239,68,68,0.03)] hover:shadow-red-500/20 hover:bg-red-500/10 dark:hover:bg-red-500/20'
                          )
                        : 'bg-white hover:bg-zinc-100/50 dark:bg-transparent dark:hover:bg-white/[0.04]'
                      } 
                    `}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${isToday ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/20' : 'text-zinc-500 dark:text-zinc-500'}`}>
                        {value.date()}
                      </span>
                      <div className="flex gap-1">
                        {hasJournal && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Daily Journal written" />
                        )}
                        {hasNotes && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" title="Day has notes" />
                        )}
                      </div>
                    </div>
                    
                    {totalRR !== null && (
                      <div className="flex flex-col items-end w-full">
                        <span className={`text-xs font-black leading-none ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {isPositive ? '+' : ''}{totalRR.toFixed(1)}R
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 mt-0.5">
                          {tradesOnDay.length} {tradesOnDay.length === 1 ? 'trade' : 'trades'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Summary Column */}
          <div className="hidden lg:flex flex-col w-[14.2857%] border-l border-zinc-200 dark:border-white/[0.03] -mt-px">
            {/* Header spacer */}
            <div className="h-10 flex items-center justify-center border-b border-zinc-200 dark:border-white/[0.03] bg-zinc-50/50 dark:bg-white/[0.01]">
              <div className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-500 leading-tight text-center tracking-wider">
                Weekly<br />Summary
              </div>
            </div>
            
            <div className="flex flex-col">
              {weeklyData.map((week, idx) => (
                <div 
                  key={idx} 
                  className={`h-[84px] flex flex-col items-center justify-center relative group transition-colors border-b border-zinc-150/40 dark:border-b-white/[0.02] ${
                    week.tradesCount > 0 
                      ? (week.isPositive ? 'bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]' : 'bg-red-500/[0.01] dark:bg-red-500/[0.02]') 
                      : 'bg-transparent'
                  }`}
                >
                  {week.tradesCount > 0 ? (
                    <>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                          {week.tradesCount} {week.tradesCount === 1 ? 'trade' : 'trades'}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex flex-col items-center text-center">
                        <span className={`text-xs font-black leading-none ${week.isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                          {week.isPositive ? '+' : ''}{week.totalRR.toFixed(1)}R
                        </span>
                      </div>

                      {/* Visual indicator bar */}
                      <div className={`absolute right-0 top-2 bottom-2 w-0.5 rounded-l-full ${week.isPositive ? 'bg-emerald-500/30' : 'bg-red-500/30'}`} />
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 italic">No activity</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
      <YearlyPerformance trades={trades} />
    </div>
  );
}
