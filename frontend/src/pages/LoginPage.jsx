import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, message } from "antd";
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
      navigate(user.canAccessAdmin ? "/admin" : "/", {
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
      navigate(currentUser.canAccessAdmin ? "/admin" : "/", {
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
    <div className="auth-wrap">
      {contextHolder}
      <section className="auth-panel">
        <span className="section-kicker">Account</span>
        <h1>Welcome back</h1>
        <p className="muted-copy">
          Sign in to continue shopping, review orders, and move quickly through checkout.
        </p>
      </section>
      <section className="auth-panel">
        {feedback ? (
          <Alert className="auth-alert" type={feedback.type} message={feedback.text} showIcon />
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
        <div className="auth-alt">
          <span>New here?</span>
          <Link to="/register">Create an account</Link>
        </div>
      </section>
    </div>
  );
}
