import { Button, Empty, InputNumber } from "antd";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

export default function CartPage() {
  const { items, totals, updateQuantity, removeFromCart } = useCart();
  const { formatMoney } = useCurrency();

  return (
    <div className="store-page">
      <section className="page-intro">
        <span className="section-kicker">Cart</span>
        <h1>Your bag</h1>
        <p>Review your selected pieces, adjust quantity, and continue to checkout when ready.</p>
      </section>
      {items.length ? (
        <div className="cart-grid">
          <section>
            {items.map((item) => (
              <div key={item._id} className="cart-line">
                <img src={item.primaryImage} alt={item.displayName} className="cart-thumb" />
                <div className="cart-copy">
                  <h3>{item.displayName}</h3>
                  <p>{item.displayCategory}</p>
                  <p>{formatMoney(item.displayPrice ?? item.price, item.currency || "AED")}</p>
                </div>
                <div className="cart-line-actions">
                  <InputNumber
                    min={1}
                    max={Math.max(item.stock, 1)}
                    value={item.quantity}
                    onChange={(value) => updateQuantity(item._id, value || 1)}
                  />
                  <Button type="link" onClick={() => removeFromCart(item._id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </section>
          <section>
            <div className="cart-summary-line">
              <span>Subtotal</span>
              <strong>{formatMoney(totals.subtotal)}</strong>
            </div>
            <div className="cart-summary-line">
              <span>Shipping</span>
              <strong>{formatMoney(totals.shipping)}</strong>
            </div>
            <div className="cart-summary-line is-total">
              <span>Total</span>
              <strong>{formatMoney(totals.total)}</strong>
            </div>
            <p className="muted-copy">
              Delivery options and final payment details are confirmed on the next step.
            </p>
            <div className="search-footer-actions">
              <Link to="/shop">
                <Button>Continue Shopping</Button>
              </Link>
              <Link to="/checkout">
                <Button type="primary">Checkout</Button>
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <Empty description="Your cart is empty. Discover the collection in the shop.">
          <Link to="/shop">
            <Button type="primary">Go to Shop</Button>
          </Link>
        </Empty>
      )}
    </div>
  );
}
