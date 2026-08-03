import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Dropdown, Grid, Space, Table } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { useCurrency } from "../../../context/CurrencyContext";
import AdminBulkActionBar from "../AdminBulkActionBar";
import AdminDeleteConfirmDialog from "../AdminDeleteConfirmDialog";
import ProductStatusBadge from "./ProductStatusBadge";

function renderLabels(product) {
  const labels = [];
  if (product.isBestSeller) labels.push("bestseller");
  if (product.isNewArrival) labels.push("new");
  if (product.hasSale) labels.push("sale");
  if (product.isFeatured) labels.push("featured");

  if (!labels.length) {
    return <span className="catalog-muted-dash">-</span>;
  }

  return (
    <Space wrap size={6}>
      {labels.map((label) => (
        <ProductStatusBadge key={label} type="label" value={label} />
      ))}
    </Space>
  );
}

function getProductMobileMeta(product, formatMoney) {
  const originalCount = product.originalMedia?.length || 0;
  const showcaseCount = product.showcaseMedia?.length || 0;

  return [
    `SKU: ${product.sku || "Not set"}`,
    `Original: ${originalCount}`,
    `Showcase: ${showcaseCount}`,
    `Cost: ${formatMoney(product.totalProductCost, product.currency || "AED")}`,
    `Supplier: ${product.supplierName || "Not linked"}`,
  ];
}

function buildSingleDeleteDialog(product) {
  return {
    title: "Delete product?",
    message: `Are you sure you want to delete '${product.displayName}'? This action cannot be undone.`,
    confirmLabel: "Delete product",
  };
}

function buildBulkDeleteDialog(count) {
  return {
    title: "Delete selected products?",
    message: `You are about to permanently delete ${count} products. Their images, stock information, pricing, labels and related product data may also be removed. This action cannot be undone.`,
    confirmLabel: `Delete ${count} products`,
  };
}

export default function ProductTable({
  products,
  loading,
  permissions,
  onEdit,
  onView,
  onDuplicate,
  onToggleVisibility,
  onToggleArchive,
  onDeleteSingle,
  onDeleteBulk,
}) {
  const { formatMoney } = useCurrency();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 7 });

  useEffect(() => {
    setSelectedProductIds((current) =>
      current.filter((productId) => products.some((product) => product._id === productId)),
    );
  }, [products]);

  const currentPageProducts = useMemo(() => {
    if (isMobile) {
      return products;
    }

    const startIndex = (pagination.current - 1) * pagination.pageSize;
    return products.slice(startIndex, startIndex + pagination.pageSize);
  }, [isMobile, pagination.current, pagination.pageSize, products]);

  const currentPageIds = useMemo(
    () => currentPageProducts.map((product) => product._id),
    [currentPageProducts],
  );
  const allFilteredIds = useMemo(() => products.map((product) => product._id), [products]);
  const isCurrentPageFullySelected = useMemo(
    () =>
      currentPageIds.length > 0 &&
      currentPageIds.every((productId) => selectedProductIds.includes(productId)),
    [currentPageIds, selectedProductIds],
  );

  const selectAllResults = () => {
    setSelectedProductIds(allFilteredIds);
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
  };

  const toggleCardSelection = (productId, checked) => {
    setSelectedProductIds((current) => {
      if (checked) {
        return current.includes(productId) ? current : [...current, productId];
      }
      return current.filter((id) => id !== productId);
    });
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const result = await onDeleteBulk(selectedProductIds);
      if (result?.deletedIds?.length) {
        setSelectedProductIds((current) =>
          current.filter((productId) => !result.deletedIds.includes(productId)),
        );
      }
      if (result?.deletedIds?.length === selectedProductIds.length) {
        setBulkDeleteOpen(false);
      } else if ((result?.deletedIds?.length || 0) > 0) {
        setBulkDeleteOpen(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSingleDelete = async () => {
    if (!singleDeleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      const result = await onDeleteSingle(singleDeleteTarget);
      if (result?.success) {
        setSelectedProductIds((current) => current.filter((id) => id !== singleDeleteTarget._id));
        setSingleDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const actionMenuItems = (product) => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Edit Product",
      disabled: !permissions.canUpdate,
      onClick: () => onEdit(product),
    },
    {
      key: "view",
      icon: <EyeOutlined />,
      label: "View Product",
      onClick: () => onView(product),
    },
    {
      key: "duplicate",
      icon: <CopyOutlined />,
      label: "Duplicate Product",
      disabled: !permissions.canCreate,
      onClick: () => onDuplicate(product),
    },
    {
      key: "visibility",
      icon: product.visibility === "visible" ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      label: product.visibility === "visible" ? "Hide Product" : "Show Product",
      disabled: !permissions.canUpdate,
      onClick: () => onToggleVisibility(product),
    },
    {
      key: "archive",
      icon: <InboxOutlined />,
      label: product.workflowStatus === "archived" ? "Unarchive Product" : "Archive Product",
      disabled: !permissions.canDelete,
      onClick: () => onToggleArchive(product),
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete Product",
      danger: true,
      disabled: !permissions.canDelete,
      onClick: () => setSingleDeleteTarget(product),
    },
  ];

  const columns = [
    {
      title: "Product",
      dataIndex: "displayName",
      width: 290,
      render: (_, product) => (
        <div className="catalog-product-cell">
          <img src={product.primaryImage} alt={product.displayName} className="catalog-thumb" />
          <div>
            <div className="catalog-cell-title">{product.displayName}</div>
            <div className="catalog-cell-subtitle">SKU: {product.sku || "Not set"}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "displayCategory",
      width: 130,
    },
    {
      title: "Price",
      dataIndex: "displayPriceLabel",
      width: 120,
      render: (_, product) => (
        <div className="catalog-price-cell">
          <div>{formatMoney(product.price, product.currency || "AED")}</div>
          {product.hasSale ? <span>{formatMoney(product.price, product.currency || "AED")}</span> : null}
        </div>
      ),
    },
    {
      title: "Costing",
      dataIndex: "displayTotalCostLabel",
      width: 180,
      render: (_, product) => (
        <div className="catalog-cost-cell">
          <strong>{formatMoney(product.totalProductCost, product.currency || "AED")}</strong>
          <span>{formatMoney(product.suggestedSellingPrice, product.currency || "AED")}</span>
          <small>{product.supplierName || product.purchaseBatchId || "No purchase link"}</small>
        </div>
      ),
    },
    {
      title: "Stock",
      dataIndex: "stock",
      width: 126,
      render: (_, product) => (
        <div className="catalog-stock-cell">
          <div>{product.displayStockLabel}</div>
          <span className={`stock-copy-${product.stockStatus.toLowerCase().replace(/\s+/g, "-")}`}>
            {product.stockStatus}
          </span>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 108,
      render: (_, product) => <ProductStatusBadge type="status" value={product.workflowStatus} />,
    },
    {
      title: "Visibility",
      dataIndex: "visibility",
      width: 110,
      render: (value) => <ProductStatusBadge type="visibility" value={value} />,
    },
    {
      title: "Labels",
      width: 160,
      render: (_, product) => renderLabels(product),
    },
    {
      title: "Actions",
      width: 132,
      render: (_, product) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            disabled={!permissions.canUpdate}
            onClick={() => onEdit(product)}
          />
          <Button type="text" icon={<EyeOutlined />} onClick={() => onView(product)} />
          <Dropdown
            trigger={["click"]}
            menu={{
              items: actionMenuItems(product),
            }}
          >
            <Button type="text" icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const tabletColumns = columns.filter(
    (column) =>
      ["displayName", "displayPriceLabel", "displayTotalCostLabel", "stock", "status"].includes(column.dataIndex) ||
      column.title === "Actions",
  );

  const rowSelection = {
    selectedRowKeys: selectedProductIds,
    onChange: (keys) => setSelectedProductIds(keys),
    preserveSelectedRowKeys: true,
    getCheckboxProps: () => ({
      disabled: !permissions.canDelete,
    }),
  };

  const deleteDialog = singleDeleteTarget
    ? buildSingleDeleteDialog(singleDeleteTarget)
    : buildBulkDeleteDialog(selectedProductIds.length);

  if (isMobile) {
    return (
      <>
        {permissions.canDelete ? (
          <AdminBulkActionBar
            selectedCount={selectedProductIds.length}
            pageCount={currentPageIds.length}
            totalCount={products.length}
            noun="products"
            onSelectAllResults={products.length > selectedProductIds.length ? selectAllResults : null}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
            onClearSelection={clearSelection}
            deleting={deleting}
          />
        ) : null}
        <div className="catalog-product-card-grid" aria-busy={loading}>
          {products.map((product) => {
            const isSelected = selectedProductIds.includes(product._id);
            return (
              <article
                className={`catalog-product-card${isSelected ? " is-selected" : ""}`}
                key={product._id}
              >
                <label className="catalog-card-checkbox">
                  <Checkbox
                    disabled={!permissions.canDelete}
                    checked={isSelected}
                    onChange={(event) => toggleCardSelection(product._id, event.target.checked)}
                  >
                    Select product
                  </Checkbox>
                </label>
                <img
                  src={product.primaryImage}
                  alt={product.displayName}
                  className="catalog-product-art"
                />
                <div className="catalog-product-body">
                  <div className="catalog-product-card-head">
                    <span className="catalog-mini-category">{product.displayCategory}</span>
                    <ProductStatusBadge type="status" value={product.workflowStatus} />
                  </div>
                  <h4>{product.displayName}</h4>
                  <div className="catalog-mobile-meta-list">
                    {getProductMobileMeta(product, formatMoney).map((item) => (
                      <span key={item} className="catalog-cell-subtitle">
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="catalog-price-stack">
                    <strong>{formatMoney(product.price, product.currency || "AED")}</strong>
                    {product.hasSale ? <span>{formatMoney(product.price, product.currency || "AED")}</span> : null}
                  </div>
                  <div className="catalog-cost-stack">
                    <strong>{formatMoney(product.totalProductCost, product.currency || "AED")}</strong>
                    <span>{formatMoney(product.suggestedSellingPrice, product.currency || "AED")}</span>
                  </div>
                  <div className="catalog-stock-copy">
                    <span>{product.displayStockLabel}</span>
                    <span className={`stock-copy-${product.stockStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                      {product.stockStatus}
                    </span>
                  </div>
                  <div className="catalog-badge-row">
                    <ProductStatusBadge type="visibility" value={product.visibility} />
                    {renderLabels(product)}
                  </div>
                </div>
                <div className="catalog-card-actions">
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    disabled={!permissions.canUpdate}
                    onClick={() => onEdit(product)}
                  >
                    Edit
                  </Button>
                  <Button type="default" icon={<EyeOutlined />} onClick={() => onView(product)}>
                    Preview
                  </Button>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: actionMenuItems(product),
                    }}
                  >
                    <Button type="default" icon={<EllipsisOutlined />}>
                      More
                    </Button>
                  </Dropdown>
                </div>
              </article>
            );
          })}
        </div>

        <AdminDeleteConfirmDialog
          open={bulkDeleteOpen}
          title={deleteDialog.title}
          message={deleteDialog.message}
          confirmLabel={deleteDialog.confirmLabel}
          loading={deleting}
          onConfirm={handleBulkDelete}
          onCancel={() => !deleting && setBulkDeleteOpen(false)}
        />
        <AdminDeleteConfirmDialog
          open={Boolean(singleDeleteTarget)}
          title={deleteDialog.title}
          message={deleteDialog.message}
          confirmLabel={deleteDialog.confirmLabel}
          loading={deleting}
          onConfirm={handleSingleDelete}
          onCancel={() => !deleting && setSingleDeleteTarget(null)}
        />
      </>
    );
  }

  return (
    <>
      {permissions.canDelete ? (
        <AdminBulkActionBar
          selectedCount={selectedProductIds.length}
          pageCount={currentPageIds.length}
          totalCount={products.length}
          noun="products"
          onSelectAllResults={
            isCurrentPageFullySelected && products.length > selectedProductIds.length ? selectAllResults : null
          }
          onDeleteSelected={() => setBulkDeleteOpen(true)}
          onClearSelection={clearSelection}
          deleting={deleting}
        />
      ) : null}
      <Table
        rowKey="_id"
        loading={loading}
        rowSelection={rowSelection}
        columns={isTablet ? tabletColumns : columns}
        dataSource={products}
        pagination={{
          pageSize: pagination.pageSize,
          current: pagination.current,
          showSizeChanger: false,
          position: ["bottomRight"],
          showTotal: (total, [start, end]) => `Showing ${start} to ${end} of ${total} products`,
        }}
        onChange={(nextPagination) =>
          setPagination((current) => ({
            ...current,
            current: nextPagination.current || 1,
            pageSize: nextPagination.pageSize || current.pageSize,
          }))
        }
        rowClassName={(record) =>
          selectedProductIds.includes(record._id) ? "catalog-table-row-selected" : ""
        }
        className="catalog-table"
      />

      <AdminDeleteConfirmDialog
        open={bulkDeleteOpen}
        title={buildBulkDeleteDialog(selectedProductIds.length).title}
        message={buildBulkDeleteDialog(selectedProductIds.length).message}
        confirmLabel={buildBulkDeleteDialog(selectedProductIds.length).confirmLabel}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => !deleting && setBulkDeleteOpen(false)}
      />
      <AdminDeleteConfirmDialog
        open={Boolean(singleDeleteTarget)}
        title={singleDeleteTarget ? buildSingleDeleteDialog(singleDeleteTarget).title : "Delete product?"}
        message={singleDeleteTarget ? buildSingleDeleteDialog(singleDeleteTarget).message : ""}
        confirmLabel={
          singleDeleteTarget ? buildSingleDeleteDialog(singleDeleteTarget).confirmLabel : "Delete product"
        }
        loading={deleting}
        onConfirm={handleSingleDelete}
        onCancel={() => !deleting && setSingleDeleteTarget(null)}
      />
    </>
  );
}
