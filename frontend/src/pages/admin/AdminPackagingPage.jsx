import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from "antd";
import {
  GiftOutlined,
  InboxOutlined,
  SearchOutlined,
  ShoppingOutlined,
  TagOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminKpiSection from "../../components/admin/AdminKpiSection";
import { useCurrency } from "../../context/CurrencyContext";
import { getProducts, updateProductPackaging } from "../../services/productService";
import { getPackagingProfiles, updatePackagingProfile } from "../../services/packagingProfileService";
import { openProductWorkspace } from "../../utils/productWorkspaceNavigation";
import "../../styles/adminCatalog.css";

const defaultFilters = {
  search: "",
  workflow: "all",
  packaging: "all"
};

function normalizePackagingCost(value, fallback = 0) {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }
  return Number(numericValue.toFixed(2));
}

function getPackagingReadiness(product) {
  if (product.stockStatus === "Out of Stock") {
    return { label: "Waiting for Stock", color: "red", score: 50 };
  }
  if (product.packagingCost <= 0) {
    return { label: "Packaging Missing", color: "orange", score: 100 };
  }
  if (product.workflowStatus === "image_pending") {
    return { label: "Media Pending", color: "gold", score: 70 };
  }
  if (product.workflowStatus === "draft") {
    return { label: "Details Pending", color: "default", score: 60 };
  }
  if (product.workflowStatus === "ready_to_publish") {
    return { label: "Pack Ready", color: "green", score: 30 };
  }
  if (product.workflowStatus === "published") {
    return { label: "Live and Ready", color: "green", score: 20 };
  }
  return { label: "Review", color: "default", score: 10 };
}

function getPackingPriority(product) {
  const isGift = product.tags?.includes("gift") || product.occasion === "Gift";
  if (product.packagingCost <= 0 && product.workflowStatus === "published") {
    return { label: "Critical", color: "red" };
  }
  if (product.packagingCost <= 0 || product.stockStatus === "Low Stock") {
    return { label: "High", color: "orange" };
  }
  if (isGift || product.workflowStatus === "ready_to_publish") {
    return { label: "Medium", color: "gold" };
  }
  return { label: "Normal", color: "green" };
}

function getRecommendedProfile(product, profiles = []) {
  if (!profiles.length) return null;
  if (product.occasion === "Wedding") {
    return profiles.find((profile) => profile.name === "Luxury Bridal") || profiles[0];
  }
  if (product.tags?.includes("gift") || product.occasion === "Gift") {
    return profiles.find((profile) => profile.name === "Gift Box") || profiles[0];
  }
  if (product.workflowStatus === "published") {
    return profiles.find((profile) => profile.name === "Premium Finish") || profiles[0];
  }
  return profiles.find((profile) => profile.name === "Standard Core") || profiles[0];
}

function buildPackagingStats(products) {
  const packagingMissingCount = products.filter((product) => product.packagingCost <= 0).length;

  return [
    {
      key: "tracked",
      label: "Tracked Products",
      value: products.length,
      icon: <ShoppingOutlined />,
      tone: "total"
    },
    {
      key: "with_packaging",
      label: "Packaging Cost Set",
      value: products.filter((product) => product.packagingCost > 0).length,
      icon: <GiftOutlined />,
      tone: "active"
    },
    {
      key: "missing_packaging",
      label: "Packaging Missing",
      value: packagingMissingCount,
      icon: <WarningOutlined />,
      tone: packagingMissingCount > 0 ? "out" : "active"
    },
    {
      key: "pack_ready",
      label: "Pack Ready",
      value: products.filter(
        (product) => getPackagingReadiness(product).label === "Pack Ready"
      ).length,
      icon: <InboxOutlined />,
      tone: "active"
    },
    {
      key: "gift_candidates",
      label: "Gift Candidates",
      value: products.filter(
        (product) => product.tags?.includes("gift") || product.occasion === "Gift"
      ).length,
      icon: <TagOutlined />,
      tone: "low"
    }
  ];
}

function getPackagingRecommendation(product, profiles = []) {
  const readiness = getPackagingReadiness(product).label;
  const profile = getRecommendedProfile(product, profiles);
  if (!profile) return "No packaging profile recommendation is available yet.";
  if (readiness === "Packaging Missing" && product.workflowStatus === "published") {
    return `Apply ${profile.name} before relying on live margin and dispatch readiness.`;
  }
  if (readiness === "Packaging Missing") {
    return `Set packaging cost with the ${profile.name} profile while this item is being prepared.`;
  }
  if (readiness === "Waiting for Stock") {
    return "Packaging is set. Revisit once stock is replenished.";
  }
  if (product.tags?.includes("gift") || product.occasion === "Gift") {
    return `Gift-focused item. ${profile.name} is the current default recommendation.`;
  }
  if (product.workflowStatus === "ready_to_publish") {
    return `Packaging and catalog prep are aligned. ${profile.name} fits the current state.`;
  }
  return `Packaging cost is in place. ${profile.name} remains the active default profile.`;
}

export default function AdminPackagingPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { formatMoney } = useCurrency();
  const [products, setProducts] = useState([]);
  const [profileCatalog, setProfileCatalog] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [profileDraftValue, setProfileDraftValue] = useState("");
  const profileInputRef = useRef(null);
  const canManageProfiles = hasPermission("packaging.profiles.manage");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [productData, profileData] = await Promise.all([
        getProducts({ admin: true, includeArchived: true }),
        getPackagingProfiles()
      ]);
      setProducts(productData);
      setProfileCatalog(profileData);
      setDrafts(
        Object.fromEntries(
          productData.map((product) => {
            const profile = getRecommendedProfile(product, profileData);
            return [
              product._id,
              {
                packagingCost: product.packagingCost || 0,
                packagingProfileId: product.packagingProfileId || profile?.id || "",
                packagingProfileLabel: product.packagingProfileLabel || profile?.name || "",
                packagingCostSource: product.packagingCostSource || "custom"
              }
            ];
          })
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!editingProfileId || !profileInputRef.current) {
      return;
    }
    profileInputRef.current.focus({
      cursor: "all"
    });
  }, [editingProfileId]);

  const stats = useMemo(() => buildPackagingStats(products), [products]);

  const enrichedProducts = useMemo(
    () =>
      products.map((product) => {
        const recommendedProfile = getRecommendedProfile(product, profileCatalog);
        return {
          ...product,
          packagingReadiness: getPackagingReadiness(product),
          packingPriority: getPackingPriority(product),
          recommendedProfile,
          packagingRecommendation: getPackagingRecommendation(product, profileCatalog)
        };
      }),
    [products, profileCatalog]
  );

  const filteredProducts = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return enrichedProducts.filter((product) => {
      const matchesSearch =
        !search ||
        [
          product.displayName,
          product.sku,
          product.displayCategory,
          product.supplierName,
          product.purchaseBatchId,
          product.recommendedProfile?.name || ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesWorkflow =
        filters.workflow === "all" || product.workflowStatus === filters.workflow;

      const matchesPackaging =
        filters.packaging === "all" ||
        (filters.packaging === "missing" && product.packagingCost <= 0) ||
        (filters.packaging === "set" && product.packagingCost > 0) ||
        (filters.packaging === "gift" &&
          (product.tags?.includes("gift") || product.occasion === "Gift")) ||
        (filters.packaging === "ready" && product.packagingReadiness.label === "Pack Ready");

      return matchesSearch && matchesWorkflow && matchesPackaging;
    });
  }, [enrichedProducts, filters]);

  const actionQueue = useMemo(
    () =>
      [...enrichedProducts]
        .filter(
          (product) =>
            product.packagingReadiness.score >= 50 ||
            product.packingPriority.label !== "Normal"
        )
        .sort((a, b) => {
          if (b.packagingReadiness.score !== a.packagingReadiness.score) {
            return b.packagingReadiness.score - a.packagingReadiness.score;
          }
          const priorityRank = { Critical: 4, High: 3, Medium: 2, Normal: 1 };
          return (
            (priorityRank[b.packingPriority.label] || 0) -
            (priorityRank[a.packingPriority.label] || 0)
          );
        })
        .slice(0, 6),
    [enrichedProducts]
  );

  const handleDraftChange = (productId, updates) => {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        ...updates
      }
    }));
  };

  const applyProfile = (productId, profile) => {
    handleDraftChange(productId, {
      packagingCost: profile.defaultCost,
      packagingProfileId: profile.id,
      packagingProfileLabel: profile.name
    });
  };

  const beginProfileEdit = (profile) => {
    if (!canManageProfiles) {
      return;
    }
    setEditingProfileId(profile.id);
    setProfileDraftValue(profile.defaultCost.toFixed(2));
  };

  const commitProfileEdit = (profileId) => {
    const activeProfile = profileCatalog.find((profile) => profile.id === profileId);
    if (!activeProfile) {
      setEditingProfileId(null);
      setProfileDraftValue("");
      return;
    }

    const nextCost = normalizePackagingCost(profileDraftValue, activeProfile.defaultCost);
    updatePackagingProfile(profileId, { defaultCost: nextCost })
      .then(async () => {
        setEditingProfileId(null);
        setProfileDraftValue("");
        message.success("Packaging profile cost updated.");
        await loadProducts();
      })
      .catch(() => {
        message.error("Packaging profile update failed.");
      });
  };

  const cancelProfileEdit = () => {
    setEditingProfileId(null);
    setProfileDraftValue("");
  };

  const handleSave = async (productId) => {
    const next = drafts[productId];
    await updateProductPackaging(productId, {
      packagingCost: Number(next.packagingCost ?? 0),
      packagingProfileId: next.packagingProfileId || "",
      packagingProfileLabel: next.packagingProfileLabel || "",
      packagingCostSource: next.packagingCostSource || "custom"
    });
    message.success("Packaging cost updated.");
    await loadProducts();
  };

  return (
    <div className="catalog-admin-page">
      <Card
        title="Packaging Workspace"
        className="nuva-card catalog-shell-card"
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Manage packaging cost and prep readiness against the same shared product records used by
          catalog, purchases, and inventory. Packaging profiles now provide reusable defaults by
          product context so the team can apply consistent presentation choices faster.
        </Typography.Paragraph>
      </Card>

      <AdminKpiSection title="Packaging Overview" items={stats} />

      <Card className="nuva-card catalog-shell-card">
        <div className="catalog-phase-note">
          <strong>Packaging focus:</strong> use profile defaults to close packaging-cost gaps and keep
          product presentation consistent before dispatch or live sales depend on it.
        </div>
        <div className="inventory-filter-grid">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by product, SKU, supplier, batch, or profile"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
          <Select
            value={filters.workflow}
            onChange={(value) => setFilters((current) => ({ ...current, workflow: value }))}
            options={[
              { label: "All workflows", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Image Pending", value: "image_pending" },
              { label: "Ready to Publish", value: "ready_to_publish" },
              { label: "Publish", value: "published" },
              { label: "Archived", value: "archived" }
            ]}
          />
          <Select
            value={filters.packaging}
            onChange={(value) => setFilters((current) => ({ ...current, packaging: value }))}
            options={[
              { label: "All packaging states", value: "all" },
              { label: "Packaging Missing", value: "missing" },
              { label: "Packaging Set", value: "set" },
              { label: "Gift Candidates", value: "gift" },
              { label: "Pack Ready", value: "ready" }
            ]}
          />
          <Button onClick={() => setFilters(defaultFilters)}>Reset Filters</Button>
        </div>
      </Card>

      <Card className="nuva-card catalog-shell-card" title="Packaging Profiles">
        <div className="inventory-queue-list">
          {profileCatalog.map((profile) => (
            <div className="inventory-queue-item" key={profile.id}>
              <div className="inventory-queue-copy">
                <div className="inventory-queue-topline">
                    <strong>{profile.name}</strong>
                  {canManageProfiles && editingProfileId === profile.id ? (
                    <div className="packaging-profile-price-editor">
                      <span>{profile.currency || "AED"}</span>
                      <Input
                        ref={profileInputRef}
                        value={profileDraftValue}
                        inputMode="decimal"
                        aria-label={`${profile.name} packaging cost`}
                        onChange={(event) => setProfileDraftValue(event.target.value)}
                        onPressEnter={() => commitProfileEdit(profile.id)}
                        onBlur={() => commitProfileEdit(profile.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            cancelProfileEdit();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`packaging-profile-price-pill${
                        canManageProfiles ? " is-editable" : ""
                      }`}
                      onClick={() => beginProfileEdit(profile)}
                    >
                      {formatMoney(profile.defaultCost, profile.currency || "AED")}
                    </button>
                  )}
                </div>
                <span>{profile.description}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="nuva-card catalog-shell-card" title="Packaging Action Queue">
        {actionQueue.length ? (
          <div className="inventory-queue-list">
            {actionQueue.map((product) => (
              <div className="inventory-queue-item" key={product._id}>
                <div className="inventory-queue-copy">
                  <div className="inventory-queue-topline">
                    <strong>{product.displayName}</strong>
                    <Tag color={product.packagingReadiness.color}>
                      {product.packagingReadiness.label}
                    </Tag>
                  </div>
                  <span>
                    {product.displayCategory} - SKU: {product.sku || "Not set"} - Default:{" "}
                    {product.packagingProfileLabel || product.recommendedProfile?.name || "Not assigned"}
                  </span>
                  <p>{product.packagingRecommendation}</p>
                </div>
                <div className="inventory-queue-actions">
                  <Button
                    type="default"
                    onClick={() =>
                      setFilters({
                        search: product.displayName,
                        workflow: "all",
                        packaging: "all"
                      })
                    }
                  >
                    Focus Row
                  </Button>
                  <Button
                    type="link"
                    onClick={() =>
                      openProductWorkspace(navigate, product._id, {
                        section: "packaging",
                        from: "packaging",
                        pathname: "/admin/packaging"
                      })
                    }
                  >
                    Open Packaging Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            No urgent packaging items are currently queued.
          </Typography.Paragraph>
        )}
      </Card>

      <Card className="nuva-card catalog-table-card">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={filteredProducts}
          scroll={{ x: 1700 }}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            position: ["bottomRight"],
            showTotal: (total, [start, end]) => `Showing ${start} to ${end} of ${total} products`
          }}
          columns={[
            {
              title: "Product Record",
              width: 290,
              render: (_, record) => (
                <div className="catalog-product-cell">
                  <img src={record.primaryImage} alt={record.displayName} className="catalog-thumb" />
                  <div>
                    <div className="catalog-cell-title">{record.displayName}</div>
                    <div className="catalog-cell-subtitle">
                      {record.displayCategory} - SKU: {record.sku || "Not set"}
                    </div>
                  </div>
                </div>
              )
            },
            {
              title: "Readiness",
              width: 170,
              render: (_, record) => (
                <Tag color={record.packagingReadiness.color}>{record.packagingReadiness.label}</Tag>
              )
            },
            {
              title: "Priority",
              width: 140,
              render: (_, record) => (
                <Tag color={record.packingPriority.color}>{record.packingPriority.label}</Tag>
              )
            },
            {
              title: "Recommended Profile",
              width: 220,
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>{record.recommendedProfile?.name || "Not available"}</strong>
                  <span>{record.recommendedProfile?.description || "No recommendation rules available."}</span>
                </div>
              )
            },
            {
              title: "Assigned Profile",
              width: 210,
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>{drafts[record._id]?.packagingProfileLabel || record.packagingProfileLabel || "Not assigned"}</strong>
                  <span>{record.packagingProfileId || drafts[record._id]?.packagingProfileId || "Uses recommendation if empty"}</span>
                </div>
              )
            },
            {
              title: "Workflow",
              width: 160,
              render: (_, record) => record.displayStatusLabel
            },
            {
              title: "Packaging Cost",
              width: 330,
              render: (_, record) => (
                <div className="inventory-adjust-stack">
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      min={0}
                      step={0.5}
                      style={{ width: "100%" }}
                      value={drafts[record._id]?.packagingCost}
                      onChange={(value) => handleDraftChange(record._id, { packagingCost: value })}
                    />
                    <Button onClick={() => handleSave(record._id)}>Save</Button>
                  </Space.Compact>
                  <Select
                    value={drafts[record._id]?.packagingProfileId}
                    options={profileCatalog.map((profile) => ({
                      label: `${profile.name} - ${formatMoney(profile.defaultCost, profile.currency || "AED")}`,
                      value: profile.id
                    }))}
                    onChange={(value) => {
                      const profile = profileCatalog.find((item) => item.id === value);
                      if (profile) {
                        applyProfile(record._id, profile);
                      }
                    }}
                  />
                </div>
              )
            },
            {
              title: "Recommendation",
              width: 320,
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>
                    {record.packagingCost > 0 ? formatMoney(record.packagingCost, record.currency || "AED") : "Not set"}
                  </strong>
                  <span>{record.packagingRecommendation}</span>
                </div>
              )
            },
            {
              title: "Actions",
              width: 150,
              render: (_, record) => (
                <Button
                  type="link"
                  style={{ paddingInline: 0 }}
                  onClick={() =>
                    openProductWorkspace(navigate, record._id, {
                      section: "packaging",
                      from: "packaging",
                      pathname: "/admin/packaging"
                    })
                  }
                >
                  Open Packaging Details
                </Button>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
