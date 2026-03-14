import React from 'react';
import { Trade } from '../types';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Search, MessageSquare, Image as ImageIcon } from 'lucide-react';
import TradeModal from './TradeModal';

interface TradeListProps {
  trades: Trade[];
}

export default function TradeList({ trades }: TradeListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'buy' | 'sell'>('all');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null);

  const filteredTrades = trades.filter(t => {
    const matchesSearch = t.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.ticket.includes(searchTerm);
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    
    const tradeOpenTime = t.openTime.toDate();
    const matchesStartDate = startDate === '' || tradeOpenTime >= new Date(startDate);
    const matchesEndDate = endDate === '' || tradeOpenTime <= new Date(new Date(endDate).setHours(23, 59, 59, 999));
    
    return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
  }).sort((a, b) => b.closeTime.toMillis() - a.closeTime.toMillis());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Closed Positions</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Symbol */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Symbol or ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:outline-none text-sm w-48 transition-all"
            />
          </div>

          {/* Type Filter */}
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:outline-none text-sm text-zinc-300 transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="buy">Buy Only</option>
            <option value="sell">Sell Only</option>
          </select>

          {/* Open Time Filter */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Open Time</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm text-zinc-300 cursor-pointer [color-scheme:dark]"
            />
            <span className="text-zinc-700">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm text-zinc-300 cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0F0F0F]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Symbol</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Size</th>
              <th className="px-6 py-4 font-semibold">Open Price</th>
              <th className="px-6 py-4 font-semibold">Close Price</th>
              <th className="px-6 py-4 font-semibold">Profit</th>
              <th className="px-6 py-4 font-semibold">Open Time</th>
              <th className="px-6 py-4 font-semibold">Close Time</th>
              <th className="px-6 py-4 font-semibold">Journal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTrades.map((trade) => (
              <tr 
                key={trade.id} 
                onClick={() => setSelectedTrade(trade)}
                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-200">{trade.item}</span>
                    <span className="text-[10px] text-zinc-600">#{trade.ticket}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {trade.type === 'buy' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {trade.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">
                  {trade.size.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">
                  {trade.openPrice.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-400">
                  {trade.closePrice.toLocaleString()}
                </td>
                <td className={`px-6 py-4 text-sm font-bold ${
                  trade.profit >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {trade.profit >= 0 ? '+' : ''}{trade.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">
                  {format(trade.openTime.toDate(), 'MMM dd, HH:mm')}
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">
                  {format(trade.closeTime.toDate(), 'MMM dd, HH:mm')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {trade.notes && <MessageSquare size={14} className="text-emerald-500/50" />}
                    {trade.chartUrls && trade.chartUrls.length > 0 && <ImageIcon size={14} className="text-blue-500/50" />}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTrades.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-zinc-600 italic">
                  No trades found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTrade && (
        <TradeModal 
          trade={selectedTrade} 
          onClose={() => setSelectedTrade(null)} 
        />
      )}
    </div>
  );
}
