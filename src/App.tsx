import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  db 
} from './lib/firebase';
import { 
  Subscription, 
  NotificationSettings, 
  Alert, 
  SubscriptionStatus 
} from './types';

// Sub-components
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import TableView from './components/TableView';
import SyncGmailModal from './components/SyncGmailModal';
import SubscriptionFormModal from './components/SubscriptionFormModal';
import NotificationsSettings from './components/NotificationsSettings';

// Icons
import { 
  LayoutDashboard, 
  Calendar, 
  Table, 
  Settings, 
  Plus, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';

const SAMPLE_SUBSCRIPTIONS: Omit<Subscription, 'id' | 'userId'>[] = [
  {
    name: 'Netflix Premium',
    amount: 22.99,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-15',
    paymentMethod: 'Visa ****4242',
    status: 'active',
    category: 'Entertainment',
    notes: 'Premium 4K ultra-HD streaming account.'
  },
  {
    name: 'Spotify Family',
    amount: 16.99,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-20',
    paymentMethod: 'Mastercard ****8811',
    status: 'active',
    category: 'Entertainment',
    notes: 'Family music plan shared with household.'
  },
  {
    name: 'OpenAI ChatGPT Plus',
    amount: 20.00,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-10',
    paymentMethod: 'Visa ****4242',
    status: 'active',
    category: 'Software & Services',
    notes: 'Premium developer access and GPT-4 model prompts.'
  },
  {
    name: 'Gold\'s Gym Membership',
    amount: 49.99,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-02',
    paymentMethod: 'Bank ACH Auto-debit',
    status: 'active',
    category: 'Health & Fitness',
    notes: 'Full region pass plus pool benefits.'
  },
  {
    name: 'Adobe Creative Cloud',
    amount: 54.99,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-28',
    paymentMethod: 'PayPal Express',
    status: 'active',
    category: 'Software & Services',
    notes: 'Photoshop, Premiere, Illustrator bundle.'
  },
  {
    name: 'ClassPass Credits',
    amount: 79.00,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-25',
    paymentMethod: 'Apple Pay',
    status: 'paused',
    category: 'Health & Fitness',
    notes: 'Paused for summer outdoor training.'
  },
  {
    name: 'AWS Cloud Micro',
    amount: 12.50,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-01',
    paymentMethod: 'Visa ****1111',
    status: 'active',
    category: 'Software & Services',
    notes: 'Personal dev sandboxes and DNS services.'
  },
  {
    name: 'High-speed Fiber Internet',
    amount: 85.00,
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: '2026-07-05',
    paymentMethod: 'Amex Card',
    status: 'active',
    category: 'Utilities',
    notes: '1 Gbps symmetrical home connection.'
  }
];

const DEFAULT_SETTINGS: NotificationSettings = {
  budgetThreshold: 150,
  enableReminders: true,
  reminderDaysBefore: 3,
  enableBudgetAlerts: true
};

export default function App() {
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'table' | 'settings'>('dashboard');
  
  // Auth states
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Core Data sets
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Modal displays
  const [isGmailSyncOpen, setIsGmailSyncOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // loading states for Firestore
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // 1. Listen for Authentication state on load
  useEffect(() => {
    initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
  }, []);

  // 2. Fetch and synchronize data sets (Switch Firestore vs LocalStorage)
  useEffect(() => {
    if (user) {
      setIsLoadingDb(true);
      const userId = user.uid;

      // Firestore Subscriptions synchronization
      const subsRef = collection(db, 'users', userId, 'subscriptions');
      const unsubSubs = onSnapshot(subsRef, (snapshot) => {
        const list: Subscription[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Subscription);
        });
        setSubscriptions(list);
        setIsLoadingDb(false);
      }, (err) => {
        console.error("Firestore loading error:", err);
        setIsLoadingDb(false);
      });

      // Firestore settings sync
      const settingsDocRef = doc(db, 'users', userId, 'settings', 'notification_rules');
      const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as NotificationSettings);
        } else {
          // pre-seed settings in DB if none
          setDoc(settingsDocRef, DEFAULT_SETTINGS).catch(console.error);
        }
      });

      // Firestore alerts sync
      const alertsRef = collection(db, 'users', userId, 'alerts');
      const unsubAlerts = onSnapshot(alertsRef, (snapshot) => {
        const list: Alert[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Alert);
        });
        // sort by date descending
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAlerts(list);
      });

      return () => {
        unsubSubs();
        unsubSettings();
        unsubAlerts();
      };
    } else {
      // Local fallback for offline / demo mode
      const localSubs = localStorage.getItem('local_subscriptions');
      const localSettings = localStorage.getItem('local_settings');
      const localAlerts = localStorage.getItem('local_alerts');

      if (localSubs) setSubscriptions(JSON.parse(localSubs));
      else setSubscriptions([]);

      if (localSettings) setSettings(JSON.parse(localSettings));
      else setSettings(DEFAULT_SETTINGS);

      if (localAlerts) {
        const alertList = JSON.parse(localAlerts);
        alertList.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAlerts(alertList);
      } else {
        setAlerts([]);
      }
    }
  }, [user]);

  // 3. Automated Smart Alerts Engine (Runs whenever subscription lists or budget thresholds change)
  useEffect(() => {
    if (subscriptions.length === 0) return;

    const activeSubs = subscriptions.filter(s => s.status === 'active');
    
    // Calculate current monthly budget consumption
    let currentMonthlySpending = 0;
    activeSubs.forEach(sub => {
      if (sub.billingCycle === 'monthly') currentMonthlySpending += sub.amount;
      else if (sub.billingCycle === 'yearly') currentMonthlySpending += sub.amount / 12;
      else if (sub.billingCycle === 'weekly') currentMonthlySpending += sub.amount * 4.33;
    });

    const isOver = currentMonthlySpending > settings.budgetThreshold && settings.budgetThreshold > 0;
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if budget alerts need to be generated
    if (isOver && settings.enableBudgetAlerts) {
      const budgetAlertMessage = `Monthly spending limit warning! Total recurring expense of $${currentMonthlySpending.toFixed(2)} exceeds your alert threshold of $${settings.budgetThreshold.toFixed(0)}.`;
      
      // Prevent duplicate warnings on the same day
      const exists = alerts.some(a => a.type === 'warning' && a.date.startsWith(todayStr) && a.message.includes('limit warning'));
      if (!exists) {
        triggerLocalOrDbAlert({
          type: 'warning',
          message: budgetAlertMessage,
          date: new Date().toISOString(),
          read: false,
          userId: user?.uid || 'guest'
        });
      }
    }

    // Check if advance billing warnings are triggered (e.g. Netflix due in 3 days)
    if (settings.enableReminders) {
      const now = new Date();
      activeSubs.forEach(sub => {
        const nextDate = new Date(sub.nextBillingDate);
        const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0 && diffDays <= settings.reminderDaysBefore) {
          const billingAlertMessage = `Advance Reminder: "${sub.name}" with recurring charge of $${sub.amount.toFixed(2)} is due in ${diffDays} days (${sub.nextBillingDate}).`;
          
          // Deduplicate billing alerts
          const exists = alerts.some(a => a.message.includes(sub.name) && a.message.includes('Reminder') && a.date.startsWith(todayStr));
          if (!exists) {
            triggerLocalOrDbAlert({
              type: 'info',
              message: billingAlertMessage,
              date: new Date().toISOString(),
              read: false,
              userId: user?.uid || 'guest'
            });
          }
        }
      });
    }

  }, [subscriptions, settings.budgetThreshold, settings.enableReminders, settings.enableBudgetAlerts]);

  // Alert trigger delegate helper
  const triggerLocalOrDbAlert = async (newAlert: Omit<Alert, 'id'>) => {
    if (user) {
      try {
        const alertsRef = collection(db, 'users', user.uid, 'alerts');
        await addDoc(alertsRef, newAlert);
      } catch (err) {
        console.error("Error creating Firestore alert:", err);
      }
    } else {
      const id = 'alert_' + Math.random().toString(36).substr(2, 9);
      const updated = [...alerts, { id, ...newAlert }];
      setAlerts(updated);
      localStorage.setItem('local_alerts', JSON.stringify(updated));
    }
  };

  // 4. CRUD operations (Dispatches to Firestore if logged in, otherwise updates client LocalStorage)
  const handleSaveSubscription = async (data: Omit<Subscription, 'id' | 'userId'> & { id?: string }) => {
    const isEdit = !!data.id;
    
    if (user) {
      const userId = user.uid;
      try {
        if (isEdit) {
          const docRef = doc(db, 'users', userId, 'subscriptions', data.id!);
          await updateDoc(docRef, { ...data, userId });
        } else {
          const colRef = collection(db, 'users', userId, 'subscriptions');
          await addDoc(colRef, { ...data, userId, createdAt: new Date().toISOString() });
        }
      } catch (error) {
        console.error("Firestore save subscription failed:", error);
      }
    } else {
      let updatedList: Subscription[] = [];
      if (isEdit) {
        updatedList = subscriptions.map(s => s.id === data.id ? { ...s, ...data } : s);
      } else {
        const newId = 'sub_' + Math.random().toString(36).substr(2, 9);
        updatedList = [...subscriptions, { id: newId, userId: 'guest', ...data }];
      }
      setSubscriptions(updatedList);
      localStorage.setItem('local_subscriptions', JSON.stringify(updatedList));
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: SubscriptionStatus) => {
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'subscriptions', id);
        await updateDoc(docRef, { status: newStatus });
      } catch (err) {
        console.error("Firestore status update failed:", err);
      }
    } else {
      const updated = subscriptions.map(s => s.id === id ? { ...s, status: newStatus } : s);
      setSubscriptions(updated);
      localStorage.setItem('local_subscriptions', JSON.stringify(updated));
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'subscriptions', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Firestore delete failed:", err);
      }
    } else {
      const updated = subscriptions.filter(s => s.id !== id);
      setSubscriptions(updated);
      localStorage.setItem('local_subscriptions', JSON.stringify(updated));
    }
  };

  const handleSaveSettings = async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'notification_rules');
        await setDoc(docRef, newSettings);
      } catch (err) {
        console.error("Firestore save settings failed:", err);
      }
    } else {
      localStorage.setItem('local_settings', JSON.stringify(newSettings));
    }
  };

  const handleMarkAlertAsRead = async (id: string) => {
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'alerts', id);
        await updateDoc(docRef, { read: true });
      } catch (err) {
        console.error("Firestore alert read status update failed:", err);
      }
    } else {
      const updated = alerts.map(a => a.id === id ? { ...a, read: true } : a);
      setAlerts(updated);
      localStorage.setItem('local_alerts', JSON.stringify(updated));
    }
  };

  const handleClearAllAlerts = async () => {
    if (user) {
      try {
        // Fetch all alerts in parallel to delete them
        const colRef = collection(db, 'users', user.uid, 'alerts');
        const snap = await getDocs(colRef);
        snap.forEach(async (docSnap) => {
          await deleteDoc(doc(db, 'users', user.uid, 'alerts', docSnap.id));
        });
      } catch (err) {
        console.error("Firestore clearing alerts failed:", err);
      }
    } else {
      setAlerts([]);
      localStorage.removeItem('local_alerts');
    }
  };

  // Google Login popup trigger
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        
        // Push local storage subscriptions up to Firestore on first sign in to merge accounts
        const localSubs = localStorage.getItem('local_subscriptions');
        if (localSubs) {
          const list: Subscription[] = JSON.parse(localSubs);
          const colRef = collection(db, 'users', result.user.uid, 'subscriptions');
          for (const sub of list) {
            await addDoc(colRef, {
              name: sub.name,
              amount: sub.amount,
              currency: sub.currency,
              billingCycle: sub.billingCycle,
              nextBillingDate: sub.nextBillingDate,
              paymentMethod: sub.paymentMethod,
              status: sub.status,
              category: sub.category,
              notes: sub.notes || '',
              userId: result.user.uid,
              createdAt: new Date().toISOString()
            });
          }
          localStorage.removeItem('local_subscriptions');
        }
      }
    } catch (err) {
      console.error('Google Sign in flow crashed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
  };

  // Load sample demo data so the app looks pre-populated immediately in trial mode
  const handleLoadSampleDemoData = () => {
    const list: Subscription[] = SAMPLE_SUBSCRIPTIONS.map((item, idx) => ({
      id: `sample_demo_${idx}`,
      userId: 'guest',
      ...item
    }));
    setSubscriptions(list);
    localStorage.setItem('local_subscriptions', JSON.stringify(list));
    
    // Add seed welcome notifications
    const sampleWelcomeAlerts: Alert[] = [
      {
        id: 'welc_01',
        type: 'success',
        message: 'Welcome to Subscription Tracker Demo! Your payment renewal cycles are now visual and projected.',
        date: new Date().toISOString(),
        read: false,
        userId: 'guest'
      }
    ];
    setAlerts(sampleWelcomeAlerts);
    localStorage.setItem('local_alerts', JSON.stringify(sampleWelcomeAlerts));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-white">
      
      {/* Master Navbar */}
      <Navbar 
        user={user}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenGmailSync={() => setIsGmailSyncOpen(true)}
        alerts={alerts}
        onMarkAlertAsRead={handleMarkAlertAsRead}
        onClearAllAlerts={handleClearAllAlerts}
        onAddSampleData={handleLoadSampleDemoData}
        hasSubscriptions={subscriptions.length > 0}
      />

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Sync Info Header */}
        {isLoadingDb && (
          <div className="bg-[#121214] border border-white/5 rounded-xl p-3 flex items-center gap-3 text-xs text-slate-400 justify-center">
            <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
            <span>Syncing database state live with Firestore...</span>
          </div>
        )}

        {/* Demo Mode Visual Indicator Banner */}
        {!user && subscriptions.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-950/40 to-indigo-900/40 border border-indigo-500/20 text-white rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-extrabold flex items-center gap-1.5 text-sm text-indigo-200">
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                Demo Trail Mode Active
              </span>
              <p className="text-indigo-200 font-medium">
                You are managing data offline in Local Storage. Sign in with Google to enable automatic Gmail email invoice scanning, live alerts, and real-time database sync.
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="bg-white hover:bg-slate-100 text-indigo-950 font-bold px-4 py-2 rounded-xl transition shadow-sm shrink-0 text-center cursor-pointer"
            >
              Secure Sync Now
            </button>
          </div>
        )}

        {/* App Empty Workspace Landing */}
        {subscriptions.length === 0 && (
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl space-y-6 my-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-indigo-950/40 text-indigo-400 p-4 rounded-2xl inline-block border border-indigo-500/30">
              <Sparkles className="h-10 w-10 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Track, Sync, and Save money</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take full control of recurring subscriptions. Never experience vampire auto-charges. Auto-scan billing cycles straight from your inbox or log accounts manually.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                onClick={() => {
                  setSelectedSubscription(null);
                  setIsFormOpen(true);
                }}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 px-6 rounded-xl shadow-lg transition cursor-pointer"
              >
                Create Manual Subscription
              </button>
              <button
                onClick={handleLoadSampleDemoData}
                className="w-full sm:w-auto bg-[#1c1c1f] hover:bg-[#252529] text-slate-300 font-bold text-xs py-3.5 px-6 rounded-xl border border-white/5 transition cursor-pointer"
              >
                Load Sample Demo Data
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation Menu */}
        {subscriptions.length > 0 && (
          <div className="space-y-6">
            
            {/* Nav Headers */}
            <div className="flex border-b border-white/5 gap-1 overflow-x-auto scrollbar-none pb-0.5">
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                  activeTab === 'dashboard' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                  activeTab === 'calendar' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Calendar Matrix</span>
              </button>

              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                  activeTab === 'table' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Table className="h-4 w-4" />
                <span>Subscriptions List</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'border-indigo-500 text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Settings & Rules</span>
              </button>

              {/* Quick floating Manual Add shortcut on the right */}
              <button
                onClick={() => {
                  setSelectedSubscription(null);
                  setIsFormOpen(true);
                }}
                className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-md cursor-pointer whitespace-nowrap self-center uppercase tracking-wider"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Sub</span>
              </button>
            </div>

            {/* Tab Views routers */}
            <div className="animate-in fade-in duration-200">
              {activeTab === 'dashboard' && (
                <DashboardView 
                  subscriptions={subscriptions}
                  settings={settings}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onOpenAddSubscription={() => {
                    setSelectedSubscription(null);
                    setIsFormOpen(true);
                  }}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView 
                  subscriptions={subscriptions}
                  onSelectSubscription={(sub) => {
                    setSelectedSubscription(sub);
                    setIsFormOpen(true);
                  }}
                />
              )}

              {activeTab === 'table' && (
                <TableView 
                  subscriptions={subscriptions}
                  onSelectSubscription={(sub) => {
                    setSelectedSubscription(sub);
                    setIsFormOpen(true);
                  }}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteSubscription={handleDeleteSubscription}
                />
              )}

              {activeTab === 'settings' && (
                <NotificationsSettings 
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  alerts={alerts}
                  onClearAllAlerts={handleClearAllAlerts}
                />
              )}
            </div>

          </div>
        )}

      </main>

      {/* Gmail scanning slideover or popup */}
      <SyncGmailModal 
        isOpen={isGmailSyncOpen}
        onClose={() => setIsGmailSyncOpen(false)}
        accessToken={token}
        onConfirmAddSubscription={handleSaveSubscription}
      />

      {/* Manual Entry popup Form */}
      <SubscriptionFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        subscription={selectedSubscription}
        onSave={handleSaveSubscription}
      />

    </div>
  );
}
