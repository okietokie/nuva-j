import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user, loading } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!loading && user) {
      messageApi.info("You are already logged in.");
      navigate(user.role === "admin" || user.role === "super_admin" ? "/admin" : "/", {
        replace: true
      });
    }
  }, [loading, messageApi, navigate, user]);

  const onFinish = async (values) => {
    setSubmitting(true);
    setFeedback(null);

    try {
      await register(values);
      navigate("/login", {
        replace: true,
        state: {
          type: "success",
          message: "Signup successful. Please log in to continue."
        }
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: getApiErrorMessage(error, "Unable to create your account. Please try again.")
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      {contextHolder}
      <Card className="nuva-card auth-card">
        <Typography.Title level={2}>Join NUVA</Typography.Title>
        <Typography.Paragraph>
          Create your account to shop, track orders, and save your favorites.
        </Typography.Paragraph>
        {feedback ? (
          <Alert
            className="auth-alert"
            type={feedback.type}
            message={feedback.text}
            showIcon
          />
        ) : null}
        <Form layout="vertical" onFinish={onFinish} onValuesChange={() => feedback && setFeedback(null)}>
          <Form.Item label="Full name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
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
