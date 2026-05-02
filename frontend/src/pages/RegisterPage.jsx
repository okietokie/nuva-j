import { Button, Card, Form, Input, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const onFinish = async (values) => {
    const user = await register(values);
    navigate(user.role === "admin" ? "/admin" : "/");
  };

  return (
    <div className="auth-shell">
      <Card className="nuva-card auth-card">
        <Typography.Title level={2}>Join NUVA</Typography.Title>
        <Typography.Paragraph>
          Create your account to shop, track orders, and save your favorites.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Full name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            Register
          </Button>
        </Form>
        <p style={{ marginTop: 18 }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </Card>
    </div>
  );
}
