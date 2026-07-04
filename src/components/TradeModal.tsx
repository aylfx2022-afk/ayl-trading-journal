import React, { useState } from 'react';
import { Trade } from '../types';
import { X, Save, Image as ImageIcon, MessageSquare, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

interface TradeModalProps {
  trade: Trade;
  onClose: () => void;
}

export default function TradeModal({ trade, onClose }: TradeModalProps) {
  const [notes, setNotes] = useState(trade.notes || '');
  const [chartUrls, setChartUrls] = useState<string[]>((trade.chartUrls || []).filter(url => url.trim() !== ''));
  const [tempChartUrl, setTempChartUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChartUrl = () => {
    const trimmed = tempChartUrl.trim();
    if (!trimmed) return;
    if (chartUrls.length >= 10) return;
    setChartUrls(prev => [...prev, trimmed]);
    setTempChartUrl('');
  };

  const handleRemoveChart = (index: number) => {
    setChartUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!trade.id) return;
    setIsSaving(true);
    try {
      const tradeRef = doc(db, 'trades', trade.id);
      // Filter out empty strings before saving
      const filteredUrls = chartUrls.filter(url => url.trim() !== '');
      await updateDoc(tradeRef, {
        notes,
        chartUrls: filteredUrls
      });
      onClose();
    } catch (error) {
      console.error("Error updating trade:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0F0F0F] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              Trade Details
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {trade.item} • {trade.type.toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did you take this trade? What did you learn?"
              className="w-full h-32 p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm text-zinc-300 placeholder:text-zinc-600 transition-all resize-none"
            />
          </div>

          {/* Chart Section */}
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className="space-y-2 animate-fade-in">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <ImageIcon size={16} className="text-emerald-500" />
                TradingView Chart Links (Max 10)
              </label>
              
              {/* Single Paste URL Box & Save Button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempChartUrl}
                  onChange={(e) => setTempChartUrl(e.target.value)}
                  disabled={chartUrls.length >= 10}
                  placeholder={chartUrls.length >= 10 ? "Maximum 10 chart URLs reached" : "Paste TradingView or image URL here..."}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500/50 text-zinc-200 disabled:opacity-50 transition-all font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveChartUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveChartUrl}
                  disabled={!tempChartUrl.trim() || chartUrls.length >= 10}
                  className="px-6 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all text-xs disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap active:scale-95"
                >
                  Save URL
                </button>
              </div>
            </div>

            {/* Grid display of all 10 slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => {
                const url = chartUrls[index];
                const isPlaceholder = !url || url.trim() === '';
                
                return (
                  <div key={index} className="space-y-2 bg-[#121214] p-3 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[135px] transition-all hover:border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        URL {index + 1}
                      </span>
                      {!isPlaceholder && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChart(index)}
                          className="text-[9px] font-black text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                        >
                          DELETE
                        </button>
                      )}
                    </div>
                    
                    {isPlaceholder ? (
                      <div className="flex-1 flex items-center justify-center p-2 rounded-xl border border-dashed border-white/5 bg-white/[0.01]">
                        <span className="text-[9px] text-zinc-600 font-medium italic select-none">Empty Slot</span>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] text-zinc-400 break-all line-clamp-1 select-all h-4 mb-0.5" title={url}>
                            {url}
                          </span>
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-500 hover:text-emerald-400 transition-colors"
                            title="Open external link"
                          >
                            <ExternalLink size={10} />
                          </a>
                        </div>
                        
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <img 
                            src={url} 
                            alt={`Chart ${index + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const errorMsg = document.createElement('div');
                                errorMsg.className = 'absolute inset-0 flex items-center justify-center text-[8px] text-zinc-600 px-1 text-center font-bold uppercase';
                                errorMsg.innerText = 'Invalid Link';
                                parent.appendChild(errorMsg);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-zinc-400 font-medium hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-2.5 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
