import React, { useState, useEffect } from 'react';
import { X, Save, Tag, DollarSign, Calendar, Info, Trash2 } from 'lucide-react';
import { Subscription, SubscriptionCategory, SubscriptionStatus, BillingCycle } from '../types';
import { getUserLocalCurrency, CURRENCY_SYMBOLS } from '../lib/currency';

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null; // null means adding new
  onSave: (data: Omit<Subscription, 'id' | 'userId'> & { id?: string }) => void;
}

export default function SubscriptionFormModal({
  isOpen,
  onClose,
  subscription,
  onSave,
}: SubscriptionFormModalProps) {
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('INR');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [category, setCategory] = useState<SubscriptionCategory>('Entertainment');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState<string | null>(null);

  // Populate form if editing
  useEffect(() => {
    if (subscription) {
      setName(subscription.name);
      setAmount(subscription.amount);
      setCurrency(subscription.currency || 'INR');
      setBillingCycle(subscription.billingCycle);
      setNextBillingDate(subscription.nextBillingDate);
      setPaymentMethod(subscription.paymentMethod || '');
      setStatus(subscription.status);
      setCategory(subscription.category);
      setNotes(subscription.notes || '');
    } else {
      // Defaults for adding new
      const detected = getUserLocalCurrency();
      setName('');
      setAmount(0);
      setCurrency(detected.code);
      setBillingCycle('monthly');
      
      // Set default next billing date to today + 1 month
      const future = new Date();
      future.setMonth(future.getMonth() + 1);
      setNextBillingDate(future.toISOString().split('T')[0]);
      
      setPaymentMethod('Visa');
      setStatus('active');
      setCategory('Entertainment');
      setNotes('');
    }
    setError(null);
  }, [subscription, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!name.trim()) {
      setError("Please specify a subscription brand name.");
      return;
    }
    if (amount <= 0) {
      setError("Please specify a valid subscription rate greater than 0.");
      return;
    }
    if (!nextBillingDate) {
      setError("Please specify the next upcoming billing renewal date.");
      return;
    }

    onSave({
      id: subscription?.id, // include if editing
      name: name.trim(),
      amount: Number(amount),
      currency: currency.toUpperCase(),
      billingCycle,
      nextBillingDate,
      paymentMethod: paymentMethod.trim() || 'Autopay',
      status,
      category,
      notes: notes.trim(),
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121214] rounded-2xl shadow-2xl border border-white/5 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#1c1c1f] border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <h3 className="font-extrabold text-white text-sm tracking-tight">
            {subscription ? 'Edit Subscription Details' : 'Track New Subscription'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex gap-2">
              <Info className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            {/* Name */}
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Brand / Service Name</label>
              <input
                type="text"
                placeholder="e.g. Netflix, Spotify, gym membership"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1c1c1f] border border-white/5 rounded-xl p-3 font-semibold text-white focus:bg-[#1c1c1f] focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Price and currency */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Price / Rate</label>
              <div className="flex gap-2">
                <div className="w-16 flex items-center justify-center bg-[#1c1c1f]/50 border border-white/5 rounded-xl p-3 font-bold text-indigo-400 select-none">
                  INR
                </div>
                <div className="relative flex-1">
                  <div className="absolute left-3.5 top-3.5 text-slate-500 font-bold select-none">₹</div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-3 bg-[#1c1c1f] border border-white/5 rounded-xl font-extrabold text-white focus:bg-[#1c1c1f] focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Cycle */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Billing Cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as any)}
                className="w-full bg-[#1c1c1f] border border-white/5 rounded-xl p-3 font-semibold text-slate-300 focus:bg-[#1c1c1f] focus:outline-none cursor-pointer"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Renewal Date */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Next Billing Date</label>
              <input
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className="w-full bg-[#1c1c1f] border border-white/5 rounded-xl p-3 font-semibold text-slate-300 focus:bg-[#1c1c1f] focus:outline-none cursor-pointer focus:border-indigo-500 transition"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#1c1c1f] border border-white/5 rounded-xl p-3 font-semibold text-slate-300 focus:bg-[#1c1c1f] focus:outline-none cursor-pointer"
              >
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Health & Fitness">Health & Fitness</option>
                <option value="Software & Services">Software & Services</option>
                <option value="Financial">Financial</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Payment Method</label>
              <input
                type="text"
                placeholder="e.g. Visa ****1234, PayPal"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#1c1c1f] border border-white/5 rounded-xl p-3 font-semibold text-slate-300 focus:bg-[#1c1c1f] focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Subscription Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#1c1c1f] border border-white/5 rounded-xl p-3 font-semibold text-slate-300 focus:bg-[#1c1c1f] focus:outline-none cursor-pointer"
              >
                <option value="active">Active / Auto-billing</option>
                <option value="paused">Paused / Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Notes */}
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Notes & Plans</label>
              <textarea
                placeholder="Add billing info, shared family plan notes, or cancel deadlines..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#1c1c1f] border border-white/5 rounded-xl p-3 font-medium text-slate-300 focus:bg-[#1c1c1f] focus:outline-none focus:border-indigo-500 transition resize-none"
              />
            </div>

          </div>

          {/* Footer Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Subscription</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-3 px-6 rounded-xl transition cursor-pointer border border-white/5"
            >
              Cancel
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
