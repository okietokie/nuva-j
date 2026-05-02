import { Button, Card, Form, Input, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values) => {
    const user = await login(values);
    navigate(user.role === "admin" ? "/admin" : "/");
  };

  return (
    <div className="auth-shell">
      <Card className="nuva-card auth-card">
        <Typography.Title level={2}>Welcome back</Typography.Title>
        <Typography.Paragraph>
          Sign in to continue your NUVA experience.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Email" name="email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            Login
          </Button>
        </Form>
        <p style={{ marginTop: 18 }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
