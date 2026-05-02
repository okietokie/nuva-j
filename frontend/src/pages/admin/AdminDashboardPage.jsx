import { Card, Col, Row, Space, Typography } from "antd";

function toneClass(tone) {
  return `admin-stat-icon admin-stat-icon-${tone}`;
}

export default function AdminDashboardPage({ section }) {
  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-head">
        <div>
          <Typography.Title level={2}>{section.dashboard.title}</Typography.Title>
          <Typography.Paragraph>{section.dashboard.subtitle}</Typography.Paragraph>
        </div>
        <Card className="admin-date-chip">May 20 - May 26, 2024</Card>
      </div>

      <Row gutter={[18, 18]} className="admin-stats-row">
        {section.dashboard.stats.map((stat) => (
          <Col xs={24} sm={12} xl={6} key={stat.label}>
            <Card className="nuva-card admin-stat-card">
              <div className={toneClass(stat.tone)} />
              <Typography.Text className="admin-stat-label">{stat.label}</Typography.Text>
              <Typography.Title level={3}>{stat.value}</Typography.Title>
              <Typography.Paragraph className="admin-stat-note">{stat.note}</Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[18, 18]}>
        {section.dashboard.panels.map((panel) => (
          <Col xs={24} lg={12} key={panel.title}>
            <Card
              className="nuva-card admin-data-card"
              title={panel.title}
              extra={panel.action ? <span className="admin-panel-action">{panel.action}</span> : null}
            >
              <Space direction="vertical" size={14} style={{ width: "100%" }}>
                {panel.lines.map((line) => (
                  <div key={line} className="admin-data-line">
                    {line}
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
