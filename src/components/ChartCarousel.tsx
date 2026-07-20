import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Maximize2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Chart {
  id: string;
  url: string;
}

interface ChartCarouselProps {
  charts: Chart[];
  onChangeUrl: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onViewFullscreen: (url: string) => void;
  onAnalyze?: (url: string) => void;
  isAnalyzing?: boolean;
}

const slideVariants: any = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.96
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] // polished cubic-bezier easeOut
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 120 : -120,
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.22,
      ease: [0.7, 0, 0.84, 0] // easeIn
    }
  })
};

export default function ChartCarousel({
  charts,
  onChangeUrl,
  onRemove,
  onAdd,
  onViewFullscreen,
  onAnalyze,
  isAnalyzing = false
}: ChartCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const prevLengthRef = useRef(charts.length);

  useEffect(() => {
    if (charts.length > prevLengthRef.current) {
      // A new slide was added! Switch to it automatically
      setDirection(1);
      setCurrentIndex(charts.length - 1);
    }
    prevLengthRef.current = charts.length;
  }, [charts.length]);

  // Safeguard array index
  const safeIndex = Math.min(currentIndex, charts.length - 1);
  const currentChart = charts[safeIndex] || { id: '', url: '' };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? charts.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === charts.length - 1 ? 0 : prev + 1));
  };

  const handleSelectDot = (idx: number) => {
    setDirection(idx > safeIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  return (
    <div className="space-y-4 bg-white/[0.01] p-5 rounded-2xl border border-white/5 transition-all lg:h-full lg:flex lg:flex-col lg:justify-between">
      {/* Integrated Header and Input Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-white/5 pb-3.5 shrink-0 animate-fade-in">
        {/* Left: Indicator & Dot Indicators */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-emerald-500 shrink-0" />
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest leading-none">
              Chart ({safeIndex + 1}/{charts.length})
            </span>
          </div>

          {/* Inline Dot Indicators */}
          <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1 border border-white/5">
            {charts.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDot(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === safeIndex 
                    ? 'w-3.5 bg-emerald-500' 
                    : 'w-1.5 bg-zinc-600 hover:bg-zinc-400'
                }`}
                title={`Switch to Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Middle: Integrated URL Input field */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <input
            type="text"
            value={currentChart.url}
            onChange={(e) => onChangeUrl(currentChart.id, e.target.value)}
            placeholder="Paste TradingView/Image URL here..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus:border-emerald-500/50 focus:outline-none text-xs text-zinc-300 font-mono transition-all placeholder:text-zinc-600 h-[30px]"
          />
          {onAnalyze && safeIndex === 0 && currentChart.url && currentChart.url.trim() !== '' && (
            <button
              type="button"
              onClick={() => onAnalyze(currentChart.url)}
              disabled={isAnalyzing}
              className={`px-3 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer h-[30px] shrink-0 ${
                isAnalyzing
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-emerald-500 text-black font-extrabold shadow-lg hover:bg-emerald-400 active:scale-95'
              }`}
              title="AI Analyze Chart (Extract Entry, SL, TP)"
            >
              <span>{isAnalyzing ? '⚡' : '✨'}</span>
              <span>{isAnalyzing ? 'Analyzing...' : 'AI ANALYZE'}</span>
            </button>
          )}
        </div>

        {/* Right: Actions and Navigation */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end flex-wrap">
          {charts.length < 10 && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-white/15 hover:border-emerald-500/30 hover:text-emerald-400 text-zinc-400 hover:bg-white/[0.01] text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer h-[26px]"
              title="Add a new empty slide"
            >
              <Plus size={11} />
              Add
            </button>
          )}

          {currentChart.url && currentChart.url.trim() !== '' && (
            <button
              type="button"
              onClick={() => onViewFullscreen(currentChart.url)}
              className="p-1 px-3 text-[9px] font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center cursor-pointer h-[26px]"
              title="View Fullscreen"
            >
              VIEW FULL
            </button>
          )}

          {charts.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onRemove(currentChart.id);
                if (safeIndex >= charts.length - 1 && charts.length > 1) {
                  setCurrentIndex(charts.length - 2);
                }
              }}
              className="p-1 px-3 text-[9px] font-bold rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center cursor-pointer h-[26px]"
            >
              DELETE
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Slide Frame */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 w-full min-h-[320px] lg:flex-1 flex items-center justify-center select-none">
        {/* Interactive 3-part Overlay Zone */}
        {currentChart.url && currentChart.url.trim() !== '' && (
          <div className="absolute inset-0 z-30 flex w-full h-full select-none pointer-events-auto">
            {/* Left 1/3: Previous Slide */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (charts.length > 1) {
                  handlePrev();
                }
              }}
              disabled={charts.length <= 1}
              className={`w-1/3 h-full absolute top-0 left-0 flex items-center justify-start pl-6 outline-none transition-all duration-300 select-none ${
                charts.length > 1 
                  ? 'cursor-pointer hover:bg-gradient-to-r hover:from-black/20 hover:to-transparent group' 
                  : 'cursor-default'
              }`}
              title={charts.length > 1 ? "Previous Slide" : undefined}
            >
              {charts.length > 1 && (
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 hover:bg-black/75 p-2 rounded-full border border-white/10 text-zinc-300 active:scale-90 transform">
                  <ChevronLeft size={18} />
                </div>
              )}
            </button>

            {/* Middle 1/3: View Fullscreen */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewFullscreen(currentChart.url);
              }}
              className="w-1/3 h-full absolute top-0 left-1/3 flex items-center justify-center cursor-zoom-in outline-none transition-all duration-300 select-none hover:bg-black/10 group"
              title="View Fullscreen"
            >
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 hover:bg-black/75 p-2 rounded-full border border-white/10 text-zinc-300 active:scale-90 transform">
                <Maximize2 size={18} />
              </div>
            </button>

            {/* Right 1/3: Next Slide */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (charts.length > 1) {
                  handleNext();
                }
              }}
              disabled={charts.length <= 1}
              className={`w-1/3 h-full absolute top-0 right-0 flex items-center justify-end pr-6 outline-none transition-all duration-300 select-none ${
                charts.length > 1 
                  ? 'cursor-pointer hover:bg-gradient-to-l hover:from-black/20 hover:to-transparent group' 
                  : 'cursor-default'
              }`}
              title={charts.length > 1 ? "Next Slide" : undefined}
            >
              {charts.length > 1 && (
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 hover:bg-black/75 p-2 rounded-full border border-white/10 text-zinc-300 active:scale-90 transform">
                  <ChevronRight size={18} />
                </div>
              )}
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {currentChart.url && currentChart.url.trim() !== '' ? (
            <motion.div
              key={currentChart.id + '-' + currentChart.url}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full h-full absolute inset-0 flex items-center justify-center p-3 select-none pointer-events-none"
            >
              <img
                src={currentChart.url}
                alt={`Chart Slide ${safeIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'absolute inset-0 flex items-center justify-center font-bold text-xs text-zinc-500 uppercase tracking-widest';
                    errorMsg.innerText = 'Invalid Image Link';
                    parent.appendChild(errorMsg);
                  }
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty-slide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center py-20 px-4 text-zinc-500 gap-2 text-center"
            >
              <span className="text-sm font-medium italic select-none">No active chart URL for this slide.</span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Paste a link in the input above.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
