import React, { useState, useMemo, useEffect } from 'react';
import { Trade } from '../types';
import { 
  Filter, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Tag, 
  Eye, 
  AlertCircle, 
  Image as ImageIcon, 
  Maximize2,
  CalendarDays,
  Flame,
  Plus,
  X,
  ChevronDown,
  ArrowUpDown,
  Clock,
  Search,
  LayoutGrid
} from 'lucide-react';
import { format } from 'date-fns';
import { getSafeDate } from '../lib/dateUtils';
import ImageViewer from './ImageViewer';
import { motion, AnimatePresence } from 'motion/react';

interface GalleryViewProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onAddTrade?: () => void;
}

type FilterType = 'all' | 'wins' | 'losses' | 'open' | 'buy' | 'sell';
type SortType = 'newest' | 'oldest' | 'largest-win' | 'largest-loss';

export default function GalleryView({ trades, onSelectTrade, onAddTrade }: GalleryViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('gallery_search');
      return stored ? JSON.parse(stored) : '';
    } catch {
      return '';
    }
  });

  const [filterType, setFilterType] = useState<FilterType>(() => {
    try {
      const stored = localStorage.getItem('gallery_filter');
      return stored ? JSON.parse(stored) : 'all';
    } catch {
      return 'all';
    }
  });

  const [sortType, setSortType] = useState<SortType>(() => {
    try {
      const stored = localStorage.getItem('gallery_sort');
      return stored ? JSON.parse(stored) : 'newest';
    } catch {
      return 'newest';
    }
  });

  const [previewSize, setPreviewSize] = useState<'small' | 'medium' | 'large'>(() => {
    try {
      const stored = localStorage.getItem('gallery_preview_size');
      return stored ? JSON.parse(stored) : 'medium';
    } catch {
      return 'medium';
    }
  });

  const [timeframeFilter, setTimeframeFilter] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('gallery_timeframe');
      return stored ? JSON.parse(stored) : 'all';
    } catch {
      return 'all';
    }
  });

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gallery_search', JSON.stringify(searchTerm));
    } catch {}
  }, [searchTerm]);

  useEffect(() => {
    try {
      localStorage.setItem('gallery_filter', JSON.stringify(filterType));
    } catch {}
  }, [filterType]);

  useEffect(() => {
    try {
      localStorage.setItem('gallery_sort', JSON.stringify(sortType));
    } catch {}
  }, [sortType]);

  useEffect(() => {
    try {
      localStorage.setItem('gallery_preview_size', JSON.stringify(previewSize));
    } catch {}
  }, [previewSize]);

  useEffect(() => {
    try {
      localStorage.setItem('gallery_timeframe', JSON.stringify(timeframeFilter));
    } catch {}
  }, [timeframeFilter]);
  
  // Lightbox state
  const [viewerState, setViewerState] = useState<{ 
    isOpen: boolean; 
    images: string[]; 
    initialIndex: number;
    metadata?: {
      tradeId?: string;
      tradeName?: string;
      dateStr?: string;
      type?: 'buy' | 'sell';
      rr?: number;
      trade?: Trade;
    }[];
  } | null>(null);

  // Filter out trades that do not have any images
  const tradesWithImages = useMemo(() => {
    return trades.filter(t => t.chartUrls && t.chartUrls.length > 0);
  }, [trades]);

  // Compute unique non-empty entryTimeframes present in trades list
  const uniqueTimeframes = useMemo(() => {
    const tfs = tradesWithImages
      .map(t => t.entryTimeframe)
      .filter((tf): tf is string => typeof tf === 'string' && tf.trim() !== '');
    return Array.from(new Set(tfs)).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [tradesWithImages]);

  // Process filters and sorting
  const processedTrades = useMemo(() => {
    let result = [...tradesWithImages];

    // Search query
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => {
        const itemMatch = t.item?.toLowerCase().includes(q) || t.pair?.toLowerCase().includes(q);
        const commentMatch = t.comment?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
        const tagsMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(q));
        const ticketMatch = t.ticket?.toLowerCase().includes(q);
        return itemMatch || commentMatch || tagsMatch || ticketMatch;
      });
    }

    // Category filter
    if (filterType !== 'all') {
      if (filterType === 'wins') {
        result = result.filter(t => t.exitPrice !== null && t.exitPrice !== undefined && (t.rr || 0) > 0);
      } else if (filterType === 'losses') {
        result = result.filter(t => t.exitPrice !== null && t.exitPrice !== undefined && (t.rr || 0) <= 0);
      } else if (filterType === 'open') {
        result = result.filter(t => t.exitPrice === null || t.exitPrice === undefined);
      } else if (filterType === 'buy') {
        result = result.filter(t => t.type === 'buy');
      } else if (filterType === 'sell') {
        result = result.filter(t => t.type === 'sell');
      }
    }

    // Timeframe filter
    if (timeframeFilter !== 'all') {
      result = result.filter(t => t.entryTimeframe === timeframeFilter);
    }

    // Sort order
    result.sort((a, b) => {
      const dateA = getSafeDate(a.openTime)?.getTime() || getSafeDate(a.createdAt)?.getTime() || 0;
      const dateB = getSafeDate(b.openTime)?.getTime() || getSafeDate(b.createdAt)?.getTime() || 0;

      if (sortType === 'newest') {
        return dateB - dateA;
      } else if (sortType === 'oldest') {
        return dateA - dateB;
      } else if (sortType === 'largest-win') {
        return (b.rr || 0) - (a.rr || 0);
      } else if (sortType === 'largest-loss') {
        return (a.rr || 0) - (b.rr || 0);
      }
      return 0;
    });

    return result;
  }, [tradesWithImages, searchTerm, filterType, sortType, timeframeFilter]);

  // Construct a flat list of all images with metadata in the current filtered/sorted gallery
  const galleryImages = useMemo(() => {
    const list: { url: string; trade: Trade; dateStr: string }[] = [];
    processedTrades.forEach(trade => {
      const safeDate = getSafeDate(trade.openTime);
      const dateStr = safeDate ? format(safeDate, 'MMM dd, yyyy hh:mm a') : 'Unknown';
      const firstUrl = trade.chartUrls?.[0];
      if (firstUrl) {
        list.push({
          url: firstUrl,
          trade,
          dateStr
        });
      }
    });
    return list;
  }, [processedTrades]);

  const handleCardClick = (trade: Trade) => {
    const firstUrl = trade.chartUrls?.[0];
    if (!firstUrl) return;
    const index = galleryImages.findIndex(img => img.url === firstUrl && img.trade.id === trade.id);
    setViewerState({
      isOpen: true,
      images: galleryImages.map(item => item.url),
      initialIndex: index >= 0 ? index : 0,
      metadata: galleryImages.map(item => ({
        tradeId: item.trade.id,
        tradeName: item.trade.pair || item.trade.item || 'UNKNOWN',
        dateStr: item.dateStr,
        type: item.trade.type,
        rr: item.trade.rr,
        trade: item.trade
      }))
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-[#0F0F11]/60 border border-white/5 p-4 rounded-3xl flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <ImageIcon size={18} className="text-emerald-400" />
            Chart Gallery
            <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
              {processedTrades.length}
            </span>
          </h2>
        </div>

        {/* Filter and Sort Controllers */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
          {/* Search Input */}
          <div className="relative flex items-center flex-1 min-w-[160px] sm:max-w-[200px]">
            <Search size={14} className="absolute left-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search charts..."
              className="w-full bg-[#141416] border border-white/10 hover:border-emerald-500/30 rounded-2xl pl-9 pr-7 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 text-zinc-200 placeholder:text-zinc-600 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Outcome & Order Filter Dropdown */}
          <div className="relative flex items-center min-w-[150px]">
            <Filter size={14} className="absolute left-3 text-emerald-400 pointer-events-none z-10" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full bg-[#141416] border border-white/10 hover:border-emerald-500/40 rounded-2xl pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-zinc-200 transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="all">All Status / Types</option>
              <option value="wins">Wins 🟢</option>
              <option value="losses">Losses 🔴</option>
              <option value="open">Open Trades 🔵</option>
              <option value="buy">Buy Orders 📈</option>
              <option value="sell">Sell Orders 📉</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 text-zinc-500 pointer-events-none" />
          </div>

          {/* Timeframe Selection Dropdown */}
          <div className="relative flex items-center min-w-[130px]">
            <Clock size={14} className="absolute left-3 text-zinc-400 pointer-events-none z-10" />
            <select
              value={timeframeFilter}
              onChange={(e) => setTimeframeFilter(e.target.value)}
              className="w-full bg-[#141416] border border-white/10 hover:border-emerald-500/40 rounded-2xl pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-zinc-200 transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="all">All Timeframes</option>
              {uniqueTimeframes.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 text-zinc-500 pointer-events-none" />
          </div>

          {/* Sort Selection Dropdown */}
          <div className="relative flex items-center min-w-[140px]">
            <ArrowUpDown size={14} className="absolute left-3 text-zinc-400 pointer-events-none z-10" />
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className="w-full bg-[#141416] border border-white/10 hover:border-emerald-500/40 rounded-2xl pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-zinc-200 transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="largest-win">Largest Wins</option>
              <option value="largest-loss">Largest Losses</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 text-zinc-500 pointer-events-none" />
          </div>

          {/* Preview Size Toggle */}
          <div className="flex bg-white/[0.02] border border-white/10 rounded-2xl p-1 gap-0.5">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setPreviewSize(size)}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  previewSize === size
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                }`}
                title={`Card size: ${size}`}
              >
                {size === 'small' && 'S'}
                {size === 'medium' && 'M'}
                {size === 'large' && 'L'}
              </button>
            ))}
          </div>

          {/* Clear Filters Button */}
          {(searchTerm !== '' || filterType !== 'all' || timeframeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setTimeframeFilter('all');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/10 hover:border-red-500/20 transition-all text-xs font-semibold cursor-pointer h-[34px]"
              title="Clear all filters"
            >
              <X size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      {processedTrades.length > 0 ? (
        <div className={
          previewSize === 'small'
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : previewSize === 'medium'
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        }>
          {processedTrades.map((trade) => {
            const hasMultipleImages = trade.chartUrls && trade.chartUrls.length > 1;
            const imagesCount = trade.chartUrls?.length || 0;
            const safeDate = getSafeDate(trade.openTime);
            const dateStr = safeDate ? format(safeDate, 'MMM dd, yyyy hh:mm a') : 'Unknown';
            const isProfit = trade.profit > 0;
            const isLoss = trade.profit <= 0;
            const isOpen = !trade.exitPrice;

            return (
              <motion.div
                key={trade.id}
                layoutId={`gallery-card-${trade.id}`}
                onClick={() => handleCardClick(trade)}
                className="group bg-[#0F0F11]/60 border border-white/5 hover:border-white/10 rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col hover:shadow-2xl hover:shadow-emerald-500/[0.02]"
              >
                {/* Image Showcase Cover */}
                <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                  <img
                    src={trade.chartUrls?.[0]}
                    alt={`${trade.pair || trade.item} Chart`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />

                  {/* Buy/Sell badge floating on image */}
                  <div className="absolute top-3 left-3 select-none">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border shadow-lg ${
                      trade.type === 'buy'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-red-500/10 text-red-400 border-red-500/25'
                    }`}>
                      {trade.type}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Beautiful empty state */
        <div className="min-h-[400px] bg-[#0F0F11]/30 border border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 text-zinc-500">
            <ImageIcon size={28} />
          </div>
          <h3 className="text-lg font-bold text-zinc-200 mb-2">
            {tradesWithImages.length === 0 ? "ပုံထည့်သွင်းထားသော Trade မရှိသေးပါ" : "ကိုက်ညီသော Trade မတွေ့ပါ"}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            {tradesWithImages.length === 0 
              ? "သင့်ရဲ့ Trade တွေကို ပိုမိုလေ့လာဆန်းစစ်နိုင်ဖို့ Trade Detail သို့မဟုတ် Trade အသစ်ထည့်သွင်းရာတွင် Chart URL ပုံများကို ထည့်သွင်းပေးပါ။"
              : "သင်ရှာဖွေထားသော အချက်အလက်များနှင့် ကိုက်ညီသည့် Trade ပုံများမရှိပါ။ ကျေးဇူးပြု၍ တခြား Keyword ဖြင့် ထပ်မံရှာဖွေကြည့်ပါ။"}
          </p>
          {tradesWithImages.length === 0 && onAddTrade && (
            <button
              onClick={onAddTrade}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <Plus size={14} />
              Add First Trade with Chart
            </button>
          )}
        </div>
      )}

      {/* Lightbox / Fullscreen Viewer */}
      <AnimatePresence>
        {viewerState?.isOpen && (
          <ImageViewer
            images={viewerState.images}
            initialIndex={viewerState.initialIndex}
            metadata={viewerState.metadata}
            onSelectTrade={onSelectTrade}
            onClose={() => setViewerState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
