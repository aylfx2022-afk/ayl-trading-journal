import React, { useState } from 'react';
import { Calendar, ConfigProvider, theme, Badge, Button, Select, Row, Col } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Trade } from '../types';
import { format, isSameDay } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  trades: Trade[];
}

export default function CalendarView({ trades }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [panelDate, setPanelDate] = useState<Dayjs>(dayjs());

  // Optimize: Group trades by date and pre-calculate totals to avoid repeated iteration in cell renders
  const tradesByDate = React.useMemo(() => {
    const map: Record<string, { trades: Trade[], totalRR: number, isPositive: boolean }> = {};
    trades.forEach(trade => {
      if (trade.openTime) {
        const dateKey = format(trade.openTime.toDate(), 'yyyy-MM-dd');
        if (!map[dateKey]) {
          map[dateKey] = { trades: [], totalRR: 0, isPositive: false };
        }
        map[dateKey].trades.push(trade);
        map[dateKey].totalRR += (trade.rr || 0);
      }
    });

    // Finalize isPositive for each day
    Object.values(map).forEach(day => {
      day.isPositive = day.totalRR >= 0;
    });

    return map;
  }, [trades]);

  const onSelect = (date: Dayjs) => {
    if (selectedDate && date.isSame(selectedDate, 'day')) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  const onPanelChange = (value: Dayjs) => {
    setPanelDate(value);
  };

  const weeklyData = React.useMemo(() => {
    if (!panelDate || typeof panelDate.startOf !== 'function') return [];
    
    const startOfCalendar = panelDate.startOf('month').startOf('week');
    const weeks = [];
    
    for (let i = 0; i < 6; i++) {
      const weekStart = startOfCalendar.add(i, 'week');
      const weekEnd = weekStart.endOf('week');
      
      let weeklyTradesCount = 0;
      let weeklyTotalRR = 0;

      // Efficiently aggregate weekly data using pre-calculated map
      for (let d = 0; d < 7; d++) {
        const currentDay = weekStart.add(d, 'day');
        const dateKey = currentDay.format('YYYY-MM-DD');
        const dayData = tradesByDate[dateKey];
        if (dayData) {
          weeklyTradesCount += dayData.trades.length;
          weeklyTotalRR += dayData.totalRR;
        }
      }
      
      weeks.push({
        start: weekStart,
        tradesCount: weeklyTradesCount,
        totalRR: weeklyTotalRR,
        isPositive: weeklyTotalRR >= 0
      });
    }
    return weeks;
  }, [panelDate, tradesByDate]);

  const dateKey = selectedDate ? selectedDate.format('YYYY-MM-DD') : null;
  const tradesForDate = dateKey ? (tradesByDate[dateKey]?.trades || []) : [];

  const fullCellRender = (value: Dayjs, info: any) => {
    if (info.type !== 'date') return info.originNode;

    const currentKey = value.format('YYYY-MM-DD');
    const dayData = tradesByDate[currentKey];
    const tradesOnDay = dayData?.trades || [];
    const totalRR = dayData ? dayData.totalRR : null;
    const isPositive = dayData ? dayData.isPositive : false;
    const isSelected = selectedDate && value.isSame(selectedDate, 'day');
    const isToday = value.isSame(dayjs(), 'day');

    return (
      <div className={`ant-picker-cell-inner ant-picker-calendar-date transition-all duration-300 h-full flex flex-col cursor-pointer group relative
        ${totalRR !== null 
          ? (isPositive ? 'bg-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' : 'bg-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]') 
          : 'hover:bg-white/[0.03]'
        } 
        border border-white/[0.03]
        ${isSelected ? 'ring-2 ring-inset ring-zinc-500/50 z-10' : ''}
      `}>
        {/* Selection Highlight Overlay (10% white tint) */}
        {isSelected && (
          <div className="absolute inset-0 bg-white/10 pointer-events-none z-0" />
        )}
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start p-2">
            <span className={`text-sm font-bold ${isToday ? 'bg-emerald-500 text-black w-6 h-6 rounded-full flex items-center justify-center p-0' : 'text-zinc-400'}`}>
              {value.date()}
            </span>
            {totalRR !== null && (
              <Badge 
                count={tradesOnDay.length} 
                style={{ 
                  backgroundColor: isPositive ? '#10b981' : '#ef4444',
                  fontSize: '9px',
                  height: '14px',
                  minWidth: '14px',
                  lineHeight: '14px',
                  padding: '0 3px',
                  borderRadius: '4px',
                  boxShadow: 'none',
                  border: 'none',
                  color: '#000',
                  fontWeight: 'bold'
                }} 
              />
            )}
          </div>
          <div className="flex-1 flex items-end p-2">
            {totalRR !== null && (
              <div className="flex flex-col">
                <span className={`text-xs font-black leading-none ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{totalRR.toFixed(2)}
                </span>
                <span className={`text-[8px] font-bold uppercase ${isPositive ? 'text-emerald-500/50' : 'text-red-400/50'}`}>
                  RR
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const headerRender = ({ value, onChange }: any) => {
    const currentViewDate = value || panelDate || dayjs();
    const start = 0;
    const end = 12;
    const monthOptions = [];

    const current = currentViewDate.clone();
    const localeData = currentViewDate.localeData();
    const months = [];
    for (let i = 0; i < 12; i++) {
      current.month(i);
      months.push(localeData.monthsShort(current));
    }

    for (let i = start; i < end; i++) {
      monthOptions.push(
        <Select.Option key={i} value={i} className="month-item">
          {months[i]}
        </Select.Option>,
      );
    }

    const year = currentViewDate.year();
    const month = currentViewDate.month();
    const options = [];
    for (let i = year - 10; i < year + 10; i += 1) {
      options.push(
        <Select.Option key={i} value={i} className="year-item">
          {i}
        </Select.Option>,
      );
    }

    return (
      <div style={{ padding: 16 }}>
        <Row gutter={12} justify="space-between" align="middle">
          <Col>
            <div className="flex items-center gap-2">
              <Button 
                shape="circle" 
                size="small" 
                icon={<ChevronLeft size={16} />} 
                onClick={() => onChange(currentViewDate.clone().subtract(1, 'month'))}
                className="bg-white/5 border-white/10 hover:bg-white/10 flex items-center justify-center"
              />
              <Button 
                size="small" 
                onClick={() => onChange(dayjs())}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-xs px-3"
              >
                Today
              </Button>
              <Button 
                shape="circle" 
                size="small" 
                icon={<ChevronRight size={16} />} 
                onClick={() => onChange(currentViewDate.clone().add(1, 'month'))}
                className="bg-white/5 border-white/10 hover:bg-white/10 flex items-center justify-center"
              />
            </div>
          </Col>
          <Col>
            <Row gutter={8}>
              <Col>
                <Select
                  size="small"
                  popupMatchSelectWidth={false}
                  className="my-year-select"
                  value={year}
                  onChange={(newYear) => {
                    const now = currentViewDate.clone().year(newYear);
                    onChange(now);
                  }}
                >
                  {options}
                </Select>
              </Col>
              <Col>
                <Select
                  size="small"
                  popupMatchSelectWidth={false}
                  value={month}
                  onChange={(newMonth) => {
                    const now = currentViewDate.clone().month(newMonth);
                    onChange(now);
                  }}
                >
                  {monthOptions}
                </Select>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#10b981',
          borderRadius: 12,
          colorBgContainer: '#0F0F0F',
          colorBorderSecondary: '#ffffff08'
        },
      }}
    >
      <div className="grid grid-cols-1 gap-8">
        <div className="p-4 rounded-3xl bg-[#0F0F0F] border border-white/5 overflow-hidden">
          <h3 className="text-lg font-bold mb-4 px-2 tracking-tight">Trading Calendar</h3>
          
          <div className="flex">
            <div className="flex-1 antd-calendar-wrapper custom-calendar">
              <Calendar 
                fullscreen={true}
                value={selectedDate || undefined}
                onSelect={onSelect}
                onPanelChange={onPanelChange}
                fullCellRender={fullCellRender}
                headerRender={headerRender}
                className="bg-transparent"
              />
            </div>
            
            {/* Weekly Summary Column */}
            <div className="hidden lg:flex flex-col w-[120px] border-l border-white/[0.03] -mt-[6px]">
              {/* Header spacer (Calendar Header + Weekdays row) */}
              <div className="h-[92px] flex items-center justify-center border-b border-white/[0.03] bg-white/[0.01]">
                <span className="text-[10px] font-black uppercase text-zinc-600 vertical-text transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
                  Weekly Summary
                </span>
              </div>
              
              <div className="flex flex-col">
                {weeklyData.map((week, idx) => (
                  <div 
                    key={idx} 
                    style={{ height: '120px' }} 
                    className={`flex flex-col items-center justify-center p-3 border-b border-white/[0.03] last:border-b-0 relative group transition-colors ${
                      week.tradesCount > 0 
                        ? (week.isPositive ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]') 
                        : 'bg-transparent'
                    }`}
                  >
                    {week.tradesCount > 0 ? (
                      <>
                        <div className="flex flex-col items-center text-center gap-1">
                          <span className={`text-[10px] font-black uppercase ${week.isPositive ? 'text-emerald-500/40' : 'text-red-500/40'}`}>
                            Trades
                          </span>
                          <span className="text-sm font-bold text-zinc-300">
                            {week.tradesCount}
                          </span>
                        </div>
                        
                        <div className="mt-4 flex flex-col items-center text-center">
                          <span className={`text-sm font-black leading-none ${week.isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                            {week.isPositive ? '+' : ''}{week.totalRR.toFixed(2)}
                          </span>
                          <span className={`text-[8px] font-bold uppercase mt-1 ${week.isPositive ? 'text-emerald-500/50' : 'text-red-400/50'}`}>
                            Weekly RR
                          </span>
                        </div>

                        {/* Visual indicator bar */}
                        <div className={`absolute right-0 top-2 bottom-2 w-0.5 rounded-l-full ${week.isPositive ? 'bg-emerald-500/30' : 'bg-red-500/30'}`} />
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-700 italic">No activity</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/5 min-h-[400px]">
          <div className="flex flex-col gap-1 mb-8">
            <h3 className="text-xl font-bold">
              {selectedDate ? selectedDate.format('MMM DD, YYYY') : 'Select a date'}
            </h3>
            <p className="text-zinc-500 text-sm">
              {selectedDate ? 'Daily Performance Summary' : 'Click a date to see trade details'}
            </p>
          </div>

          {!selectedDate ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 grayscale opacity-20">
                <CalendarDays className="text-zinc-400 w-8 h-8" />
              </div>
              <p className="text-zinc-500 text-sm italic">Choose a specific date on the calendar above to view your trading performance for that day.</p>
            </div>
          ) : tradesForDate.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Trades</p>
                  <p className="text-lg font-bold">{tradesForDate.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Total RR</p>
                  <p className={`text-lg font-bold ${tradesForDate.reduce((acc, t) => acc + (t.rr || 0), 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {tradesForDate.reduce((acc, t) => acc + (t.rr || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {tradesForDate.map(trade => (
                  <div key={trade.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center group hover:bg-white/[0.08] transition-all cursor-pointer">
                    <div>
                      <p className="font-bold text-zinc-200">{trade.item}</p>
                      <p className="text-[10px] font-black uppercase text-zinc-500">{trade.type} • {trade.entryPrice}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${trade.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-bold">RR: {trade.rr?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Badge status="default" />
              </div>
              <p className="text-zinc-500 text-sm italic">No trading activity recorded for this date.</p>
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
