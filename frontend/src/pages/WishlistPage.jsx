import { Button, Empty } from "antd";
import { Link } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export default function WishlistPage() {
  const { items, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <div className="store-page">
      <section className="page-intro">
        <span className="section-kicker">Wishlist</span>
        <h1>Your saved pieces</h1>
        <p>Keep the styles you want to revisit in one place, then add them to bag when you are ready.</p>
      </section>

      {items.length ? (
        <>
          <div className="section-header">
            <div>
              <h2>Saved for later</h2>
              <p>{items.length} piece{items.length === 1 ? "" : "s"} in your wishlist</p>
            </div>
            <Button onClick={clearWishlist}>Clear wishlist</Button>
          </div>
          <ProductGrid products={items} onAddToCart={addToCart} />
        </>
      ) : (
        <Empty description="Your wishlist is still empty. Save pieces as you browse.">
          <Link to="/shop">
            <Button type="primary">Explore the shop</Button>
          </Link>
        </Empty>
      )}
    </div>
  );
}
