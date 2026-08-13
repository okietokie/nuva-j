import { Button, Form, Input, Radio, Steps } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { createOrder } from "../services/orderService";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totals, baseTotals, clearCart } = useCart();
  const { user } = useAuth();
  const { convertAmount, formatMoney } = useCurrency();

  const handleSubmit = async (values) => {
    const payload = {
      items: items.map((item) => ({
        productId: item._id,
        name: item.name,
        price: convertAmount(item.displayPrice ?? item.price, item.currency || "AED", "AED"),
        currency: "AED",
        quantity: item.quantity,
        image: item.primaryImage
      })),
      totalAmount: baseTotals.total,
      currency: "AED",
      address: values,
      paymentMethod: values.paymentMethod,
      paymentStatus: "pending",
      orderStatus: "placed"
    };

    await createOrder(payload);
    clearCart();
    navigate("/orders");
  };

  return (
    <div className="store-page">
      <section className="page-intro">
        <span className="section-kicker">Checkout</span>
        <h1>Complete your order</h1>
        <p>
          Your delivery details, payment method, and order summary stay connected to the existing checkout flow.
        </p>
      </section>
      <Steps
        current={1}
        style={{ marginBottom: 32 }}
        items={[
          { title: "Cart" },
          { title: "Checkout" },
          { title: "Confirmation" }
        ]}
      />
      <div className="cart-grid">
        <section>
          <Form layout="vertical" onFinish={handleSubmit} initialValues={{ email: user?.email }}>
            <div className="content-grid">
              <div>
                <Form.Item label="Full name" name="fullName" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="Email" name="email" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </div>
            </div>
            <Form.Item label="Address line" name="line1" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <div className="content-grid">
              <div>
                <Form.Item label="City" name="city" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="Country" name="country" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="Postal code" name="postalCode" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </div>
            </div>
            <Form.Item label="Payment method" name="paymentMethod" initialValue="cash_on_delivery">
              <Radio.Group>
                <Radio value="cash_on_delivery">Cash on delivery</Radio>
                <Radio value="bank_transfer">Bank transfer</Radio>
              </Radio.Group>
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large">
              Place Order
            </Button>
          </Form>
        </section>
        <section>
          {items.map((item) => (
            <div key={item._id} className="cart-summary-line">
              <span>
                {item.name} x {item.quantity}
              </span>
              <strong>
                {formatMoney(
                  convertAmount(item.displayPrice ?? item.price, item.currency || "AED") *
                    item.quantity
                )}
              </strong>
            </div>
          ))}
          <div className="cart-summary-line">
            <span>Shipping</span>
            <strong>{formatMoney(totals.shipping)}</strong>
          </div>
          <div className="cart-summary-line is-total">
            <span>Total</span>
            <strong>{formatMoney(totals.total)}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
