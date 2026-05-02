import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, loading } = useAuth();
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

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({
        type: location.state.type || "success",
        text: location.state.message
      });
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  const onFinish = async (values) => {
    setSubmitting(true);
    setFeedback(null);

    try {
      const currentUser = await login(values);
      messageApi.success("Login successful.");
      navigate(currentUser.role === "admin" || currentUser.role === "super_admin" ? "/admin" : "/", {
        replace: true
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: getApiErrorMessage(error, "Unable to log in. Please try again.")
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      {contextHolder}
      <Card className="nuva-card auth-card">
        <Typography.Title level={2}>Welcome back</Typography.Title>
        <Typography.Paragraph>
          Sign in to continue your NUVA experience.
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
          <Form.Item label="Email" name="email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
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
