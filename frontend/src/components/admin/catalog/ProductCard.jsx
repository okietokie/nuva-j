import { Button, Dropdown } from "antd";
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

export default function ProductCard({
  product,
  permissions,
  onEdit,
  onView,
  onDuplicate,
  onToggleVisibility,
  onToggleArchive,
  onDelete
}) {
  const labels = [];
  if (product.isBestSeller) labels.push("bestseller");
  if (product.isNewArrival) labels.push("new");
  if (product.hasSale) labels.push("sale");
  if (product.isFeatured) labels.push("featured");

  return (
    <article className="catalog-product-card">
      <img src={product.primaryImage} alt={product.displayName} className="catalog-product-art" />
      <div className="catalog-product-body">
        <span className="catalog-mini-category">{product.displayCategory}</span>
        <h4>{product.displayName}</h4>
        <div className="catalog-price-stack">
          <strong>{product.displayPriceLabel}</strong>
          {product.hasSale ? <span>AED {product.price}</span> : null}
        </div>
        <div className="catalog-stock-copy">
          <span>{product.stockStatus}</span>
          <span>({product.stock})</span>
        </div>
        <div className="catalog-badge-row">
          <ProductStatusBadge type="status" value={product.status} />
          <ProductStatusBadge type="visibility" value={product.visibility} />
          {labels.slice(0, 2).map((label) => (
            <ProductStatusBadge key={label} type="label" value={label} />
          ))}
        </div>
      </div>
      <div className="catalog-card-actions">
        <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(product)} />
        <Button type="text" icon={<EyeOutlined />} onClick={() => onView(product)} />
        <Dropdown
          menu={{
            items: [
              {
                key: "duplicate",
                icon: <CopyOutlined />,
                label: "Duplicate",
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
            ]
          }}
          trigger={["click"]}
        >
          <Button type="text" icon={<EllipsisOutlined />} />
        </Dropdown>
      </div>
    </article>
  );
}
