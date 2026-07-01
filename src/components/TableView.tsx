import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  PauseCircle, 
  PlayCircle, 
  Tag, 
  Calendar, 
  ArrowUpDown, 
  AlertCircle,
  Table,
  List
} from 'lucide-react';
import { Subscription, SubscriptionCategory, SubscriptionStatus } from '../types';
import { getUserLocalCurrency, convertCurrency, formatCurrency } from '../lib/currency';

interface TableViewProps {
  subscriptions: Subscription[];
  onSelectSubscription: (sub: Subscription) => void;
  onUpdateStatus: (id: string, newStatus: SubscriptionStatus) => void;
  onDeleteSubscription: (id: string) => void;
}

type SortField = 'name' | 'amount' | 'nextBillingDate' | 'status';
type SortOrder = 'asc' | 'desc';

export default function TableView({
  subscriptions,
  onSelectSubscription,
  onUpdateStatus,
  onDeleteSubscription,
}: TableViewProps) {
  
  const localCurrency = getUserLocalCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('nextBillingDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Safe confirm delete with detail description
  const handleSafeDelete = (sub: Subscription) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the subscription for "${sub.name}"? This action cannot be undone and will stop tracking renewal cycles.`
    );
    if (confirmed) {
      onDeleteSubscription(sub.id);
    }
  };

  // Filter & Search & Sort subscriptions
  const filteredSubs = useMemo(() => {
    return subscriptions
      .filter(sub => {
        const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (sub.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || sub.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let valueA: any = a[sortField];
        let valueB: any = b[sortField];

        // Format dates correctly for comparison
        if (sortField === 'nextBillingDate') {
          valueA = new Date(a.nextBillingDate).getTime();
          valueB = new Date(b.nextBillingDate).getTime();
        }

        if (sortField === 'amount') {
          valueA = Number(a.amount);
          valueB = Number(b.amount);
        }

        if (typeof valueA === 'string') {
          return sortOrder === 'asc' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        } else {
          return sortOrder === 'asc' 
            ? valueA - valueB 
            : valueB - valueA;
        }
      });
  }, [subscriptions, searchTerm, categoryFilter, statusFilter, sortField, sortOrder]);

  return (
    <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
      
      {/* Filters and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-center justify-between border-b border-white/5 pb-4">
        
        {/* Search */}
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 bg-[#1c1c1f] border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

        {/* Category & Status Select filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#1c1c1f] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Utilities">Utilities</option>
              <option value="Health & Fitness">Health & Fitness</option>
              <option value="Software & Services">Software & Services</option>
              <option value="Financial">Financial</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#1c1c1f] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* View Layout Toggle */}
          <div className="flex items-center bg-[#1c1c1f] p-1 rounded-lg border border-white/5 shrink-0 select-none w-full sm:w-auto justify-center sm:justify-start">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition duration-200 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card List View (No Horizontal Scroll)"
            >
              <List className="h-3 w-3" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition duration-200 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Traditional Table View"
            >
              <Table className="h-3 w-3" />
              <span>Table View</span>
            </button>
          </div>

        </div>

      </div>

      {/* Mobile Card List (shown on mobile/Android screen sizes) */}
      <div className="space-y-3.5 md:hidden">
        {filteredSubs.length === 0 ? (
          <div className="bg-[#1c1c1f] border border-white/5 rounded-xl py-12 text-center text-slate-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No matching subscriptions found. Clear filters or add a new record.
          </div>
        ) : (
          filteredSubs.map((sub) => {
            // Status badge calculations
            let badgeClass = 'bg-slate-800 text-slate-300 border border-white/5';
            if (sub.status === 'active') badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            if (sub.status === 'paused') badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            if (sub.status === 'cancelled') badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

            // Category styling helper
            let catBadgeClass = 'bg-slate-800 text-slate-300 border border-white/5';
            if (sub.category === 'Entertainment') catBadgeClass = 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20';
            if (sub.category === 'Utilities') catBadgeClass = 'bg-amber-950/40 text-amber-300 border border-amber-500/20';
            if (sub.category === 'Health & Fitness') catBadgeClass = 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20';
            if (sub.category === 'Software & Services') catBadgeClass = 'bg-sky-950/40 text-sky-300 border border-sky-500/20';
            if (sub.category === 'Financial') catBadgeClass = 'bg-rose-950/40 text-rose-300 border border-rose-500/20';

            return (
              <div key={sub.id} className="bg-[#1c1c1f] border border-white/5 rounded-xl p-4 space-y-3 shadow-md hover:border-white/10 transition">
                {/* Header: Name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h4 
                      onClick={() => onSelectSubscription(sub)} 
                      className="font-extrabold text-white text-sm cursor-pointer hover:text-indigo-400 transition"
                    >
                      {sub.name}
                    </h4>
                    {sub.notes && (
                      <p className="text-[10px] text-slate-500 line-clamp-2">{sub.notes}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${badgeClass}`}>
                    {sub.status}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-b border-white/5 py-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">CATEGORY</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${catBadgeClass}`}>
                      <Tag className="h-2.5 w-2.5 shrink-0" />
                      {sub.category}
                    </span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-slate-500 font-semibold block">PRICE ({sub.billingCycle})</span>
                    <span className="font-extrabold text-white text-xs">
                      {sub.currency} {sub.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">RENEWAL DATE</span>
                    <div className="flex items-center gap-1 text-slate-300 font-medium">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>{new Date(sub.nextBillingDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-slate-500 font-semibold block">PAYMENT METHOD</span>
                    <span className="text-slate-400 font-semibold truncate max-w-28 inline-block">{sub.paymentMethod || 'Autopay'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {sub.status === 'active' ? (
                      <button
                        onClick={() => onUpdateStatus(sub.id, 'paused')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/20 transition cursor-pointer"
                      >
                        <PauseCircle className="h-3.5 w-3.5" />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => onUpdateStatus(sub.id, 'active')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/20 transition cursor-pointer"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Activate
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectSubscription(sub)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-white/5 bg-[#121214] rounded-lg transition cursor-pointer"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleSafeDelete(sub)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 bg-[#121214] rounded-lg transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop List View (only shown on desktop when viewMode is 'list') */}
      {viewMode === 'list' && (
        <div className="hidden md:grid grid-cols-1 max-w-3xl mx-auto w-full gap-4.5">
          {filteredSubs.length === 0 ? (
            <div className="col-span-full bg-[#1c1c1f] border border-white/5 rounded-xl py-12 text-center text-slate-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No matching subscriptions found. Clear filters or add a new record.
            </div>
          ) : (
            filteredSubs.map((sub) => {
              // Status badge calculations
              let badgeClass = 'bg-slate-800 text-slate-300 border border-white/5';
              if (sub.status === 'active') badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
              if (sub.status === 'paused') badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
              if (sub.status === 'cancelled') badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

              // Category styling helper
              let catBadgeClass = 'bg-slate-800 text-slate-300 border border-white/5';
              if (sub.category === 'Entertainment') catBadgeClass = 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20';
              if (sub.category === 'Utilities') catBadgeClass = 'bg-amber-950/40 text-amber-300 border border-amber-500/20';
              if (sub.category === 'Health & Fitness') catBadgeClass = 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20';
              if (sub.category === 'Software & Services') catBadgeClass = 'bg-sky-950/40 text-sky-300 border border-sky-500/20';
              if (sub.category === 'Financial') catBadgeClass = 'bg-rose-950/40 text-rose-300 border border-rose-500/20';

              return (
                <div key={sub.id} className="bg-[#1c1c1f]/75 border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl hover:border-white/15 hover:bg-[#1c1c1f] transition-all duration-200 flex flex-col justify-between">
                  <div>
                    {/* Header: Avatar, Name, Category */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-base select-none shrink-0">
                          {sub.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <h4 
                            onClick={() => onSelectSubscription(sub)} 
                            className="font-extrabold text-white text-sm cursor-pointer hover:text-indigo-400 transition"
                          >
                            {sub.name}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${catBadgeClass}`}>
                            <Tag className="h-2 w-2 shrink-0" />
                            {sub.category}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${badgeClass}`}>
                        {sub.status}
                      </span>
                    </div>

                    {/* Notes/Notes summary */}
                    {sub.notes && (
                      <p className="text-[11px] text-slate-500 mt-3 line-clamp-2 leading-relaxed bg-[#121214]/40 p-2.5 rounded-lg border border-white/[0.02]">
                        {sub.notes}
                      </p>
                    )}

                    {/* Details Block */}
                    <div className="space-y-2.5 border-t border-b border-white/5 py-3.5 my-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pricing</span>
                        <div className="text-right">
                          <span className="font-extrabold text-white text-sm">
                            {sub.currency} {sub.amount.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                            per {sub.billingCycle}
                          </span>
                        </div>
                      </div>

                      {sub.currency !== localCurrency.code && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Converted Price</span>
                          <span className="font-bold text-indigo-400">
                            ~{formatCurrency(convertCurrency(sub.amount, sub.currency, localCurrency.code), localCurrency.code)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Next Renewal</span>
                        <div className="flex items-center gap-1 text-slate-300 font-bold">
                          <Calendar className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>{new Date(sub.nextBillingDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pay Method</span>
                        <span className="text-slate-400 font-semibold truncate max-w-28">{sub.paymentMethod || 'Autopay'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {sub.status === 'active' ? (
                        <button
                          onClick={() => onUpdateStatus(sub.id, 'paused')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-[10px] font-extrabold border border-amber-500/20 transition cursor-pointer"
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateStatus(sub.id, 'active')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-extrabold border border-emerald-500/20 transition cursor-pointer"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Activate
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectSubscription(sub)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-white/5 bg-[#121214] rounded-xl transition cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSafeDelete(sub)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 bg-[#121214] rounded-xl transition cursor-pointer"
                        title="Delete Tracker"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Main Table Container (hidden on mobile, shown on desktop when viewMode is 'table') */}
      {viewMode === 'table' && (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3.5 px-4">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                    <span>Subscription</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">
                  <button onClick={() => handleSort('amount')} className="flex items-center gap-1 ml-auto hover:text-white cursor-pointer">
                    <span>Price</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Cycle</th>
                <th className="py-3.5 px-4">
                  <button onClick={() => handleSort('nextBillingDate')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                    <span>Renewal Date</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Pay Mode</th>
                <th className="py-3.5 px-4">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                    <span>Status</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No matching subscriptions found. Clear filters or add a new record.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  // Status badge calculations
                  let badgeClass = 'bg-slate-800 text-slate-300 border border-white/5';
                  if (sub.status === 'active') badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                  if (sub.status === 'paused') badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                  if (sub.status === 'cancelled') badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

                  // Category styling helper
                  let catBadgeClass = 'bg-slate-800 text-slate-300 border border-white/5';
                  if (sub.category === 'Entertainment') catBadgeClass = 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20';
                  if (sub.category === 'Utilities') catBadgeClass = 'bg-amber-950/40 text-amber-300 border border-amber-500/20';
                  if (sub.category === 'Health & Fitness') catBadgeClass = 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20';
                  if (sub.category === 'Software & Services') catBadgeClass = 'bg-sky-950/40 text-sky-300 border border-sky-500/20';
                  if (sub.category === 'Financial') catBadgeClass = 'bg-rose-950/40 text-rose-300 border border-rose-500/20';

                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.01] transition">
                      
                      {/* Brand Name & Details */}
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        <div className="space-y-0.5">
                          <span className="cursor-pointer hover:text-indigo-400 transition" onClick={() => onSelectSubscription(sub)}>
                            {sub.name}
                          </span>
                          {sub.notes && (
                            <p className="text-[10px] font-normal text-slate-500 line-clamp-1 max-w-xs">{sub.notes}</p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${catBadgeClass}`}>
                          <Tag className="h-3 w-3 shrink-0" />
                          {sub.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-white">
                        <div className="space-y-0.5">
                          <div>{sub.currency} {sub.amount.toFixed(2)}</div>
                          {sub.currency !== localCurrency.code && (
                            <div className="text-[10px] font-medium text-slate-500">
                              ~{formatCurrency(convertCurrency(sub.amount, sub.currency, localCurrency.code), localCurrency.code)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Billing Cycle */}
                      <td className="py-3.5 px-4 font-semibold text-slate-400 capitalize">
                        {sub.billingCycle}
                      </td>

                      {/* Renewal Date */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{new Date(sub.nextBillingDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                      </td>

                      {/* Pay Mode */}
                      <td className="py-3.5 px-4 text-slate-400 font-semibold truncate max-w-28">
                        {sub.paymentMethod || 'Autopay'}
                      </td>

                      {/* Status badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                          {sub.status}
                        </span>
                      </td>

                      {/* Quick Inline Toggles and Modals */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Inline toggle active / pause */}
                          {sub.status === 'active' ? (
                            <button
                              onClick={() => onUpdateStatus(sub.id, 'paused')}
                              className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition cursor-pointer"
                              title="Pause Subscription"
                            >
                              <PauseCircle className="h-4 w-4" />
                            </button>
                          ) : sub.status === 'paused' ? (
                            <button
                              onClick={() => onUpdateStatus(sub.id, 'active')}
                              className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition cursor-pointer"
                              title="Activate Subscription"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStatus(sub.id, 'active')}
                              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded transition cursor-pointer"
                              title="Reactivate"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onSelectSubscription(sub)}
                            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition cursor-pointer"
                            title="Edit Subscription"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleSafeDelete(sub)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Delete Subscription"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
