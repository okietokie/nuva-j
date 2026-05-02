import { Card, Typography } from "antd";

export default function AdminPlaceholderPage({ title }) {
  return (
    <Card className="nuva-card admin-panel-card">
      <div className="admin-panel-copy">
        <Typography.Text className="eyebrow">Admin Panel</Typography.Text>
        <Typography.Title level={1}>{title}</Typography.Title>
        <Typography.Paragraph>
          This page is intentionally empty for now. Tell me what you want inside the {title} panel,
          and I'll build it next.
        </Typography.Paragraph>
      </div>
    </Card>
  );
}
