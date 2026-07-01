import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle,
  Clock,
  Tag,
  DollarSign
} from 'lucide-react';
import { Subscription } from '../types';
import { getUserLocalCurrency, convertCurrency, formatCurrency } from '../lib/currency';

interface CalendarViewProps {
  subscriptions: Subscription[];
  onSelectSubscription: (sub: Subscription) => void;
}

export default function CalendarView({
  subscriptions,
  onSelectSubscription
}: CalendarViewProps) {
  const localCurrency = getUserLocalCurrency();
  const [currentDate, setCurrentDate] = useState(() => new Date()); // July 2026 by default
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    const now = new Date();
    return now.getDate();
  });

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  // Get days in the selected month and the starting weekday index
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const startDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Project active subscriptions onto this calendar month
  const calendarEvents = useMemo<Record<number, { sub: Subscription; projectedAmount: number }[]>>(() => {
    const events: Record<number, { sub: Subscription; projectedAmount: number }[]> = {};
    const activeSubs = subscriptions.filter(s => s.status === 'active');

    activeSubs.forEach(sub => {
      const nextDate = new Date(sub.nextBillingDate);
      const nextDay = nextDate.getDate();
      const nextMonthOfSub = nextDate.getMonth();
      const nextYearOfSub = nextDate.getFullYear();

      // Simple, highly effective projection rules
      if (sub.billingCycle === 'monthly') {
        // Monthly charges occur on the same day every month
        // Match day of nextBillingDate
        if (nextDay >= 1 && nextDay <= daysInMonth) {
          if (!events[nextDay]) events[nextDay] = [];
          events[nextDay].push({ sub, projectedAmount: sub.amount });
        }
      } else if (sub.billingCycle === 'yearly') {
        // Yearly charges occur only in their specific renewal month
        if (nextMonthOfSub === currentMonth) {
          if (nextDay >= 1 && nextDay <= daysInMonth) {
            if (!events[nextDay]) events[nextDay] = [];
            events[nextDay].push({ sub, projectedAmount: sub.amount });
          }
        }
      } else if (sub.billingCycle === 'weekly') {
        // Weekly charges occur every 7 days. Find all occurrences in the current month.
        // Start projecting from the next billing date
        const subDate = new Date(sub.nextBillingDate);
        const startProj = new Date(currentYear, currentMonth, 1);
        const endProj = new Date(currentYear, currentMonth, daysInMonth);

        // Align weekly project starting point
        let runningDate = new Date(subDate.getTime());
        // Walk back or forward to align around current month
        if (runningDate.getTime() > endProj.getTime()) {
          while (runningDate.getTime() > startProj.getTime()) {
            runningDate.setDate(runningDate.getDate() - 7);
          }
          runningDate.setDate(runningDate.getDate() + 7); // correct back step
        } else {
          while (runningDate.getTime() < startProj.getTime()) {
            runningDate.setDate(runningDate.getDate() + 7);
          }
        }

        // Add all weeks landing inside current month
        while (runningDate.getTime() <= endProj.getTime() && runningDate.getTime() >= startProj.getTime()) {
          const dayIndex = runningDate.getDate();
          if (!events[dayIndex]) events[dayIndex] = [];
          events[dayIndex].push({ sub, projectedAmount: sub.amount });
          runningDate.setDate(runningDate.getDate() + 7);
        }
      }
    });

    return events;
  }, [subscriptions, currentMonth, currentYear, daysInMonth]);

  // Aggregate stats for the selected calendar month
  const monthStats = useMemo(() => {
    let total = 0;
    let counts = 0;
    (Object.values(calendarEvents) as { sub: Subscription; projectedAmount: number }[][]).forEach(dayList => {
      dayList.forEach(ev => {
        total += convertCurrency(ev.projectedAmount, ev.sub.currency, localCurrency.code);
        counts += 1;
      });
    });
    return {
      total,
      count: counts
    };
  }, [calendarEvents, localCurrency.code]);

  // Calendar cells generation
  const cells = useMemo(() => {
    const result = [];
    const now = new Date();
    const isTodayMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;
    const todayDate = now.getDate();

    // Previous month filler days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      result.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        day: d,
        isCurrentMonth: true,
        isToday: isTodayMonth && d === todayDate,
        events: calendarEvents[d] || []
      });
    }

    // Next month filler days to complete grid
    const totalCells = result.length;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      result.push({
        day: i,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    return result;
  }, [daysInMonth, startDayOfWeek, calendarEvents, currentMonth, currentYear]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* Calendar Grid Sheet */}
      <div className="xl:col-span-3 bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
        
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 bg-[#1c1c1f] hover:bg-[#252529] rounded-lg border border-white/5 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold text-white min-w-36 text-center">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 bg-[#1c1c1f] hover:bg-[#252529] rounded-lg border border-white/5 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-[#1c1c1f] border border-white/5 px-3 py-1.5 rounded-lg">
            <Clock className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span>Projected billings based on billing cycle frequencies</span>
          </div>
        </div>

        {/* Calendar Board */}
        <div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 uppercase tracking-widest mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2.5">
            {cells.map((cell, idx) => {
              const dayTotalLocal = cell.events.reduce((sum, ev) => sum + convertCurrency(ev.projectedAmount, ev.sub.currency, localCurrency.code), 0);
              const isSelected = cell.isCurrentMonth && selectedDay === cell.day;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedDay(cell.day);
                    }
                  }}
                  className={`min-h-12 sm:min-h-16 md:min-h-24 p-1 sm:p-1.5 md:p-2 border rounded-xl flex flex-col justify-between transition relative overflow-hidden group cursor-pointer ${
                    cell.isCurrentMonth 
                      ? cell.isToday 
                        ? 'bg-indigo-500/10 border-indigo-500/40 ring-2 ring-indigo-500/20 text-white font-extrabold' 
                        : isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                        : 'bg-[#161619] border-white/5 hover:border-white/10' 
                      : 'bg-white/[0.01] border-white/[0.02] text-slate-600 cursor-default'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-[10px] sm:text-[11px] md:text-xs font-bold ${
                      cell.isCurrentMonth
                        ? cell.isToday 
                          ? 'text-indigo-300 bg-indigo-500/20 px-1 sm:px-1.5 py-0.5 rounded-md border border-indigo-500/10' 
                          : isSelected
                          ? 'text-indigo-300'
                          : 'text-slate-300'
                        : 'text-slate-600'
                    }`}>
                      {cell.day}
                    </span>
                    
                    {/* Day billing totals */}
                    {dayTotalLocal > 0 && cell.isCurrentMonth && (
                      <span className="text-[9px] md:text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 px-1 md:px-1.5 py-0.5 rounded-md border border-indigo-500/20 hidden sm:inline-block">
                        {formatCurrency(dayTotalLocal, localCurrency.code).replace('.00', '')}
                      </span>
                    )}
                  </div>

                  {/* Billings list */}
                  <div className="hidden sm:block space-y-1 mt-1.5 md:mt-2.5 flex-1 overflow-y-auto max-h-14">
                    {cell.isCurrentMonth && cell.events.map(({ sub, projectedAmount }) => {
                      let tagColor = 'bg-slate-800 text-slate-300 hover:bg-slate-700';
                      if (sub.category === 'Entertainment') tagColor = 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900/30';
                      if (sub.category === 'Utilities') tagColor = 'bg-amber-950/40 text-amber-300 border border-amber-500/20 hover:bg-amber-900/30';
                      if (sub.category === 'Health & Fitness') tagColor = 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20 hover:bg-indigo-900/30';
                      if (sub.category === 'Software & Services') tagColor = 'bg-sky-950/40 text-sky-300 border border-sky-500/20 hover:bg-sky-900/30';
                      if (sub.category === 'Financial') tagColor = 'bg-rose-950/40 text-rose-300 border border-rose-500/20 hover:bg-rose-900/30';

                      const localAmt = convertCurrency(projectedAmount, sub.currency, localCurrency.code);

                      return (
                        <div
                          key={sub.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSubscription(sub);
                          }}
                          className={`text-[9px] font-bold p-1 rounded border transition cursor-pointer flex items-center justify-between gap-1 truncate ${tagColor}`}
                          title={`${sub.name} - ${formatCurrency(localAmt, localCurrency.code)} (${sub.billingCycle})`}
                        >
                          <span className="truncate flex-1 font-extrabold">{sub.name}</span>
                          <span className="shrink-0 font-extrabold">{formatCurrency(localAmt, localCurrency.code).replace('.00', '')}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tiny colored dots categories indicators for mobile viewports */}
                  {cell.events.length > 0 && cell.isCurrentMonth && (
                    <div className="sm:hidden absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 justify-center max-w-[90%]">
                      {cell.events.slice(0, 3).map((ev, i) => {
                        let dotColor = 'bg-slate-400';
                        if (ev.sub.category === 'Entertainment') dotColor = 'bg-indigo-500';
                        if (ev.sub.category === 'Utilities') dotColor = 'bg-amber-500';
                        if (ev.sub.category === 'Health & Fitness') dotColor = 'bg-emerald-500';
                        if (ev.sub.category === 'Software & Services') dotColor = 'bg-sky-500';
                        if (ev.sub.category === 'Financial') dotColor = 'bg-rose-500';
                        return <span key={i} className={`h-1.5 w-1.5 rounded-full ${dotColor} shrink-0`} />;
                      })}
                      {cell.events.length > 3 && (
                        <span className="text-[7px] text-indigo-400 font-extrabold leading-none -mt-0.5">+</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Section (highly useful on mobile screens) */}
        {selectedDay && (
          <div className="p-3.5 bg-[#161619]/60 border border-white/5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Due on {monthNames[currentMonth]} {selectedDay}
              </span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold px-2 py-0.5 rounded-full">
                {(cells.find(c => c.isCurrentMonth && c.day === selectedDay)?.events || []).length} Billed
              </span>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(() => {
                const dayEvents = (cells.find(c => c.isCurrentMonth && c.day === selectedDay)?.events || []);
                if (dayEvents.length === 0) {
                  return (
                    <p className="text-[11px] text-slate-500 text-center py-2.5">No subscription payments due on this day.</p>
                  );
                }
                
                return dayEvents.map(({ sub, projectedAmount }) => {
                  let badgeColor = 'bg-slate-800 text-slate-300 border border-white/5';
                  if (sub.category === 'Entertainment') badgeColor = 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20';
                  if (sub.category === 'Utilities') badgeColor = 'bg-amber-950/40 text-amber-300 border border-amber-500/20';
                  if (sub.category === 'Health & Fitness') badgeColor = 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20';
                  if (sub.category === 'Software & Services') badgeColor = 'bg-sky-950/40 text-sky-300 border border-sky-500/20';
                  if (sub.category === 'Financial') badgeColor = 'bg-rose-950/40 text-rose-300 border border-rose-500/20';

                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => onSelectSubscription(sub)}
                      className="flex items-center justify-between p-2.5 bg-[#1c1c1f] hover:bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer transition duration-150"
                    >
                      <div className="space-y-0.5 max-w-[60%]">
                        <p className="font-bold text-xs text-white truncate">{sub.name}</p>
                        <span className={`inline-block text-[8px] uppercase tracking-wider px-1.5 py-0.25 rounded-full font-extrabold ${badgeColor}`}>
                          {sub.category}
                        </span>
                      </div>
                      
                      <div className="text-right space-y-0.5">
                        <span className="font-extrabold text-xs text-white block">
                          {formatCurrency(projectedAmount, sub.currency)}
                        </span>
                        {sub.currency !== localCurrency.code && (
                          <span className="text-[9px] text-slate-500 font-medium block">
                            ~{formatCurrency(convertCurrency(projectedAmount, sub.currency, localCurrency.code), localCurrency.code)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

      </div>

      {/* Side Stats Panel */}
      <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="border-b border-white/5 pb-3">
          <h4 className="font-bold text-white text-sm">Month Billings Audit</h4>
          <p className="text-xs text-slate-400">Summary for {monthNames[currentMonth]}</p>
        </div>

        <div className="space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-widest">Estimated Total Due</span>
            <div className="flex items-baseline justify-center gap-1 text-white">
              <span className="text-3xl font-extrabold tracking-tight">{formatCurrency(monthStats.total, localCurrency.code)}</span>
            </div>
            <p className="text-[10px] text-indigo-400 font-medium">{monthStats.count} recurring charges projected</p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Billed Items</span>
            
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5 pr-1">
              {Object.values(calendarEvents).flat().length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No billing projections land on this calendar month.
                </div>
              ) : (
                (() => {
                  const flattened = (Object.values(calendarEvents) as { sub: Subscription; projectedAmount: number }[][]).flat();
                  return flattened
                    .reduce<{ sub: Subscription; projectedAmount: number }[]>((unique, item) => {
                      const exists = unique.find(u => u.sub.id === item.sub.id);
                      if (!exists) {
                        unique.push({ ...item });
                      } else {
                        exists.projectedAmount += item.projectedAmount;
                      }
                      return unique;
                    }, [])
                    .map(({ sub, projectedAmount }) => {
                      const localAmt = convertCurrency(projectedAmount, sub.currency, localCurrency.code);
                      return (
                        <div 
                          key={sub.id} 
                          onClick={() => onSelectSubscription(sub)}
                          className="py-2.5 flex items-center justify-between hover:bg-white/[0.02] rounded-lg px-2 transition cursor-pointer text-xs"
                        >
                          <div className="space-y-0.5 max-w-[65%]">
                            <span className="font-bold text-white block truncate">{sub.name}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Tag className="h-3 w-3 text-indigo-400 shrink-0" />
                              <span className="truncate">{sub.category}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-white block">{formatCurrency(localAmt, localCurrency.code)}</span>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase capitalize">{sub.billingCycle}</span>
                          </div>
                        </div>
                      );
                    });
                })()
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
