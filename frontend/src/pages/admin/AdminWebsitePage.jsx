import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  EyeOutlined,
  GlobalOutlined,
  HistoryOutlined,
  MobileOutlined,
  ReloadOutlined,
  SaveOutlined,
  TabletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  createWebsitePreviewToken,
  discardWebsiteDraft,
  getWebsiteWorkspace,
  publishWebsiteChanges,
  restoreWebsiteVersion,
  scheduleWebsiteChanges,
  updateWebsiteDraft,
} from "../../services/websiteService";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import "../../styles/adminCatalog.css";

const viewportOptions = [
  { key: "desktop", label: "Desktop 1440px", width: 1440, icon: <GlobalOutlined /> },
  { key: "laptop", label: "Laptop 1280px", width: 1280, icon: <GlobalOutlined /> },
  { key: "tablet", label: "Tablet 768px", width: 768, icon: <TabletOutlined /> },
  { key: "mobile", label: "Mobile 390px", width: 390, icon: <MobileOutlined /> },
];

function buildPreviewUrl(previewToken, path) {
  const [pathname, queryString] = (path || "/").split("?");
  const safePath = pathname === "/" ? "" : pathname;
  const params = new URLSearchParams(queryString || "");
  params.set("previewToken", previewToken);
  return `/preview/storefront${safePath}?${params.toString()}`;
}

function formatDate(value) {
  return value ? dayjs(value).format("DD MMM YYYY, HH:mm") : "Not available";
}

function moveItem(list, index, direction) {
  const next = [...list];
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= next.length) {
    return next;
  }
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

function summarizeDraftChanges(draft, published) {
  const changes = [];
  if (JSON.stringify(draft.announcement) !== JSON.stringify(published.announcement)) {
    changes.push("Announcement or promotion settings updated.");
  }
  if (JSON.stringify(draft.navigation) !== JSON.stringify(published.navigation)) {
    changes.push("Customer-facing navigation or footer links changed.");
  }
  if (JSON.stringify(draft.seo) !== JSON.stringify(published.seo)) {
    changes.push("Homepage SEO settings changed.");
  }
  const publishedIds = (published.homepageSections || []).map((section) => section.id).join(",");
  const draftIds = (draft.homepageSections || []).map((section) => section.id).join(",");
  if (publishedIds !== draftIds) {
    changes.push("Homepage sections reordered.");
  }
  (draft.homepageSections || []).forEach((section, index) => {
    const publishedSection = (published.homepageSections || [])[index];
    if (!publishedSection) {
      changes.push(`${section.title || section.type} section added.`);
      return;
    }
    if (section.visible !== publishedSection.visible) {
      changes.push(`${section.title || section.type} was ${section.visible ? "shown" : "hidden"}.`);
    }
    if (JSON.stringify(section.productIds || []) !== JSON.stringify(publishedSection.productIds || [])) {
      changes.push(`${section.title || section.type} featured products changed.`);
    }
  });
  return changes.length ? changes : ["Draft matches the current live storefront."];
}

export default function AdminWebsitePage() {
  const [workspace, setWorkspace] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewToken, setPreviewToken] = useState("");
  const [previewPath, setPreviewPath] = useState("/");
  const [previewMode, setPreviewMode] = useState("draft");
  const [viewport, setViewport] = useState(viewportOptions[0]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  const permissions = workspace?.permissions || {};
  const published = workspace?.state?.published || null;
  const hasUnpublishedChanges = workspace?.state?.hasUnpublishedChanges || false;
  const validationChecks = workspace?.validation?.checks || [];
  const changeSummary = useMemo(
    () => (draft && published ? summarizeDraftChanges(draft, published) : []),
    [draft, published],
  );

  const previewSrc = previewToken ? buildPreviewUrl(previewToken, previewPath) : "";
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return (workspace?.catalogProducts || []).filter((product) =>
      [product.name, product.sku, product.categoryName]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [productSearch, workspace]);

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (workspace && permissions.canPreview) {
      refreshPreview(previewMode, previewPath);
    }
  }, [workspace, permissions.canPreview]);

  async function loadWorkspace() {
    setLoading(true);
    try {
      const result = await getWebsiteWorkspace();
      setWorkspace(result);
      setDraft(result.state.draft);
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, "Website workspace could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  async function refreshPreview(mode = previewMode, path = previewPath) {
    if (!permissions.canPreview) {
      return;
    }
    try {
      const result = await createWebsitePreviewToken({ mode, path });
      setPreviewMode(mode);
      setPreviewPath(path);
      setPreviewToken(result.token);
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, "Preview token could not be generated."));
    }
  }

  function updateSection(sectionId, updates) {
    setDraft((current) => ({
      ...current,
      homepageSections: (current.homepageSections || []).map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section,
      ),
    }));
  }

  function updateNavigation(kind, index, updates, groupIndex = null) {
    setDraft((current) => {
      if (kind === "header") {
        return {
          ...current,
          navigation: {
            ...current.navigation,
            headerLinks: current.navigation.headerLinks.map((item, itemIndex) =>
              itemIndex === index ? { ...item, ...updates } : item,
            ),
          },
        };
      }

      return {
        ...current,
        navigation: {
          ...current.navigation,
          footerGroups: current.navigation.footerGroups.map((group, nextGroupIndex) =>
            nextGroupIndex === groupIndex
              ? {
                  ...group,
                  links: group.links.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, ...updates } : item,
                  ),
                }
              : group,
          ),
        },
      };
    });
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const result = await updateWebsiteDraft({
        draft,
        expectedUpdatedAt: workspace?.state?.draftUpdatedAt || null,
      });
      setWorkspace(result);
      setDraft(result.state.draft);
      messageApi.success("Website draft saved.");
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, "Website draft could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await publishWebsiteChanges({
        expectedUpdatedAt: workspace?.state?.draftUpdatedAt || null,
      });
      setWorkspace(result);
      setDraft(result.state.draft);
      messageApi.success("Website changes published.");
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, "Website changes could not be published."));
    } finally {
      setPublishing(false);
    }
  }

  async function handleSchedule() {
    setPublishing(true);
    try {
      const result = await scheduleWebsiteChanges({
        expectedUpdatedAt: workspace?.state?.draftUpdatedAt || null,
        publishAt: scheduleAt?.toISOString(),
      });
      setWorkspace(result);
      setDraft(result.state.draft);
      setScheduleModalOpen(false);
      setScheduleAt(null);
      messageApi.success("Website publication scheduled.");
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, "Website schedule could not be created."));
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscardDraft() {
    setSaving(true);
    try {
      const result = await discardWebsiteDraft({
        expectedUpdatedAt: workspace?.state?.draftUpdatedAt || null,
      });
      setWorkspace(result);
      setDraft(result.state.draft);
      messageApi.success("Unpublished website changes were discarded.");
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, "Draft changes could not be discarded."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreVersion(versionId) {
    setPublishing(true);
    try {
      const result = await restoreWebsiteVersion(versionId, {
        expectedUpdatedAt: workspace?.state?.draftUpdatedAt || null,
      });
      setWorkspace(result);
      setDraft(result.state.draft);
      messageApi.success("Website version restored as a new live version.");
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, "The selected version could not be restored."));
    } finally {
      setPublishing(false);
    }
  }

  function openProductPicker(sectionId) {
    setActiveSectionId(sectionId);
    setProductModalOpen(true);
  }

  function toggleFeaturedProduct(productId) {
    const section = (draft?.homepageSections || []).find((item) => item.id === activeSectionId);
    if (!section) {
      return;
    }
    const nextIds = section.productIds.includes(productId)
      ? section.productIds.filter((id) => id !== productId)
      : [...section.productIds, productId];
    updateSection(activeSectionId, { productIds: nextIds });
  }

  if (loading || !workspace || !draft) {
    return (
      <Card className="nuva-card admin-panel-card">
        <Typography.Title level={4}>Loading Website Workspace...</Typography.Title>
      </Card>
    );
  }

  const selectedViewport = viewport.width;

  const sectionColumns = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div>
          <div className="catalog-cell-title">{record.name}</div>
          <div className="catalog-cell-subtitle">{record.sku || "No SKU"} - {record.categoryName || "No category"}</div>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Space wrap>
          <Tag color={record.status === "active" ? "green" : "default"}>{record.status}</Tag>
          <Tag color={record.visibility === "visible" ? "blue" : "default"}>{record.visibility}</Tag>
          <Tag color={record.stock > 0 ? "green" : "orange"}>{record.stock > 0 ? `In stock: ${record.stock}` : "Out of stock"}</Tag>
        </Space>
      ),
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (value) => `AED ${Number(value || 0).toFixed(2)}`,
    },
    {
      title: "Select",
      key: "select",
      render: (_, record) => {
        const selectedIds =
          (draft.homepageSections.find((section) => section.id === activeSectionId)?.productIds) || [];
        return (
          <Switch
            checked={selectedIds.includes(record.id)}
            onChange={() => toggleFeaturedProduct(record.id)}
          />
        );
      },
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {contextHolder}

      <Card className="nuva-card">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <Typography.Text className="eyebrow">Storefront Control</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0 }}>Website</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                Manage the live storefront, preview unpublished changes, and publish safely from one workspace.
              </Typography.Paragraph>
            </div>
            <Space wrap>
              <Tag color="green">{workspace.status.live}</Tag>
              <Tag color={hasUnpublishedChanges ? "orange" : "default"}>
                {hasUnpublishedChanges ? "Unpublished changes" : "Draft matches live"}
              </Tag>
              {workspace.state.scheduledPublishAt ? (
                <Tag color="blue">Scheduled: {formatDate(workspace.state.scheduledPublishAt)}</Tag>
              ) : null}
            </Space>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Typography.Text>Last published: {formatDate(workspace.state.lastPublishedAt)}</Typography.Text>
            <Typography.Text>
              By: {workspace.state.lastPublishedBy?.name || workspace.state.lastPublishedBy?.email || "System"}
            </Typography.Text>
            <Typography.Text>Draft updated: {formatDate(workspace.state.draftUpdatedAt)}</Typography.Text>
          </div>

          <Space wrap>
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={saving} disabled={!hasUnpublishedChanges}>
              Save Draft
            </Button>
            <Button icon={<EyeOutlined />} onClick={() => refreshPreview("draft", previewPath)} disabled={!permissions.canPreview}>
              Preview Changes
            </Button>
            <Button icon={<GlobalOutlined />} href="/" target="_blank">
              Open Live Website
            </Button>
            {permissions.canPublish ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handlePublish}
                loading={publishing}
                disabled={workspace.validation.summary.blocking > 0}
              >
                Publish
              </Button>
            ) : null}
            {permissions.canSchedule ? (
              <Button onClick={() => setScheduleModalOpen(true)} disabled={workspace.validation.summary.blocking > 0}>
                Schedule
              </Button>
            ) : null}
            <Button danger onClick={handleDiscardDraft} disabled={!hasUnpublishedChanges}>
              Discard Draft
            </Button>
          </Space>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <Card size="small"><strong>{workspace.summary.activeSections}</strong><div>Active sections</div></Card>
                  <Card size="small"><strong>{workspace.summary.hiddenSections}</strong><div>Hidden sections</div></Card>
                  <Card size="small"><strong>{workspace.summary.featuredProducts}</strong><div>Featured products</div></Card>
                  <Card size="small"><strong>{workspace.validation.summary.blocking}</strong><div>Blocking issues</div></Card>
                </div>

                <Card
                  title="Storefront Preview"
                  extra={
                    <Space wrap>
                      {viewportOptions.map((option) => (
                        <Button
                          key={option.key}
                          type={viewport.key === option.key ? "primary" : "default"}
                          onClick={() => setViewport(option)}
                        >
                          {option.label}
                        </Button>
                      ))}
                      <Select
                        value={previewPath}
                        style={{ minWidth: 220 }}
                        onChange={(value) => refreshPreview(previewMode, value)}
                        options={(workspace.pageShortcuts || []).map((item) => ({
                          label: item.label,
                          value: item.path,
                        }))}
                      />
                      <Select
                        value={previewMode}
                        onChange={(value) => refreshPreview(value, previewPath)}
                        options={[
                          { label: "Draft Preview", value: "draft" },
                          { label: "Live Website", value: "published" },
                        ]}
                      />
                      <Tooltip title="Refresh preview">
                        <Button icon={<ReloadOutlined />} onClick={() => refreshPreview(previewMode, previewPath)} />
                      </Tooltip>
                      {previewSrc ? (
                        <Button href={previewSrc} target="_blank">
                          Open Preview Tab
                        </Button>
                      ) : null}
                    </Space>
                  }
                >
                  {previewSrc ? (
                    <div style={{ overflow: "auto", border: "1px solid #ece2dc", borderRadius: 12, padding: 12, background: "#f8f2ec" }}>
                      <div style={{ width: selectedViewport, maxWidth: "100%", margin: "0 auto", background: "#fff", minHeight: 760 }}>
                        <iframe
                          title={`${previewMode === "draft" ? "Draft Preview" : "Live Website"} - ${previewPath}`}
                          src={previewSrc}
                          style={{ width: "100%", minHeight: 760, border: 0, background: "#fff" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <Empty description="Preview unavailable" />
                  )}
                </Card>

                <Card title="Readiness Checklist">
                  <List
                    dataSource={validationChecks}
                    locale={{ emptyText: "No current draft issues were detected." }}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={2}>
                          <Space wrap>
                            <Tag color={item.level === "blocking" ? "red" : item.level === "warning" ? "orange" : "green"}>
                              {item.level}
                            </Tag>
                            <strong>{item.location}</strong>
                          </Space>
                          <span>{item.message}</span>
                          <Typography.Text type="secondary">{item.fix}</Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: "homepage",
            label: "Homepage",
            children: (
              <div style={{ display: "grid", gap: 12 }}>
                {(draft.homepageSections || []).map((section, index) => (
                  <Card
                    key={section.id}
                    title={`${section.subtitle || section.type} (${section.type})`}
                    extra={
                      <Space wrap>
                        <Button onClick={() => setDraft((current) => ({ ...current, homepageSections: moveItem(current.homepageSections, index, -1) }))} disabled={!permissions.canEditLayout || index === 0}>
                          Move Up
                        </Button>
                        <Button onClick={() => setDraft((current) => ({ ...current, homepageSections: moveItem(current.homepageSections, index, 1) }))} disabled={!permissions.canEditLayout || index === draft.homepageSections.length - 1}>
                          Move Down
                        </Button>
                        <Switch checked={section.visible} onChange={(checked) => updateSection(section.id, { visible: checked })} />
                      </Space>
                    }
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                      <Input value={section.subtitle} onChange={(event) => updateSection(section.id, { subtitle: event.target.value })} addonBefore="Kicker" />
                      <Input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} addonBefore="Title" />
                      <Input.TextArea rows={3} value={section.body} onChange={(event) => updateSection(section.id, { body: event.target.value })} placeholder="Supporting text" />
                      {section.type === "hero" ? (
                        <>
                          <Input value={section.desktopImageUrl} onChange={(event) => updateSection(section.id, { desktopImageUrl: event.target.value })} addonBefore="Desktop image" />
                          <Input value={section.mobileImageUrl} onChange={(event) => updateSection(section.id, { mobileImageUrl: event.target.value })} addonBefore="Mobile image" />
                          <Input value={section.imageAlt} onChange={(event) => updateSection(section.id, { imageAlt: event.target.value })} addonBefore="Alt text" />
                          <Input value={section.primaryCtaLabel} onChange={(event) => updateSection(section.id, { primaryCtaLabel: event.target.value })} addonBefore="Primary CTA" />
                          <Input value={section.primaryCtaHref} onChange={(event) => updateSection(section.id, { primaryCtaHref: event.target.value })} addonBefore="Primary link" />
                          <Input value={section.secondaryCtaLabel} onChange={(event) => updateSection(section.id, { secondaryCtaLabel: event.target.value })} addonBefore="Secondary CTA" />
                          <Input value={section.secondaryCtaHref} onChange={(event) => updateSection(section.id, { secondaryCtaHref: event.target.value })} addonBefore="Secondary link" />
                        </>
                      ) : null}
                      {section.type === "featured_products" || section.type === "new_arrivals" ? (
                        <>
                          <Input value={section.ctaLabel} onChange={(event) => updateSection(section.id, { ctaLabel: event.target.value })} addonBefore="CTA label" />
                          <Input value={section.ctaHref} onChange={(event) => updateSection(section.id, { ctaHref: event.target.value })} addonBefore="CTA link" />
                          <Input type="number" value={section.limit} onChange={(event) => updateSection(section.id, { limit: Number(event.target.value || 4) })} addonBefore="Limit" />
                          {section.type === "featured_products" ? (
                            <Button onClick={() => openProductPicker(section.id)} disabled={!permissions.canManageFeaturedProducts}>
                              Manage Featured Products ({section.productIds?.length || 0})
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            key: "navigation",
            label: "Navigation",
            children: (
              <div style={{ display: "grid", gap: 16 }}>
                <Card title="Header Navigation">
                  <List
                    dataSource={draft.navigation.headerLinks}
                    renderItem={(item, index) => (
                      <List.Item>
                        <Space wrap style={{ width: "100%" }}>
                          <Input value={item.label} onChange={(event) => updateNavigation("header", index, { label: event.target.value })} addonBefore="Label" />
                          <Input value={item.href} onChange={(event) => updateNavigation("header", index, { href: event.target.value })} addonBefore="Route" />
                          <Switch checked={item.visible} onChange={(checked) => updateNavigation("header", index, { visible: checked })} />
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
                {(draft.navigation.footerGroups || []).map((group, groupIndex) => (
                  <Card key={group.id} title={group.label}>
                    <List
                      dataSource={group.links || []}
                      renderItem={(item, index) => (
                        <List.Item>
                          <Space wrap style={{ width: "100%" }}>
                            <Input value={item.label} onChange={(event) => updateNavigation("footer", index, { label: event.target.value }, groupIndex)} addonBefore="Label" />
                            <Input value={item.href} onChange={(event) => updateNavigation("footer", index, { href: event.target.value }, groupIndex)} addonBefore="Route" />
                            <Switch checked={item.visible} onChange={(checked) => updateNavigation("footer", index, { visible: checked }, groupIndex)} />
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                ))}
              </div>
            ),
          },
          {
            key: "promotions",
            label: "Promotions",
            children: (
              <Card title="Announcement Bar">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <Input value={draft.announcement.message} onChange={(event) => setDraft((current) => ({ ...current, announcement: { ...current.announcement, message: event.target.value } }))} addonBefore="Message" />
                  <Input value={draft.announcement.destination} onChange={(event) => setDraft((current) => ({ ...current, announcement: { ...current.announcement, destination: event.target.value } }))} addonBefore="Destination" />
                  <Input value={draft.announcement.timezone} onChange={(event) => setDraft((current) => ({ ...current, announcement: { ...current.announcement, timezone: event.target.value } }))} addonBefore="Timezone" />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Typography.Text>Visible</Typography.Text>
                    <Switch checked={draft.announcement.visible} onChange={(checked) => setDraft((current) => ({ ...current, announcement: { ...current.announcement, visible: checked } }))} />
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: "seo",
            label: "SEO",
            children: (
              <Card title="Homepage SEO">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <Input value={draft.seo.home.browserTitle} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...current.seo, home: { ...current.seo.home, browserTitle: event.target.value } } }))} addonBefore="Title" />
                  <Input.TextArea rows={3} value={draft.seo.home.metaDescription} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...current.seo, home: { ...current.seo.home, metaDescription: event.target.value } } }))} placeholder="Meta description" />
                  <Input value={draft.seo.home.socialTitle} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...current.seo, home: { ...current.seo.home, socialTitle: event.target.value } } }))} addonBefore="Social title" />
                  <Input.TextArea rows={3} value={draft.seo.home.socialDescription} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...current.seo, home: { ...current.seo.home, socialDescription: event.target.value } } }))} placeholder="Social description" />
                  <Input value={draft.seo.home.socialImageUrl} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...current.seo, home: { ...current.seo.home, socialImageUrl: event.target.value } } }))} addonBefore="Social image" />
                  <Input value={draft.seo.home.canonicalPath} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...current.seo, home: { ...current.seo.home, canonicalPath: event.target.value } } }))} addonBefore="Canonical path" />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Typography.Text>No index</Typography.Text>
                    <Switch checked={draft.seo.home.noIndex} onChange={(checked) => setDraft((current) => ({ ...current, seo: { ...current.seo, home: { ...current.seo.home, noIndex: checked } } }))} />
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: "publish",
            label: "Publish Centre",
            children: (
              <div style={{ display: "grid", gap: 16 }}>
                {workspace.validation.summary.blocking > 0 ? (
                  <Alert
                    type="error"
                    showIcon
                    message="Publishing is blocked until blocking issues are resolved."
                  />
                ) : (
                  <Alert type="success" showIcon message="The current draft passed blocking publish checks." />
                )}
                <Card title="Change Summary">
                  <List dataSource={changeSummary} renderItem={(item) => <List.Item>{item}</List.Item>} />
                </Card>
                <Card title="Publish Checklist">
                  <List
                    dataSource={validationChecks}
                    locale={{ emptyText: "No warnings or blocking issues were found." }}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={0}>
                          <Space>
                            <Tag color={item.level === "blocking" ? "red" : "orange"}>{item.level}</Tag>
                            <strong>{item.location}</strong>
                          </Space>
                          <span>{item.message}</span>
                          <Typography.Text type="secondary">{item.why}</Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: "history",
            label: "Version History",
            children: (
              <div style={{ display: "grid", gap: 16 }}>
                <Card title="Published Versions">
                  <Table
                    rowKey="id"
                    pagination={false}
                    dataSource={workspace.versions || []}
                    columns={[
                      { title: "Version", dataIndex: "versionNumber", key: "versionNumber" },
                      { title: "Type", dataIndex: "publishType", key: "publishType" },
                      { title: "Published", dataIndex: "publishedAt", key: "publishedAt", render: formatDate },
                      { title: "By", dataIndex: "publishedByName", key: "publishedByName", render: (_, record) => record.publishedByName || record.publishedByEmail || "System" },
                      {
                        title: "Actions",
                        key: "actions",
                        render: (_, record) => (
                          <Space>
                            {record.currentLive ? <Tag color="green">Live</Tag> : null}
                            {permissions.canRestoreVersion ? (
                              <Button icon={<HistoryOutlined />} onClick={() => handleRestoreVersion(record.id)}>
                                Restore
                              </Button>
                            ) : null}
                          </Space>
                        ),
                      },
                    ]}
                    expandable={{
                      expandedRowRender: (record) => (
                        <List
                          dataSource={record.changeSummary || []}
                          renderItem={(item) => <List.Item>{item}</List.Item>}
                        />
                      ),
                    }}
                  />
                </Card>
                <Card title="Audit History">
                  <List
                    dataSource={workspace.audit || []}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={0}>
                          <Space>
                            <Tag icon={<WarningOutlined />}>{item.action}</Tag>
                            <strong>{item.actorName || item.actorEmail || "System"}</strong>
                          </Space>
                          <span>{item.affectedSection || "storefront"}</span>
                          <Typography.Text type="secondary">{formatDate(item.createdAt)}</Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={productModalOpen}
        title="Manage Featured Products"
        footer={null}
        onCancel={() => setProductModalOpen(false)}
        width={960}
      >
        <Input.Search
          allowClear
          placeholder="Search by product name, SKU, or category"
          value={productSearch}
          onChange={(event) => setProductSearch(event.target.value)}
          style={{ marginBottom: 16 }}
        />
        <Table
          rowKey="id"
          dataSource={filteredProducts}
          columns={sectionColumns}
          pagination={{ pageSize: 8 }}
          size="small"
        />
      </Modal>

      <Modal
        open={scheduleModalOpen}
        title="Schedule Website Publication"
        onCancel={() => setScheduleModalOpen(false)}
        onOk={handleSchedule}
        okButtonProps={{ disabled: !scheduleAt, loading: publishing }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Paragraph>
            Choose the future publish time in your workspace timezone. Today is Wednesday, August 12, 2026.
          </Typography.Paragraph>
          <DatePicker
            showTime
            style={{ width: "100%" }}
            value={scheduleAt}
            onChange={setScheduleAt}
            disabledDate={(current) => current && current < dayjs().startOf("day")}
          />
        </Space>
      </Modal>
    </div>
  );
}
