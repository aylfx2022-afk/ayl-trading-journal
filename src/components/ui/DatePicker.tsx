import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DatePickerProps {
  value: Date | string | null | undefined;
  onChange: (date: Date | null) => void;
  label?: string;
  compact?: boolean;
  placeholder?: string;
  showTime?: boolean;
  clearable?: boolean;
}

export default function DatePicker({ 
  value, 
  onChange, 
  label, 
  compact, 
  placeholder,
  showTime = true,
  clearable = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const dateValue = value ? (typeof value === 'string' ? new Date(value) : value) : null;

  // Local state for calendar navigation
  const [viewDate, setViewDate] = useState(() => dateValue || new Date());
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [yearRangeStart, setYearRangeStart] = useState(() => Math.floor(viewDate.getFullYear() / 12) * 12);

  // Time values (12-hour format)
  const currentHours24 = dateValue ? dateValue.getHours() : new Date().getHours();
  const currentMinutes = dateValue ? dateValue.getMinutes() : new Date().getMinutes();
  const isPM = currentHours24 >= 12;
  const currentHours12 = currentHours24 % 12 === 0 ? 12 : currentHours24 % 12;
  const ampm: 'AM' | 'PM' = isPM ? 'PM' : 'AM';

  // Update view space when date value shifts
  useEffect(() => {
    if (dateValue) {
      setViewDate(dateValue);
      setYearRangeStart(Math.floor(dateValue.getFullYear() / 12) * 12);
    }
  }, [dateValue]);

  // Reset viewMode when dropdown closes/opens
  useEffect(() => {
    if (isOpen) {
      setViewMode('days');
      setYearRangeStart(Math.floor(viewDate.getFullYear() / 12) * 12);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleDateChange = (newDate: Date) => {
    const updated = new Date(newDate);
    updated.setHours(currentHours24, currentMinutes, 0, 0);
    onChange(updated);
  };

  const handleTimeChange = (newHours24: number, newMinutes: number) => {
    const base = dateValue ? new Date(dateValue) : new Date();
    base.setHours(newHours24, newMinutes, 0, 0);
    onChange(base);
  };

  const handleHour12Change = (h12: number) => {
    const new24 = (h12 % 12) + (isPM ? 12 : 0);
    handleTimeChange(new24, currentMinutes);
  };

  const handleMinuteChange = (m: number) => {
    handleTimeChange(currentHours24, m);
  };

  const handleAmPmToggle = (newPeriod: 'AM' | 'PM') => {
    const newIsPM = newPeriod === 'PM';
    const new24 = (currentHours12 % 12) + (newIsPM ? 12 : 0);
    handleTimeChange(new24, currentMinutes);
  };

  // Calendar Helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Months name array
  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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

  const prevYear = () => {
    setViewDate(new Date(year - 1, month, 1));
  };

  const nextYear = () => {
    setViewDate(new Date(year + 1, month, 1));
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

  const displayFormat = showTime 
    ? (compact ? 'dd/MM/yyyy hh:mm a' : 'MMM dd, yyyy hh:mm a')
    : (compact ? 'dd/MM/yy' : 'MMM dd, yyyy');

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className={`block font-black uppercase text-[#8b93a1] tracking-widest mb-1.5 text-left px-1 ${compact ? 'text-[10px]' : 'text-sm'}`}>
          {label}
        </label>
      )}
      <div className="relative w-full group">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#12161c] border border-white/10 rounded-xl ${compact ? 'px-3 py-2.5' : 'px-4 py-2.5'} text-[#e8ebf2] hover:border-[#4d8fe0]/30 transition-all text-left overflow-hidden font-bold text-sm cursor-pointer`}
        >
          <span className={`truncate ${!dateValue ? 'text-[#8b93a1] font-medium text-xs' : ''}`}>
            {dateValue ? format(dateValue, displayFormat) : (placeholder || 'Select...')}
          </span>
          <div className="flex items-center gap-1.5 text-[#8b93a1] shrink-0 ml-2">
            {showTime && <Clock size={13} className="text-[#4d8fe0]/70" />}
            <CalendarIcon size={14} />
          </div>
        </button>
      </div>

      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none pointer-events-auto">
              {/* Backdrop click to close */}
              <div 
                className="absolute inset-0 z-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="relative z-10 bg-[#181d26] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-full max-w-[340px] p-5 text-[#e8ebf2] pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#4d8fe0]/10 text-[#4d8fe0] border border-[#4d8fe0]/20">
                    <CalendarIcon size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#e8ebf2]">
                      {label || (showTime ? 'Select Date & Time' : 'Select Date')}
                    </h3>
                    <p className="text-[11px] font-bold text-[#7ba8e8] font-mono mt-0.5">
                      {dateValue ? format(dateValue, displayFormat) : (placeholder || 'No date selected')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/10 transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Header based on viewMode */}
              {viewMode === 'days' && (
                <div className="flex items-center justify-between mb-3 text-left">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] transition-all cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="font-bold text-sm select-none tracking-wide text-[#e8ebf2] flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('months')}
                      className="px-2 py-1 rounded-lg hover:bg-white/10 hover:text-[#7ba8e8] transition-all cursor-pointer border border-transparent hover:border-[#4d8fe0]/20"
                    >
                      {monthsFull[month]}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setYearRangeStart(Math.floor(year / 12) * 12);
                        setViewMode('years');
                      }}
                      className="px-2 py-1 rounded-lg hover:bg-white/10 hover:text-[#7ba8e8] transition-all cursor-pointer border border-transparent hover:border-[#4d8fe0]/20"
                    >
                      {year}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] transition-all cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {viewMode === 'months' && (
                <div className="flex items-center justify-between mb-3 text-left">
                  <button
                    type="button"
                    onClick={prevYear}
                    className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] transition-all cursor-pointer"
                    title="Previous Year"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="font-bold text-sm select-none tracking-wide text-[#e8ebf2] flex items-center gap-1.5">
                    <span className="text-[#8b93a1] text-xs">Select Month for</span>
                    <button
                      type="button"
                      onClick={() => {
                        setYearRangeStart(Math.floor(year / 12) * 12);
                        setViewMode('years');
                      }}
                      className="px-2 py-1 rounded-lg hover:bg-white/10 hover:text-[#7ba8e8] transition-all cursor-pointer text-[#7ba8e8] font-extrabold border border-[#4d8fe0]/20 bg-[#4d8fe0]/5"
                    >
                      {year}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={nextYear}
                    className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] transition-all cursor-pointer"
                    title="Next Year"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {viewMode === 'years' && (
                <div className="flex items-center justify-between mb-3 text-left">
                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart - 12)}
                    className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] transition-all cursor-pointer"
                    title="Previous 12 Years"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="font-extrabold text-xs select-none tracking-wider text-[#7ba8e8] bg-[#1e2733] px-3 py-1 rounded-lg border border-[#4d8fe0]/20">
                    {yearRangeStart} – {yearRangeStart + 11}
                  </div>
                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart + 12)}
                    className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-[#8b93a1] hover:text-[#e8ebf2] transition-all cursor-pointer"
                    title="Next 12 Years"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Days Grid View */}
              {viewMode === 'days' && (
                <>
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <div key={day} className="text-[10px] uppercase font-black text-[#8b93a1] py-1 tracking-wider">
                        {day}
                      </div>
                    ))}
                  </div>

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
                            ${!cell.isCurrentMonth ? 'text-[#8b93a1]/40 hover:text-[#8b93a1]' : 'text-[#e8ebf2]'}
                            ${daySelected 
                              ? 'bg-[#4d8fe0] text-white font-black hover:bg-[#3a6fc4]' 
                              : 'hover:bg-white/5'
                            }
                          `}
                        >
                          {cell.date.getDate()}
                          {dayToday && !daySelected && (
                            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#4d8fe0]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Months Grid View (3x4) */}
              {viewMode === 'months' && (
                <div className="grid grid-cols-3 gap-2 py-2">
                  {monthsShort.map((mName, mIdx) => {
                    const isCurrentMonth = mIdx === month;
                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => {
                          setViewDate(new Date(year, mIdx, 1));
                          setViewMode('days');
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          isCurrentMonth
                            ? 'bg-[#4d8fe0] text-white font-black shadow-lg shadow-[#4d8fe0]/20'
                            : 'bg-white/5 text-[#8b93a1] hover:bg-white/10 hover:text-[#e8ebf2] hover:border-[#4d8fe0]/30 border border-transparent'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Years Grid View (3x4) */}
              {viewMode === 'years' && (
                <div className="grid grid-cols-3 gap-2 py-2">
                  {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((yNum) => {
                    const isCurrentYear = yNum === year;
                    return (
                      <button
                        key={yNum}
                        type="button"
                        onClick={() => {
                          setViewDate(new Date(yNum, month, 1));
                          setViewMode('months');
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          isCurrentYear
                            ? 'bg-[#4d8fe0] text-white font-black shadow-lg shadow-[#4d8fe0]/20'
                            : 'bg-white/5 text-[#8b93a1] hover:bg-white/10 hover:text-[#e8ebf2] hover:border-[#4d8fe0]/30 border border-transparent'
                        }`}
                      >
                        {yNum}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TIME SELECTION SECTION (12-Hour Format with AM/PM) */}
              {showTime && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#8b93a1] tracking-wider">
                      <Clock size={12} className="text-[#4d8fe0]" />
                      <span>Time (12h)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const base = dateValue ? new Date(dateValue) : new Date();
                        base.setHours(now.getHours(), now.getMinutes(), 0, 0);
                        onChange(base);
                      }}
                      className="text-[10px] font-bold text-[#4d8fe0] hover:text-[#7ba8e8] transition-colors cursor-pointer"
                    >
                      Current Time
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 12-Hour selector */}
                    <div className="flex-1 flex items-center bg-[#12161c] border border-white/10 rounded-xl px-2 py-1.5 focus-within:border-[#4d8fe0]/50 transition-all">
                      <span className="text-[10px] text-[#8b93a1] font-bold mr-1 select-none">H:</span>
                      <select
                        value={currentHours12}
                        onChange={(e) => handleHour12Change(parseInt(e.target.value, 10))}
                        className="bg-transparent text-xs font-bold text-[#e8ebf2] focus:outline-none w-full cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                          <option key={h} value={h} className="bg-[#181d26] text-[#e8ebf2]">
                            {String(h).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-sm font-black text-[#8b93a1] select-none">:</span>

                    {/* Minutes selector */}
                    <div className="flex-1 flex items-center bg-[#12161c] border border-white/10 rounded-xl px-2 py-1.5 focus-within:border-[#4d8fe0]/50 transition-all">
                      <span className="text-[10px] text-[#8b93a1] font-bold mr-1 select-none">M:</span>
                      <select
                        value={currentMinutes}
                        onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
                        className="bg-transparent text-xs font-bold text-[#e8ebf2] focus:outline-none w-full cursor-pointer"
                      >
                        {Array.from({ length: 60 }, (_, i) => (
                          <option key={i} value={i} className="bg-[#181d26] text-[#e8ebf2]">
                            {String(i).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* AM / PM Segmented Control */}
                    <div className="flex items-center bg-[#12161c] border border-white/10 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => handleAmPmToggle('AM')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          ampm === 'AM'
                            ? 'bg-[#4d8fe0] text-white shadow-sm'
                            : 'text-[#8b93a1] hover:text-[#e8ebf2]'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAmPmToggle('PM')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          ampm === 'PM'
                            ? 'bg-[#4d8fe0] text-white shadow-sm'
                            : 'text-[#8b93a1] hover:text-[#e8ebf2]'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* Minute quick presets */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[9px] text-[#8b93a1] font-bold select-none">Quick:</span>
                    {[0, 15, 30, 45].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMinuteChange(m)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                          currentMinutes === m
                            ? 'bg-[#1e2733] border-[#4d8fe0]/40 text-[#7ba8e8]'
                            : 'bg-white/5 border-transparent text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/10'
                        }`}
                      >
                        :{String(m).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Action buttons */}
              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                {clearable && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null);
                      setIsOpen(false);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-center cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setViewDate(now);
                    setViewMode('days');
                    onChange(now);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-[#7ba8e8] bg-[#1e2733] border border-[#4d8fe0]/20 hover:bg-[#4d8fe0]/20 transition-all text-center cursor-pointer"
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#4d8fe0] text-white hover:bg-[#3a6fc4] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check size={12} className="stroke-[3]" />
                  Done
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
}


