import React, { useState } from 'react';
import { Trade } from '../types';
import { Save, Image as ImageIcon, ExternalLink, ArrowLeft, X, Maximize2 } from 'lucide-react';
import { getSafeDate } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import DatePicker from './ui/DatePicker';
import TagInput from './ui/TagInput';
import ImageViewer from './ImageViewer';
import MarkdownEditor from './MarkdownEditor';

interface TradeDetailsProps {
  trade: Trade;
  onBack: () => void;
}

export default function TradeDetails({ trade, onBack }: TradeDetailsProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [notes, setNotes] = useState(trade.notes || '');
  const [pair, setPair] = useState(trade.item || '');
  const [tags, setTags] = useState<string[]>(trade.tags || []);
  const [mentalState, setMentalState] = useState(trade.mentalState || '');
  const [physicalState, setPhysicalState] = useState(trade.physicalState || '');
  const [type, setType] = useState<'buy' | 'sell'>(trade.type || 'buy');
  
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
  const [entryDateTime, setEntryDateTime] = useState<Date | null>(getSafeDate(trade.openTime));
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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
    
    const profit = type === 'buy' 
      ? exit - entry
      : entry - exit;
      
    setRr((profit / risk).toFixed(2));
  }, [type, entryPrice, slPrice, exitPrice]);

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
  }, [notes, charts, entryPrice, slPrice, tpPrice, exitPrice, rr, entryDateTime, pair, tags, mentalState, physicalState, type]);

  const handleSave = async () => {
    if (!trade.id) return;
    setSavingStatus('saving');
    try {
      const tradeRef = doc(db, 'trades', trade.id);
      const filteredUrls = charts.map(c => c.url).filter(url => url.trim() !== '');
      await updateDoc(tradeRef, {
        notes,
        tags,
        item: pair,
        pair: pair,
        type,
        chartUrls: filteredUrls,
        entryPrice: Number(entryPrice) || 0,
        slPrice: Number(slPrice) || 0,
        tpPrice: Number(tpPrice) || 0,
        exitPrice: exitPrice !== '' ? Number(exitPrice) : null,
        rr: rr !== '' ? Number(rr) : null,
        openTime: entryDateTime ? Timestamp.fromDate(entryDateTime) : trade.openTime,
        closeTime: null,
        mentalState,
        physicalState
      });
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      console.error("Error updating trade:", error);
      setSavingStatus('idle');
      handleFirestoreError(error, OperationType.UPDATE, 'trades/' + trade.id);
    }
  };

  const validChartUrls = charts.map(c => c.url).filter(url => url.trim() !== '');

  return (
    <div className="w-full space-y-8">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl p-6 text-left w-full">
        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* Left Column (30% width) - Form Complete */}
          <div className="lg:col-span-3 space-y-5">
            {/* Pair Name */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">Pair</p>
              <select 
                value={pair} 
                onChange={e => setPair(e.target.value)} 
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer uppercase"
              >
                <optgroup label="Forex Majors" className="bg-[#18181b] text-zinc-500 text-xs uppercase font-bold">
                  {['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD'].map(p => (
                    <option key={p} value={p} className="text-zinc-200">{p}</option>
                  ))}
                </optgroup>
                <optgroup label="Forex Crosses" className="bg-[#18181b] text-zinc-500 text-xs uppercase font-bold">
                  {['EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/NZD', 'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/NZD', 'AUD/JPY', 'AUD/CAD', 'AUD/CHF', 'AUD/NZD', 'CAD/JPY', 'CHF/JPY', 'NZD/JPY', 'NZD/CAD', 'NZD/CHF', 'CAD/CHF'].map(p => (
                    <option key={p} value={p} className="text-zinc-200">{p}</option>
                  ))}
                </optgroup>
                <optgroup label="Metals & Indices" className="bg-[#18181b] text-zinc-500 text-xs uppercase font-bold">
                  {['XAU/USD', 'XAG/USD', 'US30', 'NAS100', 'SPX500', 'GER40'].map(p => (
                    <option key={p} value={p} className="text-zinc-200">{p}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Entry Date */}
            <div className="space-y-1.5 relative z-50">
              <DatePicker 
                label="Entry Date"
                value={entryDateTime}
                onChange={setEntryDateTime}
                compact
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black px-1 tracking-widest text-zinc-500">Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as 'buy' | 'sell')} 
                className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none transition-all cursor-pointer font-bold text-sm ${
                  type === 'buy' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}
              >
                <option value="buy" className="bg-[#18181b] text-emerald-500">BUY</option>
                <option value="sell" className="bg-[#18181b] text-red-500">SELL</option>
              </select>
            </div>

            <hr className="border-white/5 my-4" />

            {/* Entry Price */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">Entry</p>
              <input type="number" step="0.00001" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 focus:outline-none focus:border-emerald-500/50" />
            </div>

            {/* Stop Loss SL Price */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">SL</p>
              <input type="number" step="0.00001" value={slPrice} onChange={e => setSlPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 focus:outline-none focus:border-red-500/50" />
            </div>

            {/* Take Profit TP Price */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">TP</p>
              <input type="number" step="0.00001" value={tpPrice} onChange={e => setTpPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 focus:outline-none focus:border-emerald-500/50" />
            </div>

            {/* Exit Price */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">Exit</p>
              <input type="number" step="0.00001" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 focus:outline-none focus:border-emerald-500/50" />
            </div>

            {/* RR Ratio */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">RR</p>
              <input type="number" step="0.01" value={rr} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-400 focus:outline-none cursor-not-allowed" />
            </div>

            <hr className="border-white/5 my-4" />

            {/* Comments Area */}
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">
                Comments
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className="text-emerald-500 hover:text-emerald-400 uppercase tracking-widest text-[10px]"
                >
                  {isEditingNotes ? 'Done' : 'Write'}
                </button>
              </label>
              {isEditingNotes ? (
                <MarkdownEditor 
                  value={notes} 
                  onChange={setNotes}
                  placeholder="Analysis notes..."
                  minHeight="140px"
                />
              ) : (
                <div className="min-h-[140px] w-full p-4 bg-white/5 rounded-xl border border-white/5 text-sm text-zinc-300 markdown-preview text-left">
                  {notes ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
                  ) : <span className="text-zinc-600">No notes yet...</span>}
                </div>
              )}
            </div>

            {/* Tags area */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">
                # Tags
              </label>
              <TagInput 
                tags={tags} 
                onChange={setTags} 
                placeholder="Strategy, news..." 
                availableTags={availableTags}
              />
            </div>

            {/* Mental State dropdown */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-zinc-400 px-1">Mental State (စိတ်အခြေအနေ)</p>
              <select
                value={mentalState}
                onChange={(e) => setMentalState(e.target.value)}
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

            {/* Physical state dropdown */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-zinc-400 px-1">Physical State (ခန္ဓာကိုယ်အခြေအနေ)</p>
              <select
                value={physicalState}
                onChange={(e) => setPhysicalState(e.target.value)}
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

            {/* Saving history footer status message */}
            <div className="pt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
                {savingStatus === 'saving' && <span className="text-emerald-500/70 animate-pulse">Saving Changes...</span>}
                {savingStatus === 'saved' && <span className="text-emerald-500">All Changes Saved</span>}
                {savingStatus === 'idle' && 'Last entry auto-saved'}
              </div>
            </div>
          </div>

          {/* Right Column (70% width) - Large Chart Previews Stacked Vertically */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4 bg-white/[0.01] p-5 rounded-2xl border border-white/5">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">
                <ImageIcon size={14} className="text-emerald-500" />
                Chart Links (Max 5)
              </label>
              
              <div className="space-y-6">
                {charts.map((chart, idx) => (
                  <div key={chart.id} className="space-y-3 bg-[#121214] p-5 rounded-xl border border-white/5 transition-all hover:border-white/10 animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        URL {idx + 1} Preview
                      </span>
                      <div className="flex gap-1.5">
                        {chart.url && (
                          <button 
                            type="button"
                            onClick={() => setViewerIndex(validChartUrls.indexOf(chart.url))}
                            className="p-1 px-3 text-[9px] font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center cursor-pointer"
                            title="View Fullscreen"
                          >
                            VIEW FULL
                          </button>
                        )}
                        {charts.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveChart(chart.id)}
                            className="p-1 px-3 text-[9px] font-bold rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center cursor-pointer"
                          >
                            DELETE
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={chart.url}
                      onChange={(e) => handleChartUrlChange(chart.id, e.target.value)}
                      placeholder="Paste TradingView/Image URL here..."
                      className="w-full p-2.5 rounded-xl bg-[#111113] border border-white/10 focus:border-emerald-500/50 focus:outline-none text-xs text-zinc-300 font-mono transition-all"
                    />

                    {/* Image Preview */}
                    {chart.url && chart.url.trim() !== '' && (
                      <div 
                        className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 w-full min-h-[300px] flex items-center justify-center cursor-pointer group"
                        onClick={() => setViewerIndex(validChartUrls.indexOf(chart.url))}
                      >
                        <img 
                          src={chart.url} 
                          alt={`Chart ${idx + 1}`}
                          className="w-full h-auto object-contain max-h-[700px] transition-transform duration-500 group-hover:scale-[1.02] rounded-lg"
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
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 size={16} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {charts.length < 5 && (
                  <button 
                    type="button"
                    onClick={handleAddChart}
                    className="flex items-center justify-center border border-dashed border-white/10 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/30 transition-all bg-white/[0.01] w-full"
                  >
                    + Add New Image Link
                  </button>
                )}
              </div>
            </div>
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
