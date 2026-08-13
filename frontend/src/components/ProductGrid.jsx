import { Empty, Skeleton } from "antd";
import ProductCard from "./storefront/ProductCard";

export default function ProductGrid({
  products,
  onAddToCart,
  loading = false,
  emptyTitle = "No products available right now."
}) {
  if (loading) {
    return (
      <div className="product-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card">
            <Skeleton.Image active style={{ width: "100%", height: 300 }} />
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="empty-panel">
        <Empty description={emptyTitle} />
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <ProductCard
          key={product._id}
          product={product}
          onAddToCart={onAddToCart}
          priority={index < 2}
        />
      ))}
    </div>
  );
}
