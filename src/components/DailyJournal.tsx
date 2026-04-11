import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyJournal as DailyJournalType } from '../types';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface DailyJournalProps {
  user: User;
}

export default function DailyJournal({ user }: DailyJournalProps) {
  const [journals, setJournals] = useState<DailyJournalType[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [marketAnalysis, setMarketAnalysis] = useState('');
  const [feelings, setFeelings] = useState('');
  const [chartUrl, setChartUrl] = useState('');
  const [chartUrls, setChartUrls] = useState<string[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'daily_journals'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const journalData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyJournalType[];
      setJournals(journalData);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'daily_journals'), {
        date,
        marketAnalysis,
        feelings,
        chartUrls,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setMarketAnalysis('');
      setFeelings('');
      setChartUrls([]);
    } catch (error) {
      console.error("Error adding journal entry:", error);
    }
  };

  const handleDelete = async (journalId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteDoc(doc(db, 'daily_journals', journalId));
      } catch (error) {
        console.error("Error deleting journal entry:", error);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#0F0F0F] p-6 rounded-2xl border border-white/5">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <BookOpen className="text-emerald-500" />
          New Journal Entry
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-zinc-100"
          />
          <textarea
            placeholder="Market Analysis..."
            value={marketAnalysis}
            onChange={(e) => setMarketAnalysis(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-zinc-100 h-32"
            required
          />
          <textarea
            placeholder="Feelings / Psychological Notes..."
            value={feelings}
            onChange={(e) => setFeelings(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-zinc-100 h-32"
          />
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="TradingView Chart Link"
              value={chartUrl}
              onChange={(e) => setChartUrl(e.target.value)}
              className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                if (chartUrl) {
                  setChartUrls([...chartUrls, chartUrl]);
                  setChartUrl('');
                }
              }}
              className="bg-emerald-500 text-black px-4 py-2 rounded-xl font-bold"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {chartUrls.map((url, index) => (
              <span key={index} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm">
                {url.substring(0, 20)}...
              </span>
            ))}
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-all"
          >
            Save Entry
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Entries</h2>
        {journals.map((journal) => (
          <div key={journal.id} className="bg-[#0F0F0F] p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{journal.date}</h3>
              <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-500">
                  {journal.createdAt && typeof journal.createdAt.toDate === 'function' 
                    ? journal.createdAt.toDate().toLocaleDateString() 
                    : 'N/A'}
                </span>
                <button onClick={() => handleDelete(journal.id!)} className="text-zinc-500 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <p className="text-zinc-300">{journal.marketAnalysis}</p>
            {journal.feelings && <p className="text-zinc-500 italic">{journal.feelings}</p>}
            {journal.chartUrls && journal.chartUrls.length > 0 && (
              <div className="flex gap-2 pt-2">
                {journal.chartUrls.map((url, index) => (
                  <a key={index} href={url} target="_blank" rel="noreferrer" className="text-emerald-400 text-sm hover:underline">
                    Chart {index + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
