import React, { useState } from 'react';
import { Trade } from '../types';
import { Save, Image as ImageIcon, ExternalLink, ArrowLeft, X, Maximize2, Check } from 'lucide-react';
import { getSafeDate } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TIMEFRAME_PRESETS = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

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

const preTradeEmotionOptions = [
  { value: 'calm', label: 'Calm / တည်ငြိမ်မှုရှိ', emoji: '🧘' },
  { value: 'excited', label: 'Excited / စိတ်လှုပ်ရှားနေ', emoji: '⚡' },
  { value: 'confident', label: 'Confident / ယုံကြည်မှုရှိ', emoji: '💪' },
  { value: 'hesitant', label: 'Hesitant / တွန့်ဆုတ်နေ', emoji: '😟' },
  { value: 'fomo', label: 'FOMO / နောက်ကျကျန်စိုးရိမ်', emoji: '🚀' },
  { value: 'impatient', label: 'Impatient / စိတ်မရှည်ဖြစ်နေ', emoji: '⏳' },
  { value: 'bored', label: 'Bored / ပျင်းရိနေ', emoji: '🥱' }
];

const duringTradeEmotionOptions = [
  { value: 'peaceful', label: 'Peaceful / စိတ်အေးချမ်း', emoji: '🕊️' },
  { value: 'anxious', label: 'Anxious / စိုးရိမ်ပူပန်', emoji: '😰' },
  { value: 'relaxed', label: 'Relaxed / စိတ်ပေါ့ပါး', emoji: '🍹' },
  { value: 'obsessive', label: 'Obsessive Screen watching / စခရင်အမြဲကြည့်နေ', emoji: '👁️' },
  { value: 'fearing_loss', label: 'Fearing Loss / ရှုံးမှာကြောက်နေ', emoji: '📉' },
  { value: 'greed_surge', label: 'Greed Surge / ပိုလိုချင်စိတ်စွတ်', emoji: '🤑' },
  { value: 'confident', label: 'Confident / ယုံကြည်မှုအတိုင်း', emoji: '🛡️' }
];

const postTradeEmotionOptions = [
  { value: 'satisfied_disciplined', label: 'Satisfied & Disciplined / စည်းကမ်းလိုက်နာခဲ့၍ကျေနပ်', emoji: '🏆' },
  { value: 'satisfied_lucky', label: 'Satisfied but Lucky / ကံကောင်း၍ကျေနပ်', emoji: '🍀' },
  { value: 'relieved', label: 'Relieved / သက်ပြင်းချနိုင်ခဲ့', emoji: '😌' },
  { value: 'frustrated', label: 'Frustrated / စိတ်ပျက်ဒေါသထွက်', emoji: '😫' },
  { value: 'regretful_sl', label: 'Regretful SL / ရှုံး၍နောင်တရ', emoji: '🤦' },
  { value: 'regretful_early_exit', label: 'Regretful Early Exit / စောထွက်မိ၍နောင်တရ', emoji: '😢' },
  { value: 'neutral_accepting', label: 'Neutral & Accepting / ရလဒ်ကိုသာမန်အတိုင်းလက်ခံ', emoji: '🤝' }
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
  const [preTradeEmotion, setPreTradeEmotion] = useState(trade.preTradeEmotion || '');
  const [duringTradeEmotion, setDuringTradeEmotion] = useState(trade.duringTradeEmotion || '');
  const [postTradeEmotion, setPostTradeEmotion] = useState(trade.postTradeEmotion || '');
  const [type, setType] = useState<'buy' | 'sell'>(trade.type || 'buy');
  const [entryTimeframe, setEntryTimeframe] = useState(trade.entryTimeframe || '');
  const [showCustomTf, setShowCustomTf] = useState(false);
  const [customTfValue, setCustomTfValue] = useState('');
  
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAIAnalyze = async (url: string) => {
    if (!auth.currentUser) return;
    setIsAnalyzing(true);
    try {
      const docRef = doc(db, 'userSettings', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        alert("Please configure your AI API key in Settings first! / Settings မှာ API Key အရင်သွားထည့်ပေးပါ။");
        return;
      }
      const settings = docSnap.data();
      const provider = settings.aiProvider || 'gemini';
      const apiKey = provider === 'openrouter' ? settings.openRouterApiKey : settings.geminiApiKey;

      if (!apiKey || apiKey.trim() === '') {
        alert(`Please configure your ${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} API Key in Settings first! / Settings မှာ API Key အရင်သွားထည့်ပေးပါ။`);
        return;
      }

      const res = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, provider, apiKey })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to analyze chart');
      }

      const data = await res.json();
      
      if (data.entryPrice) {
        setEntryPrice(data.entryPrice.toString());
        if (data.slPrice) setSlPrice(data.slPrice.toString());
        if (data.tpPrice) setTpPrice(data.tpPrice.toString());
        if (data.type === 'buy' || data.type === 'sell') setType(data.type);
        if (data.pair) setPair(data.pair);
        if (data.entryTimeframe) setEntryTimeframe(data.entryTimeframe);
        
        const details = [
          `Trade: ${data.type.toUpperCase()}`,
          `Entry: ${data.entryPrice}`,
          `SL: ${data.slPrice}`,
          `TP: ${data.tpPrice}`,
          data.pair ? `Pair: ${data.pair}` : null,
          data.entryTimeframe ? `Timeframe: ${data.entryTimeframe}` : null,
          `Confidence: ${(data.confidence * 100).toFixed(0)}%`,
          `Notes: ${data.message || 'None'}`
        ].filter(Boolean).join('\n');

        alert(`AI Analysis Success! / AI ခွဲခြမ်းစိတ်ဖြာမှုအောင်မြင်သည်။\n\n${details}`);
      } else {
        throw new Error("No entry price was extracted from the chart.");
      }

    } catch (err: any) {
      console.error(err);
      alert(`AI Analysis Failed: ${err.message || err}\nကျေးဇူးပြု၍ API Key သို့မဟုတ် ပုံလင့်ခ် မှန်မမှန် ပြန်လည်စစ်ဆေးပါ။`);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    if (charts.length < 10) {
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
  }, [notes, charts, entryPrice, slPrice, tpPrice, exitPrice, rr, entryDateTime, pair, tags, mentalState, physicalState, preTradeEmotion, duringTradeEmotion, postTradeEmotion, type, entryTimeframe]);

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
        physicalState,
        preTradeEmotion,
        duringTradeEmotion,
        postTradeEmotion,
        entryTimeframe
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

            {/* Entry & Exit Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Entry Price */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">Entry</p>
                <input type="number" step="0.00001" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 focus:outline-none focus:border-emerald-500/50" />
              </div>

              {/* Exit Price */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-zinc-500 uppercase font-black px-1 tracking-widest">Exit</p>
                <input type="number" step="0.00001" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-200 focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>

            {/* SL & TP Row */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* ENTRY TIMEFRAME */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Entry Timeframe</label>
              <div className="flex flex-wrap gap-1.5 px-1">
                {TIMEFRAME_PRESETS.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setEntryTimeframe(tf)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      entryTimeframe === tf
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
                {showCustomTf ? (
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg pl-2 pr-1 py-0.5">
                    <input
                      type="text"
                      value={customTfValue}
                      onChange={(e) => setCustomTfValue(e.target.value)}
                      placeholder="e.g. 12h"
                      className="bg-transparent text-xs text-zinc-200 outline-none w-14 font-semibold"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customTfValue.trim();
                          if (val) {
                            setEntryTimeframe(val);
                            setCustomTfValue('');
                            setShowCustomTf(false);
                          }
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customTfValue.trim();
                        if (val) {
                          setEntryTimeframe(val);
                          setCustomTfValue('');
                          setShowCustomTf(false);
                        }
                      }}
                      className="p-1 text-emerald-500 hover:text-emerald-400 hover:bg-white/5 rounded-md transition-all"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomTf(false);
                        setCustomTfValue('');
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-400 hover:bg-white/5 rounded-md transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomTf(true)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-dashed border-zinc-700 bg-transparent text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-all"
                  >
                    + Custom
                  </button>
                )}
              </div>
              {entryTimeframe && !TIMEFRAME_PRESETS.includes(entryTimeframe) && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs px-1">
                  <span className="text-zinc-500">Selected Custom:</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-md font-semibold">
                    {entryTimeframe}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEntryTimeframe('')}
                    className="text-zinc-500 hover:text-red-400 text-[10px] uppercase font-black tracking-widest ml-1"
                  >
                    Clear
                  </button>
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

            <div className="space-y-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
              <p className="text-[10.5px] uppercase font-black text-emerald-500 tracking-wider font-sans">Trader Psychology (စိတ်ပိုင်းဆိုင်ရာ)</p>
              
              {/* PRE-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-zinc-400 px-1 font-sans">Feeling BEFORE Entry (Trade မဝင်ခင် ခံစားချက်)</p>
                <CustomSelect
                  value={preTradeEmotion}
                  onChange={setPreTradeEmotion}
                  options={preTradeEmotionOptions}
                  placeholder="Select pre-trade emotion"
                  typeStyle="mental"
                />
              </div>

              {/* DURING-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-zinc-400 px-1 font-sans">Feeling DURING Active Trade (ဝင်ထားစဉ် ခံစားချက်)</p>
                <CustomSelect
                  value={duringTradeEmotion}
                  onChange={setDuringTradeEmotion}
                  options={duringTradeEmotionOptions}
                  placeholder="Select during-trade emotion"
                  typeStyle="mental"
                />
              </div>

              {/* POST-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-zinc-400 px-1 font-sans">Feeling AFTER Exit (ထွက်ပြီးနောက် ခံစားချက်)</p>
                <CustomSelect
                  value={postTradeEmotion}
                  onChange={setPostTradeEmotion}
                  options={postTradeEmotionOptions}
                  placeholder="Select post-trade emotion"
                  typeStyle="mental"
                />
              </div>
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
              onAnalyze={handleAIAnalyze}
              isAnalyzing={isAnalyzing}
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
