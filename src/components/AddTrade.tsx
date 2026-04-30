import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

import DatePicker from './ui/DatePicker';
import TagInput from './ui/TagInput';
import MarkdownEditor from './MarkdownEditor';

interface AddTradeProps {
  onBack: () => void;
}

export default function AddTrade({ onBack }: AddTradeProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    pair: '',
    type: 'buy' as 'buy' | 'sell',
    entryPrice: '' as any,
    slPrice: '' as any,
    tpPrice: '' as any,
    exitPrice: '' as any,
    rr: '' as any,
    notes: '',
    tags: [] as string[],
    chartUrls: [''],
    entryDateTime: new Date()
  });

  React.useEffect(() => {
    const fetchTags = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'userSettings', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAvailableTags(docSnap.data().customTags || []);
        }
      }
    };
    fetchTags();
  }, []);
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
        openTime: Timestamp.fromDate(entryDate),
        size: 0,
        item: formData.pair,
        openPrice: Number(formData.entryPrice) || 0,
        closeTime: null,
        closePrice: Number(formData.exitPrice) || 0,
        profit: 0,
        type: formData.type,
        notes: formData.notes,
        tags: formData.tags,
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
      <h2 className="text-2xl font-bold mb-6">New Trade</h2>
      <form id="add-trade-form" onSubmit={handleSubmit} className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-6 space-y-5 w-full text-left">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Section 1: Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Pair</label>
              <select 
                required 
                value={formData.pair} 
                onChange={e => setFormData({...formData, pair: e.target.value})} 
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm uppercase cursor-pointer"
              >
                <option value="">Select a pair</option>
                <optgroup label="Forex Majors" className="bg-[#18181b] text-zinc-500 text-xs uppercase font-bold">
                  {['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD'].map(pair => (
                    <option key={pair} value={pair} className="text-zinc-200">{pair}</option>
                  ))}
                </optgroup>
                <optgroup label="Forex Crosses" className="bg-[#18181b] text-zinc-500 text-xs uppercase font-bold">
                  {['EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/NZD', 'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/NZD', 'AUD/JPY', 'AUD/CAD', 'AUD/CHF', 'AUD/NZD', 'CAD/JPY', 'CHF/JPY', 'NZD/JPY', 'NZD/CAD', 'NZD/CHF', 'CAD/CHF'].map(pair => (
                    <option key={pair} value={pair} className="text-zinc-200">{pair}</option>
                  ))}
                </optgroup>
                <optgroup label="Metals & Indices" className="bg-[#18181b] text-zinc-500 text-xs uppercase font-bold">
                  {['XAU/USD', 'XAG/USD', 'US30', 'NAS100', 'SPX500', 'GER40'].map(pair => (
                    <option key={pair} value={pair} className="text-zinc-200">{pair}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Entry Time</label>
              <DatePicker 
                value={formData.entryDateTime}
                onChange={date => setFormData({...formData, entryDateTime: date})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Type</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as 'buy' | 'sell'})} 
                className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none transition-all cursor-pointer font-bold text-sm ${
                  formData.type === 'buy' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}
              >
                <option value="buy" className="bg-[#18181b] text-emerald-500">BUY</option>
                <option value="sell" className="bg-[#18181b] text-red-500">SELL</option>
              </select>
            </div>
          </div>

          {/* Section 2: Pricing Logic */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Entry</label>
              <input 
                type="number" step="0.00001" required value={formData.entryPrice} 
                onChange={e => setFormData({...formData, entryPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">SL</label>
              <input 
                type="number" step="0.00001" required value={formData.slPrice} 
                onChange={e => setFormData({...formData, slPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500/50 text-zinc-200 text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">TP</label>
              <input 
                type="number" step="0.00001" required value={formData.tpPrice} 
                onChange={e => setFormData({...formData, tpPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Exit</label>
              <input 
                type="number" step="0.00001" value={formData.exitPrice} 
                onChange={e => setFormData({...formData, exitPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm" 
                placeholder="Opt."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">RR</label>
              <input 
                type="number" step="0.1" readOnly value={formData.rr} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-400 cursor-not-allowed font-bold text-sm" 
              />
            </div>
          </div>

          {/* Section 3: Notes & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Comments</label>
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest"
                >
                  {isEditingNotes ? 'Done' : 'Write'}
                </button>
              </div>
                {isEditingNotes ? (
                <MarkdownEditor 
                  value={formData.notes} 
                  onChange={val => setFormData({...formData, notes: val})}
                  placeholder="Strategy notes..."
                  minHeight="120px"
                />
              ) : (
                <div className="min-h-[120px] w-full p-4 bg-white/5 rounded-xl border border-white/5 text-sm text-zinc-300 markdown-preview">
                  {formData.notes ? (
                    <ReactMarkdown>{formData.notes}</ReactMarkdown>
                  ) : <span className="text-zinc-600">No notes yet...</span>}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Tags</label>
              <TagInput 
                tags={formData.tags} 
                onChange={tags => setFormData({...formData, tags})} 
                placeholder="Scalp, news..." 
                availableTags={availableTags}
              />
            </div>
          </div>
        
          {/* Section 4: Charts */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Chart Links (Max 5)</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.chartUrls.map((url, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => handleChartUrlChange(index, e.target.value)}
                      placeholder={`URL ${index + 1}`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 text-zinc-200"
                    />
                    {formData.chartUrls.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveChart(index)}
                        className="px-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all text-xs"
                      >
                        X
                      </button>
                    )}
                  </div>

                  {/* Individual Image Preview */}
                  {url && url.trim() !== '' && (
                    <div 
                      className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] group"
                    >
                      <img 
                        src={url} 
                        alt="Chart Preview"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const errorMsg = document.createElement('div');
                            errorMsg.className = 'absolute inset-0 flex items-center justify-center text-[8px] text-zinc-700 px-2 text-center font-bold uppercase';
                            errorMsg.innerText = 'Invalid Link';
                            parent.appendChild(errorMsg);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {formData.chartUrls.length < 5 && (
                <button 
                  type="button"
                  onClick={handleAddChart}
                  className="flex items-center justify-center border border-dashed border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all bg-white/[0.02]"
                >
                  + Add Link
                </button>
              )}
            </div>
          </div>

          {/* Status Messages */}
          <div className="pt-2">
            {status === 'saving' && (
              <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium animate-pulse">
                <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                Saving trade entries...
              </div>
            )}
            {status === 'success' && <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium"><CheckCircle2 size={16} /> Trade saved successfully!</div>}
            {status === 'error' && <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-medium"><AlertCircle size={16} /> {error}</div>}
          </div>
        </div>
      </form>
    </div>
  );
}
