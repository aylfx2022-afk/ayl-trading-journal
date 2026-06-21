import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import DatePicker from './ui/DatePicker';
import TagInput from './ui/TagInput';
import ImageViewer from './ImageViewer';
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
      <form id="add-trade-form" onSubmit={handleSubmit} className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-6 w-full text-left lg:h-[calc(100vh-120px)] lg:flex lg:flex-col lg:overflow-hidden lg:min-h-[500px]">
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
              <CustomSelect
                value={formData.mentalState}
                onChange={val => setFormData({...formData, mentalState: val})}
                options={mentalOptions}
                placeholder="Select mental state"
                typeStyle="mental"
              />
            </div>

            {/* PHYSICAL STATE */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-zinc-400 px-1">Physical State (ခန္ဓာကိုယ်အခြေအနေ)</p>
              <CustomSelect
                value={formData.physicalState}
                onChange={val => setFormData({...formData, physicalState: val})}
                options={physicalOptions}
                placeholder="Select physical state"
                typeStyle="physical"
              />
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
          <div className="lg:col-span-7 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-3">
            <div className="space-y-4 bg-white/[0.01] p-5 rounded-2xl border border-white/5">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest px-1">
                <ImageIcon size={14} className="text-emerald-500" />
                Chart Links (Max 5)
              </label>
              
              <div className="space-y-6">
                {charts.map((chart, idx) => (
                  <div key={chart.id} className="space-y-4 bg-[#121214] p-5 rounded-xl border border-white/5 transition-all hover:border-white/10 animate-fade-in shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex-1 flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest shrink-0">
                          URL {idx + 1}:
                        </span>
                        <input
                          type="text"
                          value={chart.url}
                          onChange={(e) => handleChartUrlChange(chart.id, e.target.value)}
                          placeholder="Paste TradingView/Image URL here..."
                          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus:border-emerald-500/50 focus:outline-none text-xs text-zinc-300 font-mono transition-all placeholder:text-zinc-600"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 justify-end shrink-0">
                        {chart.url && chart.url.trim() !== '' && (
                          <button 
                            type="button"
                            onClick={() => setViewerIndex(validChartUrls.indexOf(chart.url))}
                            className="p-1 px-3 text-[9px] font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center cursor-pointer h-[30px]"
                            title="View Fullscreen"
                          >
                            VIEW FULL
                          </button>
                        )}
                        {charts.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveChart(chart.id)}
                            className="p-1 px-3 text-[9px] font-bold rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center cursor-pointer h-[30px]"
                          >
                            DELETE
                          </button>
                        )}
                      </div>
                    </div>

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
