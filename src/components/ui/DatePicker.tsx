import React, { useState, useRef, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DatePickerProps {
  value: Date | string | null;
  onChange: (date: Date) => void;
  label?: string;
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const dateValue = value ? (typeof value === 'string' ? new Date(value) : value) : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateChange = (newDate: any) => {
    if (newDate instanceof Date) {
      onChange(newDate);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-zinc-400 mb-2 text-left">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 hover:border-emerald-500/30 transition-all text-left"
      >
        <span className="truncate">
          {dateValue ? format(dateValue, 'MMM dd, yyyy') : 'Select date...'}
        </span>
        <CalendarIcon size={18} className="text-zinc-500 shrink-0" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 right-0 origin-top-right"
          >
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[320px]">
              <Calendar
                onChange={handleDateChange}
                value={dateValue || new Date()}
                className="custom-calendar-component"
              />
              
              <div className="p-3 border-t border-white/5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(new Date());
                    setIsOpen(false);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 transition-all text-center"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 text-zinc-400 hover:bg-white/10 transition-all"
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
