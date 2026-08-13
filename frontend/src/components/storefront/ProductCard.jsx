import {
  EyeOutlined,
  HeartFilled,
  HeartOutlined,
  ShoppingOutlined
} from "@ant-design/icons";
import { Button, Tag } from "antd";
import { Link } from "react-router-dom";
import { useCurrency } from "../../context/CurrencyContext";
import { useWishlist } from "../../context/WishlistContext";

export default function ProductCard({ product, onAddToCart, priority = false }) {
  const { formatMoney } = useCurrency();
  const { isSaved, toggleWishlist } = useWishlist();
  const soldOut = !product.allowBackorder && product.stock <= 0;
  const saved = isSaved(product._id);
  const productUrl = `/products/${product.slug || product._id}`;
  const secondaryImage = product.images?.find((image) => image.url !== product.primaryImage)?.url;

  return (
    <article className="product-card">
      <div className="product-card-media">
        <Link to={productUrl} className="product-card-link" aria-label={product.displayName}>
          <img
            src={product.primaryImage}
            alt={product.displayName}
            className="product-card-image"
            loading={priority ? "eager" : "lazy"}
          />
          {secondaryImage ? (
            <img
              src={secondaryImage}
              alt=""
              aria-hidden="true"
              className="product-card-image product-card-image-secondary"
              loading="lazy"
            />
          ) : null}
        </Link>

        <div className="product-card-badges">
          {product.displayCategory ? <Tag>{product.displayCategory}</Tag> : null}
          {product.isNewArrival ? <Tag color="green">New</Tag> : null}
          {product.isFeatured ? <Tag color="gold">Featured</Tag> : null}
          {soldOut ? <Tag color="default">Sold Out</Tag> : null}
        </div>

        <button
          type="button"
          className={`wishlist-button ${saved ? "is-active" : ""}`}
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => toggleWishlist(product)}
        >
          {saved ? <HeartFilled /> : <HeartOutlined />}
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-card-copy">
          <p className="product-card-category">{product.displayCategory}</p>
          <Link to={productUrl} className="product-card-title">
            {product.displayName}
          </Link>
          <p className="product-card-price">
            {formatMoney(product.price, product.currency || "AED")}
          </p>
          <p className="product-card-status">{product.stockStatus}</p>
        </div>

        <div className="product-card-actions">
          <Link to={productUrl}>
            <Button icon={<EyeOutlined />} size="large">
              View
            </Button>
          </Link>
          <Button
            type="primary"
            size="large"
            icon={<ShoppingOutlined />}
            disabled={soldOut}
            onClick={() => onAddToCart(product)}
          >
            {soldOut ? "Unavailable" : "Quick Add"}
          </Button>
        </div>
      </div>
    </article>
  );
}
