import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2, Image as ImageIcon, Maximize2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

interface AddTradeProps {
  onBack: () => void;
  initialDate?: Date;
  activeAccountId: string | null;
}

export default function AddTrade({ onBack, initialDate, activeAccountId }: AddTradeProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [charts, setCharts] = useState<{id: string, url: string}[]>(
    [{ id: `chart-0-${Date.now()}`, url: '' }]
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showCustomTf, setShowCustomTf] = useState(false);
  const [customTfValue, setCustomTfValue] = useState('');

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
    entryDateTime: initialDate || new Date(),
    mentalState: '',
    physicalState: '',
    preTradeEmotion: '',
    duringTradeEmotion: '',
    postTradeEmotion: '',
    entryTimeframe: ''
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
        setFormData(prev => ({
          ...prev,
          entryPrice: data.entryPrice,
          slPrice: data.slPrice || prev.slPrice,
          tpPrice: data.tpPrice || prev.tpPrice,
          type: data.type === 'buy' || data.type === 'sell' ? data.type : prev.type,
          pair: data.pair || prev.pair,
          entryTimeframe: data.entryTimeframe || prev.entryTimeframe
        }));
        
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

  const validChartUrls = charts.map(c => c.url).filter(url => url.trim() !== '');

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
        chartUrls: charts.map(c => c.url).filter(url => url.trim() !== ''),
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
        physicalState: formData.physicalState,
        preTradeEmotion: formData.preTradeEmotion,
        duringTradeEmotion: formData.duringTradeEmotion,
        postTradeEmotion: formData.postTradeEmotion,
        entryTimeframe: formData.entryTimeframe || ''
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
      <form id="add-trade-form" onSubmit={handleSubmit} className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-6 w-full text-left lg:h-[calc(100vh-110px)] lg:flex lg:flex-col lg:overflow-hidden lg:min-h-[500px]">
        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-8 lg:flex-1 lg:overflow-hidden lg:min-h-0">
          
          {/* Left Column (30% width) - Form Complete */}
          <div className="lg:col-span-3 space-y-3 lg:h-full lg:overflow-y-auto lg:pr-3">
            {/* SELECT A PAIR */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Pair</label>
              <CustomSelect
                value={formData.pair}
                onChange={val => setFormData({...formData, pair: val})}
                groups={pairGroups}
                placeholder="Select a pair"
              />
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
              <CustomSelect
                value={formData.type}
                onChange={val => setFormData({...formData, type: val as 'buy' | 'sell' | ''})}
                options={typeOptions}
                placeholder="Select Type"
                typeStyle="type"
              />
            </div>

            <hr className="border-white/5 my-2.5" />

            {/* ENTRY & EXIT ROW */}
            <div className="grid grid-cols-2 gap-4">
              {/* ENTRY */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Entry</label>
                <input 
                  type="number" step="0.00001" required value={formData.entryPrice} 
                  onChange={e => setFormData({...formData, entryPrice: e.target.value})} 
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
            </div>

            {/* SL & TP ROW */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* RR */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">RR</label>
              <input 
                type="number" step="0.1" readOnly value={formData.rr} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-400 cursor-not-allowed font-bold text-sm" 
              />
            </div>

            <hr className="border-white/5 my-2.5" />

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

            {/* ENTRY TIMEFRAME */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">Entry Timeframe</label>
              <div className="flex flex-wrap gap-1.5 px-1">
                {TIMEFRAME_PRESETS.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, entryTimeframe: tf }))}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      formData.entryTimeframe === tf
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
                            setFormData(prev => ({ ...prev, entryTimeframe: val }));
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
                          setFormData(prev => ({ ...prev, entryTimeframe: val }));
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
              {formData.entryTimeframe && !TIMEFRAME_PRESETS.includes(formData.entryTimeframe) && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs px-1">
                  <span className="text-zinc-500">Selected Custom:</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-md font-semibold">
                    {formData.entryTimeframe}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, entryTimeframe: '' }))}
                    className="text-zinc-500 hover:text-red-400 text-[10px] uppercase font-black tracking-widest ml-1"
                  >
                    Clear
                  </button>
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

            <div className="space-y-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
              <p className="text-[10.5px] uppercase font-black text-emerald-500 tracking-wider">Trader Psychology (စိတ်ပိုင်းဆိုင်ရာ)</p>
              
              {/* PRE-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-zinc-400 px-1">Feeling BEFORE Entry (Trade မဝင်ခင် ခံစားချက်)</p>
                <CustomSelect
                  value={formData.preTradeEmotion}
                  onChange={val => setFormData({...formData, preTradeEmotion: val})}
                  options={preTradeEmotionOptions}
                  placeholder="Select pre-trade emotion"
                  typeStyle="mental"
                />
              </div>

              {/* DURING-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-zinc-400 px-1">Feeling DURING Active Trade (ဝင်ထားစဉ် ခံစားချက်)</p>
                <CustomSelect
                  value={formData.duringTradeEmotion}
                  onChange={val => setFormData({...formData, duringTradeEmotion: val})}
                  options={duringTradeEmotionOptions}
                  placeholder="Select during-trade emotion"
                  typeStyle="mental"
                />
              </div>

              {/* POST-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-zinc-400 px-1">Feeling AFTER Exit (ထွက်ပြီးနောက် ခံစားချက်)</p>
                <CustomSelect
                  value={formData.postTradeEmotion}
                  onChange={val => setFormData({...formData, postTradeEmotion: val})}
                  options={postTradeEmotionOptions}
                  placeholder="Select post-trade emotion"
                  typeStyle="mental"
                />
              </div>
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
      </form>

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
