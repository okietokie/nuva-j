import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from "antd";
import {
  AppstoreOutlined,
  InboxOutlined,
  ProfileOutlined,
  SearchOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminKpiSection from "../../components/admin/AdminKpiSection";
import { useCurrency } from "../../context/CurrencyContext";
import { getProducts, updateProduct, updateStock } from "../../services/productService";
import "../../styles/adminCatalog.css";

const defaultFilters = {
  search: "",
  workflow: "all",
  stock: "all"
};

const movementTypeOptions = [
  { label: "Manual Correction", value: "manual_adjustment" },
  { label: "Restock", value: "restock" },
  { label: "Damage / Loss", value: "damage" },
  { label: "Customer Return", value: "return" },
  { label: "Sale Correction", value: "sale_correction" }
];

const quickAdjustmentSteps = [-5, -1, 1, 5];

const inventoryPresets = [
  {
    label: "Restock",
    movementType: "restock",
    note: "Restocked from supplier delivery."
  },
  {
    label: "Damage",
    movementType: "damage",
    note: "Stock reduced due to damaged item."
  },
  {
    label: "Return",
    movementType: "return",
    note: "Stock increased after customer return."
  },
  {
    label: "Correction",
    movementType: "sale_correction",
    note: "Stock corrected after sales reconciliation."
  }
];

function stockColor(stockStatus) {
  if (stockStatus === "Out of Stock") return "red";
  if (stockStatus === "Low Stock") return "orange";
  if (stockStatus === "Not set") return "default";
  return "green";
}

function formatMovementDate(value) {
  if (!value) return "Unknown time";
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildInventoryStats(products) {
  const lowStockCount = products.filter((product) => product.stockStatus === "Low Stock").length;
  const outOfStockCount = products.filter((product) => product.stockStatus === "Out of Stock").length;

  return [
    {
      key: "records",
      label: "Tracked Records",
      value: products.length,
      icon: <AppstoreOutlined />,
      tone: "total"
    },
    {
      key: "in_stock",
      label: "In Stock",
      value: products.filter((product) => product.stockStatus === "In Stock").length,
      icon: <InboxOutlined />,
      tone: "active"
    },
    {
      key: "low_stock",
      label: "Low Stock",
      value: lowStockCount,
      icon: <WarningOutlined />,
      tone: lowStockCount > 0 ? "low" : "total"
    },
    {
      key: "out_of_stock",
      label: "Out of Stock",
      value: outOfStockCount,
      icon: <WarningOutlined />,
      tone: outOfStockCount > 0 ? "out" : "total"
    },
    {
      key: "ready",
      label: "Ready To Publish",
      value: products.filter((product) => product.workflowStatus === "ready_to_publish").length,
      icon: <ProfileOutlined />,
      tone: "active"
    }
  ];
}

function getInventoryActionRecommendation(product) {
  if (product.stockStatus === "Out of Stock" && product.purchaseBatchId) {
    return "Restock from the linked purchase batch or confirm a new supplier delivery.";
  }
  if (product.stockStatus === "Out of Stock") {
    return "Record a restock plan and link a supplier or purchase batch.";
  }
  if (product.stockStatus === "Low Stock") {
    return "Review the low-stock threshold and prepare a replenishment update.";
  }
  if (product.workflowStatus === "image_pending") {
    return "Complete showcase media so stock is ready for publishing.";
  }
  if (product.workflowStatus === "draft") {
    return "Finish product details before pushing this stocked item live.";
  }
  if (!product.purchaseBatchId) {
    return "Link this stocked item to a purchase batch for cleaner margin tracking.";
  }
  return "Inventory is healthy. Review recent movement history if anything changes.";
}

function getInventoryPriorityScore(product) {
  if (product.stockStatus === "Out of Stock") return 100;
  if (product.stockStatus === "Low Stock") return 80;
  if (product.workflowStatus === "image_pending") return 60;
  if (product.workflowStatus === "draft") return 50;
  if (!product.purchaseBatchId) return 40;
  return 0;
}

export default function AdminInventoryPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const { formatMoney: formatCurrency } = useCurrency();
  const [drafts, setDrafts] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const canUpdateInventory = hasPermission("inventory.update");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts({ admin: true, includeArchived: true });
      setProducts(data);
      setDrafts(
        Object.fromEntries(
          data.map((product) => [
            product._id,
            {
              stock: product.stock,
              lowStockLimit: product.lowStockLimit,
              note: "",
              movementType: "manual_adjustment"
            }
          ])
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const stats = useMemo(() => buildInventoryStats(products), [products]);

  const filteredProducts = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        [
          product.displayName,
          product.sku,
          product.displayCategory,
          product.supplierName,
          product.purchaseBatchId
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesWorkflow =
        filters.workflow === "all" || product.workflowStatus === filters.workflow;
      const matchesStock = filters.stock === "all" || product.stockStatus === filters.stock;

      return matchesSearch && matchesWorkflow && matchesStock;
    });
  }, [filters, products]);

  const attentionCount = useMemo(
    () =>
      products.filter(
        (product) =>
          product.stockStatus === "Low Stock" ||
          product.stockStatus === "Out of Stock" ||
          product.workflowStatus === "image_pending"
      ).length,
    [products]
  );

  const actionQueue = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          priorityScore: getInventoryPriorityScore(product),
          recommendation: getInventoryActionRecommendation(product)
        }))
        .filter((product) => product.priorityScore > 0)
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 6),
    [products]
  );

  const handleDraftChange = (productId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [field]: value
      }
    }));
  };

  const adjustDraftStock = (productId, delta) => {
    setDrafts((current) => {
      const existing = current[productId] || {};
      const nextStock = Math.max(0, Number(existing.stock ?? 0) + delta);
      return {
        ...current,
        [productId]: {
          ...existing,
          stock: nextStock
        }
      };
    });
  };

  const applyPreset = (productId, preset) => {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        movementType: preset.movementType,
        note: preset.note
      }
    }));
  };

  const handleSave = async (productId) => {
    const next = drafts[productId];
    await updateStock(productId, {
      stock: Number(next.stock ?? 0),
      movementType: next.movementType || "manual_adjustment",
      note: next.note || undefined
    });
    await updateProduct(productId, { lowStockLimit: Number(next.lowStockLimit ?? 0) });
    message.success("Shared stock record updated.");
    await loadProducts();
  };

  const renderStockHistory = (record) => (
    <div className="inventory-history-panel">
      <div className="inventory-history-head">
        <strong>Recent Stock Movements</strong>
        <span>
          {record.stockMovements?.length
            ? `${record.stockMovements.length} logged movement${record.stockMovements.length === 1 ? "" : "s"}`
            : "No stock movements recorded yet"}
        </span>
      </div>
      {record.stockMovements?.length ? (
        <div className="inventory-history-list">
          {record.stockMovements.map((movement, index) => (
            <div className="inventory-history-item" key={`${record._id}-movement-${index}`}>
              <div className="inventory-history-topline">
                <strong>{movement.displayType}</strong>
                <span className={movement.quantityChange < 0 ? "tone-out" : "tone-in"}>
                  {movement.displayChangeLabel} units
                </span>
              </div>
              <div className="inventory-history-meta">
                <span>
                  {movement.previousStock} to {movement.newStock} units
                </span>
                <span>{formatMovementDate(movement.createdAt)}</span>
                <span>{movement.actorName || (movement.orderId ? `Order ${movement.orderId}` : "System")}</span>
              </div>
              {movement.note ? <p>{movement.note}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="catalog-admin-page">
      <Card
        title="Inventory Workspace"
        className="nuva-card catalog-shell-card"
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Track quantity, stock alerts, publishing readiness, and costing context from one inventory
          view. Every stock change is traceable, and common actions like restock, damage, return,
          and correction can now be prepared faster with presets and quick stock steps.
        </Typography.Paragraph>
      </Card>

      <AdminKpiSection title="Inventory Overview" items={stats} />

      <Card className="nuva-card catalog-shell-card">
        <div className="catalog-phase-note">
          <strong>Needs attention:</strong> {attentionCount} records currently need stock or workflow
          follow-up. Use the filters below to isolate low-stock, out-of-stock, or draft-stage items.
        </div>
        <div className="inventory-filter-grid">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by product, SKU, supplier, or batch"
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
            value={filters.stock}
            onChange={(value) => setFilters((current) => ({ ...current, stock: value }))}
            options={[
              { label: "All stock states", value: "all" },
              { label: "In Stock", value: "In Stock" },
              { label: "Low Stock", value: "Low Stock" },
              { label: "Out of Stock", value: "Out of Stock" },
              { label: "Not set", value: "Not set" }
            ]}
          />
          <Button onClick={() => setFilters(defaultFilters)}>Reset Filters</Button>
        </div>
      </Card>

      <Card className="nuva-card catalog-shell-card" title="Inventory Action Queue">
        {actionQueue.length ? (
          <div className="inventory-queue-list">
            {actionQueue.map((product) => (
              <div className="inventory-queue-item" key={product._id}>
                <div className="inventory-queue-copy">
                  <div className="inventory-queue-topline">
                    <strong>{product.displayName}</strong>
                    <Tag color={stockColor(product.stockStatus)}>{product.stockStatus}</Tag>
                  </div>
                  <span>
                    {product.displayCategory} - SKU: {product.sku || "Not set"} - Workflow:{" "}
                    {product.displayStatusLabel}
                  </span>
                  <p>{product.recommendation}</p>
                </div>
                <div className="inventory-queue-actions">
                  <Button
                    type="default"
                    onClick={() =>
                      setFilters({
                        search: product.displayName,
                        workflow: "all",
                        stock: "all"
                      })
                    }
                  >
                    Focus Row
                  </Button>
                  <Button type="link" onClick={() => navigate(`/admin/products/${product._id}`)}>
                    Open Product
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            No urgent inventory actions are currently queued.
          </Typography.Paragraph>
        )}
      </Card>

      <Card className="nuva-card catalog-table-card">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={filteredProducts}
          scroll={{ x: 1440 }}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            position: ["bottomRight"],
            showTotal: (total, [start, end]) => `Showing ${start} to ${end} of ${total} records`
          }}
          expandable={{
            expandedRowRender: renderStockHistory,
            rowExpandable: () => true
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
              title: "Stock Status",
              width: 140,
              render: (_, record) => <Tag color={stockColor(record.stockStatus)}>{record.stockStatus}</Tag>
            },
            {
              title: "Workflow",
              width: 160,
              render: (_, record) => record.displayStatusLabel
            },
            {
              title: "Cost Context",
              width: 190,
              render: (_, record) => (
                <div className="catalog-cost-cell">
                  <strong>{record.totalProductCost ? formatCurrency(record.totalProductCost, record.currency || "AED") : "Cost not set"}</strong>
                  <span>{record.suggestedSellingPrice ? formatCurrency(record.suggestedSellingPrice, record.currency || "AED") : "Not suggested"}</span>
                  <small>{record.supplierName || "No supplier linked"}</small>
                </div>
              )
            },
            {
              title: "Purchase Link",
              width: 180,
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>{record.purchaseBatchId || "No batch linked"}</strong>
                  <span>{record.quantityPurchased ? `${record.quantityPurchased} purchased` : "No quantity logged"}</span>
                </div>
              )
            },
            {
              title: "Available Quantity",
              width: 130,
              render: (_, record) => `${record.stock} units`
            },
            {
              title: "Low-Stock Limit",
              width: 160,
              render: (_, record) => (
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  disabled={!canUpdateInventory}
                  value={drafts[record._id]?.lowStockLimit}
                  onChange={(value) => handleDraftChange(record._id, "lowStockLimit", value)}
                />
              )
            },
            {
              title: "Adjust Stock",
              width: 380,
              render: (_, record) => (
                <div className="inventory-adjust-stack">
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      disabled={!canUpdateInventory}
                      value={drafts[record._id]?.stock}
                      onChange={(value) => handleDraftChange(record._id, "stock", value)}
                    />
                    <Button disabled={!canUpdateInventory} onClick={() => handleSave(record._id)}>
                      Save
                    </Button>
                  </Space.Compact>
                  <div className="inventory-step-row">
                    {quickAdjustmentSteps.map((step) => (
                      <Button
                        key={`${record._id}-step-${step}`}
                        disabled={!canUpdateInventory}
                        onClick={() => adjustDraftStock(record._id, step)}
                      >
                        {step > 0 ? `+${step}` : step}
                      </Button>
                    ))}
                  </div>
                  <Select
                    options={movementTypeOptions}
                    disabled={!canUpdateInventory}
                    value={drafts[record._id]?.movementType}
                    onChange={(value) => handleDraftChange(record._id, "movementType", value)}
                  />
                  <Input
                    placeholder="Adjustment note, e.g. recount or damaged item"
                    disabled={!canUpdateInventory}
                    value={drafts[record._id]?.note}
                    onChange={(event) => handleDraftChange(record._id, "note", event.target.value)}
                  />
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
                  onClick={() => navigate(`/admin/products/${record._id}`)}
                >
                  Open Product
                </Button>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
