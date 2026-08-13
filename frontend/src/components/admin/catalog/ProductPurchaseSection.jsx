import { Button, Card, Descriptions, Typography } from "antd";

export default function ProductPurchaseSection({ product, canReadPurchases, onBackToPurchases }) {
  if (!canReadPurchases) {
    return (
      <Card className="nuva-card">
        <Typography.Paragraph>You do not have permission to view purchase context for this product.</Typography.Paragraph>
      </Card>
    );
  }

  if (!product.purchaseBatchId) {
    return (
      <Card className="nuva-card">
        <Typography.Title level={4}>Purchase Link</Typography.Title>
        <Typography.Paragraph>This product is not linked to a purchase batch yet.</Typography.Paragraph>
        <Button onClick={onBackToPurchases}>Go to Purchases</Button>
      </Card>
    );
  }

  return (
    <Card className="nuva-card">
      <div className="product-workspace-section__heading">
        <div>
          <Typography.Title level={4}>Purchase Link</Typography.Title>
          <Typography.Paragraph>
            Purchase batches remain authoritative for batch-derived values. This section is intentionally contextual and read-only.
          </Typography.Paragraph>
        </div>
        <Button onClick={onBackToPurchases}>Back to Purchase Batch</Button>
      </div>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Supplier">{product.supplierName || "Not linked"}</Descriptions.Item>
        <Descriptions.Item label="Purchase Batch">{product.purchaseBatchId}</Descriptions.Item>
        <Descriptions.Item label="Purchase Date">
          {product.purchaseDate ? new Date(product.purchaseDate).toLocaleDateString("en-GB") : "Not set"}
        </Descriptions.Item>
        <Descriptions.Item label="Quantity Purchased">{product.quantityPurchased || 0}</Descriptions.Item>
        <Descriptions.Item label="Purchase Unit Cost">{product.purchaseUnitCost || 0}</Descriptions.Item>
        <Descriptions.Item label="Purchase Total">{product.purchaseTotalCost || 0}</Descriptions.Item>
        <Descriptions.Item label="Allocated Shared Expense">{product.allocatedBatchExpense || 0}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
