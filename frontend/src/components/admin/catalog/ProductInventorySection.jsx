import { Button, Card, List, Tag, Typography } from "antd";

export default function ProductInventorySection({ product, canEdit, canReadInventory, onOpenInventoryWorkflow }) {
  if (!canReadInventory) {
    return (
      <Card className="nuva-card">
        <Typography.Paragraph>You do not have permission to view inventory context for this product.</Typography.Paragraph>
      </Card>
    );
  }

  return (
    <div className="product-workspace-section">
      <Card className="nuva-card">
        <div className="product-workspace-section__heading">
          <div>
            <Typography.Title level={4}>Inventory Settings</Typography.Title>
            <Typography.Paragraph>
              Stock movements still belong to Inventory. This view keeps the current product-level thresholds and recent context visible.
            </Typography.Paragraph>
          </div>
          <Button onClick={onOpenInventoryWorkflow}>Open Inventory Workflow</Button>
        </div>

        <div className="product-workspace-grid">
          <div className="product-workspace-field">
            <label>Current Stock</label>
            <div className="product-workspace-readonly">
              {product.stock} units <Tag>{product.stockStatus}</Tag>
            </div>
          </div>
          <div className="product-workspace-field">
            <label>Low-stock Alert Limit</label>
            <div className="product-workspace-readonly">{product.lowStockLimit}</div>
          </div>
          <div className="product-workspace-field">
            <label>Allow Backorder</label>
            <div className="product-workspace-readonly">{product.allowBackorder ? "Yes" : "No"}</div>
          </div>
          <div className="product-workspace-field">
            <label>Edit Access</label>
            <div className="product-workspace-readonly">{canEdit ? "Can edit product settings" : "Read only"}</div>
          </div>
        </div>
      </Card>

      <Card className="nuva-card" title="Recent Stock Movements">
        <List
          dataSource={product.stockMovements?.slice(0, 5) || []}
          locale={{ emptyText: "No stock movements recorded yet." }}
          renderItem={(movement) => (
            <List.Item>
              <List.Item.Meta
                title={`${movement.displayType} (${movement.displayChangeLabel})`}
                description={`${movement.previousStock} -> ${movement.newStock} • ${movement.createdAt ? new Date(movement.createdAt).toLocaleString("en-GB") : "Unknown time"}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
