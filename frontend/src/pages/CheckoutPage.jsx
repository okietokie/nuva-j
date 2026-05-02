import { Button, Card, Col, Form, Input, Radio, Row, Steps } from "antd";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/orderService";
import { useAuth } from "../context/AuthContext";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totals, clearCart } = useCart();
  const { user } = useAuth();

  const handleSubmit = async (values) => {
    const payload = {
      items: items.map((item) => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.images[0]
      })),
      totalAmount: totals.total,
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
    <div className="page-wrap">
      <section className="page-heading">
        <span className="eyebrow">Checkout</span>
        <h1>Complete your order</h1>
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
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={15}>
          <Card className="nuva-card">
            <Form layout="vertical" onFinish={handleSubmit} initialValues={{ email: user?.email }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Full name" name="fullName" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Email" name="email" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Address line" name="line1" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="City" name="city" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Country" name="country" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Postal code" name="postalCode" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
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
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="Order Summary" className="nuva-card">
            {items.map((item) => (
              <div key={item._id} className="summary-row">
                <span>
                  {item.name} x {item.quantity}
                </span>
                <strong>${item.price * item.quantity}</strong>
              </div>
            ))}
            <div className="summary-row">
              <span>Shipping</span>
              <strong>${totals.shipping}</strong>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <strong>${totals.total}</strong>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
