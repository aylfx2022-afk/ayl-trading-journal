import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { 
  Search, 
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
  Plus
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  
  // Lightbox state
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; images: string[]; initialIndex: number } | null>(null);

  // Filter out trades that do not have any images
  const tradesWithImages = useMemo(() => {
    return trades.filter(t => t.chartUrls && t.chartUrls.length > 0);
  }, [trades]);

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

    // Sort order
    result.sort((a, b) => {
      const dateA = getSafeDate(a.openTime)?.getTime() || 0;
      const dateB = getSafeDate(b.openTime)?.getTime() || 0;

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
  }, [tradesWithImages, searchTerm, filterType, sortType]);

  const handleOpenViewer = (images: string[], index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click (onSelectTrade)
    setViewerState({
      isOpen: true,
      images,
      initialIndex: index
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-[#0F0F11]/60 border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row gap-4 justify-between items-center backdrop-blur-md">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Pair, Tag သို့မဟုတ် Comment ရှာရန်..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500/50 text-zinc-200 transition-all placeholder:text-zinc-600"
          />
        </div>

        {/* Filter and Sort Controllers */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Quick Filters */}
          <div className="flex bg-white/[0.02] border border-white/5 rounded-2xl p-1 gap-1">
            {(['all', 'wins', 'losses', 'open'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterType === type
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {type === 'all' && 'All'}
                {type === 'wins' && 'Wins 🟢'}
                {type === 'losses' && 'Losses 🔴'}
                {type === 'open' && 'Open 🔵'}
              </button>
            ))}
          </div>

          {/* Sort Selection */}
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="bg-[#141416] border border-white/5 rounded-2xl px-4 py-2 text-xs font-semibold focus:outline-none text-zinc-300 transition-all cursor-pointer hover:border-white/10"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="largest-win">Largest Wins</option>
            <option value="largest-loss">Largest Losses</option>
          </select>
        </div>
      </div>

      {/* Main Grid Content */}
      {processedTrades.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {processedTrades.map((trade) => {
            const hasMultipleImages = trade.chartUrls && trade.chartUrls.length > 1;
            const imagesCount = trade.chartUrls?.length || 0;
            const safeDate = getSafeDate(trade.openTime);
            const dateStr = safeDate ? format(safeDate, 'MMM dd, yyyy HH:mm') : 'Unknown';
            const isProfit = trade.profit > 0;
            const isLoss = trade.profit <= 0;
            const isOpen = !trade.exitPrice;

            return (
              <motion.div
                key={trade.id}
                layoutId={`gallery-card-${trade.id}`}
                onClick={() => onSelectTrade(trade)}
                className="group bg-[#0F0F11]/60 border border-white/5 hover:border-white/10 rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col hover:shadow-2xl hover:shadow-emerald-500/[0.02]"
              >
                {/* Image Showcase Cover */}
                <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden border-b border-white/5">
                  <img
                    src={trade.chartUrls?.[0]}
                    alt={`${trade.pair || trade.item} Chart`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />

                  {/* Multi-image indicator badge */}
                  {hasMultipleImages && (
                    <div className="absolute right-3 bottom-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg select-none">
                      <ImageIcon size={11} className="text-zinc-300" />
                      <span className="text-[10px] font-mono font-black text-zinc-200">+{imagesCount - 1} More</span>
                    </div>
                  )}

                  {/* Quick Expand button */}
                  <button
                    onClick={(e) => handleOpenViewer(trade.chartUrls || [], 0, e)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-emerald-500 hover:text-black border border-white/10 text-zinc-300 transition-all shadow-lg scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 size={13} />
                  </button>

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

                {/* Details Section */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                        {trade.pair || trade.item || 'UNKNOWN'}
                      </h4>
                      {/* PnL Display (RR Value) */}
                      {isOpen ? (
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg select-none">
                          Running
                        </span>
                      ) : (
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg border font-mono select-none ${
                          (trade.rr || 0) > 0 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : (trade.rr || 0) < 0 
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>
                          {(trade.rr || 0) > 0 ? '+' : ''}{(trade.rr || 0).toFixed(2)} R
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold">
                      <CalendarDays size={11} className="text-zinc-600" />
                      <span>{dateStr}</span>
                    </div>
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
            onClose={() => setViewerState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
