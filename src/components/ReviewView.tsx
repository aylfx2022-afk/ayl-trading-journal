import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Review, Trade } from '../types';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subWeeks, 
  subMonths, 
  isWithinInterval,
  parseISO,
  differenceInCalendarWeeks,
  differenceInCalendarMonths
} from 'date-fns';
import { 
  NotebookPen, 
  Plus, 
  Calendar, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  TrendingUp, 
  BarChart2, 
  CheckCircle2, 
  X, 
  Sparkles,
  Clock,
  Briefcase
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MarkdownEditor from './MarkdownEditor';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { getSafeDate } from '../lib/dateUtils';

interface ReviewViewProps {
  reviews: Review[];
  trades: Trade[];
  activeAccountId?: string | null;
  activeAccountName?: string;
  activeAccountIsDefault?: boolean;
}

export default function ReviewView({
  reviews,
  trades,
  activeAccountId,
  activeAccountName,
  activeAccountIsDefault
}: ReviewViewProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editorType, setEditorType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0); // 0 = current, -1 = last week/month, etc.
  const [reviewContent, setReviewContent] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // View Details Modal
  const [viewingReview, setViewingReview] = useState<Review | null>(null);

  // Delete Confirmation Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Calculate target period based on type and offset
  const periodInfo = useMemo(() => {
    const now = new Date();
    if (editorType === 'weekly') {
      const targetDate = subWeeks(now, selectedDateOffset);
      const start = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday
      
      const periodKey = `W-${format(start, 'yyyy-MM-dd')}`;
      const periodTitle = `Week ${format(start, 'w, yyyy')} (${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')})`;
      const startDateYMD = format(start, 'yyyy-MM-dd');
      const endDateYMD = format(end, 'yyyy-MM-dd');

      return { start, end, periodKey, periodTitle, startDateYMD, endDateYMD };
    } else {
      const targetDate = subMonths(now, selectedDateOffset);
      const start = startOfMonth(targetDate);
      const end = endOfMonth(targetDate);

      const periodKey = `M-${format(start, 'yyyy-MM')}`;
      const periodTitle = format(start, 'MMMM yyyy');
      const startDateYMD = format(start, 'yyyy-MM-dd');
      const endDateYMD = format(end, 'yyyy-MM-dd');

      return { start, end, periodKey, periodTitle, startDateYMD, endDateYMD };
    }
  }, [editorType, selectedDateOffset]);

  // Calculate Trade Performance Stats for the target period
  const calculatedStats = useMemo(() => {
    const periodTrades = trades.filter(t => {
      if (!t.openTime) return false;
      const tradeDate = getSafeDate(t.openTime);
      if (!tradeDate) return false;
      return isWithinInterval(tradeDate, { start: periodInfo.start, end: periodInfo.end });
    });

    const totalTrades = periodTrades.length;
    const wins = periodTrades.filter(t => (t.rr || 0) > 0).length;
    const losses = periodTrades.filter(t => (t.rr || 0) < 0).length;
    const netRR = periodTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return { totalTrades, wins, losses, winRate, netRR };
  }, [trades, periodInfo]);

  // Handle Period Offset Change in Modal
  const handleOffsetChange = (newOffset: number) => {
    setSelectedDateOffset(newOffset);

    const now = new Date();
    let targetKey = '';
    if (editorType === 'weekly') {
      const targetDate = subWeeks(now, newOffset);
      const start = startOfWeek(targetDate, { weekStartsOn: 1 });
      targetKey = `W-${format(start, 'yyyy-MM-dd')}`;
    } else {
      const targetDate = subMonths(now, newOffset);
      const start = startOfMonth(targetDate);
      targetKey = `M-${format(start, 'yyyy-MM')}`;
    }

    const existing = reviews.find(r => r.type === editorType && r.periodKey === targetKey);
    if (existing) {
      setEditingReviewId(existing.id || null);
      setReviewContent(existing.content || '');
    } else {
      setEditingReviewId(null);
      setReviewContent('');
    }
  };

  // Open Create Modal for "This Week"
  const handleOpenAddThisWeek = () => {
    setEditorType('weekly');
    setSelectedDateOffset(0);

    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const periodKey = `W-${format(start, 'yyyy-MM-dd')}`;
    const existing = reviews.find(r => r.type === 'weekly' && r.periodKey === periodKey);

    if (existing) {
      setEditingReviewId(existing.id || null);
      setReviewContent(existing.content || '');
    } else {
      setEditingReviewId(null);
      setReviewContent('');
    }

    setIsModalOpen(true);
  };

  // Open Create Modal for "This Month"
  const handleOpenAddThisMonth = () => {
    setEditorType('monthly');
    setSelectedDateOffset(0);

    const now = new Date();
    const start = startOfMonth(now);
    const periodKey = `M-${format(start, 'yyyy-MM')}`;
    const existing = reviews.find(r => r.type === 'monthly' && r.periodKey === periodKey);

    if (existing) {
      setEditingReviewId(existing.id || null);
      setReviewContent(existing.content || '');
    } else {
      setEditingReviewId(null);
      setReviewContent('');
    }

    setIsModalOpen(true);
  };

  // Edit Existing Review Card
  const handleEditReview = (review: Review) => {
    setEditorType(review.type);
    setEditingReviewId(review.id || null);
    setReviewContent(review.content);

    let offset = 0;
    try {
      if (review.startDateYMD) {
        const startD = parseISO(review.startDateYMD);
        if (review.type === 'weekly') {
          offset = Math.max(0, differenceInCalendarWeeks(new Date(), startD, { weekStartsOn: 1 }));
        } else {
          offset = Math.max(0, differenceInCalendarMonths(new Date(), startD));
        }
      }
    } catch (err) {
      offset = 0;
    }
    setSelectedDateOffset(offset);
    setIsModalOpen(true);
  };

  // Save Review to Firestore
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsSaving(true);
    try {
      // Find if there is an existing review matching this specific periodKey
      const existingForPeriod = reviews.find(
        r => r.type === editorType && r.periodKey === periodInfo.periodKey
      );

      const reviewDocId = existingForPeriod?.id || (
        activeAccountIsDefault
          ? `${user.uid}_${periodInfo.periodKey}`
          : `${user.uid}_${activeAccountId}_${periodInfo.periodKey}`
      );

      const reviewRef = doc(db, 'reviews', reviewDocId);

      const reviewData: Partial<Review> = {
        type: editorType,
        periodKey: periodInfo.periodKey,
        periodTitle: periodInfo.periodTitle,
        startDateYMD: periodInfo.startDateYMD,
        endDateYMD: periodInfo.endDateYMD,
        content: reviewContent,
        userId: user.uid,
        accountId: activeAccountId || null,
        createdAt: existingForPeriod?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: calculatedStats
      };

      // Clean undefined
      const cleanData = Object.fromEntries(
        Object.entries(reviewData).filter(([_, v]) => v !== undefined)
      );

      await setDoc(reviewRef, cleanData, { merge: true });

      setIsSaving(false);
      setIsModalOpen(false);
      setReviewContent('');
      setEditingReviewId(null);
    } catch (error) {
      console.error("Error saving review:", error);
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
      setIsSaving(false);
    }
  };

  // Delete Review
  const handleDeleteReview = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', id));
      setDeleteConfirmId(null);
      if (viewingReview?.id === id) {
        setViewingReview(null);
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      handleFirestoreError(error, OperationType.DELETE, `reviews/${id}`);
    }
  };

  // Filter and Sort Reviews
  const filteredReviews = useMemo(() => {
    return reviews
      .filter(r => r.type === activeTab)
      .filter(r => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.periodTitle.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [reviews, activeTab, searchQuery, sortOrder]);

  const weeklyCount = reviews.filter(r => r.type === 'weekly').length;
  const monthlyCount = reviews.filter(r => r.type === 'monthly').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181d26] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#e8ebf2] flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-[#4d8fe0]" />
              Trading Reviews
            </h2>
            {activeAccountName && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Briefcase size={10} />
                {activeAccountName}
              </span>
            )}
          </div>
          <p className="text-[#8b93a1] text-sm">
            Reflect on your weekly and monthly performance, psychology, and trade executions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleOpenAddThisWeek}
            className="px-4 py-2.5 rounded-xl bg-[#4d8fe0] hover:bg-[#3a6fc4] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg hover:shadow-[#4d8fe0]/10 cursor-pointer active:scale-95"
          >
            <Plus size={16} className="stroke-[3]" />
            Add Weekly Review
          </button>
          <button
            onClick={handleOpenAddThisMonth}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#e8ebf2] font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <Calendar size={16} />
            Add Monthly Review
          </button>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        {/* Weekly vs Monthly Tabs */}
        <div className="flex items-center gap-2 bg-[#12161c] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'weekly'
                ? 'bg-[#4d8fe0] text-white shadow-md'
                : 'text-[#8b93a1] hover:text-[#e8ebf2]'
            }`}
          >
            Weekly Reviews
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'weekly' ? 'bg-white/20 text-white' : 'bg-white/10 text-[#8b93a1]'
            }`}>
              {weeklyCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-[#4d8fe0] text-white shadow-md'
                : 'text-[#8b93a1] hover:text-[#e8ebf2]'
            }`}
          >
            Monthly Reviews
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'monthly' ? 'bg-white/20 text-white' : 'bg-white/10 text-[#8b93a1]'
            }`}>
              {monthlyCount}
            </span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8b93a1] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#181d26] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-[#e8ebf2] placeholder:text-[#8b93a1]/60 focus:outline-none focus:border-[#4d8fe0]/50 w-full sm:w-60"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="bg-[#181d26] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#e8ebf2] focus:outline-none focus:border-[#4d8fe0]/50 cursor-pointer"
          >
            <option value="newest" className="bg-[#181d26]">Newest First</option>
            <option value="oldest" className="bg-[#181d26]">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {filteredReviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredReviews.map((review) => {
            const hasStats = review.stats && review.stats.totalTrades > 0;
            return (
              <div
                key={review.id}
                className="group bg-[#181d26] border border-white/5 hover:border-white/15 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl relative overflow-hidden"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        review.type === 'weekly' 
                          ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {review.type === 'weekly' ? 'Weekly Review' : 'Monthly Review'}
                      </span>
                      <h3 className="text-base font-bold text-[#e8ebf2] mt-2 line-clamp-1 group-hover:text-[#7ba8e8] transition-colors">
                        {review.periodTitle}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditReview(review)}
                        className="p-1.5 text-[#8b93a1] hover:text-[#7ba8e8] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Edit Review"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(review.id!)}
                        className="p-1.5 text-[#8b93a1] hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Delete Review"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Performance Summary Pills */}
                  {hasStats ? (
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#12161c] border border-white/5 text-center">
                      <div>
                        <p className="text-[8px] text-[#8b93a1] font-black uppercase tracking-wider">Trades</p>
                        <p className="text-xs font-bold text-[#e8ebf2]">{review.stats?.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-[#8b93a1] font-black uppercase tracking-wider">Win Rate</p>
                        <p className="text-xs font-bold text-[#7ba8e8]">{(review.stats?.winRate || 0).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-[#8b93a1] font-black uppercase tracking-wider">Net RR</p>
                        <p className={`text-xs font-bold ${(review.stats?.netRR || 0) >= 0 ? 'text-[#7ba8e8]' : 'text-red-400'}`}>
                          {(review.stats?.netRR || 0) >= 0 ? '+' : ''}{(review.stats?.netRR || 0).toFixed(1)}R
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#8b93a1] italic px-1">
                      No trade logs in this period
                    </div>
                  )}

                  {/* Review Text Preview */}
                  <div className="relative py-2">
                    <div className="text-xs text-zinc-300 line-clamp-4 leading-relaxed markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {review.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-[#8b93a1]">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {review.updatedAt ? format(parseISO(review.updatedAt), 'MMM dd, yyyy HH:mm') : 'Just now'}
                  </span>

                  <button
                    onClick={() => setViewingReview(review)}
                    className="text-[#7ba8e8] hover:text-[#4d8fe0] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye size={12} />
                    Read Full
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#181d26] border border-dashed border-white/10 rounded-2xl py-20 px-4 text-center max-w-md mx-auto my-8 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[#1e2733] border border-[#4d8fe0]/20 text-[#7ba8e8] flex items-center justify-center mx-auto">
            <NotebookPen size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#e8ebf2]">
              No {activeTab === 'weekly' ? 'Weekly' : 'Monthly'} Reviews Found
            </h3>
            <p className="text-[#8b93a1] text-xs">
              {searchQuery
                ? `No reviews match "${searchQuery}". Try clearing your search query.`
                : `You haven't written any ${activeTab} reviews for this profile yet.`}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={activeTab === 'weekly' ? handleOpenAddThisWeek : handleOpenAddThisMonth}
              className="px-4 py-2 rounded-xl bg-[#4d8fe0] hover:bg-[#3a6fc4] text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
            >
              <Plus size={14} className="stroke-[3]" />
              Write {activeTab === 'weekly' ? 'Weekly' : 'Monthly'} Review
            </button>
          )}
        </div>
      )}

      {/* Write / Edit Review Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
          <div 
            className="bg-[#181d26] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#181d26] z-10">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                  editorType === 'weekly'
                    ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {editorType === 'weekly' ? 'Weekly Review' : 'Monthly Review'}
                </span>
                <h3 className="text-sm font-bold text-[#e8ebf2]">
                  {editingReviewId ? 'Edit Review' : 'New Performance Review'}
                </h3>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveReview} className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Target Period Selector */}
              <div className="bg-[#12161c] border border-white/5 p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#8b93a1]">
                      Target Period
                    </label>
                    <h4 className="text-base font-bold text-[#7ba8e8] mt-0.5">
                      {periodInfo.periodTitle}
                    </h4>
                  </div>

                  {/* Offset Picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8b93a1] font-medium">Period:</span>
                    <select
                      value={selectedDateOffset}
                      onChange={(e) => handleOffsetChange(Number(e.target.value))}
                      className="bg-[#181d26] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#e8ebf2] focus:outline-none focus:border-[#4d8fe0]/50 cursor-pointer"
                    >
                      <option value={0}>{editorType === 'weekly' ? 'This Week (Current)' : 'This Month (Current)'}</option>
                      <option value={1}>{editorType === 'weekly' ? '1 Week Ago' : '1 Month Ago'}</option>
                      <option value={2}>{editorType === 'weekly' ? '2 Weeks Ago' : '2 Months Ago'}</option>
                      <option value={3}>{editorType === 'weekly' ? '3 Weeks Ago' : '3 Months Ago'}</option>
                      <option value={4}>{editorType === 'weekly' ? '4 Weeks Ago' : '4 Months Ago'}</option>
                      <option value={5}>{editorType === 'weekly' ? '5 Weeks Ago' : '5 Months Ago'}</option>
                      <option value={6}>{editorType === 'weekly' ? '6 Weeks Ago' : '6 Months Ago'}</option>
                      <option value={8}>{editorType === 'weekly' ? '8 Weeks Ago' : '8 Months Ago'}</option>
                      <option value={12}>{editorType === 'weekly' ? '12 Weeks Ago' : '12 Months Ago'}</option>
                    </select>
                  </div>
                </div>

                {/* Auto Calculated Stats for Selected Period */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-[#181d26] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-[#8b93a1] uppercase tracking-widest">Total Trades</p>
                    <p className="text-base font-bold text-[#e8ebf2]">{calculatedStats.totalTrades}</p>
                  </div>
                  <div className="bg-[#181d26] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-[#8b93a1] uppercase tracking-widest">Win Rate</p>
                    <p className="text-base font-bold text-[#7ba8e8]">{calculatedStats.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-[#181d26] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-[#8b93a1] uppercase tracking-widest">Wins / Losses</p>
                    <p className="text-base font-bold text-[#e8ebf2]">
                      <span className="text-[#7ba8e8]">{calculatedStats.wins}W</span> / <span className="text-red-400">{calculatedStats.losses}L</span>
                    </p>
                  </div>
                  <div className="bg-[#181d26] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-[#8b93a1] uppercase tracking-widest">Net RR</p>
                    <p className={`text-base font-bold ${calculatedStats.netRR >= 0 ? 'text-[#7ba8e8]' : 'text-red-400'}`}>
                      {calculatedStats.netRR >= 0 ? '+' : ''}{calculatedStats.netRR.toFixed(2)}R
                    </p>
                  </div>
                </div>
              </div>

              {/* Markdown Editor */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#8b93a1] flex items-center justify-between">
                  <span>Review Notes & Self-Reflection</span>
                  <span className="text-[#8b93a1]/60 normal-case font-normal">Supports Markdown formatting</span>
                </label>

                <MarkdownEditor
                  value={reviewContent}
                  onChange={setReviewContent}
                  placeholder="Write your review here... What went well? What rules were followed or broken? Key psychological lessons learned..."
                  minHeight="220px"
                />
              </div>

              {/* Footer Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8b93a1] hover:text-[#e8ebf2] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !reviewContent.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#4d8fe0] hover:bg-[#3a6fc4] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Save Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Read Full Detail Modal */}
      {viewingReview && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setViewingReview(null)}>
          <div 
            className="bg-[#181d26] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md ${
                  viewingReview.type === 'weekly' 
                    ? 'bg-[#1e2733] text-[#7ba8e8] border border-[#4d8fe0]/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {viewingReview.type === 'weekly' ? 'Weekly Review' : 'Monthly Review'}
                </span>
                <h3 className="text-xl font-bold text-[#e8ebf2] mt-2">
                  {viewingReview.periodTitle}
                </h3>
              </div>

              <button
                onClick={() => setViewingReview(null)}
                className="p-1 rounded-lg text-[#8b93a1] hover:text-[#e8ebf2] hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Performance Stats */}
            {viewingReview.stats && viewingReview.stats.totalTrades > 0 && (
              <div className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-[#12161c] border border-white/5 text-center">
                <div>
                  <p className="text-[8px] text-[#8b93a1] font-black uppercase tracking-wider">Total Trades</p>
                  <p className="text-sm font-bold text-[#e8ebf2]">{viewingReview.stats.totalTrades}</p>
                </div>
                <div>
                  <p className="text-[8px] text-[#8b93a1] font-black uppercase tracking-wider">Win Rate</p>
                  <p className="text-sm font-bold text-[#7ba8e8]">{(viewingReview.stats.winRate || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[8px] text-[#8b93a1] font-black uppercase tracking-wider">Wins / Losses</p>
                  <p className="text-sm font-bold text-[#e8ebf2]">
                    <span className="text-[#7ba8e8]">{viewingReview.stats.wins}W</span> / <span className="text-red-400">{viewingReview.stats.losses}L</span>
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-[#8b93a1] font-black uppercase tracking-wider">Net RR</p>
                  <p className={`text-sm font-bold ${(viewingReview.stats.netRR || 0) >= 0 ? 'text-[#7ba8e8]' : 'text-red-400'}`}>
                    {(viewingReview.stats.netRR || 0) >= 0 ? '+' : ''}{(viewingReview.stats.netRR || 0).toFixed(2)}R
                  </p>
                </div>
              </div>
            )}

            {/* Markdown Content */}
            <div className="bg-[#12161c] p-5 rounded-xl border border-white/5 text-[#e8ebf2] text-sm leading-relaxed markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {viewingReview.content}
              </ReactMarkdown>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-[10px] text-[#8b93a1]">
                Last updated: {viewingReview.updatedAt ? format(parseISO(viewingReview.updatedAt), 'MMMM dd, yyyy HH:mm') : ''}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewingReview(null);
                    handleEditReview(viewingReview);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[#e8ebf2] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewingReview(null)}
                  className="px-4 py-2 rounded-xl bg-[#4d8fe0] hover:bg-[#3a6fc4] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-[#181d26] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-red-400 tracking-wider">Delete Review</h3>
            <p className="text-[#e8ebf2] text-xs">Are you sure you want to delete this review note? This action cannot be undone.</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#8b93a1] hover:text-[#e8ebf2] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReview(deleteConfirmId)}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
