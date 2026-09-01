import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2, Image as ImageIcon, Maximize2, Check, X, Sparkles, Copy, ClipboardPaste } from 'lucide-react';
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
        setFormData(prev => ({ ...prev, exitPrice: cleaned }));
        setPastedExit(true);
        setTimeout(() => setPastedExit(false), 1500);
      }
    } catch (err) {
      console.error('Failed to paste exit price: ', err);
    }
  };

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
  const [aiNotice, setAiNotice] = useState<{ type: 'success' | 'error'; title: string; details?: string; data?: any } | null>(null);

  React.useEffect(() => {
    if (aiNotice) {
      const timer = setTimeout(() => {
        setAiNotice(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [aiNotice]);

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
        setFormData(prev => ({
          ...prev,
          entryPrice: data.entryPrice,
          slPrice: data.slPrice || prev.slPrice,
          tpPrice: data.tpPrice || prev.tpPrice,
          type: data.type === 'buy' || data.type === 'sell' ? data.type : prev.type,
          pair: data.pair || prev.pair,
          entryTimeframe: data.entryTimeframe || prev.entryTimeframe
        }));
        
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
      <form id="add-trade-form" onSubmit={handleSubmit} className="bg-[#181d26] border border-white/5 rounded-2xl p-6 w-full text-left lg:h-[calc(100vh-110px)] lg:flex lg:flex-col lg:overflow-hidden lg:min-h-[500px] shadow-xl">
        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-8 lg:flex-1 lg:overflow-hidden lg:min-h-0">
          
          {/* Left Column (30% width) - Form Complete */}
          <div className="lg:col-span-3 space-y-3 lg:h-full lg:overflow-y-auto lg:pr-3">
            {/* SELECT A PAIR */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Pair</label>
              <CustomSelect
                value={formData.pair}
                onChange={val => setFormData({...formData, pair: val})}
                groups={pairGroups}
                placeholder="Select a pair"
              />
            </div>

            {/* DATE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Entry Date & Time</label>
              <DatePicker 
                value={formData.entryDateTime}
                onChange={date => setFormData({...formData, entryDateTime: date})}
              />
            </div>

            {/* SELECT TYPE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Type</label>
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
                <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Entry</label>
                <input 
                  type="number" step="0.00001" required value={formData.entryPrice} 
                  onChange={e => setFormData({...formData, entryPrice: e.target.value})} 
                  className="w-full bg-[#12161c] border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#4d8fe0]/50 text-[#e8ebf2] text-sm" 
                />
              </div>

              {/* EXIT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest">Exit</label>
                  <button
                    type="button"
                    onClick={handlePasteExit}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#4d8fe0] hover:text-[#7ba8e8] transition-colors cursor-pointer"
                    title="Paste Exit Price"
                  >
                    {pastedExit ? (
                      <>
                        <Check size={11} className="text-[#4d8fe0]" />
                        <span className="text-[#4d8fe0]">Pasted!</span>
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
                  <input 
                    type="number" step="0.00001" value={formData.exitPrice} 
                    onChange={e => setFormData({...formData, exitPrice: e.target.value})} 
                    className="w-full bg-[#12161c] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-[#4d8fe0]/50 text-[#e8ebf2] text-sm" 
                    placeholder="Opt."
                  />
                  <button
                    type="button"
                    onClick={handlePasteExit}
                    className="absolute right-2.5 p-1 rounded-lg text-[#8b93a1] hover:text-[#4d8fe0] hover:bg-white/10 transition-all cursor-pointer"
                    title="Paste Exit Price from Clipboard"
                  >
                    {pastedExit ? <Check size={14} className="text-[#4d8fe0]" /> : <ClipboardPaste size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* SL & TP ROW */}
            <div className="grid grid-cols-2 gap-4">
              {/* SL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest">SL</label>
                  {formData.slPrice !== '' && formData.slPrice !== null && (
                    <button
                      type="button"
                      onClick={() => handleCopyPrice(formData.slPrice, 'sl')}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#8b93a1] hover:text-red-400 transition-colors cursor-pointer"
                      title="Copy SL Price"
                    >
                      {copiedField === 'sl' ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
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
                  <input 
                    type="number" step="0.00001" required value={formData.slPrice} 
                    onChange={e => setFormData({...formData, slPrice: e.target.value})} 
                    className="w-full bg-[#12161c] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-red-500/50 text-[#e8ebf2] text-sm" 
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(formData.slPrice, 'sl')}
                    disabled={formData.slPrice === '' || formData.slPrice === null}
                    className="absolute right-2.5 p-1 rounded-lg text-[#8b93a1] hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Copy SL Price"
                  >
                    {copiedField === 'sl' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* TP */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest">TP</label>
                  {formData.tpPrice !== '' && formData.tpPrice !== null && (
                    <button
                      type="button"
                      onClick={() => handleCopyPrice(formData.tpPrice, 'tp')}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#8b93a1] hover:text-[#4d8fe0] transition-colors cursor-pointer"
                      title="Copy TP Price"
                    >
                      {copiedField === 'tp' ? (
                        <>
                          <Check size={11} className="text-[#4d8fe0]" />
                          <span className="text-[#4d8fe0]">Copied!</span>
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
                  <input 
                    type="number" step="0.00001" required value={formData.tpPrice} 
                    onChange={e => setFormData({...formData, tpPrice: e.target.value})} 
                    className="w-full bg-[#12161c] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-[#4d8fe0]/50 text-[#e8ebf2] text-sm" 
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(formData.tpPrice, 'tp')}
                    disabled={formData.tpPrice === '' || formData.tpPrice === null}
                    className="absolute right-2.5 p-1 rounded-lg text-[#8b93a1] hover:text-[#4d8fe0] hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Copy TP Price"
                  >
                    {copiedField === 'tp' ? <Check size={14} className="text-[#4d8fe0]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* RR */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">RR</label>
              <input 
                type="number" step="0.1" readOnly value={formData.rr} 
                className="w-full bg-[#12161c] border border-white/10 rounded-xl px-4 py-2.5 text-[#8b93a1] cursor-not-allowed font-bold text-sm" 
              />
            </div>

            <hr className="border-white/5 my-2.5" />

            {/* COMMENTS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Comments</label>
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className="text-[10px] font-bold text-[#4d8fe0] hover:text-[#7ba8e8] uppercase tracking-widest cursor-pointer"
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
                <div className="min-h-[120px] w-full p-4 bg-[#12161c] rounded-xl border border-white/5 text-sm text-[#e8ebf2] markdown-preview text-left">
                  {formData.notes ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.notes}</ReactMarkdown>
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
                    onClick={() => setFormData(prev => ({ ...prev, entryTimeframe: tf }))}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      formData.entryTimeframe === tf
                        ? 'bg-[#1e2733] border-[#4d8fe0] text-[#7ba8e8] font-bold'
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
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-dashed border-white/15 bg-transparent text-[#8b93a1] hover:border-white/30 hover:text-[#e8ebf2] transition-all cursor-pointer"
                  >
                    + Custom
                  </button>
                )}
              </div>
              {formData.entryTimeframe && !TIMEFRAME_PRESETS.includes(formData.entryTimeframe) && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs px-1">
                  <span className="text-[#8b93a1]">Selected Custom:</span>
                  <span className="px-2 py-0.5 bg-[#1e2733] border border-[#4d8fe0] text-[#7ba8e8] rounded-md font-semibold">
                    {formData.entryTimeframe}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, entryTimeframe: '' }))}
                    className="text-[#8b93a1] hover:text-red-400 text-[10px] uppercase font-black tracking-widest ml-1 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* TAGS */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase text-[#8b93a1] tracking-widest px-1">Tags</label>
              <TagInput 
                tags={formData.tags} 
                onChange={tags => setFormData({...formData, tags})} 
                placeholder="Scalp, news..." 
                availableTags={availableTags}
              />
            </div>

            <div className="space-y-3 bg-[#12161c] p-3 rounded-xl border border-white/5">
              <p className="text-[10.5px] uppercase font-black text-[#4d8fe0] tracking-wider">Trader Psychology (စိတ်ပိုင်းဆိုင်ရာ)</p>
              
              {/* PRE-TRADE EMOTION */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-[#8b93a1] px-1">Feeling BEFORE Entry (Trade မဝင်ခင် ခံစားချက်)</p>
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
                <p className="text-[9px] uppercase font-bold text-[#8b93a1] px-1">Feeling DURING Active Trade (ဝင်ထားစဉ် ခံစားချက်)</p>
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
                <p className="text-[9px] uppercase font-bold text-[#8b93a1] px-1">Feeling AFTER Exit (ထွက်ပြီးနောက် ခံစားချက်)</p>
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
                <div className="flex items-center justify-center gap-2 text-[#4d8fe0] text-sm font-medium animate-pulse">
                  <div className="w-4 h-4 border-2 border-[#4d8fe0]/20 border-t-[#4d8fe0] rounded-full animate-spin"></div>
                  Saving trade entries...
                </div>
              )}
              {status === 'success' && <div className="flex items-center justify-center gap-2 text-[#7ba8e8] text-sm font-medium"><CheckCircle2 size={16} /> Trade saved successfully!</div>}
              {status === 'error' && <div className="flex items-center justify-center gap-2 text-red-400 text-sm font-medium"><AlertCircle size={16} /> {error}</div>}
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
