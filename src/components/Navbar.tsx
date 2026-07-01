import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  Bell, 
  LogOut, 
  RefreshCw, 
  Mail, 
  Sparkles, 
  Database, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { Alert } from '../types';

interface NavbarProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenGmailSync: () => void;
  alerts: Alert[];
  onMarkAlertAsRead: (id: string) => void;
  onClearAllAlerts: () => void;
  onAddSampleData: () => void;
  hasSubscriptions: boolean;
}

export default function Navbar({
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  onOpenGmailSync,
  alerts,
  onMarkAlertAsRead,
  onClearAllAlerts,
  onAddSampleData,
  hasSubscriptions,
}: NavbarProps) {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.read);

  return (
    <nav className="bg-[#121214] border-b border-white/5 sticky top-0 z-40 px-4 py-3.5 sm:px-6 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Title and Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/10">
            <Sparkles className="h-5 w-5" id="app-logo" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Subscription Hub
              <span className="text-[10px] bg-indigo-500/15 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wide hidden sm:inline-block">
                AI Driven
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Never miss a renewal with automated Gmail scanning and smart alerts
            </p>
          </div>
        </div>

        {/* Action Controls and Auth Status */}
        <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end w-full sm:w-auto">
          {user ? (
            <>
              {/* Firestore Sync Indicator */}
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold">
                <Database className="h-3.5 w-3.5 animate-pulse" />
                <span className="hidden md:inline">Sync Active</span>
              </div>

              {/* Gmail Sync Button */}
              <button
                onClick={onOpenGmailSync}
                className="flex items-center gap-2 bg-[#1c1c1f] hover:bg-[#252529] text-indigo-400 hover:text-indigo-300 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-white/5 transition shadow-md cursor-pointer"
                id="gmail-sync-btn"
                title="Connect & scan Gmail for subscription emails"
              >
                <Mail className="h-4 w-4 text-indigo-400" />
                <span>Sync Gmail</span>
              </button>

              {/* Notification Alerts Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#1c1c1f] rounded-lg border border-white/5 transition relative cursor-pointer"
                  id="notifications-bell"
                >
                  <Bell className="h-4 w-4" />
                  {unreadAlerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-md animate-bounce">
                      {unreadAlerts.length}
                    </span>
                  )}
                </button>

                {showAlertsDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-[#161619] border border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 bg-[#1c1c1f] flex items-center justify-between">
                      <span className="font-bold text-white text-xs uppercase tracking-wider">Notifications</span>
                      {alerts.length > 0 && (
                        <button 
                          onClick={onClearAllAlerts}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                      {alerts.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-500 text-xs">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                          No recent notifications.
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            onClick={() => onMarkAlertAsRead(alert.id)}
                            className={`p-3.5 hover:bg-white/[0.02] transition cursor-pointer text-xs flex gap-3 ${!alert.read ? 'bg-indigo-500/5' : ''}`}
                          >
                            {alert.type === 'warning' ? (
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            ) : alert.type === 'success' ? (
                              <Database className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className={`text-slate-300 ${!alert.read ? 'font-semibold text-white' : ''}`}>
                                {alert.message}
                              </p>
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                {new Date(alert.date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {!alert.read && (
                              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 self-center" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Image & Logout */}
              <div className="flex items-center gap-2 border-l border-white/5 pl-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User Profile'}
                    className="h-8 w-8 rounded-full border border-indigo-500/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                    {user.email?.slice(0, 2) || 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left mr-1">
                  <p className="text-xs font-bold text-slate-200 line-clamp-1">{user.displayName || 'Sub Tracker User'}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-[#1c1c1f] rounded-lg border border-white/5 transition cursor-pointer"
                  title="Sign Out"
                  id="sign-out-btn"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {!hasSubscriptions && (
                <button
                  onClick={onAddSampleData}
                  className="bg-[#1c1c1f] hover:bg-[#252529] text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-white/5 transition cursor-pointer"
                  id="sample-data-btn"
                >
                  Load Demo Mode
                </button>
              )}
              
              {/* Google Sign-In button designed precisely according to spec guidelines */}
              <button 
                onClick={onLogin} 
                className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition duration-150 cursor-pointer"
                id="google-login-btn"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0 fill-white">
                      <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
