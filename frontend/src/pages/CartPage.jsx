import { Button, Card, Empty, InputNumber, List, Row, Col } from "antd";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { items, totals, updateQuantity, removeFromCart } = useCart();

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <span className="eyebrow">Cart</span>
        <h1>Your selection</h1>
      </section>
      {items.length ? (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card className="nuva-card">
              <List
                dataSource={items}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <InputNumber
                        key="qty"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        onChange={(value) => updateQuantity(item._id, value)}
                      />,
                      <Button key="remove" type="link" onClick={() => removeFromCart(item._id)}>
                        Remove
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 16 }}
                        />
                      }
                      title={item.name}
                      description={`${item.material} • $${item.price}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Order Summary" className="nuva-card">
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>${totals.subtotal}</strong>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <strong>${totals.shipping}</strong>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <strong>${totals.total}</strong>
              </div>
              <Link to="/checkout">
                <Button type="primary" size="large" block>
                  Continue to Checkout
                </Button>
              </Link>
            </Card>
          </Col>
        </Row>
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
