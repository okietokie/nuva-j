import { Button, Card, Typography } from "antd";
import { useNavigate } from "react-router-dom";

export default function AdminForbiddenPage({
  title = "403 - You do not have permission to access this section",
  description = "This area is outside your current role or workspace access.",
}) {
  const navigate = useNavigate();

  return (
    <Card className="nuva-card admin-panel-card">
      <div className="admin-panel-copy">
        <Typography.Text className="eyebrow">Admin Access</Typography.Text>
        <Typography.Title level={1}>{title}</Typography.Title>
        <Typography.Paragraph>{description}</Typography.Paragraph>
        <Button type="primary" onClick={() => navigate("/admin", { replace: true })}>
          Return to Dashboard
        </Button>
      </div>
    </Card>
  );
}
