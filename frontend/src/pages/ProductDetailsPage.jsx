import {
  HeartFilled,
  HeartOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
  RightOutlined
} from "@ant-design/icons";
import { Button, Empty, Image, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useOutletContext, useParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useWishlist } from "../context/WishlistContext";
import { getProduct } from "../services/productService";

function clampQuantity(value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }

  return Math.max(1, Math.min(max, Math.floor(numeric)));
}

export default function ProductDetailsPage() {
  const { productSlug } = useParams();
  const location = useLocation();
  const { products } = useOutletContext();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState("");
  const [addState, setAddState] = useState("idle");
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { formatMoney } = useCurrency();
  const { isSaved, toggleWishlist } = useWishlist();

  useEffect(() => {
    const previewId = new URLSearchParams(location.search).get("preview");

    async function requestProduct() {
      try {
        const nextProduct =
          previewId && isAdmin
            ? await getProduct(previewId, { admin: true })
            : await getProduct(productSlug);
        setProduct(nextProduct);
        setActiveImage(nextProduct.primaryImage);
      } catch (error) {
        setProduct(null);
      }
    }

    requestProduct();
  }, [isAdmin, location.search, productSlug]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const saved = JSON.parse(localStorage.getItem("nuva_recently_viewed") || "[]");
    const next = [product, ...saved.filter((item) => item._id !== product._id)].slice(0, 4);
    localStorage.setItem("nuva_recently_viewed", JSON.stringify(next));
  }, [product]);

  useEffect(() => {
    if (addState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setAddState("idle"), addState === "success" ? 1400 : 700);
    return () => window.clearTimeout(timeoutId);
  }, [addState]);

  const relatedProducts = useMemo(
    () =>
      products
        .filter(
          (item) =>
            item._id !== product?._id &&
            (item.categoryId === product?.categoryId ||
              item.displayCategory === product?.displayCategory)
        )
        .slice(0, 4),
    [product, products]
  );

  const recentlyViewed = useMemo(() => {
    const saved = JSON.parse(localStorage.getItem("nuva_recently_viewed") || "[]");
    return saved.filter((item) => item._id !== product?._id).slice(0, 4);
  }, [product]);

  const siblingVariants = useMemo(
    () =>
      product?.variantCode
        ? products.filter(
            (item) =>
              item._id !== product._id &&
              item.variantCode &&
              item.variantCode === product.variantCode
          )
        : [],
    [product, products]
  );

  if (!product) {
    return (
      <div className="store-page">
        <div className="empty-panel">
          <Empty description="We could not load this product." />
        </div>
      </div>
    );
  }

  const soldOut = !product.allowBackorder && product.stock <= 0;
  const maxQuantity = Math.max(product.stock || 1, 1);
  const gallery = product.images?.length
    ? product.images
    : [{ url: product.primaryImage, alt: product.displayName }];
  const imageIndex = Math.max(
    0,
    gallery.findIndex((image) => image.url === activeImage)
  );
  const detailRows = [
    product.material ? { label: "Material", value: product.material } : null,
    product.color ? { label: "Colour", value: product.color } : null,
    product.size ? { label: "Size", value: product.size } : null,
    product.weight ? { label: "Weight", value: product.weight } : null
  ].filter(Boolean);

  const handleQuantityChange = (nextValue) => {
    setQuantity(clampQuantity(nextValue, maxQuantity));
  };

  const handleAddToCart = () => {
    if (soldOut || addState === "loading") {
      return;
    }

    setAddState("loading");
    addToCart(product, quantity);
    setAddState("success");
  };

  const showPrevImage = () => {
    const nextIndex = (imageIndex - 1 + gallery.length) % gallery.length;
    setActiveImage(gallery[nextIndex].url);
  };

  const showNextImage = () => {
    const nextIndex = (imageIndex + 1) % gallery.length;
    setActiveImage(gallery[nextIndex].url);
  };

  return (
    <div className="store-page store-page--pdp">
      <div className="pdp-layout">
        <section className="pdp-gallery" aria-label="Product image gallery">
          <div className="pdp-main-image">
            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  className="pdp-gallery-nav pdp-gallery-nav-prev"
                  onClick={showPrevImage}
                  aria-label="Show previous product image"
                >
                  <LeftOutlined />
                </button>
                <button
                  type="button"
                  className="pdp-gallery-nav pdp-gallery-nav-next"
                  onClick={showNextImage}
                  aria-label="Show next product image"
                >
                  <RightOutlined />
                </button>
              </>
            ) : null}
            <Image
              src={activeImage || product.primaryImage}
              alt={product.displayName}
              preview
            />
          </div>

          {gallery.length > 1 ? (
            <div className="pdp-thumbs" aria-label="Product image thumbnails">
              {gallery.map((image, index) => (
                <button
                  key={image.id || image.url}
                  type="button"
                  className={`pdp-thumb ${activeImage === image.url ? "is-active" : ""}`}
                  onClick={() => setActiveImage(image.url)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img src={image.url} alt={image.alt || product.displayName} />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="pdp-copy">
          <div className="pdp-primary">
            <span className="section-kicker">{product.displayCategory}</span>
            <h1>{product.displayName}</h1>
            <p className="pdp-price">{formatMoney(product.price, product.currency || "AED")}</p>

            <div className="pdp-meta-row">
              {product.material ? <Tag className="pdp-tag">{product.material}</Tag> : null}
              {product.color ? <Tag className="pdp-tag">{product.color}</Tag> : null}
              <Tag className={`pdp-tag pdp-tag-stock ${soldOut ? "is-sold-out" : "is-stock"}`}>
                {soldOut ? "Sold Out" : product.stockStatus}
              </Tag>
            </div>

            {siblingVariants.length ? (
              <div className="pdp-variant-row">
                {siblingVariants.map((item) => (
                  <Link
                    key={item._id}
                    to={`/products/${item.slug || item._id}`}
                    className="filter-chip"
                  >
                    {item.variantName || item.color || item.displayName}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="pdp-purchase-grid">
              <div className="pdp-quantity-group" aria-label="Quantity selector">
                <span className="visually-hidden">Quantity</span>
                <button
                  type="button"
                  className="pdp-quantity-button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  <MinusOutlined />
                </button>
                <span className="pdp-quantity-value" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="pdp-quantity-button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  aria-label="Increase quantity"
                  disabled={quantity >= maxQuantity}
                >
                  <PlusOutlined />
                </button>
              </div>

              <Button
                type="primary"
                size="large"
                className="pdp-add-button"
                disabled={soldOut || addState === "loading"}
                loading={addState === "loading"}
                onClick={handleAddToCart}
              >
                {soldOut ? "Unavailable" : addState === "success" ? "Added to Cart" : "Add to Cart"}
              </Button>

              <Button
                size="large"
                className="pdp-wishlist-button"
                icon={isSaved(product._id) ? <HeartFilled /> : <HeartOutlined />}
                onClick={() => toggleWishlist(product)}
                aria-label={isSaved(product._id) ? "Remove from wishlist" : "Add to wishlist"}
              />
            </div>
          </div>

          <div className="pdp-section">
            <h3>Delivery information</h3>
            <p className="muted-copy">
              Delivery charges and the estimated delivery date will be calculated at checkout.
            </p>
          </div>

          {detailRows.length ? (
            <div className="pdp-section">
              <h3>Product Details</h3>
              <dl className="pdp-detail-list">
                {detailRows.map((item) => (
                  <div key={item.label} className="pdp-detail-row">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {product.description ? <p className="pdp-detail-copy">{product.description}</p> : null}
            </div>
          ) : product.description ? (
            <div className="pdp-section">
              <h3>Product Details</h3>
              <p className="pdp-detail-copy">{product.description}</p>
            </div>
          ) : null}

          {product.careInstructions ? (
            <div className="pdp-section">
              <h3>Care</h3>
              <p className="muted-copy">{product.careInstructions}</p>
            </div>
          ) : null}
        </section>
      </div>

      {relatedProducts.length ? (
        <section>
          <div className="section-header">
            <div>
              <span className="section-kicker">Related Products</span>
              <h2>Continue exploring</h2>
            </div>
          </div>
          <ProductGrid products={relatedProducts} onAddToCart={addToCart} />
        </section>
      ) : null}

      {recentlyViewed.length ? (
        <section>
          <div className="section-header">
            <div>
              <span className="section-kicker">Recently Viewed</span>
              <h2>Your recent picks</h2>
            </div>
          </div>
          <ProductGrid products={recentlyViewed} onAddToCart={addToCart} />
        </section>
      ) : null}
    </div>
  );
}
