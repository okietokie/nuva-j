import { Select, Space, Typography } from "antd";
import { useCurrency } from "../context/CurrencyContext";
import { CURRENCY_OPTIONS } from "../utils/currency";

export default function CurrencySwitcher({ compact = false, navbar = false }) {
  const { selectedCurrency, setSelectedCurrency, ratesDate, ratesStatus } = useCurrency();

  return (
    <Space size={6} align="center" className={navbar ? "currency-switcher-navbar" : ""}>
      {!compact && !navbar ? <Typography.Text type="secondary">Currency</Typography.Text> : null}
      <Select
        size={compact ? "middle" : "small"}
        value={selectedCurrency}
        onChange={setSelectedCurrency}
        options={CURRENCY_OPTIONS}
        suffixIcon={navbar ? undefined : undefined}
        style={{ width: compact ? 106 : 104 }}
        dropdownRender={(menu) => (
          <div>
            {menu}
            {ratesDate ? (
              <div className="currency-dropdown-note">
                <Typography.Text type="secondary">
                  Rates: {ratesStatus === "fallback" ? "fallback" : ratesDate}
                </Typography.Text>
              </div>
            ) : null}
          </div>
        )}
      />
      {!compact && !navbar && ratesDate ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Rates: {ratesStatus === "fallback" ? "fallback" : ratesDate}
        </Typography.Text>
      ) : null}
    </Space>
  );
}
