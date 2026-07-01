import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  Calendar, 
  CreditCard,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Subscription } from '../types';
import { getUserLocalCurrency, convertCurrency, formatCurrency } from '../lib/currency';

interface PaymentConfirmQueueProps {
  subscriptions: Subscription[];
  onConfirmPayment: (sub: Subscription) => void;
}

export default function PaymentConfirmQueue({
  subscriptions,
  onConfirmPayment,
}: PaymentConfirmQueueProps) {
  
  const localCurrency = getUserLocalCurrency();

  // Find subscriptions that are due soon (next 7 days) or overdue
  const pendingSubscriptions = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return subscriptions
      .filter(sub => sub.status === 'active')
      .map(sub => {
        const nextDate = new Date(sub.nextBillingDate);
        nextDate.setHours(0, 0, 0, 0);
        const diffTime = nextDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          ...sub,
          daysRemaining: diffDays
        };
      })
      // Only include overdue or upcoming within the next 7 days
      .filter(sub => sub.daysRemaining <= 7)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [subscriptions]);

  // Track session-snoozed subscription IDs
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Active queue filters out any items that are already advanced or currently snoozed
  const activeQueue = useMemo(() => {
    return pendingSubscriptions.filter(sub => !snoozedIds.includes(sub.id));
  }, [pendingSubscriptions, snoozedIds]);

  const topCard = activeQueue[0];

  const handleSwipeRight = () => {
    if (!topCard) return;
    setSwipeDirection('right');
    setTimeout(() => {
      onConfirmPayment(topCard);
      setSwipeDirection(null);
    }, 200);
  };

  const handleSwipeLeft = () => {
    if (!topCard) return;
    setSwipeDirection('left');
    setTimeout(() => {
      setSnoozedIds(prev => [...prev, topCard.id]);
      setSwipeDirection(null);
    }, 200);
  };

  const handleResetSnoozes = () => {
    setSnoozedIds([]);
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between min-h-[360px] relative overflow-hidden">
      
      {/* Header */}
      <div className="border-b border-white/5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Payment Confirmation Deck</h3>
        </div>
        <span className="text-[9px] text-emerald-300 bg-emerald-500/15 font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          {activeQueue.length} Pending
        </span>
      </div>

      {/* Main card stage */}
      <div className="relative flex-1 flex items-center justify-center my-4 min-h-[190px]">
        <AnimatePresence mode="popLayout">
          {topCard ? (
            <div className="w-full max-w-sm relative h-[180px] flex items-center justify-center">
              
              {/* Back card (underneath peek) */}
              {activeQueue.length > 1 && (
                <div 
                  className="absolute w-full h-[165px] bg-[#1a1a1d] border border-white/[0.02] rounded-2xl shadow-lg opacity-40 translate-y-3 scale-95 select-none pointer-events-none transition duration-200"
                />
              )}

              {/* Active top card */}
              <motion.div
                key={topCard.id}
                drag="x"
                dragConstraints={{ left: -120, right: 120 }}
                onDragEnd={(e, info) => {
                  if (info.offset.x > 80) {
                    handleSwipeRight();
                  } else if (info.offset.x < -80) {
                    handleSwipeLeft();
                  }
                }}
                animate={
                  swipeDirection === 'right' 
                    ? { x: 350, opacity: 0, rotate: 15 } 
                    : swipeDirection === 'left' 
                    ? { x: -350, opacity: 0, rotate: -15 } 
                    : { x: 0, opacity: 1, rotate: 0 }
                }
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute w-full h-full bg-gradient-to-b from-[#1c1c1f] to-[#161618] border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col justify-between cursor-grab active:cursor-grabbing touch-pan-y"
              >
                
                {/* Due status badge */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block truncate">
                      {topCard.category}
                    </span>
                    <h4 className="text-sm font-extrabold text-white leading-tight truncate">
                      {topCard.name}
                    </h4>
                  </div>
                  
                  <span className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold ${
                    topCard.daysRemaining < 0 
                      ? 'bg-red-500/15 text-red-400 border border-red-500/20' 
                      : topCard.daysRemaining === 0 
                      ? 'bg-red-500/15 text-red-400 border border-red-500/20 font-bold'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                  }`}>
                    {topCard.daysRemaining < 0 
                      ? `${Math.abs(topCard.daysRemaining)}d Overdue` 
                      : topCard.daysRemaining === 0 
                      ? 'Due Today' 
                      : `In ${topCard.daysRemaining} days`}
                  </span>
                </div>

                {/* Pricing / currency displays */}
                <div className="bg-[#121214]/60 rounded-xl p-2.5 flex items-center justify-between border border-white/5 gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[8px] uppercase font-bold text-slate-500 block truncate">Original Bill</span>
                    <span className="text-sm font-bold text-slate-300 truncate block">
                      {formatCurrency(topCard.amount, topCard.currency)}
                    </span>
                  </div>
                  
                  {topCard.currency !== localCurrency.code && (
                    <div className="text-right space-y-0.5 min-w-0 flex-1 ml-2">
                      <span className="text-[8px] uppercase font-bold text-indigo-400 block truncate">Local Equivalent</span>
                      <span className="text-sm font-extrabold text-white truncate block">
                        {formatCurrency(convertCurrency(topCard.amount, topCard.currency, localCurrency.code), localCurrency.code)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Swipe guides */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Swipe Left to Snooze
                  </span>
                  <span className="flex items-center gap-1">
                    Swipe Right if Paid
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </span>
                </div>

              </motion.div>
            </div>
          ) : (
            <div className="text-center space-y-2 py-6">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto animate-bounce" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">All Payments Confirmed!</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  No subscriptions require manual payment confirmation within the next 7 days.
                </p>
              </div>
              {snoozedIds.length > 0 && (
                <button
                  onClick={handleResetSnoozes}
                  className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Reset {snoozedIds.length} Snoozed Cards
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual buttons for both Android & web ease-of-use */}
      {topCard && (
        <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-white/5">
          <button
            onClick={handleSwipeLeft}
            className="flex items-center justify-center gap-1.5 bg-[#1c1c1f] hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/25 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            <span>Snooze</span>
          </button>
          
          <button
            onClick={handleSwipeRight}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Mark Paid</span>
          </button>
        </div>
      )}

    </div>
  );
}
