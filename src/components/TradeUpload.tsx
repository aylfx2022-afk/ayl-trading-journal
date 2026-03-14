import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseTradeHistory } from '../services/geminiService';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function TradeUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ count: number } | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('Please upload an HTML file exported from MT4/5.');
      setStatus('error');
      return;
    }

    setStatus('parsing');
    setError(null);

    try {
      const text = await file.text();
      const trades = await parseTradeHistory(text);

      if (!trades || trades.length === 0) {
        throw new Error('No trades found in the file. Make sure it is a valid MT4/5 history report.');
      }

      setStatus('saving');
      let savedCount = 0;

      for (const trade of trades) {
        // Check if ticket already exists to avoid duplicates
        const q = query(
          collection(db, 'trades'), 
          where('userId', '==', auth.currentUser?.uid),
          where('ticket', '==', trade.ticket)
        );
        const existing = await getDocs(q);
        
        if (existing.empty) {
          await addDoc(collection(db, 'trades'), {
            ...trade,
            openTime: Timestamp.fromDate(new Date(trade.openTime)),
            closeTime: Timestamp.fromDate(new Date(trade.closeTime)),
            userId: auth.currentUser?.uid,
            createdAt: Timestamp.now()
          });
          savedCount++;
        }
      }

      setSummary({ count: savedCount });
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process file.');
      setStatus('error');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Import Trade History</h2>
        <p className="text-zinc-500">Upload your MT4/5 HTML history report. Our AI will automatically extract and log your trades.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center ${
          isDragging 
            ? 'border-emerald-500 bg-emerald-500/5' 
            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
        }`}
      >
        <input
          type="file"
          accept=".html,.htm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
          <Upload className="text-emerald-500 w-10 h-10" />
        </div>

        <h3 className="text-xl font-semibold mb-2">Drag & Drop MT4/5 Report</h3>
        <p className="text-zinc-500 max-w-xs mx-auto">
          Export your history from MT4/5 as HTML and drop it here.
        </p>

        <div className="mt-8 flex items-center gap-2 text-xs text-zinc-600">
          <FileText size={14} />
          <span>Supports .html, .htm files</span>
        </div>
      </div>

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8"
          >
            {status === 'parsing' || status === 'saving' ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                <Loader2 className="text-emerald-500 animate-spin" />
                <div>
                  <p className="font-medium">
                    {status === 'parsing' ? 'AI is analyzing your report...' : 'Saving trades to your journal...'}
                  </p>
                  <p className="text-xs text-zinc-500">This may take a few moments depending on the number of trades.</p>
                </div>
              </div>
            ) : status === 'success' ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                <CheckCircle2 className="text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-400">Import Successful!</p>
                  <p className="text-xs text-emerald-500/70">
                    Successfully imported {summary?.count} new trades to your journal.
                  </p>
                </div>
              </div>
            ) : status === 'error' ? (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4">
                <AlertCircle className="text-red-500" />
                <div>
                  <p className="font-medium text-red-400">Import Failed</p>
                  <p className="text-xs text-red-500/70">{error}</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
          <h4 className="font-semibold mb-2">How to export from MT4?</h4>
          <ol className="text-sm text-zinc-500 space-y-2 list-decimal list-inside">
            <li>Open Terminal (Ctrl+T)</li>
            <li>Go to Account History tab</li>
            <li>Right click anywhere in history</li>
            <li>Select "Save as Report"</li>
          </ol>
        </div>
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
          <h4 className="font-semibold mb-2">How to export from MT5?</h4>
          <ol className="text-sm text-zinc-500 space-y-2 list-decimal list-inside">
            <li>Open Toolbox (Ctrl+T)</li>
            <li>Go to History tab</li>
            <li>Right click anywhere in history</li>
            <li>Select "Report" → "HTML"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
