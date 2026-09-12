import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Trade } from '../types';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, BarChart3, Clock } from 'lucide-react';
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

interface AssignedTimelineTrade {
  trade: Trade;
  startDayIdx: number;
  endDayIdx: number;
  span: number;
  slot: number;
  timeDisplay: string;
  durationDisplay: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CalendarView({ trades, onSelectTrade, onSelectDay, panelDate, setPanelDate, journals }: CalendarViewProps) {
  const [calendarMode, setCalendarMode] = useState<'summary' | 'timeline'>(() => {
    return (localStorage.getItem('preferred_calendar_mode') as 'summary' | 'timeline') || 'timeline';
  });
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

  // Pre-calculate timeline slot layout for each week chunk to support spanning trade bars
  const weeksTimelineLayout = useMemo(() => {
    return weeksChunked.map(weekDays => {
      const weekStart = weekDays[0].startOf('day').toDate();
      const weekEnd = weekDays[6].endOf('day').toDate();

      // Collect trades touching this week
      const weekTrades: Array<{
        trade: Trade;
        startIdx: number;
        endIdx: number;
        span: number;
        openDate: Date;
        closeDate: Date | null;
        timeDisplay: string;
        durationDisplay: string | null;
      }> = [];

      trades.forEach(trade => {
        const openDate = getSafeDate(trade.openTime || trade.entryDateTime);
        if (!openDate) return;
        const closeDate = getSafeDate(trade.closeTime || trade.exitDateTime);

        const tradeStart = openDate;
        const tradeEnd = closeDate || openDate;

        // Check if trade overlaps this week
        if (tradeEnd < weekStart || tradeStart > weekEnd) return;

        // Determine start day in week (0 to 6)
        let startIdx = 0;
        if (tradeStart >= weekStart) {
          const openKey = format(openDate, 'yyyy-MM-dd');
          const found = weekDays.findIndex(d => d.format('YYYY-MM-DD') === openKey);
          startIdx = found !== -1 ? found : 0;
        }

        // Determine end day in week (0 to 6)
        let endIdx = 6;
        if (tradeEnd <= weekEnd) {
          const closeKey = closeDate ? format(closeDate, 'yyyy-MM-dd') : format(openDate, 'yyyy-MM-dd');
          const found = weekDays.findIndex(d => d.format('YYYY-MM-DD') === closeKey);
          endIdx = found !== -1 && found >= startIdx ? found : startIdx;
        }

        const span = Math.max(1, endIdx - startIdx + 1);

        // Time format display: e.g. "17:30 → 13:30" or "17:30"
        const openStr = openDate ? format(openDate, 'HH:mm') : '';
        const closeStr = closeDate ? format(closeDate, 'HH:mm') : '';
        let timeDisplay = openStr;
        if (openStr && closeStr && openStr !== closeStr) {
          timeDisplay = `${openStr} → ${closeStr}`;
        } else if (!openStr && closeStr) {
          timeDisplay = closeStr;
        }

        // Duration string display: e.g. "2h 45m" or "1d 3h"
        let durationDisplay: string | null = null;
        if (openDate && closeDate) {
          const diffMs = Math.abs(closeDate.getTime() - openDate.getTime());
          const diffMins = Math.round(diffMs / (1000 * 60));
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          const days = Math.floor(hrs / 24);
          if (days > 0) {
            durationDisplay = `${days}d ${hrs % 24}h`;
          } else if (hrs > 0) {
            durationDisplay = `${hrs}h ${mins}m`;
          } else if (mins > 0) {
            durationDisplay = `${mins}m`;
          }
        }

        weekTrades.push({
          trade,
          startIdx,
          endIdx,
          span,
          openDate,
          closeDate,
          timeDisplay,
          durationDisplay,
        });
      });

      // Sort trades: startDayIdx asc, span desc (multi-day first), openDate asc
      weekTrades.sort((a, b) => {
        if (a.startIdx !== b.startIdx) return a.startIdx - b.startIdx;
        if (b.span !== a.span) return b.span - a.span;
        return a.openDate.getTime() - b.openDate.getTime();
      });

      // Assign non-colliding slots (0, 1, 2, ...) across days
      const daySlots: Array<Set<number>> = Array.from({ length: 7 }, () => new Set<number>());
      const assignedTrades: AssignedTimelineTrade[] = [];

      for (const item of weekTrades) {
        let slot = 0;
        while (true) {
          let conflict = false;
          for (let d = item.startIdx; d <= item.endIdx; d++) {
            if (daySlots[d].has(slot)) {
              conflict = true;
              break;
            }
          }
          if (!conflict) break;
          slot++;
        }

        for (let d = item.startIdx; d <= item.endIdx; d++) {
          daySlots[d].add(slot);
        }

        assignedTrades.push({
          trade: item.trade,
          startDayIdx: item.startIdx,
          endDayIdx: item.endIdx,
          span: item.span,
          slot,
          timeDisplay: item.timeDisplay,
          durationDisplay: item.durationDisplay,
        });
      }

      return {
        assignedTrades,
        daySlots,
      };
    });
  }, [weeksChunked, trades]);

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

            {/* Middle/Right: Mode Toggle & stats */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Calendar View Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a212b] shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMode('summary');
                    localStorage.setItem('preferred_calendar_mode', 'summary');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calendarMode === 'summary'
                      ? 'bg-zinc-100 dark:bg-[#282d38] text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="P&L Summary Mode: Trade count and R-value"
                >
                  <BarChart3 size={14} />
                  <span>Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMode('timeline');
                    localStorage.setItem('preferred_calendar_mode', 'timeline');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calendarMode === 'timeline'
                      ? 'bg-zinc-100 dark:bg-[#282d38] text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Timeline Mode: Trade pair, entry/exit times & duration"
                >
                  <Clock size={14} />
                  <span>Timeline</span>
                </button>
              </div>

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
        <div className="p-3 sm:p-4">
          {/* Weekdays Header Row - Clean horizontal text as in image */}
          <div className="grid grid-cols-7 lg:grid-cols-8 pb-3 pt-1">
            {WEEKDAYS.map(day => (
              <div 
                key={day} 
                className="text-center text-xs font-normal text-zinc-400 dark:text-zinc-400 tracking-wide"
              >
                {day}
              </div>
            ))}
            <div className="hidden lg:block text-center text-xs font-normal text-zinc-400 dark:text-zinc-400 tracking-wide">
              Weekly Summary
            </div>
          </div>

          {/* Continuous Table Grid Container */}
          <div className="border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#191919] shadow-xs">
            {weeksChunked.map((weekDays, weekIdx) => {
              const weekSummary = weeklyData[weekIdx];
              const weekTimeline = weeksTimelineLayout[weekIdx];
              return (
                <div key={weekIdx} className="grid grid-cols-7 lg:grid-cols-8 border-b border-zinc-200 dark:border-white/10 last:border-b-0">
                  {/* 7 Days in Week */}
                  {weekDays.map((value, dayIdx) => {
                    const isCurrentMonth = value.month() === panelDate.month() && value.year() === panelDate.year();
                    const currentKey = value.format('YYYY-MM-DD');
                    const dayData = tradesByDate[currentKey];
                    const tradesOnDay = dayData?.trades || [];
                    const totalRR = dayData ? dayData.totalRR : null;
                    const isPositive = dayData ? dayData.isPositive : false;
                    const isToday = value.isSame(dayjs(), 'day');
                    const hasNotes = tradesOnDay.some(t => t.notes);
                    const hasJournal = journals?.some(j => j.dateYMD === currentKey && j.content?.trim() !== '');

                    const hasTrades = totalRR !== null;
                    const isWeekend = dayIdx === 0 || dayIdx === 6;

                    // Display date format: e.g. "Sep 1" or "Oct 1" on the 1st of month, otherwise "2", "3", etc.
                    const isFirstDay = value.date() === 1;
                    const dateDisplay = isFirstDay ? `${value.format('MMM')} 1` : `${value.date()}`;

                    // Cell background:
                    // When trades exist: profit/loss tinted background
                    // When no trades (both current month & adjacent months):
                    // - Sat & Sun: #202020
                    // - Mon - Fri: #191919
                    const cellBg = hasTrades
                      ? (isPositive
                          ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.10] hover:bg-emerald-500/[0.14] dark:hover:bg-emerald-500/[0.14]'
                          : 'bg-rose-500/[0.08] dark:bg-rose-500/[0.10] hover:bg-rose-500/[0.14] dark:hover:bg-rose-500/[0.14]'
                        )
                      : (isWeekend
                          ? 'bg-zinc-100/60 dark:bg-[#202020] hover:bg-zinc-200/50 dark:hover:bg-[#262626]'
                          : 'bg-white dark:bg-[#191919] hover:bg-zinc-50 dark:hover:bg-[#212121]'
                        );

                    return (
                      <div
                        key={currentKey}
                        onClick={() => isCurrentMonth && onSelectDay(value)}
                        className={`relative transition-colors duration-150 min-h-[92px] sm:min-h-[104px] p-2 sm:p-2.5 flex flex-col justify-between ${
                          dayIdx === 6 ? 'border-r-0 lg:border-r' : 'border-r'
                        } border-zinc-200 dark:border-white/10 ${
                          !isCurrentMonth ? 'cursor-default' : 'cursor-pointer'
                        } ${cellBg}`}
                      >
                        {/* Top: Indicators (Left) & Date Number (Right) */}
                        <div className="flex justify-between items-start w-full">
                          {/* Journal / Note indicators on Left */}
                          <div className="flex items-center gap-1 min-h-[18px]">
                            {hasJournal && (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-xs" title="Daily Journal written" />
                            )}
                            {hasNotes && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-xs" title="Day has notes" />
                            )}
                          </div>

                          {/* Date Display on Right */}
                          {isToday ? (
                            <div className="w-6 h-6 rounded-full bg-[#d9534f] text-white flex items-center justify-center text-xs font-semibold shadow-xs">
                              {value.date()}
                            </div>
                          ) : (
                            <span className={`text-xs sm:text-sm leading-none pt-0.5 ${
                              isCurrentMonth 
                                ? 'font-medium text-zinc-800 dark:text-zinc-200' 
                                : 'font-normal text-zinc-400 dark:text-zinc-600'
                            }`}>
                              {dateDisplay}
                            </span>
                          )}
                        </div>

                        {/* Body Content based on calendarMode */}
                        {calendarMode === 'timeline' ? (
                          <div className="flex-1 flex flex-col gap-1 mt-1 w-full overflow-visible">
                            {(() => {
                              if (!weekTimeline) return null;
                              const { assignedTrades, daySlots } = weekTimeline;
                              const currentDaySlots = daySlots[dayIdx];
                              if (!currentDaySlots || currentDaySlots.size === 0) return null;

                              const maxSlot = Math.max(...Array.from(currentDaySlots));
                              const renderedSlots = [];

                              for (let s = 0; s <= maxSlot; s++) {
                                // 1. Trade starting on this day at slot s
                                const startingTrade = assignedTrades.find(t => t.startDayIdx === dayIdx && t.slot === s);
                                if (startingTrade) {
                                  const tradeRR = startingTrade.trade.rr ?? (startingTrade.trade.profit !== undefined ? (startingTrade.trade.profit > 0 ? 1 : startingTrade.trade.profit < 0 ? -1 : 0) : 0);
                                  const isProfit = tradeRR > 0;
                                  const isLoss = tradeRR < 0;

                                  const pillStyle = isProfit
                                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 dark:border-emerald-500/40'
                                    : isLoss
                                    ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 dark:bg-rose-950/80 dark:hover:bg-rose-900/90 dark:border-rose-500/40'
                                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 dark:bg-[#292c34] dark:hover:bg-[#353944] dark:border-white/10';

                                  const pairTextColor = isProfit
                                    ? 'text-emerald-950 dark:text-[#34d399]'
                                    : isLoss
                                    ? 'text-rose-950 dark:text-[#f87171]'
                                    : 'text-zinc-800 dark:text-zinc-100';

                                  const timeTextColor = isProfit
                                    ? 'text-emerald-800/90 dark:text-emerald-300/80'
                                    : isLoss
                                    ? 'text-rose-800/90 dark:text-rose-300/80'
                                    : 'text-zinc-500 dark:text-zinc-400';

                                  renderedSlots.push(
                                    <div
                                      key={`trade-${startingTrade.trade.id || `${dayIdx}-${s}`}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectTrade(startingTrade.trade);
                                      }}
                                      style={{
                                        width: startingTrade.span > 1 
                                          ? `calc(${startingTrade.span * 100}% + ${(startingTrade.span - 1)}px)` 
                                          : '100%',
                                        zIndex: startingTrade.span > 1 ? 25 : 10,
                                      }}
                                      className={`h-[22px] sm:h-[24px] rounded-[5px] border px-1.5 sm:px-2 flex items-center justify-between gap-1.5 cursor-pointer shadow-xs transition-all select-none group/pill relative shrink-0 ${pillStyle}`}
                                      title={`${startingTrade.trade.item || startingTrade.trade.pair || 'Trade'} | ${startingTrade.timeDisplay}${startingTrade.durationDisplay ? ` (Duration: ${startingTrade.durationDisplay})` : ''} | ${startingTrade.trade.profit >= 0 ? '+' : ''}$${startingTrade.trade.profit.toFixed(2)} (${(startingTrade.trade.rr || 0) >= 0 ? '+' : ''}${(startingTrade.trade.rr || 0).toFixed(1)}R)`}
                                    >
                                      {/* Left: Pair Name */}
                                      <div className="flex items-center min-w-0 overflow-hidden">
                                        <span className={`text-[10px] sm:text-[11px] font-bold lowercase tracking-tight truncate ${pairTextColor}`}>
                                          {startingTrade.trade.item || startingTrade.trade.pair || 'trade'}
                                        </span>
                                      </div>

                                      {/* Right: Time Range */}
                                      <div className={`flex items-center gap-1 shrink-0 ml-auto text-[9px] sm:text-[10px] font-mono ${timeTextColor}`}>
                                        <span>{startingTrade.timeDisplay}</span>
                                      </div>
                                    </div>
                                  );
                                  continue;
                                }

                                // 2. Trade spanning through this day at slot s from a previous day
                                const isSpanned = assignedTrades.some(t => t.startDayIdx < dayIdx && t.endDayIdx >= dayIdx && t.slot === s);
                                if (isSpanned) {
                                  // Placeholder spacer so slot height matches across columns
                                  renderedSlots.push(
                                    <div key={`spacer-${s}`} className="h-[22px] sm:h-[24px] pointer-events-none shrink-0" />
                                  );
                                  continue;
                                }

                                // 3. Empty slot spacer if a higher slot is used
                                renderedSlots.push(
                                  <div key={`empty-${s}`} className="h-[22px] sm:h-[24px] pointer-events-none shrink-0" />
                                );
                              }

                              return renderedSlots;
                            })()}
                          </div>
                        ) : (
                          /* Summary Mode: Trade Count & R-Value aligned to the right corner */
                          hasTrades && (
                            <div className="flex-1 flex flex-col items-end justify-end text-right mt-auto pt-1">
                              <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                {tradesOnDay.length} {tradesOnDay.length === 1 ? 'trade' : 'trades'}
                              </span>
                              <span className={`text-xs sm:text-sm font-black tracking-tight leading-tight mt-0.5 ${
                                isPositive ? 'text-emerald-600 dark:text-[#34d399]' : 'text-rose-500 dark:text-[#f87171]'
                              }`}>
                                {isPositive ? '+' : ''}{totalRR.toFixed(1)}R
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}

                  {/* Weekly Summary Cell (8th Column) */}
                  {weekSummary && (
                    <div className={`hidden lg:flex flex-col items-center justify-center p-2.5 transition-colors min-h-[92px] sm:min-h-[104px] ${
                      weekSummary.tradesCount > 0 
                        ? (weekSummary.isPositive 
                            ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]' 
                            : 'bg-rose-500/[0.04] dark:bg-rose-500/[0.06]'
                          ) 
                        : 'bg-zinc-50/40 dark:bg-[#191919]'
                    }`}>
                      {weekSummary.tradesCount > 0 ? (
                        <>
                          <div className="flex flex-col items-center text-center">
                            <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              {weekSummary.tradesCount} {weekSummary.tradesCount === 1 ? 'trade' : 'trades'}
                            </span>
                          </div>
                          
                          <div className="mt-0.5 flex flex-col items-center text-center">
                            <span className={`text-xs sm:text-sm font-black tracking-tight leading-tight ${
                              weekSummary.isPositive ? 'text-emerald-600 dark:text-[#34d399]' : 'text-rose-500 dark:text-[#f87171]'
                            }`}>
                              {weekSummary.isPositive ? '+' : ''}{weekSummary.totalRR.toFixed(1)}R
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600 italic">No activity</span>
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
