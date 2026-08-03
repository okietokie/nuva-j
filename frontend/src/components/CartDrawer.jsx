import { Badge, Button, Drawer, Empty, List, Space } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, itemCount, removeFromCart, totals } = useCart();
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
        title="Your Cart"
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={380}
      >
        {items.length ? (
          <>
            <List
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" onClick={() => removeFromCart(item._id)} key="remove">
                      Remove
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <img
                        src={item.images?.[0] || item.image}
                        alt={item.name}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12 }}
                      />
                    }
                    title={item.name}
                    description={`Qty ${item.quantity} x ${formatMoney(
                      item.price,
                      item.currency || "AED",
                    )}`}
                  />
                </List.Item>
              )}
            />
            <Space
              direction="vertical"
              size="middle"
              style={{ width: "100%", marginTop: 24 }}
            >
              <div className="drawer-total">
                <span>Total</span>
                <strong>{formatMoney(totals.total)}</strong>
              </div>
              <Link to="/cart" onClick={() => setOpen(false)}>
                <Button type="primary" block>
                  View Cart
                </Button>
              </Link>
            </Space>
          </>
        ) : (
          <Empty description="Your cart is waiting for something beautiful." />
        )}
      </Drawer>
    </>
  );
}
