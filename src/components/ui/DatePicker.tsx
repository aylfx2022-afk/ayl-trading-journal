import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DatePickerProps {
  value: Date | string | null;
  onChange: (date: Date | null) => void;
  label?: string;
  compact?: boolean;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, label, compact, placeholder }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const dateValue = value ? (typeof value === 'string' ? new Date(value) : value) : null;

  // Local state for calendar navigation
  const [viewDate, setViewDate] = useState(() => dateValue || new Date());

  // Update view space when date value shifts
  useEffect(() => {
    if (dateValue) {
      setViewDate(dateValue);
    }
  }, [dateValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateChange = (newDate: Date) => {
    onChange(newDate);
    setIsOpen(false);
  };

  // Calendar Helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Months name array
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0, Monday is 1, etc.
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Navigation handlers
  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days
  const calendarDays = [];

  // Previous Month's Days (padding)
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // Current Month's Days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next Month's Days (padding to fill the grid up to 42 items)
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!dateValue) return false;
    return date.getDate() === dateValue.getDate() &&
      date.getMonth() === dateValue.getMonth() &&
      date.getFullYear() === dateValue.getFullYear();
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className={`block font-black uppercase text-zinc-500 tracking-widest mb-1.5 text-left px-1 ${compact ? 'text-[10px]' : 'text-sm'}`}>
          {label}
        </label>
      )}
      <div className="relative w-full group">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#18181b] border border-white/10 rounded-xl ${compact ? 'px-3 py-2.5' : 'px-4 py-2.5'} text-zinc-200 hover:border-emerald-500/30 transition-all text-left overflow-hidden font-bold text-sm`}
        >
          <span className="truncate">
            {dateValue ? format(dateValue, compact ? 'dd/MM/yy' : 'MMM dd, yyyy') : (placeholder || 'Select...')}
          </span>
          <CalendarIcon size={14} className="text-zinc-500 shrink-0 ml-2" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 left-0 origin-top-left"
          >
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-[310px] p-4 text-zinc-200">
              
              {/* Custom Header with Month, Year picker & arrows */}
              <div className="flex items-center justify-between mb-4 text-left">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="font-bold text-sm select-none tracking-wide text-zinc-200">
                  {months[month]} {year}
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Weekdays Row */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-[10px] uppercase font-black text-zinc-500 py-1 tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  const daySelected = isSelected(cell.date);
                  const dayToday = isToday(cell.date);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateChange(cell.date)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer
                        ${!cell.isCurrentMonth ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-200'}
                        ${daySelected 
                          ? 'bg-emerald-500 text-black font-black hover:bg-emerald-400' 
                          : 'hover:bg-white/5'
                        }
                      `}
                    >
                      {cell.date.getDate()}
                      {dayToday && !daySelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Action buttons */}
              <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDateChange(new Date())}
                  className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-center cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/5 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
