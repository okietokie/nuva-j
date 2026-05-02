import { Button, Card, Col, Descriptions, InputNumber, Row, Tag } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProduct } from "../services/productService";
import { useCart } from "../context/CartContext";

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    getProduct(productId).then(setProduct);
  }, [productId]);

  if (!product) {
    return null;
  }

  return (
    <div className="page-wrap">
      <Row gutter={[32, 32]}>
        <Col xs={24} md={12}>
          <Card className="nuva-card">
            <img
              src={product.images[0]}
              alt={product.name}
              style={{ width: "100%", borderRadius: 20, objectFit: "cover" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="lead-copy">{product.description}</p>
          <div className="price-line">${product.price}</div>
          <div className="tag-row">
            <Tag color="gold">{product.material}</Tag>
            <Tag color="brown">{product.color}</Tag>
            <Tag color={product.stock > 0 ? "green" : "red"}>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </Tag>
          </div>
          <div className="detail-actions">
            <InputNumber min={1} max={product.stock} value={quantity} onChange={setQuantity} />
            <Button type="primary" size="large" onClick={() => addToCart(product, quantity)}>
              Add to Cart
            </Button>
          </div>
          <Descriptions
            column={1}
            bordered
            style={{ marginTop: 28 }}
            items={[
              { key: "material", label: "Material", children: product.material },
              { key: "color", label: "Color", children: product.color },
              { key: "category", label: "Category", children: product.category }
            ]}
          />
        </Col>
      </Row>
    </div>
  );
}
