import React, { useState } from 'react';
import { Trade } from '../types';
import { format } from 'date-fns';
import { Trash2, Search, MessageSquare, ChevronUp, ChevronDown, Edit3, Calendar as CalendarIcon, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { db } from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';

import DatePicker from './ui/DatePicker';

interface TradeListProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
}

type SortField = 'date' | 'pair' | 'rr' | 'type';
type SortOrder = 'asc' | 'desc';

export default function TradeList({ trades, onSelectTrade }: TradeListProps) {
  const [selectedNote, setSelectedNote] = useState<{ note: string, pair: string } | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'buy' | 'sell'>('all');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [sortConfig, setSortConfig] = React.useState<{ field: SortField, order: SortOrder }>({ field: 'date', order: 'desc' });
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 20;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, startDate, endDate, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleDeleteTrade = async (e: React.MouseEvent, tradeId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trade?')) return;
    
    try {
      await deleteDoc(doc(db, 'trades', tradeId));
    } catch (error) {
      console.error("Error deleting trade:", error);
      alert("Failed to delete trade. Please check your permissions.");
    }
  };

  const filteredTrades = React.useMemo(() => {
    return trades.filter(t => {
      const pair = t.pair || t.item || '';
      const tagsStr = (t.tags || []).join(' ');
      const matchesSearch = pair.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           tagsStr.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      
      const tradeDate = t.openTime?.toDate() || t.createdAt?.toDate() || new Date();
      
      const matchesStartDate = !startDate || tradeDate >= startDate;
      
      let matchesEndDate = true;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        matchesEndDate = tradeDate <= endOfDay;
      }
      
      return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case 'date':
          comparison = (b.openTime?.toMillis() || 0) - (a.openTime?.toMillis() || 0);
          break;
        case 'pair':
          comparison = (a.pair || a.item || '').localeCompare(b.pair || b.item || '');
          break;
        case 'rr':
          comparison = (a.rr || 0) - (b.rr || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortConfig.order === 'desc' ? comparison : -comparison;
    });
  }, [trades, searchTerm, typeFilter, startDate, endDate, sortConfig]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize);
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (rr: number) => {
    if (rr > 0) return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">PROFIT</span>;
    if (rr < 0) return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold">LOSS</span>;
    return <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-bold">BE</span>;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.order === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  return (
    <div className="space-y-6">
      {/* Modal for notes */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedNote(null)}>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-zinc-500 mb-4">{selectedNote.pair} Journal</h3>
            <p className="text-zinc-300 text-sm whitespace-pre-wrap">{selectedNote.note}</p>
            <button onClick={() => setSelectedNote(null)} className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">Close</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold capitalize">Trade History</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Symbol */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search pair..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:outline-none text-sm w-48 transition-all"
            />
          </div>

          {/* Type Filter */}
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:outline-none text-sm text-zinc-300 transition-all cursor-pointer h-10"
          >
            <option value="all">All Types</option>
            <option value="buy">Buy Only</option>
            <option value="sell">Sell Only</option>
          </select>

          {/* Created Time Filter */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-xl px-2.5 h-10 group/range">
            <CalendarIcon size={14} className="text-zinc-600 group-hover/range:text-emerald-500 transition-colors" />
            
            <div className="flex items-center gap-1">
              <div className="w-24">
                <DatePicker 
                  value={startDate}
                  onChange={setStartDate}
                  compact={true}
                  placeholder="Start"
                />
              </div>
              <span className="text-zinc-700 text-[10px] font-bold">-</span>
              <div className="w-24">
                <DatePicker 
                  value={endDate}
                  onChange={setEndDate}
                  compact={true}
                  placeholder="End"
                />
              </div>
            </div>

            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(null); setEndDate(null); }}
                className="p-1 rounded-md text-zinc-600 hover:text-white hover:bg-white/10 transition-all ml-1"
                title="Clear Dates"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0F0F0F]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase tracking-wider">
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('pair')}>
                <div className="flex items-center gap-1">Pair <SortIcon field="pair" /></div>
              </th>
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">Type <SortIcon field="type" /></div>
              </th>
              <th className="px-6 py-4 font-bold">Entry Price</th>
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">Entry Date <SortIcon field="date" /></div>
              </th>
              <th className="px-6 py-4 font-bold">Exit Price</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => handleSort('rr')}>
                <div className="flex items-center gap-1">RR <SortIcon field="rr" /></div>
              </th>
              <th className="px-6 py-4 font-bold">Journal</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedTrades.map((trade) => (
              <tr 
                key={trade.id} 
                onClick={() => onSelectTrade(trade)}
                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-200">{trade.pair || trade.item}</span>
                    {trade.tags && trade.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {trade.tags.map((tag, i) => (
                          <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500/70 border border-emerald-500/10 transition-colors hover:bg-emerald-500/20">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {trade.type === 'buy' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {trade.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">{trade.entryPrice?.toFixed(5)}</td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">
                  {trade.openTime ? format(trade.openTime.toDate(), 'dd/MM/yyyy') : '-'}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">{trade.exitPrice?.toFixed(5) || '-'}</td>
                <td className="px-6 py-4">
                  {getStatusBadge(trade.rr || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-black text-zinc-200">{trade.rr?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4">
                  {trade.notes && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedNote({ note: trade.notes!, pair: trade.pair || trade.item || 'Trade' }); }}
                      className="flex items-center gap-1.5 text-emerald-500/50 group hover:text-emerald-500 transition-colors"
                    >
                      <MessageSquare size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      className="p-2 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                      title="View Details"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteTrade(e, trade.id!)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                      title="Delete Trade"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTrades.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Search className="text-zinc-700 w-6 h-6" />
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-xs text-zinc-500 font-medium">
            Showing <span className="text-zinc-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-zinc-300">{Math.min(currentPage * pageSize, filteredTrades.length)}</span> of <span className="text-zinc-300">{filteredTrades.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-all"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Only show a limited range of page numbers if there are many pages
                if (
                  totalPages <= 7 || 
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                        currentPage === pageNum 
                          ? 'bg-emerald-500 text-black' 
                          : 'bg-white/5 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  (pageNum === 2 && currentPage > 3) || 
                  (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                  return <span key={pageNum} className="text-zinc-700 text-xs px-1">...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
