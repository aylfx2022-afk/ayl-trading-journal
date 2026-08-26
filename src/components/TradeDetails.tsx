import React, { useState } from 'react';
import { Trade } from '../types';
import { Save, Image as ImageIcon, ExternalLink, ArrowLeft, X, Maximize2, Check, Sparkles, AlertCircle, Copy, ClipboardPaste } from 'lucide-react';
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
  const [copiedField, setCopiedField] = useState<'sl' | 'tp' | null>(null);
  const [pastedExit, setPastedExit] = useState(false);

  const handleCopyPrice = (value: any, field: 'sl' | 'tp') => {
    if (value === undefined || value === null || value === '') return;
    navigator.clipboard.writeText(value.toString()).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }).catch(err => {
      console.error('Failed to copy price: ', err);
    });
  };

  const handlePasteExit = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleaned = text.trim();
        setExitPrice(cleaned);
        setPastedExit(true);
        setTimeout(() => setPastedExit(false), 1500);
      }
    } catch (err) {
      console.error('Failed to paste exit price: ', err);
    }
  };

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiNotice, setAiNotice] = useState<{ type: 'success' | 'error'; title: string; details?: string; data?: any } | null>(null);

  const handleAIAnalyze = async (url: string) => {
    if (!auth.currentUser) return;
    setIsAnalyzing(true);
    setAiNotice(null);
    try {
      let provider = 'gemini';
      try {
        const docRef = doc(db, 'userSettings', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          provider = docSnap.data().aiProvider || 'gemini';
        }
      } catch (e) {
        // Fallback to gemini
      }

      const res = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, provider })
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
        
        setAiNotice({
          type: 'success',
          title: 'AI Analysis Complete! Parameters auto-filled.',
          data: data
        });
      } else {
        throw new Error("No entry price was extracted from the chart.");
      }

    } catch (err: any) {
      console.error(err);
      setAiNotice({
        type: 'error',
        title: 'AI Analysis Failed',
        details: err.message || String(err)
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    if (aiNotice) {
      const timer = setTimeout(() => {
        setAiNotice(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [aiNotice]);

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
      <div className="bg-[#181d26] border border-white/10 rounded-2xl p-6 text-left w-full lg:h-[calc(100vh-110px)] lg:flex lg:flex-col lg:overflow-hidden lg:min-h-[500px] shadow-2xl">
        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-8 lg:flex-1 lg:overflow-hidden lg:min-h-0">
          
          {/* Left Column (30% width) - Form Complete */}
          <div className="lg:col-span-3 space-y-3 lg:h-full lg:overflow-y-auto lg:pr-3">
            {/* Pair Name */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#8b93a1] uppercase font-black px-1 tracking-widest">Pair</p>
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
              <label className="text-[10px] uppercase font-black px-1 tracking-widest text-[#8b93a1]">Type</label>
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
                <p className="text-[10px] text-[#8b93a1] uppercase font-black px-1 tracking-widest">Entry</p>
                <input type="number" step="0.00001" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full bg-[#12161c] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-[#e8ebf2] focus:outline-none focus:border-[#4d8fe0]/50" />
              </div>

              {/* Exit Price */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] text-[#8b93a1] uppercase font-black tracking-widest">Exit</p>
                  <button
                    type="button"
                    onClick={handlePasteExit}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#4d8fe0] hover:text-[#7ba8e8] transition-colors cursor-pointer"
                    title="Paste Exit Price"
                  >
                    {pastedExit ? (
                      <>
                        <Check size={11} className="text-[#7ba8e8]" />
                        <span className="text-[#7ba8e8]">Pasted!</span>
                      </>
                    ) : (
                      <>
                        <ClipboardPaste size={11} />
                        <span>Paste</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input type="number" step="0.00001" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full bg-[#12161c] border border-white/10 rounded-xl pl-3 pr-9 py-2 text-sm font-bold text-[#e8ebf2] focus:outline-none focus:border-[#4d8fe0]/50" />
                  <button
                    type="button"
                    onClick={handlePasteExit}
                    className="absolute right-2 p-1 rounded-lg text-[#8b93a1] hover:text-[#4d8fe0] hover:bg-white/10 transition-all cursor-pointer"
                    title="Paste Exit Price from Clipboard"
                  >
                    {pastedExit ? <Check size={14} className="text-[#7ba8e8]" /> : <ClipboardPaste size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* SL & TP Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Stop Loss SL Price */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] text-[#8b93a1] uppercase font-black tracking-widest">SL</p>
                  {slPrice !== '' && slPrice !== null && (
                    <button
                      type="button"
                      onClick={() => handleCopyPrice(slPrice, 'sl')}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#8b93a1] hover:text-red-400 transition-colors cursor-pointer"
                      title="Copy SL Price"
                    >
                      {copiedField === 'sl' ? (
                        <>
                          <Check size={11} className="text-[#7ba8e8]" />
                          <span className="text-[#7ba8e8]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input type="number" step="0.00001" value={slPrice} onChange={e => setSlPrice(e.target.value)} className="w-full bg-[#12161c] border border-white/10 rounded-xl pl-3 pr-9 py-2 text-sm font-bold text-[#e8ebf2] focus:outline-none focus:border-red-500/50" />
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(slPrice, 'sl')}
                    disabled={!slPrice}
                    className="absolute right-2 p-1 rounded-lg text-[#8b93a1] hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Copy SL Price"
                  >
                    {copiedField === 'sl' ? <Check size={14} className="text-[#7ba8e8]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Take Profit TP Price */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] text-[#8b93a1] uppercase font-black tracking-widest">TP</p>
                  {tpPrice !== '' && tpPrice !== null && (
                    <button
                      type="button"
                      onClick={() => handleCopyPrice(tpPrice, 'tp')}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#8b93a1] hover:text-[#4d8fe0] transition-colors cursor-pointer"
                      title="Copy TP Price"
                    >
                      {copiedField === 'tp' ? (
                        <>
                          <Check size={11} className="text-[#7ba8e8]" />
                          <span className="text-[#7ba8e8]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input type="number" step="0.00001" value={tpPrice} onChange={e => setTpPrice(e.target.value)} className="w-full bg-[#12161c] border border-white/10 rounded-xl pl-3 pr-9 py-2 text-sm font-bold text-[#e8ebf2] focus:outline-none focus:border-[#4d8fe0]/50" />
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(tpPrice, 'tp')}
                    disabled={!tpPrice}
                    className="absolute right-2 p-1 rounded-lg text-[#8b93a1] hover:text-[#4d8fe0] hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Copy TP Price"
                  >
                    {copiedField === 'tp' ? <Check size={14} className="text-[#7ba8e8]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* RR Ratio */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#8b93a1] uppercase font-black px-1 tracking-widest">RR</p>
              <input type="number" step="0.01" value={rr} readOnly className="w-full bg-[#12161c] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-[#8b93a1] focus:outline-none cursor-not-allowed" />
            </div>

            <hr className="border-white/5 my-2.5" />

            {/* Comments Area */}
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">
                Comments
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className="text-[#4d8fe0] hover:text-[#7ba8e8] uppercase tracking-widest text-[10px]"
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
                <div className="min-h-[140px] w-full p-4 bg-[#12161c] rounded-xl border border-white/5 text-sm text-[#e8ebf2] markdown-preview text-left">
                  {notes ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
                  ) : <span className="text-[#8b93a1]/60">No notes yet...</span>}
                </div>
              )}
            </div>

            {/* ENTRY TIMEFRAME */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Entry Timeframe</label>
              <div className="flex flex-wrap gap-1.5 px-1">
                {TIMEFRAME_PRESETS.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setEntryTimeframe(tf)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      entryTimeframe === tf
                        ? 'bg-[#1e2733] border-[#4d8fe0]/50 text-[#7ba8e8] font-bold'
                        : 'bg-[#12161c] border-white/5 text-[#8b93a1] hover:bg-white/10 hover:text-[#e8ebf2]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
                {showCustomTf ? (
                  <div className="flex items-center gap-1 bg-[#12161c] border border-white/10 rounded-lg pl-2 pr-1 py-0.5">
                    <input
                      type="text"
                      value={customTfValue}
                      onChange={(e) => setCustomTfValue(e.target.value)}
                      placeholder="e.g. 12h"
                      className="bg-transparent text-xs text-[#e8ebf2] outline-none w-14 font-semibold"
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
                      className="p-1 text-[#4d8fe0] hover:text-[#7ba8e8] hover:bg-white/5 rounded-md transition-all cursor-pointer"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomTf(false);
                        setCustomTfValue('');
                      }}
                      className="p-1 text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 rounded-md transition-all cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomTf(true)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-dashed border-white/20 bg-transparent text-[#8b93a1] hover:border-white/40 hover:text-[#e8ebf2] transition-all cursor-pointer"
                  >
                    + Custom
                  </button>
                )}
              </div>
              {entryTimeframe && !TIMEFRAME_PRESETS.includes(entryTimeframe) && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs px-1">
                  <span className="text-[#8b93a1]">Selected Custom:</span>
                  <span className="px-2 py-0.5 bg-[#1e2733] border border-[#4d8fe0]/40 text-[#7ba8e8] rounded-md font-semibold">
                    {entryTimeframe}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEntryTimeframe('')}
                    className="text-[#8b93a1] hover:text-red-400 text-[10px] uppercase font-black tracking-widest ml-1 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Tags area */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">
                # Tags
              </label>
              <TagInput 
                tags={tags} 
                onChange={setTags} 
                placeholder="Strategy, news..." 
                availableTags={availableTags}
              />
            </div>

            <div className="space-y-3 bg-[#12161c] p-3 rounded-xl border border-white/5">
              <p className="text-[10.5px] uppercase font-black text-[#4d8fe0] tracking-wider font-sans">Trader Psychology (စိတ်ပိုင်းဆိုင်ရာ)</p>
              
              {/* PRE-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-[#8b93a1] px-1 font-sans">Feeling BEFORE Entry (Trade မဝင်ခင် ခံစားချက်)</p>
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
                <p className="text-[9px] uppercase font-bold text-[#8b93a1] px-1 font-sans">Feeling DURING Active Trade (ဝင်ထားစဉ် ခံစားချက်)</p>
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
                <p className="text-[9px] uppercase font-bold text-[#8b93a1] px-1 font-sans">Feeling AFTER Exit (ထွက်ပြီးနောက် ခံစားချက်)</p>
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
              <div className="text-[10px] font-black uppercase tracking-widest text-[#8b93a1] px-1">
                {savingStatus === 'saving' && <span className="text-[#4d8fe0] animate-pulse">Saving Changes...</span>}
                {savingStatus === 'saved' && <span className="text-[#7ba8e8]">All Changes Saved</span>}
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
        {aiNotice && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 120, transition: { duration: 0.25 } }}
            className={`fixed bottom-6 right-6 z-50 w-84 max-w-[calc(100vw-2rem)] p-4 rounded-2xl border text-xs shadow-2xl backdrop-blur-xl pointer-events-auto ${
              aiNotice.type === 'success'
                ? 'bg-zinc-950/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : 'bg-zinc-950/95 border-red-500/40 text-red-200 shadow-red-950/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {aiNotice.type === 'success' ? (
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                    <Sparkles size={16} />
                  </div>
                ) : (
                  <div className="p-1.5 bg-red-500/20 text-red-400 rounded-lg shrink-0">
                    <AlertCircle size={16} />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{aiNotice.type === 'success' ? '✨ AI Analysis Auto-Filled' : '⚠️ AI Analysis Failed'}</span>
                  </p>
                  {aiNotice.type === 'success' && aiNotice.data && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {aiNotice.data.type && (
                        <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wider ${
                          aiNotice.data.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {aiNotice.data.type}
                        </span>
                      )}
                      {aiNotice.data.pair && (
                        <span className="px-2 py-0.5 bg-white/10 text-zinc-200 rounded-md font-bold text-[10px]">
                          Pair: {aiNotice.data.pair}
                        </span>
                      )}
                      {aiNotice.data.entryTimeframe && (
                        <span className="px-2 py-0.5 bg-white/10 text-zinc-200 rounded-md font-bold text-[10px]">
                          TF: {aiNotice.data.entryTimeframe}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md font-mono font-bold text-[10px]">
                        Entry: {aiNotice.data.entryPrice}
                      </span>
                      {aiNotice.data.slPrice && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-md font-mono font-bold text-[10px]">
                          SL: {aiNotice.data.slPrice}
                        </span>
                      )}
                      {aiNotice.data.tpPrice && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md font-mono font-bold text-[10px]">
                          TP: {aiNotice.data.tpPrice}
                        </span>
                      )}
                    </div>
                  )}
                  {aiNotice.type === 'error' && (
                    <p className="text-red-300/90 text-[11px] leading-relaxed">{aiNotice.details}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiNotice(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
