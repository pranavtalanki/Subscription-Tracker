export type BillingCycle = 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type SubscriptionCategory = 'Entertainment' | 'Utilities' | 'Health & Fitness' | 'Software & Services' | 'Financial' | 'Other';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string; // YYYY-MM-DD
  paymentMethod: string;
  status: SubscriptionStatus;
  category: SubscriptionCategory;
  notes?: string;
  userId: string;
  createdAt?: string;
}

export interface NotificationSettings {
  budgetThreshold: number;
  enableReminders: boolean;
  reminderDaysBefore: number;
  enableBudgetAlerts: boolean;
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  date: string;
  read: boolean;
  userId: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  emailsFound: number;
  newSubscriptionsAdded: number;
  status: 'success' | 'failed';
  userId: string;
}
