import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  SUPPORTED_CURRENCIES,
  convertCurrencyAmount,
  formatCurrencyAmount,
  parseFrankfurterRates
} from "../utils/currency";

const CurrencyContext = createContext(null);
const STORAGE_KEY = "nuva_currency";
const RATES_ENDPOINT = "https://api.frankfurter.dev/v2/rates?base=AED&quotes=AED,USD,INR";

export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_CURRENCIES.includes(saved) ? saved : DEFAULT_CURRENCY;
  });
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [ratesDate, setRatesDate] = useState(null);
  const [ratesStatus, setRatesStatus] = useState("idle");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    let active = true;

    async function loadRates() {
      setRatesStatus("loading");

      try {
        const response = await fetch(RATES_ENDPOINT);
        if (!response.ok) {
          throw new Error("Unable to load rates.");
        }

        const payload = await response.json();
        if (!active) {
          return;
        }

        setRates(parseFrankfurterRates(payload));
        setRatesDate(
          Array.isArray(payload) ? payload[0]?.date || null : payload?.date || payload?.meta?.last_updated_at || null
        );
        setRatesStatus("ready");
      } catch (error) {
        if (!active) {
          return;
        }

        setRates(FALLBACK_RATES);
        setRatesStatus("fallback");
      }
    }

    loadRates();
    const intervalId = window.setInterval(loadRates, 60 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const value = useMemo(() => {
    const convertAmount = (amount, fromCurrency = DEFAULT_CURRENCY, toCurrency = selectedCurrency) =>
      convertCurrencyAmount(amount, fromCurrency, toCurrency, rates);

    const formatMoney = (amount, fromCurrency = DEFAULT_CURRENCY, toCurrency = selectedCurrency) =>
      formatCurrencyAmount(convertAmount(amount, fromCurrency, toCurrency), toCurrency);

    return {
      selectedCurrency,
      setSelectedCurrency,
      rates,
      ratesDate,
      ratesStatus,
      convertAmount,
      formatMoney,
      formatRawMoney: formatCurrencyAmount
    };
  }, [rates, ratesDate, ratesStatus, selectedCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }

  return context;
}
