export const SUPPORTED_CURRENCIES = ["AED", "USD", "INR"];

export const CURRENCY_OPTIONS = [
  { value: "AED", label: "AED" },
  { value: "USD", label: "USD" },
  { value: "INR", label: "INR" }
];

export const DEFAULT_CURRENCY = "AED";

export const FALLBACK_RATES = {
  AED: 1,
  USD: 1 / 3.6725,
  INR: 26.12
};

const CURRENCY_LOCALES = {
  AED: "en-AE",
  USD: "en-US",
  INR: "en-IN"
};

function getSafeCurrency(code) {
  const normalized = String(code || DEFAULT_CURRENCY).toUpperCase();
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : DEFAULT_CURRENCY;
}

function getSafeRateMap(rates = {}) {
  return {
    AED: Number(rates.AED || FALLBACK_RATES.AED),
    USD: Number(rates.USD || FALLBACK_RATES.USD),
    INR: Number(rates.INR || FALLBACK_RATES.INR)
  };
}

export function convertCurrencyAmount(amount, fromCurrency = DEFAULT_CURRENCY, toCurrency = DEFAULT_CURRENCY, rates = FALLBACK_RATES) {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount)) {
    return 0;
  }

  const from = getSafeCurrency(fromCurrency);
  const to = getSafeCurrency(toCurrency);
  if (from === to) {
    return Number(numericAmount.toFixed(2));
  }

  const safeRates = getSafeRateMap(rates);
  const aedAmount = from === "AED" ? numericAmount : numericAmount / safeRates[from];
  const converted = to === "AED" ? aedAmount : aedAmount * safeRates[to];

  return Number(converted.toFixed(2));
}

export function formatCurrencyAmount(amount, currency = DEFAULT_CURRENCY) {
  const safeCurrency = getSafeCurrency(currency);
  const numericAmount = Number(amount || 0);
  const absoluteAmount = Math.abs(numericAmount);
  const formattedNumber = new Intl.NumberFormat(CURRENCY_LOCALES[safeCurrency] || "en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(absoluteAmount);

  if (numericAmount < 0) {
    return `- ${safeCurrency} ${formattedNumber}`;
  }

  return `${safeCurrency} ${formattedNumber}`;
}

export function parseFrankfurterRates(payload) {
  const nextRates = { ...FALLBACK_RATES };

  if (Array.isArray(payload)) {
    payload.forEach((entry) => {
      const quote = getSafeCurrency(entry?.quote);
      const rate = Number(entry?.rate);
      if (Number.isFinite(rate) && rate > 0) {
        nextRates[quote] = rate;
      }
    });
    return nextRates;
  }

  if (payload?.rates && typeof payload.rates === "object") {
    Object.entries(payload.rates).forEach(([quote, rate]) => {
      const safeQuote = getSafeCurrency(quote);
      const numericRate = Number(rate);
      if (Number.isFinite(numericRate) && numericRate > 0) {
        nextRates[safeQuote] = numericRate;
      }
    });
  }

  return nextRates;
}
