import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  AlertTriangle, 
  Check, 
  HelpCircle,
  TrendingDown,
  MailCheck,
  CreditCard,
  Save,
  CheckCircle2
} from 'lucide-react';
import { NotificationSettings, Alert } from '../types';

interface NotificationsSettingsProps {
  settings: NotificationSettings;
  onSaveSettings: (settings: NotificationSettings) => void;
  alerts: Alert[];
  onClearAllAlerts: () => void;
}

export default function NotificationsSettings({
  settings,
  onSaveSettings,
  alerts,
  onClearAllAlerts,
}: NotificationsSettingsProps) {
  
  const [budgetThreshold, setBudgetThreshold] = useState(settings.budgetThreshold);
  const [enableReminders, setEnableReminders] = useState(settings.enableReminders);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(settings.reminderDaysBefore);
  const [enableBudgetAlerts, setEnableBudgetAlerts] = useState(settings.enableBudgetAlerts);
  
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setBudgetThreshold(settings.budgetThreshold);
    setEnableReminders(settings.enableReminders);
    setReminderDaysBefore(settings.reminderDaysBefore);
    setEnableBudgetAlerts(settings.enableBudgetAlerts);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      budgetThreshold: Number(budgetThreshold),
      enableReminders,
      reminderDaysBefore: Number(reminderDaysBefore),
      enableBudgetAlerts,
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Settings Form panel */}
      <div className="lg:col-span-2 bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="border-b border-white/5 pb-3 flex items-center gap-2">
          <Settings className="h-4 w-4 text-indigo-400" />
          <h3 className="font-bold text-white text-sm">Alert Rules & Budgeting Targets</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {isSaved && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Notification settings successfully saved!</span>
            </div>
          )}

          {/* Budget Limit Config */}
          <div className="bg-[#1c1c1f] border border-white/5 p-4 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white text-xs">Monthly Expense Cap Limit</span>
                <p className="text-[10px] text-slate-400">
                  Receive visual budget warnings on your dashboard if the combined cost of active accounts exceeds this cap.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <div className="relative max-w-44">
                <div className="absolute left-3.5 top-2.5 text-slate-500 font-bold">$</div>
                <input
                  type="number"
                  value={budgetThreshold}
                  onChange={(e) => setBudgetThreshold(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 bg-[#121214] border border-white/5 rounded-lg font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-500">USD per month (0 to disable)</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1.5">
              <input
                type="checkbox"
                checked={enableBudgetAlerts}
                onChange={(e) => setEnableBudgetAlerts(e.target.checked)}
                className="rounded border-white/10 bg-[#121214] text-indigo-500 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
              />
              <span className="font-semibold text-slate-300">Trigger active warnings when nearing limit</span>
            </label>
          </div>

          {/* Billing reminder dates config */}
          <div className="bg-[#1c1c1f] border border-white/5 p-4 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <Bell className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white text-xs">Advance Billing Reminders</span>
                <p className="text-[10px] text-slate-400">
                  Notify me in the notification menu several days prior to actual automatic renewal charges.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={enableReminders}
                onChange={(e) => setEnableReminders(e.target.checked)}
                className="rounded border-white/10 bg-[#121214] text-indigo-500 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
              />
              <span className="font-semibold text-slate-300">Enable pre-charge advance notifications</span>
            </label>

            {enableReminders && (
              <div className="pt-2 flex items-center gap-2 pl-6 animate-in slide-in-from-left-2 duration-150">
                <span className="text-[10px] text-slate-400 font-semibold">Remind me</span>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={reminderDaysBefore}
                  onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                  className="w-14 text-center bg-[#121214] border border-white/5 rounded-lg p-1.5 font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-semibold">days prior to next billing date</span>
              </div>
            )}
          </div>

          {/* Save Action */}
          <button
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Rules Configurations</span>
          </button>

        </form>
      </div>

      {/* Right Column - Recent triggers statistics */}
      <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="border-b border-white/5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Notifications Audit</h3>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={onClearAllAlerts}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[#1c1c1f] border border-white/5 p-4 rounded-xl space-y-1 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Alerts Triggered</span>
            <span className="text-3xl font-extrabold text-white block">
              {alerts.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {alerts.filter(a => !a.read).length} unread notifications
            </span>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Audits Feed</span>
            
            <div className="max-h-[350px] overflow-y-auto divide-y divide-white/5 space-y-2.5 pr-1">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No billing warnings or threshold events have been triggered yet.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="pt-2 text-xs flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <div className="space-y-0.5 flex-1">
                      <p className="text-slate-200 leading-relaxed font-semibold">{alert.message}</p>
                      <span className="text-[9px] text-slate-500 block font-medium">
                        {new Date(alert.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
