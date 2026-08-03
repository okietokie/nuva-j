import { Card, Typography } from "antd";

export default function AdminPlaceholderPage({ title }) {
  return (
    <Card className="nuva-card admin-panel-card">
      <div className="admin-panel-copy">
        <Typography.Text className="eyebrow">Admin Module</Typography.Text>
        <Typography.Title level={1}>{title}</Typography.Title>
        <Typography.Paragraph>
          This module has been placed in the central admin structure and will be connected next without duplicating products,
          customers, inventory, or orders in separate sections.
        </Typography.Paragraph>
        <Typography.Paragraph>
          For now, this page acts as a clean placeholder so we can restructure the full NUVA admin
          system step by step without breaking the existing application.
        </Typography.Paragraph>
      </div>
    </Card>
  );
}
