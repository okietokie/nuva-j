import {
  CloseOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { Button, Drawer, Empty, Input, Skeleton } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrency } from "../../context/CurrencyContext";

function useDebouncedValue(value, delay = 220) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debounced;
}

export default function SearchPanel({ open, onClose, products, categories }) {
  const navigate = useNavigate();
  const { formatMoney } = useCurrency();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const keyword = debouncedQuery.trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    return products
      .filter((product) => {
        const haystack = [
          product.displayName,
          product.displayCategory,
          product.description,
          product.material,
          ...(product.tags || [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      })
      .slice(0, 8);
  }, [debouncedQuery, products]);

  const recentSearches = useMemo(() => {
    const saved = localStorage.getItem("nuva_recent_searches");
    return saved ? JSON.parse(saved).slice(0, 4) : [];
  }, [open]);

  const saveRecentSearch = (value) => {
    const next = [value, ...recentSearches.filter((item) => item !== value)].slice(0, 4);
    localStorage.setItem("nuva_recent_searches", JSON.stringify(next));
  };

  const goToProduct = (product) => {
    saveRecentSearch(product.displayName);
    onClose();
    navigate(`/products/${product.slug || product._id}`);
  };

  const handleKeyDown = (event) => {
    if (!results.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      goToProduct(results[activeIndex]);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="top"
      height="min(88vh, 720px)"
      closeIcon={<CloseOutlined />}
      className="search-drawer"
      title="Search NUVA"
    >
      <div className="search-panel">
        <Input
          autoFocus
          size="large"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          prefix={<SearchOutlined />}
          placeholder="Search products, categories, or styling details"
          aria-label="Search products"
        />

        {!debouncedQuery ? (
          <div className="search-grid">
            <section className="search-block">
              <h3>Recent searches</h3>
              {recentSearches.length ? (
                <div className="chip-row">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="filter-chip"
                      onClick={() => setQuery(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">Recent searches will appear here as you browse.</p>
              )}
            </section>

            <section className="search-block">
              <h3>Popular categories</h3>
              <div className="chip-row">
                {categories.slice(0, 6).map((category) => (
                  <Link
                    key={category.id || category.slug || category.name}
                    to={`/shop?category=${encodeURIComponent(category.name)}`}
                    onClick={onClose}
                    className="filter-chip"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : debouncedQuery !== query ? (
          <div className="search-loading">
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : results.length ? (
          <div className="search-results" role="listbox" aria-label="Search results">
            {results.map((product, index) => (
              <button
                key={product._id}
                type="button"
                className={`search-result ${index === activeIndex ? "is-active" : ""}`}
                onClick={() => goToProduct(product)}
              >
                <img src={product.primaryImage} alt={product.displayName} />
                <span>
                  <strong>{product.displayName}</strong>
                  <small>{product.displayCategory}</small>
                </span>
                <em>{formatMoney(product.price, product.currency || "AED")}</em>
              </button>
            ))}
          </div>
        ) : (
          <Empty description="No products matched your search yet." />
        )}

        <div className="search-footer-actions">
          <Button onClick={onClose}>Close</Button>
          <Link
            to={`/shop${query ? `?search=${encodeURIComponent(query)}` : ""}`}
            onClick={onClose}
          >
            <Button type="primary">View all results</Button>
          </Link>
        </div>
      </div>
    </Drawer>
  );
}
