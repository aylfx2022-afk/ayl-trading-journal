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
  const [chartUrls, setChartUrls] = useState<string[]>(trade.chartUrls || ['']);
  const [isSaving, setIsSaving] = useState(false);

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
              Trade Details <span className="text-zinc-500 text-sm font-normal">#{trade.ticket}</span>
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
