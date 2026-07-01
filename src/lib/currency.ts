// Currency utility file for detecting, converting, and formatting currency based on local preferences.

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.78,
  CAD: 1.36,
  AUD: 1.50,
  JPY: 160.0,
  SGD: 1.35,
  BRL: 5.50,
  MXN: 18.0,
  CNY: 7.25,
  CHF: 0.89,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  SGD: 'S$',
  BRL: 'R$',
  MXN: '$',
  CNY: '¥',
  CHF: 'CHF',
};

/**
 * Automatically detects the user's local currency based on their timezone and locale.
 * Configured to always return INR to use Indian Rupee as the single unified standard.
 */
export function getUserLocalCurrency(): { code: string; symbol: string } {
  return { code: 'INR', symbol: '₹' };
}

/**
 * Converts an amount from one currency to another using our exchange rates.
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const normFrom = (fromCurrency || 'USD').toUpperCase();
  const normTo = (toCurrency || 'USD').toUpperCase();
  
  if (normFrom === normTo) return amount;
  
  const rateFrom = EXCHANGE_RATES[normFrom] || 1.0;
  const rateTo = EXCHANGE_RATES[normTo] || 1.0;
  
  // Convert to base (USD) first, then convert to target
  const amountInUSD = amount / rateFrom;
  return amountInUSD * rateTo;
}

/**
 * Formats an amount with the correct symbol and decimals according to the selected currency.
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const code = (currencyCode || 'USD').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || '$';
  
  // Use native Intl if possible, or manual template
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Returns list of supported currency options.
 */
export function getSupportedCurrencies(): { code: string; label: string; symbol: string }[] {
  return [
    { code: 'USD', label: 'US Dollar', symbol: '$' },
    { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
    { code: 'EUR', label: 'Euro', symbol: '€' },
    { code: 'GBP', label: 'British Pound', symbol: '£' },
    { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
    { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
    { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', label: 'Mexican Peso', symbol: '$' },
    { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
    { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  ];
}
