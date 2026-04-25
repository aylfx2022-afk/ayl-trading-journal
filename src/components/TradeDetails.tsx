import React, { useState } from 'react';
import { Trade } from '../types';
import { Save, Image as ImageIcon, MessageSquare, ExternalLink, ArrowLeft, X, Maximize2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

import DatePicker from './ui/DatePicker';
import ImageViewer from './ImageViewer';

interface TradeDetailsProps {
  trade: Trade;
  onBack: () => void;
}

export default function TradeDetails({ trade, onBack }: TradeDetailsProps) {
  const [notes, setNotes] = useState(trade.notes || '');
  const [charts, setCharts] = useState<{id: string, url: string}[]>(
    (trade.chartUrls && trade.chartUrls.length > 0) 
      ? trade.chartUrls.map((url, i) => ({ id: `chart-${i}-${Date.now()}`, url }))
      : [{ id: `chart-0-${Date.now()}`, url: '' }]
  );
  const [entryPrice, setEntryPrice] = useState(trade.entryPrice?.toString() || '');
  const [slPrice, setSlPrice] = useState(trade.slPrice?.toString() || '');
  const [tpPrice, setTpPrice] = useState(trade.tpPrice?.toString() || '');
  const [exitPrice, setExitPrice] = useState(trade.exitPrice?.toString() || '');
  const [rr, setRr] = useState(trade.rr?.toString() || '');
  const [entryDateTime, setEntryDateTime] = useState<Date | null>(trade.openTime ? trade.openTime.toDate() : null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(slPrice);
    const exit = parseFloat(exitPrice);
    
    if (isNaN(entry) || isNaN(sl) || isNaN(exit)) {
      setRr('');
      return;
    }

    const risk = Math.abs(entry - sl);
    if (risk === 0) {
      setRr('0');
      return;
    }
    
    const profit = trade.type === 'buy' 
      ? exit - entry
      : entry - exit;
      
    setRr((profit / risk).toFixed(2));
  }, [trade.type, entryPrice, slPrice, exitPrice]);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [notes]);

  const handleAddChart = () => {
    if (charts.length < 5) {
      setCharts([...charts, { id: `chart-${Date.now()}`, url: '' }]);
    }
  };

  const handleRemoveChart = (id: string) => {
    const newCharts = charts.filter((c) => c.id !== id);
    setCharts(newCharts.length > 0 ? newCharts : [{ id: `chart-${Date.now()}`, url: '' }]);
  };

  const handleChartUrlChange = (id: string, value: string) => {
    setCharts(charts.map(c => c.id === id ? { ...c, url: value } : c));
  };

  const isInitialRender = React.useRef(true);

  React.useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      handleSave();
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes, charts, entryPrice, slPrice, tpPrice, exitPrice, rr, entryDateTime]);

  const handleSave = async () => {
    if (!trade.id) return;
    setSavingStatus('saving');
    try {
      const tradeRef = doc(db, 'trades', trade.id);
      const filteredUrls = charts.map(c => c.url).filter(url => url.trim() !== '');
      await updateDoc(tradeRef, {
        notes,
        chartUrls: filteredUrls,
        entryPrice: Number(entryPrice) || 0,
        slPrice: Number(slPrice) || 0,
        tpPrice: Number(tpPrice) || 0,
        exitPrice: exitPrice !== '' ? Number(exitPrice) : null,
        rr: rr !== '' ? Number(rr) : null,
        openTime: entryDateTime ? Timestamp.fromDate(entryDateTime) : trade.openTime,
        closeTime: null
      });
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      console.error("Error updating trade:", error);
      setSavingStatus('idle');
    }
  };

  const validChartUrls = charts.map(c => c.url).filter(url => url.trim() !== '');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-left">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            Trade Details <span className="text-zinc-500 text-sm font-normal">#{trade.ticket}</span>
          </h2>
          <p className="text-zinc-500 mt-1">
            {trade.item} • {trade.type.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-8 space-y-8 text-left">
        {/* Trade Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">RR</p>
            <input type="number" step="0.01" value={rr} readOnly className="w-full bg-transparent text-lg font-bold text-zinc-200 focus:outline-none" />
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Entry Price</p>
            <input type="number" step="0.00001" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full bg-transparent text-lg font-bold text-zinc-200 focus:outline-none" />
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center">
            <DatePicker 
              label="Entry Time"
              value={entryDateTime}
              onChange={setEntryDateTime}
            />
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">SL Price</p>
            <input type="number" step="0.00001" value={slPrice} onChange={e => setSlPrice(e.target.value)} className="w-full bg-transparent text-lg font-bold text-zinc-200 focus:outline-none" />
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">TP Price</p>
            <input type="number" step="0.00001" value={tpPrice} onChange={e => setTpPrice(e.target.value)} className="w-full bg-transparent text-lg font-bold text-zinc-200 focus:outline-none" />
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Exit Price</p>
            <input type="number" step="0.00001" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full bg-transparent text-lg font-bold text-zinc-200 focus:outline-none" />
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <MessageSquare size={16} className="text-emerald-500" />
            Trade Notes & Journal
          </label>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why did you take this trade? What did you learn?"
            className="w-full min-h-[128px] p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm text-zinc-300 placeholder:text-zinc-600 transition-all resize-none overflow-hidden"
          />
        </div>

        {/* Chart Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <ImageIcon size={16} className="text-emerald-500" />
                TradingView Chart Links (Max 5)
              </label>
              <p className="text-[10px] text-zinc-500 italic">
                Tip: Use TradingView "Share Image" links or direct URLs (Imgur, Discord). Notion links may expire.
              </p>
            </div>
          </div>
          
          <Reorder.Group axis="y" values={charts} onReorder={setCharts} className="space-y-3">
            {charts.map((chart) => (
              <Reorder.Item 
                key={chart.id} 
                value={chart} 
                className="space-y-2 bg-white/[0.02] border border-white/5 p-4 rounded-2xl relative z-0"
                whileDrag={{ 
                  scale: 0.9, 
                  zIndex: 50,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                  opacity: 0.9
                }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
              >
                <div className="flex gap-2 items-center">
                  <div className="cursor-grab active:cursor-grabbing p-1 text-zinc-600 hover:text-zinc-400">
                    <GripVertical size={20} />
                  </div>
                  <input
                    type="text"
                    value={chart.url}
                    onChange={(e) => handleChartUrlChange(chart.id, e.target.value)}
                    placeholder={`Chart URL (https://www.tradingview.com/x/...)`}
                    className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm text-zinc-300 placeholder:text-zinc-600 transition-all"
                  />
                  {chart.url && (
                    <button 
                      onClick={() => setViewerIndex(validChartUrls.indexOf(chart.url))}
                      className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                      <Maximize2 size={18} />
                    </button>
                  )}
                  {charts.length > 1 && (
                    <button 
                      onClick={() => handleRemoveChart(chart.id)}
                      className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {chart.url && (
                  <div 
                    className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 aspect-video flex items-center justify-center cursor-pointer group relative"
                    onClick={() => setViewerIndex(validChartUrls.indexOf(chart.url))}
                  >
                    <img 
                      src={chart.url} 
                      alt="Trade Chart" 
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const errorMsg = document.createElement('div');
                          errorMsg.className = 'text-center p-4 text-zinc-500 text-xs italic';
                          errorMsg.innerText = 'Unable to load image. If this is a Notion link, it may have expired. Try TradingView "Share Image" links instead.';
                          parent.appendChild(errorMsg);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                        <Maximize2 className="text-white w-6 h-6" />
                      </div>
                    </div>
                  </div>
                )}
              </Reorder.Item>
            ))}
            {charts.length < 5 && (
              <button 
                onClick={handleAddChart}
                className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors w-fit px-1"
              >
                + Add Another Chart
              </button>
            )}
          </Reorder.Group>
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-zinc-500">
            {savingStatus === 'saving' && 'Saving...'}
            {savingStatus === 'saved' && 'Saved'}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewerIndex !== null && (
          <ImageViewer 
            images={validChartUrls}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
