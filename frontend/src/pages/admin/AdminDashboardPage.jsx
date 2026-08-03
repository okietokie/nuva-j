import { Card, Col, Row, Space, Typography } from "antd";
import AdminKpiSection from "../../components/admin/AdminKpiSection";

function mapDashboardTone(tone) {
  if (tone === "green" || tone === "mint" || tone === "teal") {
    return "active";
  }
  if (tone === "amber") {
    return "low";
  }
  if (tone === "gold" || tone === "cyan" || tone === "violet") {
    return "total";
  }
  return "total";
}

function highlightToneClass(tone) {
  return `admin-highlight-card admin-highlight-card-${tone}`;
}

export default function AdminDashboardPage({ section }) {
  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-head">
        <div>
          <Typography.Text className="eyebrow">NUVA Business Overview</Typography.Text>
          <Typography.Title level={2}>{section.dashboard.title}</Typography.Title>
          <Typography.Paragraph>{section.dashboard.subtitle}</Typography.Paragraph>
        </div>
      </div>

      <AdminKpiSection
        title="Business Snapshot"
        items={section.dashboard.stats.map((stat) => ({
          key: stat.label,
          label: stat.label,
          value: stat.value,
          note: stat.note,
          tone: mapDashboardTone(stat.tone),
        }))}
      />

      <Row gutter={[18, 18]} className="admin-highlights-row">
        {section.dashboard.highlights.map((highlight) => (
          <Col xs={24} lg={8} key={highlight.title}>
            <Card className={`nuva-card ${highlightToneClass(highlight.tone)}`}>
              <Typography.Text className="admin-highlight-label">{highlight.title}</Typography.Text>
              <Typography.Title level={3}>{highlight.value}</Typography.Title>
              <Typography.Paragraph>{highlight.note}</Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[18, 18]}>
        {section.dashboard.panels.map((panel) => (
          <Col xs={24} xl={12} key={panel.title}>
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
