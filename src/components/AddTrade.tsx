import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import DatePicker from './ui/DatePicker';
import TagInput from './ui/TagInput';
import MarkdownEditor from './MarkdownEditor';

interface AddTradeProps {
  onBack: () => void;
  initialDate?: Date;
  activeAccountId: string | null;
}

export default function AddTrade({ onBack, initialDate, activeAccountId }: AddTradeProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tempChartUrl, setTempChartUrl] = useState('');
  const [formData, setFormData] = useState({
    pair: '',
    type: '' as 'buy' | 'sell' | '',
    entryPrice: '' as any,
    slPrice: '' as any,
    tpPrice: '' as any,
    exitPrice: '' as any,
    rr: '' as any,
    notes: '',
    tags: [] as string[],
    chartUrls: [] as string[],
    entryDateTime: initialDate || new Date(),
    mentalState: '',
    physicalState: ''
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

  const handleSaveChartUrl = () => {
    const trimmed = tempChartUrl.trim();
    if (!trimmed) return;
    if (formData.chartUrls.length >= 5) return;
    setFormData(prev => ({
      ...prev,
      chartUrls: [...prev.chartUrls, trimmed]
    }));
    setTempChartUrl('');
  };

  const handleRemoveChart = (index: number) => {
    setFormData(prev => ({ ...prev, chartUrls: prev.chartUrls.filter((_, i) => i !== index) }));
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
        accountId: activeAccountId,
        createdAt: Timestamp.now(),
        // New fields
        pair: formData.pair,
        entryPrice: Number(formData.entryPrice) || 0,
        slPrice: Number(formData.slPrice) || 0,
        tpPrice: Number(formData.tpPrice) || 0,
        exitPrice: formData.exitPrice !== '' ? Number(formData.exitPrice) : null,
        rr: formData.rr !== '' ? Number(formData.rr) : null,
        mentalState: formData.mentalState,
        physicalState: formData.physicalState
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
      <form id="add-trade-form" onSubmit={handleSubmit} className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-6 w-full text-left">
        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* Left Column (30% width) - Form Complete */}
          <div className="lg:col-span-3 space-y-5">
            {/* SELECT A PAIR */}
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

            {/* DATE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Entry Time</label>
              <DatePicker 
                value={formData.entryDateTime}
                onChange={date => setFormData({...formData, entryDateTime: date})}
              />
            </div>

            {/* SELECT TYPE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Type</label>
              <select 
                required
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as 'buy' | 'sell' | ''})} 
                className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none transition-all cursor-pointer font-bold text-sm ${
                  formData.type === 'buy' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : formData.type === 'sell'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-zinc-800 border-white/10 text-zinc-500'
                }`}
              >
                <option value="" className="bg-[#18181b] text-zinc-500">Select Type</option>
                <option value="buy" className="bg-[#18181b] text-emerald-500">BUY</option>
                <option value="sell" className="bg-[#18181b] text-red-500">SELL</option>
              </select>
            </div>

            <hr className="border-white/5 my-4" />

            {/* ENTRY */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Entry</label>
              <input 
                type="number" step="0.00001" required value={formData.entryPrice} 
                onChange={e => setFormData({...formData, entryPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm" 
              />
            </div>

            {/* SL */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">SL</label>
              <input 
                type="number" step="0.00001" required value={formData.slPrice} 
                onChange={e => setFormData({...formData, slPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500/50 text-zinc-200 text-sm" 
              />
            </div>

            {/* TP */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">TP</label>
              <input 
                type="number" step="0.00001" required value={formData.tpPrice} 
                onChange={e => setFormData({...formData, tpPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm" 
              />
            </div>

            {/* EXIT */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Exit</label>
              <input 
                type="number" step="0.00001" value={formData.exitPrice} 
                onChange={e => setFormData({...formData, exitPrice: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 text-zinc-200 text-sm" 
                placeholder="Opt."
              />
            </div>

            {/* RR */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">RR</label>
              <input 
                type="number" step="0.1" readOnly value={formData.rr} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-400 cursor-not-allowed font-bold text-sm" 
              />
            </div>

            <hr className="border-white/5 my-4" />

            {/* COMMENTS */}
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
                <div className="min-h-[120px] w-full p-4 bg-white/5 rounded-xl border border-white/5 text-sm text-zinc-300 markdown-preview text-left">
                  {formData.notes ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.notes}</ReactMarkdown>
                  ) : <span className="text-zinc-600">No notes yet...</span>}
                </div>
              )}
            </div>

            {/* TAGS */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Tags</label>
              <TagInput 
                tags={formData.tags} 
                onChange={tags => setFormData({...formData, tags})} 
                placeholder="Scalp, news..." 
                availableTags={availableTags}
              />
            </div>

            {/* MENTAL STATE */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-zinc-400 px-1">Mental State (စိတ်အခြေအနေ)</p>
              <select
                value={formData.mentalState}
                onChange={(e) => setFormData({ ...formData, mentalState: e.target.value })}
                className="w-full bg-[#111113] border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 text-zinc-200"
              >
                <option value="" className="bg-[#111113] text-zinc-400">Select mental state</option>
                <option value="neutral" className="bg-[#111113]">Neutral 😐</option>
                <option value="focused" className="bg-[#111113]">Focused 🎯</option>
                <option value="calm" className="bg-[#111113]">Calm 🧘</option>
                <option value="anxious" className="bg-[#111113]">Anxious 😟</option>
                <option value="greedy" className="bg-[#111113]">Greedy 🤑</option>
                <option value="impatient" className="bg-[#111113]">Impatient ⏳</option>
                <option value="excited" className="bg-[#111113]">Excited ⚡</option>
              </select>
            </div>

            {/* PHYSICAL STATE */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-zinc-400 px-1">Physical State (ခန္ဓာကိုယ်အခြေအနေ)</p>
              <select
                value={formData.physicalState}
                onChange={(e) => setFormData({ ...formData, physicalState: e.target.value })}
                className="w-full bg-[#111113] border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 text-zinc-200"
              >
                <option value="" className="bg-[#111113] text-zinc-400">Select physical state</option>
                <option value="energetic" className="bg-[#111113]">Energetic ⚡</option>
                <option value="neutral" className="bg-[#111113]">Neutral 😐</option>
                <option value="tired" className="bg-[#111113]">Tired 😴</option>
                <option value="sick" className="bg-[#111113]">Sick 🤒</option>
                <option value="sleepy" className="bg-[#111113]">Sleepy 💤</option>
              </select>
            </div>
            
            {/* Status Messages */}
            <div className="pt-4">
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

          {/* Right Column (70% width) - Large Chart Images */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3 bg-white/[0.01] p-5 rounded-2xl border border-white/5">
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">
                Chart Links (Max 5)
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempChartUrl}
                  onChange={(e) => setTempChartUrl(e.target.value)}
                  disabled={formData.chartUrls.length >= 5}
                  placeholder={formData.chartUrls.length >= 5 ? "Maximum 5 chart URLs reached" : "Paste TradingView/Image URL here..."}
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
                  disabled={!tempChartUrl.trim() || formData.chartUrls.length >= 5}
                  className="px-6 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all text-xs disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap active:scale-95"
                >
                  Save URL
                </button>
              </div>
            </div>

            {/* Large Image Previews Stacked Vertically */}
            <div className="space-y-6">
              {formData.chartUrls.map((url, index) => (
                <div key={index} className="bg-[#121214] p-5 rounded-2xl border border-white/5 flex flex-col gap-4 transition-all hover:border-white/10 animate-fade-in shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      URL {index + 1} Preview
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChart(index)}
                      className="text-[9px] font-black text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      DELETE
                    </button>
                  </div>
                  
                  <div className="text-[10px] text-zinc-500 select-all font-mono break-all px-1">
                    {url}
                  </div>
                  
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 w-full min-h-[300px] flex items-center justify-center">
                    <img 
                      src={url} 
                      alt={`Chart ${index + 1}`}
                      className="w-full h-auto object-contain max-h-[700px] rounded-xl"
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
                  </div>
                </div>
              ))}

              {formData.chartUrls.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] text-zinc-500">
                  <span className="text-sm font-medium italic select-none">No chart images added yet. Paste a URL and click Save URL.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
