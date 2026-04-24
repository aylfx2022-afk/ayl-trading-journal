import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

import DatePicker from './ui/DatePicker';

interface AddTradeProps {
  onBack: () => void;
}

export default function AddTrade({ onBack }: AddTradeProps) {
  const [formData, setFormData] = useState({
    pair: '',
    type: 'buy' as 'buy' | 'sell',
    entryPrice: '' as any,
    slPrice: '' as any,
    tpPrice: '' as any,
    exitPrice: '' as any,
    rr: '' as any,
    notes: '',
    chartUrls: [''],
    entryDateTime: new Date()
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleAddChart = () => {
    if (formData.chartUrls.length < 5) {
      setFormData(prev => ({ ...prev, chartUrls: [...prev.chartUrls, ''] }));
    }
  };

  const handleRemoveChart = (index: number) => {
    setFormData(prev => ({ ...prev, chartUrls: prev.chartUrls.filter((_, i) => i !== index) }));
  };

  const handleChartUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.chartUrls];
    newUrls[index] = value;
    setFormData(prev => ({ ...prev, chartUrls: newUrls }));
  };

  React.useEffect(() => {
    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.slPrice);
    const exit = parseFloat(formData.exitPrice);
    
    if (isNaN(entry) || isNaN(sl) || isNaN(exit)) {
      setFormData(prev => ({ ...prev, rr: '' }));
      return;
    }

    const risk = Math.abs(entry - sl);
    if (risk === 0) {
      setFormData(prev => ({ ...prev, rr: 0 }));
      return;
    }
    
    const profit = formData.type === 'buy' 
      ? exit - entry
      : entry - exit;
      
    setFormData(prev => ({ ...prev, rr: parseFloat((profit / risk).toFixed(2)) }));
  }, [formData.type, formData.entryPrice, formData.slPrice, formData.exitPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setStatus('saving');
    setError('');

    try {
      const entryDate = formData.entryDateTime || new Date();
      await addDoc(collection(db, 'trades'), {
        ticket: 'MANUAL-' + Date.now(),
        openTime: Timestamp.fromDate(entryDate),
        size: 0,
        item: formData.pair,
        openPrice: Number(formData.entryPrice) || 0,
        closeTime: null,
        closePrice: Number(formData.exitPrice) || 0,
        profit: 0,
        type: formData.type,
        notes: formData.notes,
        chartUrls: formData.chartUrls.filter(url => url.trim() !== ''),
        userId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
        // New fields
        pair: formData.pair,
        entryPrice: Number(formData.entryPrice) || 0,
        slPrice: Number(formData.slPrice) || 0,
        tpPrice: Number(formData.tpPrice) || 0,
        exitPrice: formData.exitPrice !== '' ? Number(formData.exitPrice) : null,
        rr: formData.rr !== '' ? Number(formData.rr) : null
      });
      setStatus('success');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save trade.');
      setStatus('error');
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-8">New Trade</h2>
      <form onSubmit={handleSubmit} className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 space-y-6 w-full text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <DatePicker 
              label="Entry Date & Time"
              value={formData.entryDateTime}
              onChange={date => setFormData({...formData, entryDateTime: date})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Pair Name</label>
            <select 
              required 
              value={formData.pair} 
              onChange={e => setFormData({...formData, pair: e.target.value})} 
              className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200 uppercase cursor-pointer"
            >
              <option value="">Select a pair</option>
              {['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'].map(pair => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Type</label>
            <select 
              value={formData.type} 
              onChange={e => setFormData({...formData, type: e.target.value as 'buy' | 'sell'})} 
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-all cursor-pointer font-bold ${
                formData.type === 'buy' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                  : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
              }`}
            >
              <option value="buy" className="bg-[#18181b] text-emerald-500">Buy</option>
              <option value="sell" className="bg-[#18181b] text-red-500">Sell</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Entry Price</label>
            <input type="number" step="0.00001" required value={formData.entryPrice} onChange={e => setFormData({...formData, entryPrice: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">SL Price</label>
            <input type="number" step="0.00001" required value={formData.slPrice} onChange={e => setFormData({...formData, slPrice: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">TP Price</label>
            <input type="number" step="0.00001" required value={formData.tpPrice} onChange={e => setFormData({...formData, tpPrice: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Exit Price</label>
            <input type="number" step="0.00001" value={formData.exitPrice} onChange={e => setFormData({...formData, exitPrice: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">RR</label>
            <input type="number" step="0.1" readOnly value={formData.rr} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Comments</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200 h-24" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className="block text-sm font-medium text-zinc-400">TradingView Chart Links (Max 5)</label>
              <p className="text-[10px] text-zinc-500 italic">
                Tip: Use TradingView "Share Image" links. Notion links expire after 1 hour.
              </p>
            </div>
          </div>
          {formData.chartUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => handleChartUrlChange(index, e.target.value)}
                placeholder={`Chart URL ${index + 1}`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 text-zinc-200"
              />
              {formData.chartUrls.length > 1 && (
                <button 
                  type="button"
                  onClick={() => handleRemoveChart(index)}
                  className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                  X
                </button>
              )}
            </div>
          ))}
          {formData.chartUrls.length < 5 && (
            <button 
              type="button"
              onClick={handleAddChart}
              className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors w-fit px-1"
            >
              + Add Another Chart
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <button type="submit" disabled={status === 'saving'} className="w-full py-4 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">
            {status === 'saving' ? 'Saving...' : <><Save size={18} /> Save Trade</>}
          </button>
        </div>
        {status === 'success' && <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium"><CheckCircle2 size={16} /> Trade saved successfully!</div>}
        {status === 'error' && <div className="flex items-center gap-2 text-red-500 text-sm font-medium"><AlertCircle size={16} /> {error}</div>}
      </form>
    </div>
  );
}
