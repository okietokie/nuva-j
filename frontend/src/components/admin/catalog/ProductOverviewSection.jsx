import { Alert, Button, Card, Col, Descriptions, Row, Tag } from "antd";

function buildWarnings(product) {
  const warnings = [];
  if (product.packagingCost <= 0) warnings.push("Packaging cost is still missing.");
  if (product.stockStatus === "Low Stock" || product.stockStatus === "Out of Stock") {
    warnings.push(`Inventory needs attention: ${product.stockStatus}.`);
  }
  if (!product.purchaseBatchId) warnings.push("No purchase batch is linked yet.");
  return warnings;
}

export default function ProductOverviewSection({ product, onOpenSection }) {
  const warnings = buildWarnings(product);

  return (
    <div className="product-workspace-section">
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card className="nuva-card product-workspace-summary-card">
            <div className="product-workspace-summary-media">
              <img src={product.primaryImage} alt={product.displayName} />
            </div>
            <div className="product-workspace-summary-shortcuts">
              <Button onClick={() => onOpenSection("packaging")}>Open Packaging</Button>
              <Button onClick={() => onOpenSection("inventory")}>Open Inventory</Button>
              <Button onClick={() => onOpenSection("purchase")}>Open Purchase Link</Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card className="nuva-card">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Product Name">{product.displayName}</Descriptions.Item>
              <Descriptions.Item label="SKU">{product.sku || "Not set"}</Descriptions.Item>
              <Descriptions.Item label="Design Number">{product.designNumber || "Not set"}</Descriptions.Item>
              <Descriptions.Item label="Category">{product.displayCategory}</Descriptions.Item>
              <Descriptions.Item label="Workflow">
                <Tag>{product.displayStatusLabel}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Visibility">{product.visibility}</Descriptions.Item>
              <Descriptions.Item label="Selling Price">{product.displayPriceLabel}</Descriptions.Item>
              <Descriptions.Item label="Total Cost">{product.displayTotalCostLabel}</Descriptions.Item>
              <Descriptions.Item label="Suggested Selling Price">
                {product.displaySuggestedPriceLabel}
              </Descriptions.Item>
              <Descriptions.Item label="Stock">
                {product.displayStockLabel} ({product.stockStatus})
              </Descriptions.Item>
              <Descriptions.Item label="Packaging Profile">
                {product.packagingProfileLabel || "Not assigned"}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {product.updatedAt ? new Date(product.updatedAt).toLocaleString("en-GB") : "Unknown"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {warnings.length ? (
        <div className="product-workspace-alert-stack">
          {warnings.map((warning) => (
            <Alert key={warning} type="warning" showIcon message={warning} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
