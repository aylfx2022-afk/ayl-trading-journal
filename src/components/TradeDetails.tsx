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
import ChartCarousel from './ChartCarousel';
import MarkdownEditor from './MarkdownEditor';
import CustomSelect from './ui/CustomSelect';

const pairGroups = [
  {
    label: 'Forex Majors',
    options: [
      { value: 'EUR/USD', label: 'EUR/USD' },
      { value: 'GBP/USD', label: 'GBP/USD' },
      { value: 'USD/JPY', label: 'USD/JPY' },
      { value: 'USD/CHF', label: 'USD/CHF' },
      { value: 'AUD/USD', label: 'AUD/USD' },
      { value: 'NZD/USD', label: 'NZD/USD' },
      { value: 'USD/CAD', label: 'USD/CAD' }
    ]
  },
  {
    label: 'Forex Crosses',
    options: [
      { value: 'EUR/GBP', label: 'EUR/GBP' },
      { value: 'EUR/JPY', label: 'EUR/JPY' },
      { value: 'GBP/JPY', label: 'GBP/JPY' },
      { value: 'EUR/AUD', label: 'EUR/AUD' },
      { value: 'EUR/CAD', label: 'EUR/CAD' },
      { value: 'EUR/CHF', label: 'EUR/CHF' },
      { value: 'EUR/NZD', label: 'EUR/NZD' },
      { value: 'GBP/AUD', label: 'GBP/AUD' },
      { value: 'GBP/CAD', label: 'GBP/CAD' },
      { value: 'GBP/CHF', label: 'GBP/CHF' },
      { value: 'GBP/NZD', label: 'GBP/NZD' },
      { value: 'AUD/JPY', label: 'AUD/JPY' },
      { value: 'AUD/CAD', label: 'AUD/CAD' },
      { value: 'AUD/CHF', label: 'AUD/CHF' },
      { value: 'AUD/NZD', label: 'AUD/NZD' },
      { value: 'CAD/JPY', label: 'CAD/JPY' },
      { value: 'CHF/JPY', label: 'CHF/JPY' },
      { value: 'NZD/JPY', label: 'NZD/JPY' },
      { value: 'NZD/CAD', label: 'NZD/CAD' },
      { value: 'NZD/CHF', label: 'NZD/CHF' },
      { value: 'CAD/CHF', label: 'CAD/CHF' }
    ]
  },
  {
    label: 'Metals & Indices',
    options: [
      { value: 'XAU/USD', label: 'XAU/USD' },
      { value: 'XAG/USD', label: 'XAG/USD' },
      { value: 'US30', label: 'US30' },
      { value: 'NAS100', label: 'NAS100' },
      { value: 'SPX500', label: 'SPX500' },
      { value: 'GER40', label: 'GER40' }
    ]
  }
];

const typeOptions = [
  { value: 'buy', label: 'BUY', emoji: '📈' },
  { value: 'sell', label: 'SELL', emoji: '📉' }
];

const mentalOptions = [
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'focused', label: 'Focused', emoji: '🎯' },
  { value: 'calm', label: 'Calm', emoji: '🧘' },
  { value: 'disciplined', label: 'Disciplined', emoji: '📜' },
  { value: 'fomo', label: 'FOMO', emoji: '🚀' },
  { value: 'revenge', label: 'Revenge Trade', emoji: '😡' },
  { value: 'overconfident', label: 'Overconfident', emoji: '😎' },
  { value: 'anxious', label: 'Anxious', emoji: '😟' },
  { value: 'greedy', label: 'Greedy', emoji: '🤑' },
  { value: 'impatient', label: 'Impatient', emoji: '⏳' },
  { value: 'hesitant', label: 'Hesitant', emoji: '😨' },
  { value: 'excited', label: 'Excited', emoji: '⚡' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😫' },
  { value: 'bored', label: 'Bored', emoji: '🥱' }
];

const physicalOptions = [
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
  { value: 'sick', label: 'Sick', emoji: '🤒' },
  { value: 'sleepy', label: 'Sleepy', emoji: '💤' }
];

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
    <div className="w-full">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl p-6 text-left w-full lg:h-[calc(100vh-110px)] lg:flex lg:flex-col lg:overflow-hidden lg:min-h-[500px]">
        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-8 lg:flex-1 lg:overflow-hidden lg:min-h-0">
          
          {/* Left Column (30% width) - Form Complete */}
          <div className="lg:col-span-3 space-y-3 lg:h-full lg:overflow-y-auto lg:pr-3">
            {/* Pair Name */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">Pair</p>
              <CustomSelect
                value={pair}
                onChange={setPair}
                groups={pairGroups}
                placeholder="Select a pair"
              />
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
              <CustomSelect
                value={type}
                onChange={val => setType(val as 'buy' | 'sell')}
                options={typeOptions}
                placeholder="Select Type"
                typeStyle="type"
              />
            </div>

            <hr className="border-white/5 my-2.5" />

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

            <hr className="border-white/5 my-2.5" />

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
              <CustomSelect
                value={mentalState}
                onChange={setMentalState}
                options={mentalOptions}
                placeholder="Select mental state"
                typeStyle="mental"
              />
            </div>

            {/* Physical state dropdown */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-zinc-400 px-1">Physical State (ခန္ဓာကိုယ်အခြေအနေ)</p>
              <CustomSelect
                value={physicalState}
                onChange={setPhysicalState}
                options={physicalOptions}
                placeholder="Select physical state"
                typeStyle="physical"
              />
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

          {/* Right Column (70% width) - Premium Chart Carousel Slider */}
          <div className="lg:col-span-7 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
            <ChartCarousel
              charts={charts}
              onChangeUrl={handleChartUrlChange}
              onRemove={handleRemoveChart}
              onAdd={handleAddChart}
              onViewFullscreen={(url) => setViewerIndex(validChartUrls.indexOf(url))}
            />
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
