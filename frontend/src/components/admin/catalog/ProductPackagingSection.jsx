import { Alert, Button, Card, InputNumber, Radio, Select, Space, Tag, Typography } from "antd";

function getRecommendedProfile(product, profiles) {
  if (!profiles.length) return null;
  if (product.occasion === "Wedding") {
    return profiles.find((profile) => profile.name === "Luxury Bridal") || profiles[0];
  }
  if (product.occasion === "Gift" || (product.tags || []).includes("gift")) {
    return profiles.find((profile) => profile.name === "Gift Box") || profiles[0];
  }
  if (product.workflowStatus === "published") {
    return profiles.find((profile) => profile.name === "Premium Finish") || profiles[0];
  }
  return profiles.find((profile) => profile.name === "Standard Core") || profiles[0];
}

export default function ProductPackagingSection({
  product,
  draft,
  profiles,
  canEdit,
  canManageProfiles,
  saving,
  onChange,
  onSave,
  onOpenPackagingWorkflow
}) {
  const recommendedProfile = getRecommendedProfile(product, profiles);
  const selectedProfile = profiles.find((profile) => profile.id === draft.packagingProfileId) || recommendedProfile;
  const profileDefaultCost = Number(selectedProfile?.defaultCost || 0);
  const usesProfileDefault = draft.packagingCostSource === "profile_default";
  const effectivePackagingCost = usesProfileDefault ? profileDefaultCost : Number(draft.packagingCost || 0);

  return (
    <div className="product-workspace-section">
      <Card className="nuva-card">
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div className="product-workspace-section__heading">
            <div>
              <Typography.Title level={4}>Packaging</Typography.Title>
              <Typography.Paragraph>
                Keep packaging assignment, cost source, and product override in one authoritative product view.
              </Typography.Paragraph>
            </div>
            <Space wrap>
              <Button onClick={onOpenPackagingWorkflow}>Open Packaging Workflow</Button>
              {canManageProfiles ? <Button>Manage Packaging Profiles</Button> : null}
            </Space>
          </div>

          {selectedProfile ? (
            <Alert
              type="info"
              showIcon
              message={`Recommended profile: ${recommendedProfile?.name || "None"}`}
              description={recommendedProfile ? recommendedProfile.description || "Recommended from current product context." : "No packaging profiles are available yet."}
            />
          ) : (
            <Alert type="warning" showIcon message="No packaging profiles are available." />
          )}

          <div className="product-workspace-grid">
            <div className="product-workspace-field">
              <label>Assigned Packaging Profile</label>
              <Select
                value={draft.packagingProfileId || undefined}
                disabled={!canEdit}
                placeholder="Select packaging profile"
                options={profiles.map((profile) => ({
                  label: `${profile.name} (${profile.currency} ${profile.defaultCost})`,
                  value: profile.id
                }))}
                onChange={(value) => {
                  const profile = profiles.find((entry) => entry.id === value);
                  onChange({
                    packagingProfileId: value || "",
                    packagingProfileLabel: profile?.name || "",
                  });
                }}
              />
            </div>

            <div className="product-workspace-field">
              <label>Cost Source</label>
              <Radio.Group
                value={draft.packagingCostSource}
                disabled={!canEdit}
                onChange={(event) => onChange({ packagingCostSource: event.target.value })}
              >
                <Space direction="vertical">
                  <Radio value="profile_default">Use profile default</Radio>
                  <Radio value="custom">Use custom product override</Radio>
                </Space>
              </Radio.Group>
            </div>

            <div className="product-workspace-field">
              <label>Profile Default Cost</label>
              <div className="product-workspace-readonly">{selectedProfile ? `${selectedProfile.currency} ${profileDefaultCost.toFixed(2)}` : "Not available"}</div>
            </div>

            <div className="product-workspace-field">
              <label>Product Override Cost</label>
              <InputNumber
                min={0}
                step={0.5}
                disabled={!canEdit || usesProfileDefault}
                style={{ width: "100%" }}
                value={draft.packagingCost}
                onChange={(value) => onChange({ packagingCost: Number(value || 0) })}
              />
            </div>

            <div className="product-workspace-field">
              <label>Effective Packaging Cost</label>
              <div className="product-workspace-readonly">{`${product.currency || selectedProfile?.currency || "AED"} ${effectivePackagingCost.toFixed(2)}`}</div>
            </div>

            <div className="product-workspace-field">
              <label>Packaging Readiness</label>
              <div className="product-workspace-readonly">
                <Tag color={effectivePackagingCost > 0 ? "green" : "orange"}>
                  {effectivePackagingCost > 0 ? "Packaging Ready" : "Missing Information"}
                </Tag>
              </div>
            </div>
          </div>

          {effectivePackagingCost <= 0 ? (
            <Alert
              type="warning"
              showIcon
              message="Packaging cost is still incomplete."
              description="Assign a profile default or enter a custom override so total product cost remains trustworthy."
            />
          ) : null}

          <div className="product-workspace-footer-actions">
            <Button type="primary" loading={saving} disabled={!canEdit} onClick={onSave}>
              Save Packaging
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}
