import React, { useState, useRef, useEffect } from 'react';
import { format, isBefore, isAfter, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  placeholderStart?: string;
  placeholderEnd?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholderStart = 'Start Date',
  placeholderEnd = 'End Date'
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Separate view date states for Left and Right calendars
  const [leftViewDate, setLeftViewDate] = useState<Date>(() => startDate || new Date());
  const [rightViewDate, setRightViewDate] = useState<Date>(() => {
    if (endDate) return endDate;
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });

  // Sync view states if values change from props
  useEffect(() => {
    if (startDate) {
      setLeftViewDate(startDate);
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      setRightViewDate(endDate);
    } else {
      // Set right calendar to one month ahead of left
      const nextMonth = new Date(leftViewDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setRightViewDate(nextMonth);
    }
  }, [endDate, leftViewDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calendar generation helpers
  const getDaysArray = (viewDate: Date) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding to reach full 42 grid cells
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Range helper to highlight intermediate dates
  const isInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return (isAfter(date, startDate) || isSameDay(date, startDate)) && 
           (isBefore(date, endDate) || isSameDay(date, endDate));
  };

  const isSelectedStart = (date: Date) => startDate && isSameDay(date, startDate);
  const isSelectedEnd = (date: Date) => endDate && isSameDay(date, endDate);

  const selectDate = (date: Date, type: 'start' | 'end') => {
    if (type === 'start') {
      if (endDate && isAfter(date, endDate)) {
        // If start date is set after current end date, push end date back or clear it
        onChange(date, null);
      } else {
        onChange(date, endDate);
      }
    } else {
      if (startDate && isBefore(date, startDate)) {
        // If end date is set before current start date, make this targeted date the start date
        onChange(date, null);
      } else {
        onChange(startDate, date);
      }
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger: beautiful double-input styling */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#18181b] border border-white/10 rounded-xl px-3 h-10 select-none hover:border-emerald-500/30 transition-all font-bold text-xs text-zinc-200 cursor-pointer"
      >
        <CalendarIcon size={14} className="text-zinc-500 shrink-0" />
        <div className="flex items-center gap-1 truncate max-w-[200px]">
          <span className={startDate ? 'text-zinc-200' : 'text-zinc-500'}>
            {startDate ? format(startDate, 'dd/MM/yy') : placeholderStart}
          </span>
          <span className="text-zinc-600">-</span>
          <span className={endDate ? 'text-zinc-200' : 'text-zinc-500'}>
            {endDate ? format(endDate, 'dd/MM/yy') : placeholderEnd}
          </span>
        </div>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null, null);
            }}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-all ml-1 cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 right-0 md:origin-top-right origin-top"
          >
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-5 text-zinc-200 w-[630px] max-w-[calc(100vw-32px)]">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/5">
                
                {/* LEFT CALENDAR: START DATE */}
                <div className="pb-4 md:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => setLeftViewDate(new Date(leftViewDate.getFullYear(), leftViewDate.getMonth() - 1, 1))}
                      className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="font-bold text-xs select-none tracking-wider text-emerald-500 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10">
                      START: {months[leftViewDate.getMonth()]} {leftViewDate.getFullYear()}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeftViewDate(new Date(leftViewDate.getFullYear(), leftViewDate.getMonth() + 1, 1))}
                      className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <div key={day} className="text-[10px] uppercase font-black text-zinc-500 py-1 tracking-wider">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {getDaysArray(leftViewDate).map((cell, idx) => {
                      const isStart = isSelectedStart(cell.date);
                      const isEnd = isSelectedEnd(cell.date);
                      const inRange = isInRange(cell.date);
                      
                      return (
                        <button
                          key={`start-${idx}`}
                          type="button"
                          onClick={() => selectDate(cell.date, 'start')}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer
                            ${!cell.isCurrentMonth ? 'text-zinc-700 hover:text-zinc-500' : 'text-zinc-200'}
                            ${isStart 
                              ? 'bg-emerald-500 text-black font-black hover:bg-emerald-400' 
                              : inRange
                                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                : 'hover:bg-white/5'
                            }
                          `}
                        >
                          {cell.date.getDate()}
                          {isStart && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-black" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT CALENDAR: END DATE */}
                <div className="pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => setRightViewDate(new Date(rightViewDate.getFullYear(), rightViewDate.getMonth() - 1, 1))}
                      className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="font-bold text-xs select-none tracking-wider text-rose-500 bg-rose-500/5 px-2.5 py-1 rounded-full border border-rose-500/10">
                      END: {months[rightViewDate.getMonth()]} {rightViewDate.getFullYear()}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRightViewDate(new Date(rightViewDate.getFullYear(), rightViewDate.getMonth() + 1, 1))}
                      className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <div key={day} className="text-[10px] uppercase font-black text-zinc-500 py-1 tracking-wider">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {getDaysArray(rightViewDate).map((cell, idx) => {
                      const isStart = isSelectedStart(cell.date);
                      const isEnd = isSelectedEnd(cell.date);
                      const inRange = isInRange(cell.date);

                      return (
                        <button
                          key={`end-${idx}`}
                          type="button"
                          onClick={() => selectDate(cell.date, 'end')}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer
                            ${!cell.isCurrentMonth ? 'text-zinc-700 hover:text-zinc-500' : 'text-zinc-200'}
                            ${isEnd 
                              ? 'bg-rose-500 text-white font-black hover:bg-rose-400' 
                              : inRange
                                ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                                : 'hover:bg-white/5'
                            }
                          `}
                        >
                          {cell.date.getDate()}
                          {isEnd && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      onChange(today, today);
                    }}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      onChange(d, new Date());
                    }}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-zinc-200 transition-all cursor-pointer"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 1);
                      onChange(d, new Date());
                    }}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-zinc-200 transition-all cursor-pointer"
                  >
                    Last 30 Days
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onChange(null, null)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                  >
                    Clear Filter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/5 text-zinc-200 hover:bg-white/15 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
