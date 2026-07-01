import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  ChevronRight, 
  Download, 
  CheckCircle,
  FileText,
  Percent,
  Sparkles,
  PieChart
} from 'lucide-react';
import { Subscription, NotificationSettings } from '../types';

interface DashboardViewProps {
  subscriptions: Subscription[];
  settings: NotificationSettings;
  onNavigateToTab: (tab: 'calendar' | 'table') => void;
  onOpenAddSubscription: () => void;
}

export default function DashboardView({
  subscriptions,
  settings,
  onNavigateToTab,
  onOpenAddSubscription,
}: DashboardViewProps) {
  
  // 1. Calculations
  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions]);
  
  const metrics = useMemo(() => {
    let monthlyTotal = 0;
    let yearlyTotal = 0;
    
    activeSubs.forEach(sub => {
      let subMonthly = 0;
      let subYearly = 0;
      
      if (sub.billingCycle === 'monthly') {
        subMonthly = sub.amount;
        subYearly = sub.amount * 12;
      } else if (sub.billingCycle === 'yearly') {
        subMonthly = sub.amount / 12;
        subYearly = sub.amount;
      } else if (sub.billingCycle === 'weekly') {
        subMonthly = sub.amount * 4.33;
        subYearly = sub.amount * 52;
      }
      
      monthlyTotal += subMonthly;
      yearlyTotal += subYearly;
    });
    
    return {
      monthly: Math.round(monthlyTotal * 100) / 100,
      yearly: Math.round(yearlyTotal * 100) / 100
    };
  }, [activeSubs]);

  // 2. Category Breakdown
  const categoryData = useMemo(() => {
    const categories: Record<string, { amount: number; color: string; count: number }> = {
      'Entertainment': { amount: 0, color: 'bg-indigo-500 text-indigo-500 fill-indigo-500', count: 0 },
      'Utilities': { amount: 0, color: 'bg-amber-500 text-amber-500 fill-amber-500', count: 0 },
      'Health & Fitness': { amount: 0, color: 'bg-emerald-500 text-emerald-500 fill-emerald-500', count: 0 },
      'Software & Services': { amount: 0, color: 'bg-sky-500 text-sky-500 fill-sky-500', count: 0 },
      'Financial': { amount: 0, color: 'bg-rose-500 text-rose-500 fill-rose-500', count: 0 },
      'Other': { amount: 0, color: 'bg-slate-400 text-slate-400 fill-slate-400', count: 0 },
    };

    activeSubs.forEach(sub => {
      let subMonthly = 0;
      if (sub.billingCycle === 'monthly') subMonthly = sub.amount;
      else if (sub.billingCycle === 'yearly') subMonthly = sub.amount / 12;
      else if (sub.billingCycle === 'weekly') subMonthly = sub.amount * 4.33;

      if (categories[sub.category]) {
        categories[sub.category].amount += subMonthly;
        categories[sub.category].count += 1;
      } else {
        categories['Other'].amount += subMonthly;
        categories['Other'].count += 1;
      }
    });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        monthlyAmount: Math.round(data.amount * 100) / 100,
        color: data.color,
        count: data.count,
        percentage: metrics.monthly > 0 ? Math.round((data.amount / metrics.monthly) * 100) : 0
      }))
      .filter(cat => cat.monthlyAmount > 0)
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
  }, [activeSubs, metrics.monthly]);

  // 3. Upcoming Renewals (next 5)
  const upcomingRenewals = useMemo(() => {
    const now = new Date();
    return activeSubs
      .map(sub => {
        const nextDate = new Date(sub.nextBillingDate);
        const diffTime = nextDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          ...sub,
          daysRemaining: diffDays
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }, [activeSubs]);

  // 4. Budget progress
  const budgetPercentage = useMemo(() => {
    if (settings.budgetThreshold <= 0) return 0;
    return Math.min(Math.round((metrics.monthly / settings.budgetThreshold) * 100), 100);
  }, [metrics.monthly, settings.budgetThreshold]);

  const isOverBudget = metrics.monthly > settings.budgetThreshold && settings.budgetThreshold > 0;

  // 5. Export Report Functionality
  const triggerExport = (format: 'csv' | 'report') => {
    if (subscriptions.length === 0) {
      alert("No subscription data available to export.");
      return;
    }

    let fileContent = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'csv') {
      const headers = 'Name,Amount,Currency,Billing Cycle,Next Billing Date,Payment Method,Status,Category,Notes\n';
      const rows = subscriptions.map(sub => 
        `"${sub.name.replace(/"/g, '""')}",${sub.amount},"${sub.currency}","${sub.billingCycle}","${sub.nextBillingDate}","${sub.paymentMethod.replace(/"/g, '""')}","${sub.status}","${sub.category}","${(sub.notes || '').replace(/"/g, '""')}"`
      ).join('\n');
      fileContent = headers + rows;
      fileName = 'subscriptions_export_2026.csv';
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      // Elegant text-based analytical report
      const nowStr = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
      const catSummary = categoryData.map(c => ` - ${c.name}: $${c.monthlyAmount.toFixed(2)}/mo (${c.percentage}%)`).join('\n');
      const activeList = activeSubs.map(s => ` - ${s.name}: $${s.amount.toFixed(2)} (${s.billingCycle}) renewal on ${s.nextBillingDate}`).join('\n');
      
      fileContent = `=====================================================
SUBSCRIPTION SPENDING ANALYTICS REPORT
Generated on: ${nowStr}
=====================================================

OVERVIEW SUMMARY
-----------------------------------------------------
Total Subscriptions Tracked: ${subscriptions.length}
Active Subscriptions: ${activeSubs.length}
Total Estimated Monthly Expense: $${metrics.monthly.toFixed(2)}
Total Estimated Annual Expense: $${metrics.yearly.toFixed(2)}
Budget Threshold Limit: $${settings.budgetThreshold > 0 ? settings.budgetThreshold.toFixed(2) : 'No Limit Set'}
Budget Compliance Status: ${isOverBudget ? '⚠️ EXCEEDED BUDGET LIMIT' : '✅ COMPLIANT WITH BUDGET'}

CATEGORY SPENDING BREAKDOWN (Monthly Equivalent)
-----------------------------------------------------
${catSummary || 'No spending recorded yet.'}

ACTIVE SUBSCRIPTIONS DETAILS
-----------------------------------------------------
${activeList || 'No active subscriptions recorded.'}

-----------------------------------------------------
SMART INSIGHTS & SAVING TIPS
${isOverBudget ? '• ALERT: You are spending $' + (metrics.monthly - settings.budgetThreshold).toFixed(2) + ' more than your target budget. Consider pausing or cancelling lower priority entertainment accounts.' : '• Good job! Your monthly subscriptions are fully within your preset budget limits.'}
• Regularly audit services you haven't logged into for more than 30 days to avoid "vampire" charges.
• Share family billing plans where permitted to cut costs by up to 50%.
=====================================================`;
      fileName = 'subscription_spending_habits_report.txt';
      mimeType = 'text/plain;charset=utf-8;';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Monthly Expense Card */}
        <div className="bg-[#121214] border border-white/5 p-5 rounded-2xl shadow-xl flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Spending</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight">${metrics.monthly.toFixed(2)}</span>
              <span className="text-xs text-slate-500 font-semibold">/mo</span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
              <span>Recurring active charges</span>
            </p>
          </div>
          <div className="bg-indigo-500/10 text-indigo-400 p-4 rounded-xl border border-indigo-500/20">
            <DollarSign className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Yearly Expense Card */}
        <div className="bg-[#121214] border border-white/5 p-5 rounded-2xl shadow-xl flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yearly Spending</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight">${metrics.yearly.toFixed(2)}</span>
              <span className="text-xs text-slate-500 font-semibold">/yr</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Equivalent value over 12 months
            </p>
          </div>
          <div className="bg-violet-500/10 text-violet-400 p-4 rounded-xl border border-violet-500/20">
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Budget Status Card */}
        <div className={`bg-[#121214] border p-5 rounded-2xl shadow-xl flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 ${isOverBudget ? 'border-red-500/30 bg-red-950/10' : 'border-white/5'}`}>
          <div className="space-y-1 w-full">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Budget Threshold</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                ${settings.budgetThreshold > 0 ? settings.budgetThreshold.toFixed(0) : '—'}
              </span>
              <span className="text-xs text-slate-500 font-semibold">limit</span>
            </div>
            
            {settings.budgetThreshold > 0 ? (
              <div className="space-y-1.5 pt-1.5">
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>{budgetPercentage}% used</span>
                  <span className={isOverBudget ? 'text-red-400 font-extrabold' : 'text-emerald-400'}>{isOverBudget ? '⚠️ Over Budget' : 'Within budget'}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">No budget alert limit configured</p>
            )}
          </div>
        </div>

      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Category Breakdown & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Spend Breakdown Graph */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Monthly Category Distribution</h3>
              </div>
              <span className="text-[10px] text-indigo-300 bg-indigo-500/15 font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {categoryData.length} Categories active
              </span>
            </div>

            {categoryData.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No active subscriptions to calculate category weights. Click <b>Add Subscription</b> to begin.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* SVG Donut Chart */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-44 h-44">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {/* Base Circle */}
                      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                      
                      {/* Dynamic segments */}
                      {(() => {
                        let accumPercent = 0;
                        const radius = 38;
                        const circumference = 2 * Math.PI * radius; // ~238.76
                        
                        return categoryData.map((cat, i) => {
                          const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -((accumPercent / 100) * circumference);
                          accumPercent += cat.percentage;
                          
                          // Convert classes into simple SVG fill hex/colors
                          let strokeColor = '#94a3b8'; // Other
                          if (cat.name === 'Entertainment') strokeColor = '#6366f1';
                          if (cat.name === 'Utilities') strokeColor = '#f59e0b';
                          if (cat.name === 'Health & Fitness') strokeColor = '#10b981';
                          if (cat.name === 'Software & Services') strokeColor = '#0ea5e9';
                          if (cat.name === 'Financial') strokeColor = '#f43f5e';
                          
                          return (
                            <circle
                              key={cat.name}
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="12"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-300"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Total</span>
                      <span className="text-xl font-extrabold text-white">${metrics.monthly.toFixed(0)}</span>
                      <span className="text-[9px] text-slate-400 font-semibold">/ month</span>
                    </div>
                  </div>
                </div>

                {/* Progress breakdown bars */}
                <div className="md:col-span-7 space-y-3.5">
                  {categoryData.map((cat) => {
                    let pillColor = 'bg-slate-400';
                    if (cat.name === 'Entertainment') pillColor = 'bg-indigo-500';
                    if (cat.name === 'Utilities') pillColor = 'bg-amber-500';
                    if (cat.name === 'Health & Fitness') pillColor = 'bg-emerald-500';
                    if (cat.name === 'Software & Services') pillColor = 'bg-sky-500';
                    if (cat.name === 'Financial') pillColor = 'bg-rose-500';

                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${pillColor}`} />
                            <span className="font-semibold text-slate-300">{cat.name}</span>
                          </div>
                          <span className="text-slate-200 font-semibold">
                            ${cat.monthlyAmount.toFixed(2)} <span className="text-[10px] text-slate-500">({cat.percentage}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${pillColor}`} style={{ width: `${cat.percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

          {/* Export summary habits panel */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Download className="h-4 w-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Reports & Data Exports</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#1c1c1f] border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-500/25 transition duration-150">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/10">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-xs text-white">CSV Spreadsheet Export</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Download a full raw record of all tracked accounts, payment history details, and status logs to edit in Excel or Google Sheets.
                  </p>
                </div>
                <button
                  onClick={() => triggerExport('csv')}
                  className="mt-4 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg shadow-sm transition duration-150 cursor-pointer w-full"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .CSV Spreadsheet</span>
                </button>
              </div>

              <div className="bg-[#1c1c1f] border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-violet-500/25 transition duration-150">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="bg-violet-500/10 text-violet-400 p-1.5 rounded-lg border border-violet-500/10">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-xs text-white">Visual Spend Habits Report</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Generate an offline analytical text-based audit summarizing billing health and actionable financial budgeting suggestions.
                  </p>
                </div>
                <button
                  onClick={() => triggerExport('report')}
                  className="mt-4 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg shadow-sm transition duration-150 cursor-pointer w-full"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Export Analytical Report</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Upcoming Renewals & Budget Alerts */}
        <div className="space-y-6">
          
          {/* Budget Health and Alerts Panel */}
          {isOverBudget && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl p-4 shadow-xl space-y-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-red-300">Budget Warning</h4>
              </div>
              <p className="text-xs leading-relaxed text-red-200/90">
                Your current monthly commitment of <b>${metrics.monthly.toFixed(2)}</b> exceeds your alert threshold of <b>${settings.budgetThreshold.toFixed(0)}</b>. 
              </p>
              <div className="bg-red-950/40 p-2.5 rounded-xl border border-red-500/10 text-[11px] font-medium text-red-200 space-y-1">
                <span className="font-bold text-[10px] text-red-400 block uppercase">Saving Recommendation:</span>
                • Audit your <b>Entertainment</b> category. Canceling or pausing just one minor subscription could instantly align your budget.
              </div>
            </div>
          )}

          {/* Upcoming Renewals Widget */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Upcoming Billing Dates</h3>
              </div>
              <button 
                onClick={() => onNavigateToTab('calendar')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
              >
                <span>Full Calendar</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {upcomingRenewals.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No upcoming billing dates to track. Add subscription details to populate.
                </div>
              ) : (
                upcomingRenewals.map((sub) => {
                  let badgeColor = 'bg-[#1c1c1f] text-slate-400 border border-white/5';
                  let diffLabel = '';

                  if (sub.daysRemaining === 0) {
                    badgeColor = 'bg-red-500/15 text-red-400 font-bold border border-red-500/25';
                    diffLabel = 'Today';
                  } else if (sub.daysRemaining === 1) {
                    badgeColor = 'bg-amber-500/15 text-amber-400 border border-amber-500/25';
                    diffLabel = 'Tomorrow';
                  } else if (sub.daysRemaining < 0) {
                    badgeColor = 'bg-red-950/40 text-red-400 border border-red-500/10';
                    diffLabel = 'Passed';
                  } else if (sub.daysRemaining <= 3) {
                    badgeColor = 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
                    diffLabel = `In ${sub.daysRemaining} days`;
                  } else {
                    badgeColor = 'bg-[#1c1c1f] text-slate-400 border border-white/5';
                    diffLabel = `In ${sub.daysRemaining} days`;
                  }

                  return (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-[#1c1c1f] hover:bg-white/[0.02] border border-white/5 rounded-xl transition duration-150">
                      <div className="space-y-0.5 max-w-[60%]">
                        <p className="font-bold text-xs text-white truncate">{sub.name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span className="font-bold text-indigo-400 capitalize">{sub.billingCycle}</span>
                          <span>•</span>
                          <span className="truncate">{sub.paymentMethod || 'Autopay'}</span>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <span className="font-extrabold text-xs text-white block">
                          ${sub.amount.toFixed(2)}
                        </span>
                        <span className={`inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold ${badgeColor}`}>
                          {diffLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Subscription Analytics</h3>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-center">
              <div className="bg-[#1c1c1f] border border-white/5 p-3 rounded-xl">
                <span className="text-lg font-extrabold text-white block">
                  {subscriptions.length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracked Items</span>
              </div>

              <div className="bg-[#1c1c1f] border border-white/5 p-3 rounded-xl">
                <span className="text-lg font-extrabold text-emerald-400 block">
                  {activeSubs.length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Bills</span>
              </div>

              <div className="bg-[#1c1c1f] border border-white/5 p-3 rounded-xl">
                <span className="text-lg font-extrabold text-amber-400 block">
                  {subscriptions.filter(s => s.status === 'paused').length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paused Bills</span>
              </div>

              <div className="bg-[#1c1c1f] border border-white/5 p-3 rounded-xl">
                <span className="text-lg font-extrabold text-rose-400 block">
                  {subscriptions.filter(s => s.status === 'cancelled').length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cancelled Bills</span>
              </div>
            </div>

            <button
              onClick={onOpenAddSubscription}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 rounded-xl transition duration-150 shadow-md cursor-pointer"
            >
              Add New Subscription
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
