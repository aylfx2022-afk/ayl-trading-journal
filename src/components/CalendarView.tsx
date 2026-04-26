import React, { useState } from 'react';
import { Calendar, ConfigProvider, theme, Badge, Button, Select, Row, Col } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Trade } from '../types';
import { format, isSameDay } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onSelectDay: (date: Dayjs) => void;
}

export default function CalendarView({ trades, onSelectTrade, onSelectDay }: CalendarViewProps) {
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

  const monthlyStats = React.useMemo(() => {
    const currentMonth = panelDate.month();
    const currentYear = panelDate.year();
    
    const monthlyTrades = trades.filter(trade => {
      if (!trade.openTime) return false;
      const date = trade.openTime.toDate();
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalTrades = monthlyTrades.length;
    const totalRR = monthlyTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
    const wins = monthlyTrades.filter(t => (t.rr || 0) > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      totalTrades,
      totalRR,
      winRate,
      isPositive: totalRR >= 0
    };
  }, [panelDate, trades]);

  const onSelect = (date: Dayjs, info: { source: string }) => {
    if (info.source === 'date') {
      onSelectDay(date);
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

  const fullCellRender = (value: Dayjs, info: any) => {
    if (info.type !== 'date') return info.originNode;

    const currentKey = value.format('YYYY-MM-DD');
    const dayData = tradesByDate[currentKey];
    const tradesOnDay = dayData?.trades || [];
    const totalRR = dayData ? dayData.totalRR : null;
    const isPositive = dayData ? dayData.isPositive : false;
    const isToday = value.isSame(dayjs(), 'day');
    const hasNotes = tradesOnDay.some(t => t.notes);

    return (
      <div className={`ant-picker-cell-inner ant-picker-calendar-date transition-all duration-300 h-full flex flex-col cursor-pointer group relative
        ${totalRR !== null 
          ? (isPositive ? 'bg-emerald-500/15 shadow-[inset_0_0_15px_rgba(16,185,129,0.03)]' : 'bg-red-500/15 shadow-[inset_0_0_15px_rgba(239,68,68,0.03)]') 
          : 'hover:bg-white/[0.02]'
        } 
        border border-white/[0.02]
      `}>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start p-1.5">
            <span className={`text-xs font-bold ${isToday ? 'bg-emerald-500 text-black w-5 h-5 rounded-full flex items-center justify-center p-0' : 'text-zinc-500'}`}>
              {value.date()}
            </span>
            <div className="flex items-center gap-1">
              {hasNotes && (
                <div className="w-1 h-1 rounded-full bg-emerald-400/70" title="Day has notes" />
              )}
              {totalRR !== null && (
                <div className={`text-[8px] font-black px-1 rounded-sm ${isPositive ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                  {tradesOnDay.length}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex items-end p-1.5">
            {totalRR !== null && (
              <div className="flex flex-col">
                <span className={`text-[10px] font-black leading-none ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{totalRR.toFixed(1)}
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

    const current = currentViewDate.clone().date(1);
    const localeData = currentViewDate.localeData();
    const months = localeData.monthsShort() || [];
    
    // If localeData.monthsShort() didn't return an array, fallback to manual generation
    const monthsList = Array.isArray(months) && months.length === 12 ? months : [];
    if (monthsList.length === 0) {
      for (let i = 0; i < 12; i++) {
        monthsList.push(current.month(i).format('MMM'));
      }
    }

    for (let i = start; i < end; i++) {
      monthOptions.push(
        <Select.Option key={i} value={i} className="month-item">
          {monthsList[i]}
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
      <div style={{ padding: '4px 8px' }}>
        <Row gutter={4} justify="space-between" align="middle">
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
      <div className="grid grid-cols-1 gap-4">
        <div className="p-2 rounded-2xl bg-[#0F0F0F] border border-white/5 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 px-2 gap-2">
            <h3 className="text-base font-black tracking-tight flex items-center gap-2">
              <CalendarDays size={18} className="text-emerald-500" />
              Calendar
            </h3>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center px-4">
                <span className="text-[9px] font-black uppercase text-zinc-600 leading-none mb-0.5">Trades</span>
                <span className="text-xs font-bold text-zinc-300">{monthlyStats.totalTrades}</span>
              </div>
              <div className="flex flex-col items-center px-4 border-l border-white/5">
                <span className="text-[9px] font-black uppercase text-zinc-600 leading-none mb-0.5">Win Rate</span>
                <span className="text-xs font-bold text-zinc-300">{monthlyStats.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex flex-col items-center px-4 border-l border-white/5">
                <span className="text-[9px] font-black uppercase text-zinc-600 leading-none mb-0.5">Month RR</span>
                <span className={`text-xs font-black ${monthlyStats.isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                  {monthlyStats.isPositive ? '+' : ''}{monthlyStats.totalRR.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-1 antd-calendar-wrapper custom-calendar compact-calendar">
              <Calendar 
                fullscreen={true}
                onSelect={onSelect}
                onPanelChange={onPanelChange}
                fullCellRender={fullCellRender}
                headerRender={headerRender}
                className="bg-transparent"
              />
            </div>
            
            {/* Weekly Summary Column */}
            <div className="hidden lg:flex flex-col w-[80px] border-l border-white/[0.03] -mt-[6px]">
              {/* Header spacer (Calendar Header + Weekdays row) */}
              <div className="h-[68px] flex items-center justify-center border-b border-white/[0.03] bg-white/[0.01]">
                <span className="text-[9px] font-black uppercase text-zinc-700 vertical-text transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
                  Weekly
                </span>
              </div>
              
              <div className="flex flex-col">
                {weeklyData.map((week, idx) => (
                  <div 
                    key={idx} 
                    className={`weekly-row flex flex-col items-center justify-center p-2 border-b border-white/[0.03] last:border-b-0 relative group transition-colors ${
                      week.tradesCount > 0 
                        ? (week.isPositive ? 'bg-emerald-500/[0.02]' : 'bg-red-500/[0.02]') 
                        : 'bg-transparent'
                    }`}
                  >
                    {week.tradesCount > 0 ? (
                      <>
                        <div className="flex flex-col items-center text-center">
                          <span className="text-xs font-bold text-zinc-400">
                            {week.tradesCount}t
                          </span>
                        </div>
                        
                        <div className="mt-2 flex flex-col items-center text-center">
                          <span className={`text-xs font-black leading-none ${week.isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                            {week.isPositive ? '+' : ''}{week.totalRR.toFixed(1)}
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
      </div>
    </ConfigProvider>
  );
}
