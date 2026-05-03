import { Button, Dropdown, Grid, Space, Table } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  InboxOutlined
} from "@ant-design/icons";
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

export default function ProductTable({
  products,
  loading,
  permissions,
  onEdit,
  onView,
  onDuplicate,
  onToggleVisibility,
  onToggleArchive,
  onDelete
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  const actionMenuItems = (product) => [
    {
      key: "duplicate",
      icon: <CopyOutlined />,
      label: "Duplicate Product",
      disabled: !permissions.canCreate,
      onClick: () => onDuplicate(product)
    },
    {
      key: "visibility",
      icon: product.visibility === "visible" ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      label: product.visibility === "visible" ? "Hide Product" : "Show Product",
      disabled: !permissions.canUpdate,
      onClick: () => onToggleVisibility(product)
    },
    {
      key: "archive",
      icon: <InboxOutlined />,
      label: product.status === "archived" ? "Unarchive Product" : "Archive Product",
      disabled: !permissions.canDelete,
      onClick: () => onToggleArchive(product)
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete Product",
      danger: true,
      disabled: !permissions.canDelete,
      onClick: () => onDelete(product)
    }
  ];

  const columns = [
    {
      title: "",
      dataIndex: "_select",
      width: 42,
      render: () => <input type="checkbox" aria-label="Select product" />
    },
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
      )
    },
    {
      title: "Category",
      dataIndex: "displayCategory",
      width: 130
    },
    {
      title: "Price",
      dataIndex: "displayPriceLabel",
      width: 120,
      render: (_, product) => (
        <div className="catalog-price-cell">
          <div>{product.displayPriceLabel}</div>
          {product.hasSale ? <span>AED {product.price}</span> : null}
        </div>
      )
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
      )
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 108,
      render: (value) => <ProductStatusBadge type="status" value={value} />
    },
    {
      title: "Visibility",
      dataIndex: "visibility",
      width: 110,
      render: (value) => <ProductStatusBadge type="visibility" value={value} />
    },
    {
      title: "Labels",
      width: 160,
      render: (_, product) => renderLabels(product)
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
              items: actionMenuItems(product)
            }}
          >
            <Button type="text" icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  const tabletColumns = columns.filter((column) =>
    ["displayName", "displayPriceLabel", "stock", "status"].includes(column.dataIndex) ||
    column.title === "Actions"
  );

  if (isMobile) {
    return (
      <div className="catalog-product-card-grid" aria-busy={loading}>
        {products.map((product) => (
          <article className="catalog-product-card" key={product._id}>
            <img
              src={product.primaryImage}
              alt={product.displayName}
              className="catalog-product-art"
            />
            <div className="catalog-product-body">
              <span className="catalog-mini-category">{product.displayCategory}</span>
              <h4>{product.displayName}</h4>
              <div className="catalog-cell-subtitle">SKU: {product.sku || "Not set"}</div>
              <div className="catalog-price-stack">
                <strong>{product.displayPriceLabel}</strong>
                {product.hasSale ? <span>AED {product.price}</span> : null}
              </div>
              <div className="catalog-stock-copy">
                <span>{product.displayStockLabel}</span>
                <span className={`stock-copy-${product.stockStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                  {product.stockStatus}
                </span>
              </div>
              <div className="catalog-badge-row">
                <ProductStatusBadge type="status" value={product.status} />
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
                View
              </Button>
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: actionMenuItems(product)
                }}
              >
                <Button type="default" icon={<EllipsisOutlined />}>
                  More
                </Button>
              </Dropdown>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <Table
      rowKey="_id"
      loading={loading}
      columns={isTablet ? tabletColumns : columns}
      dataSource={products}
      pagination={{
        pageSize: 7,
        showSizeChanger: false,
        position: ["bottomRight"],
        showTotal: (total, [start, end]) => `Showing ${start} to ${end} of ${total} products`
      }}
      className="catalog-table"
    />
  );
}
