import React, { useState } from 'react';
import { Trade } from '../types';
import { Save, Image as ImageIcon, MessageSquare, ExternalLink, ArrowLeft, X } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

interface TradeDetailsProps {
  trade: Trade;
  onBack: () => void;
}

export default function TradeDetails({ trade, onBack }: TradeDetailsProps) {
  const [notes, setNotes] = useState(trade.notes || '');
  const [chartUrls, setChartUrls] = useState<string[]>(trade.chartUrls || ['']);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [notes]);

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
  }, [notes, chartUrls]);

  const handleAddChart = () => {
    if (chartUrls.length < 5) {
      setChartUrls([...chartUrls, '']);
    }
  };

  const handleRemoveChart = (index: number) => {
    const newUrls = chartUrls.filter((_, i) => i !== index);
    setChartUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const handleChartUrlChange = (index: number, value: string) => {
    const newUrls = [...chartUrls];
    newUrls[index] = value;
    setChartUrls(newUrls);
  };

  const handleSave = async () => {
    if (!trade.id) return;
    setSavingStatus('saving');
    try {
      const tradeRef = doc(db, 'trades', trade.id);
      const filteredUrls = chartUrls.filter(url => url.trim() !== '');
      await updateDoc(tradeRef, {
        notes,
        chartUrls: filteredUrls
      });
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      console.error("Error updating trade:", error);
      setSavingStatus('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            Trade Details <span className="text-zinc-500 text-sm font-normal">#{trade.ticket}</span>
          </h2>
          <p className="text-zinc-500 mt-1">
            {trade.item} • {trade.type.toUpperCase()} • {format(trade.closeTime.toDate(), 'PPP p')}
          </p>
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-8 space-y-8">
        {/* Trade Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Profit/Loss</p>
            <p className={`text-lg font-bold ${trade.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ${trade.profit.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Entry Price</p>
            <p className="text-lg font-bold text-zinc-200">{trade.openPrice}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Exit Price</p>
            <p className="text-lg font-bold text-zinc-200">{trade.closePrice}</p>
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
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <ImageIcon size={16} className="text-emerald-500" />
              TradingView Chart Links (Max 5)
            </label>
            {chartUrls.length < 5 && (
              <button 
                onClick={handleAddChart}
                className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                + Add Another Chart
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {chartUrls.map((url, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleChartUrlChange(index, e.target.value)}
                    placeholder={`Chart URL ${index + 1} (https://www.tradingview.com/x/...)`}
                    className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm text-zinc-300 placeholder:text-zinc-600 transition-all"
                  />
                  {url && (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                  {chartUrls.length > 1 && (
                    <button 
                      onClick={() => handleRemoveChart(index)}
                      className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {url && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 aspect-video flex items-center justify-center">
                    <img 
                      src={url} 
                      alt={`Trade Chart ${index + 1}`} 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-zinc-500">
            {savingStatus === 'saving' && 'Saving...'}
            {savingStatus === 'saved' && 'Saved'}
          </div>
        </div>
      </div>
    </div>
  );
}
