import { Badge, Button, Drawer, Empty, InputNumber } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, itemCount, removeFromCart, updateQuantity, totals } = useCart();
  const { formatMoney } = useCurrency();

  return (
    <>
      <Badge count={itemCount} color="#A13043">
        <Button
          shape="circle"
          icon={<ShoppingOutlined />}
          onClick={() => setOpen(true)}
        />
      </Badge>
      <Drawer
        title="Your Bag"
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={380}
        className="mobile-menu"
      >
        {items.length ? (
          <div className="search-panel">
            {items.map((item) => (
              <div key={item._id} className="cart-line">
                <img src={item.primaryImage} alt={item.displayName} className="cart-thumb" />
                <div className="cart-copy">
                  <h3>{item.displayName}</h3>
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
            <div className="cart-summary-line is-total">
              <span>Subtotal</span>
              <strong>{formatMoney(totals.subtotal)}</strong>
            </div>
            <div className="search-footer-actions">
              <Link to="/shop" onClick={() => setOpen(false)}>
                <Button>Continue shopping</Button>
              </Link>
              <Link to="/cart" onClick={() => setOpen(false)}>
                <Button type="primary">Go to cart</Button>
              </Link>
            </div>
          </div>
        ) : (
          <Empty description="Your bag is still empty." />
        )}
      </Drawer>
    </>
  );
}
