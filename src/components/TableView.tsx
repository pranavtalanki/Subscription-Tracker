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
  AlertCircle
} from 'lucide-react';
import { Subscription, SubscriptionCategory, SubscriptionStatus } from '../types';

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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('nextBillingDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

        </div>

      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
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
                      {sub.currency} {sub.amount.toFixed(2)}
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

    </div>
  );
}
