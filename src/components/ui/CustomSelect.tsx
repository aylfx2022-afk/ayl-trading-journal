import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
  className?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  typeStyle?: 'default' | 'type' | 'mental' | 'physical';
}

export default function CustomSelect({
  value,
  onChange,
  options,
  groups,
  placeholder = 'Select...',
  required,
  className = '',
  typeStyle = 'default'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine open direction based on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 300; // max-h is 285px + buffer
      const spaceAbove = rect.top;
      // Open upwards if space below is limited and we have more space above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Find currently selected option
  const allOptions = groups 
    ? groups.flatMap(g => g.options) 
    : (options || []);
  
  const selectedOption = allOptions.find(o => o.value === value);

  // Determine trigger button styling based on typeStyle and selected value
  let triggerClass = "w-full flex items-center justify-between bg-[#12161c] border border-white/10 rounded-xl px-4 py-2.5 text-[#e8ebf2] hover:border-[#4d8fe0]/30 transition-all font-bold text-sm text-left uppercase";
  
  if (typeStyle === 'type') {
    if (value === 'buy') {
      triggerClass = "w-full flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-2.5 font-bold text-sm text-left uppercase hover:bg-emerald-500/15 transition-all";
    } else if (value === 'sell') {
      triggerClass = "w-full flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 font-bold text-sm text-left uppercase hover:bg-red-500/15 transition-all";
    } else {
      triggerClass = "w-full flex items-center justify-between bg-[#12161c] border border-white/10 text-[#8b93a1] rounded-xl px-4 py-2.5 font-bold text-sm text-left uppercase hover:border-white/20 transition-all";
    }
  } else if (typeStyle === 'mental' && value) {
    triggerClass = "w-full flex items-center justify-between bg-[#12161c] border border-[#4d8fe0]/30 rounded-xl px-3 py-2 text-xs font-bold text-[#7ba8e8] text-left hover:border-[#4d8fe0]/50 transition-all";
  } else if (typeStyle === 'physical' && value) {
    triggerClass = "w-full flex items-center justify-between bg-[#12161c] border border-[#4d8fe0]/30 rounded-xl px-3 py-2 text-xs font-bold text-[#7ba8e8] text-left hover:border-[#4d8fe0]/50 transition-all";
  } else if (typeStyle === 'mental' || typeStyle === 'physical') {
    // defaults for mental/physical options when unselected (smaller size px-3 py-2 text-xs)
    triggerClass = "w-full flex items-center justify-between bg-[#12161c] border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-[#8b93a1] text-left hover:border-white/20 transition-all";
  }

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClass}
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedOption?.emoji && <span>{selectedOption.emoji}</span>}
          <span>{selectedOption ? selectedOption.label : (value || placeholder)}</span>
        </span>
        <ChevronDown 
          size={typeStyle === 'mental' || typeStyle === 'physical' ? 12 : 14} 
          className={`text-[#8b93a1] shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#4d8fe0]' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpwards ? -8 : 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpwards ? -8 : 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-[110] left-0 w-full bg-[#181d26] border border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-[285px] overflow-y-auto p-1.5 focus:outline-none ${
              openUpwards 
                ? 'bottom-full mb-1.5 origin-bottom' 
                : 'top-full mt-1.5 origin-top'
            }`}
          >
            {/* Show Flat Options */}
            {options && options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 text-left group cursor-pointer mb-0.5 last:mb-0
                    ${isSelected 
                      ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20' 
                      : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/[0.06] hover:translate-x-0.5 border border-transparent'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    {opt.emoji && <span className="transform group-hover:scale-125 transition-transform duration-150">{opt.emoji}</span>}
                    <span className="transition-colors duration-150">{opt.label}</span>
                  </span>
                  {isSelected && <Check size={14} className="text-[#4d8fe0]" />}
                </button>
              );
            })}

            {/* Show Grouped Options */}
            {groups && groups.map((group, gIdx) => (
              <div key={group.label} className={gIdx > 0 ? 'mt-3 border-t border-white/5 pt-2' : ''}>
                <div className="px-3 py-1 text-[9px] font-black uppercase text-[#8b93a1] tracking-widest leading-none mb-1">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.options.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 text-left group cursor-pointer border border-transparent
                          ${isSelected 
                            ? 'bg-[#1e2733] text-[#7ba8e8] border-[#4d8fe0]/20' 
                            : 'text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/[0.06] hover:translate-x-0.5'
                          }
                        `}
                      >
                        <span className="flex items-center gap-2">
                          {opt.emoji && <span className="transform group-hover:scale-125 transition-transform duration-150">{opt.emoji}</span>}
                          <span>{opt.label}</span>
                        </span>
                        {isSelected && <Check size={12} className="text-[#4d8fe0]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* No Option item fallback */}
            {(!options || options.length === 0) && (!groups || groups.length === 0) && (
              <div className="px-4 py-3 text-xs text-[#8b93a1] text-center">No options available</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
