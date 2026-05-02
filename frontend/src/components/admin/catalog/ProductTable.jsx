import { Button, Dropdown, Space, Table } from "antd";
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
              items: [
                {
                  key: "duplicate",
                  icon: <CopyOutlined />,
                  label: "Duplicate Product",
                  disabled: !permissions.canCreate,
                  onClick: () => onDuplicate(product)
                },
                {
                  key: "visibility",
                  icon:
                    product.visibility === "visible" ? <EyeInvisibleOutlined /> : <EyeOutlined />,
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
              ]
            }}
          >
            <Button type="text" icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <Table
      rowKey="_id"
      loading={loading}
      columns={columns}
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
