import "../../styles/adminCatalog.css";

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

function isMonetaryValue(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /\b(AED|USD|INR)\b/.test(value) || /[$€£¥₹]/.test(value);
}

export default function AdminKpiSection({ title, items, className = "", headerExtra = null }) {
  return (
    <section className={joinClasses("admin-kpi-section", className)}>
      {(title || headerExtra) && (
        <div className="admin-kpi-section-header">
          {title ? <h3>{title}</h3> : <span />}
          {headerExtra}
        </div>
      )}

      <div className="catalog-stats-grid">
        {items.map((item) => {
          const isMoney = isMonetaryValue(item.value);
          const valueClassName = joinClasses(
            "catalog-stat-value",
            isMoney ? "money-value" : "",
            item.valueClassName,
          );

          return (
            <article
              className={joinClasses("catalog-stat-tile", "kpi-card", isMoney ? "kpi-card-money" : "")}
              key={item.key || item.label}
            >
              <div className={joinClasses("catalog-stat-icon", "kpi-card__icon", item.tone || "total")}>
                {item.icon || null}
              </div>
              <div className={joinClasses("catalog-stat-copy", "kpi-card__content")}>
                <span>{item.label}</span>
                <strong className={valueClassName}>{item.value}</strong>
                {item.note ? <small>{item.note}</small> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
