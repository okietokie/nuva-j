import { Select, Space, Typography } from "antd";
import { useCurrency } from "../context/CurrencyContext";
import { CURRENCY_OPTIONS } from "../utils/currency";

export default function CurrencySwitcher({ compact = false }) {
  const { selectedCurrency, setSelectedCurrency, ratesDate, ratesStatus } = useCurrency();

  return (
    <Space size={6} align="center">
      {!compact ? <Typography.Text type="secondary">Currency</Typography.Text> : null}
      <Select
        size={compact ? "middle" : "small"}
        value={selectedCurrency}
        onChange={setSelectedCurrency}
        options={CURRENCY_OPTIONS}
        style={{ width: compact ? 92 : 104 }}
      />
      {!compact && ratesDate ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Rates: {ratesStatus === "fallback" ? "fallback" : ratesDate}
        </Typography.Text>
      ) : null}
    </Space>
  );
}
