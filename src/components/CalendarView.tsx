import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'months' | 'years'>('months');
  const [yearRangeStart, setYearRangeStart] = useState(() => Math.floor(panelDate.year() / 12) * 12);

  const pickerContainerRef = useRef<HTMLDivElement>(null);

  // Close picker on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const weeksChunked = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < gridDays.length; i += 7) {
      chunks.push(gridDays.slice(i, i + 7));
    }
    return chunks;
  }, [gridDays]);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-2xl bg-white dark:bg-[#12161c] border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm">
        
        {/* Custom Header Render */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-[#161c24]">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* View Month Title & Controls with Floating Picker Popover */}
            <div className="relative flex flex-wrap items-center gap-2" ref={pickerContainerRef}>
              <button 
                type="button"
                onClick={() => setPanelDate(panelDate.subtract(1, 'month'))}
                className="p-1.5 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#1a212b] dark:border-white/10 dark:hover:bg-[#222b38] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer border border-zinc-200 dark:border-white/10"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isPickerOpen && pickerMode === 'months') {
                    setIsPickerOpen(false);
                  } else {
                    setPickerMode('months');
                    setIsPickerOpen(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#1a212b] dark:border-white/10 dark:hover:bg-[#222b38] text-sm font-black text-zinc-800 dark:text-zinc-100 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all cursor-pointer border border-zinc-200 dark:border-white/10 flex items-center gap-1.5"
              >
                <span>{panelDate.format('MMMM')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setYearRangeStart(Math.floor(panelDate.year() / 12) * 12);
                  if (isPickerOpen && pickerMode === 'years') {
                    setIsPickerOpen(false);
                  } else {
                    setPickerMode('years');
                    setIsPickerOpen(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#1a212b] dark:border-white/10 dark:hover:bg-[#222b38] text-sm font-black text-zinc-800 dark:text-zinc-100 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all cursor-pointer border border-zinc-200 dark:border-white/10"
              >
                <span>{panelDate.format('YYYY')}</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setPanelDate(dayjs());
                  setIsPickerOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#1a212b] dark:border-white/10 dark:hover:bg-[#222b38] text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer border border-zinc-200 dark:border-white/10 ml-1"
              >
                Today
              </button>

              <button 
                type="button"
                onClick={() => setPanelDate(panelDate.add(1, 'month'))}
                className="p-1.5 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#1a212b] dark:border-white/10 dark:hover:bg-[#222b38] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer border border-zinc-200 dark:border-white/10"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>

              {/* Floating DatePicker Popover */}
              {isPickerOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#161c24] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden w-[310px] p-4 text-zinc-800 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-150">
                  {pickerMode === 'months' && (
                    <div>
                      {/* Popover Header */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={() => setPanelDate(panelDate.subtract(1, 'year'))}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-[#222b38] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                          title="Previous Year"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="font-bold text-xs select-none tracking-wide text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400">Select Month for</span>
                          <button
                            type="button"
                            onClick={() => {
                              setYearRangeStart(Math.floor(panelDate.year() / 12) * 12);
                              setPickerMode('years');
                            }}
                            className="px-2 py-0.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            {panelDate.year()}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPanelDate(panelDate.add(1, 'year'))}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-[#222b38] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                          title="Next Year"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* 3x4 Month Grid */}
                      <div className="grid grid-cols-3 gap-2 py-1">
                        {MONTHS.map((mName, mIdx) => {
                          const isSelected = mIdx === panelDate.month();
                          return (
                            <button
                              key={mName}
                              type="button"
                              onClick={() => {
                                setPanelDate(panelDate.month(mIdx));
                                setIsPickerOpen(false);
                              }}
                              className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                  : 'bg-zinc-100 dark:bg-[#1a212b] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#222b38] hover:text-zinc-900 dark:hover:text-white border border-transparent'
                              }`}
                            >
                              {mName}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/10 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPanelDate(dayjs());
                            setIsPickerOpen(false);
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-center cursor-pointer"
                        >
                          TODAY
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPickerOpen(false)}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-[#1a212b] border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-[#222b38] transition-all text-center cursor-pointer"
                        >
                          CLOSE
                        </button>
                      </div>
                    </div>
                  )}

                  {pickerMode === 'years' && (
                    <div>
                      {/* Popover Header */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={() => setYearRangeStart(yearRangeStart - 12)}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-[#222b38] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                          title="Previous 12 Years"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="font-black text-xs select-none tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                          {yearRangeStart} – {yearRangeStart + 11}
                        </div>
                        <button
                          type="button"
                          onClick={() => setYearRangeStart(yearRangeStart + 12)}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-[#222b38] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                          title="Next 12 Years"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* 3x4 Year Grid */}
                      <div className="grid grid-cols-3 gap-2 py-1">
                        {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((yNum) => {
                          const isSelected = yNum === panelDate.year();
                          return (
                            <button
                              key={yNum}
                              type="button"
                              onClick={() => {
                                setPanelDate(panelDate.year(yNum));
                                setPickerMode('months');
                              }}
                              className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                  : 'bg-zinc-100 dark:bg-[#1a212b] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#222b38] hover:text-zinc-900 dark:hover:text-white border border-transparent'
                              }`}
                            >
                              {yNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/10 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPanelDate(dayjs());
                            setIsPickerOpen(false);
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-center cursor-pointer"
                        >
                          TODAY
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPickerOpen(false)}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-[#1a212b] border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-[#222b38] transition-all text-center cursor-pointer"
                        >
                          CLOSE
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Middle/Right: stats */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Monthly Stats */}
              <div className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 bg-white dark:bg-[#1a212b]">
                <span>Tr: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{monthlyStats.totalTrades}</span></span>
                <span>WR: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{monthlyStats.winRate.toFixed(0)}%</span></span>
                <span>RR: <span className={`font-bold ${monthlyStats.isPositive ? 'text-emerald-600 dark:text-[#34d399]' : 'text-rose-500 dark:text-[#f87171]'}`}>
                  {monthlyStats.isPositive ? '+' : ''}{monthlyStats.totalRR.toFixed(1)}R
                </span></span>
              </div>
            </div>

          </div>
        </div>

        {/* Custom Calendar Grid & Weekly Summary */}
        <div className="p-3 flex flex-col gap-[6px]">
          {/* Weekdays Header Row */}
          <div className="grid grid-cols-7 lg:grid-cols-8 gap-[6px]">
            {WEEKDAYS.map(day => (
              <div 
                key={day} 
                className="flex items-center justify-center text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider h-8 rounded-[8px] bg-zinc-50/80 dark:bg-[#161c24] border border-zinc-200/70 dark:border-white/5"
              >
                {day}
              </div>
            ))}
            <div className="hidden lg:flex items-center justify-center text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-400 leading-tight text-center tracking-wider h-8 rounded-[8px] bg-zinc-50/80 dark:bg-[#161c24] border border-zinc-200/70 dark:border-white/5">
              Weekly<br />Summary
            </div>
          </div>

          {/* 6 Week Rows */}
          <div className="flex flex-col gap-[6px]">
            {weeksChunked.map((weekDays, weekIdx) => {
              const weekSummary = weeklyData[weekIdx];
              return (
                <div key={weekIdx} className="grid grid-cols-7 lg:grid-cols-8 gap-[6px]">
                  {/* 7 Days in Week */}
                  {weekDays.map((value) => {
                    const isCurrentMonth = value.month() === panelDate.month() && value.year() === panelDate.year();
                    const currentKey = value.format('YYYY-MM-DD');
                    const dayData = tradesByDate[currentKey];
                    const tradesOnDay = dayData?.trades || [];
                    const totalRR = dayData ? dayData.totalRR : null;
                    const isPositive = dayData ? dayData.isPositive : false;
                    const isToday = value.isSame(dayjs(), 'day');
                    const hasNotes = tradesOnDay.some(t => t.notes);
                    const hasJournal = journals?.some(j => j.dateYMD === currentKey && j.content?.trim() !== '');

                    // Corporate Dashboard style with subtle slim left accent indicator line and rounded-[10px]
                    const borderAccentClass = totalRR !== null 
                      ? (isPositive 
                          ? 'border border-zinc-200/80 dark:border-white/10 border-l-2 border-l-emerald-500/90 dark:border-l-[#34d399] bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04]' 
                          : 'border border-zinc-200/80 dark:border-white/10 border-l-2 border-l-rose-400/90 dark:border-l-[#f87171] bg-rose-500/[0.03] dark:bg-rose-500/[0.04]'
                        )
                      : 'border border-zinc-200/70 dark:border-white/5 bg-white dark:bg-[#161c24]';

                    return (
                      <div
                        key={currentKey}
                        onClick={() => isCurrentMonth && onSelectDay(value)}
                        className={`transition-all duration-200 ease-out h-[84px] rounded-[10px] flex flex-col justify-between p-2 relative group hover:z-20
                          ${!isCurrentMonth ? 'opacity-25 pointer-events-none grayscale' : 'cursor-pointer hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-[#1c2430] hover:shadow-sm'}
                          ${borderAccentClass}
                        `}
                      >
                        {/* Top: Date Number & Indicators */}
                        <div className="flex justify-between items-start w-full">
                          <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-[6px] ${isToday ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#34d399] font-black border border-emerald-500/20' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {value.date()}
                          </span>
                          <div className="flex gap-1">
                            {hasJournal && (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" title="Daily Journal written" />
                            )}
                            {hasNotes && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-sm" title="Day has notes" />
                            )}
                          </div>
                        </div>
                        
                        {/* Center: Text Hierarchy - Trade Count (secondary) & R-Value (primary) */}
                        {totalRR !== null && (
                          <div className="flex-1 flex flex-col items-center justify-center text-center -mt-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              {tradesOnDay.length} {tradesOnDay.length === 1 ? 'trade' : 'trades'}
                            </span>
                            <span className={`text-xs font-black tracking-tight leading-tight mt-0.5 ${isPositive ? 'text-emerald-600 dark:text-[#34d399]' : 'text-rose-500 dark:text-[#f87171]'}`}>
                              {isPositive ? '+' : ''}{totalRR.toFixed(1)}R
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Weekly Summary Cell */}
                  {weekSummary && (
                    <div className={`hidden lg:flex flex-col items-center justify-center p-2 rounded-[10px] relative group transition-colors h-[84px] ${
                      weekSummary.tradesCount > 0 
                        ? (weekSummary.isPositive 
                            ? 'border border-zinc-200/80 dark:border-white/10 border-l-2 border-l-emerald-500/70 dark:border-l-[#34d399]/80 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03]' 
                            : 'border border-zinc-200/80 dark:border-white/10 border-l-2 border-l-rose-400/70 dark:border-l-[#f87171]/80 bg-rose-500/[0.02] dark:bg-rose-500/[0.03]'
                          ) 
                        : 'border border-zinc-200/70 dark:border-white/5 bg-zinc-50/40 dark:bg-[#161c24]'
                    }`}>
                      {weekSummary.tradesCount > 0 ? (
                        <>
                          <div className="flex flex-col items-center text-center">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              {weekSummary.tradesCount} {weekSummary.tradesCount === 1 ? 'trade' : 'trades'}
                            </span>
                          </div>
                          
                          <div className="mt-0.5 flex flex-col items-center text-center">
                            <span className={`text-xs font-black tracking-tight leading-tight ${weekSummary.isPositive ? 'text-emerald-600 dark:text-[#34d399]' : 'text-rose-500 dark:text-[#f87171]'}`}>
                              {weekSummary.isPositive ? '+' : ''}{weekSummary.totalRR.toFixed(1)}R
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 italic">No activity</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
      <YearlyPerformance trades={trades} />
    </div>
  );
}
