import { Button, Card, Col, Descriptions, InputNumber, Row, Tag } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getProduct } from "../services/productService";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";

export default function ProductDetailsPage() {
  const { productSlug } = useParams();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { formatMoney } = useCurrency();

  useEffect(() => {
    const previewId = new URLSearchParams(location.search).get("preview");
    const requestProduct = async () => {
      try {
        const nextProduct =
          previewId && isAdmin
            ? await getProduct(previewId, { admin: true })
            : await getProduct(productSlug);
        setProduct(nextProduct);
      } catch (error) {
        setProduct(null);
      }
    };

    requestProduct();
  }, [isAdmin, location.search, productSlug]);

  if (!product) {
    return null;
  }

  return (
    <div className="page-wrap">
      <Row gutter={[32, 32]}>
        <Col xs={24} md={12}>
          <Card className="nuva-card">
            <img
              src={product.primaryImage}
              alt={product.displayName}
              style={{ width: "100%", borderRadius: 20, objectFit: "cover" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <span className="eyebrow">{product.displayCategory}</span>
          <h1>{product.displayName}</h1>
          <p className="lead-copy">{product.description}</p>
          <div className="price-line">{formatMoney(product.price, product.currency || "AED")}</div>
          <div className="tag-row">
            <Tag color="gold">{product.material || "Material not set"}</Tag>
            <Tag color="brown">{product.color || "Color not set"}</Tag>
            <Tag color={product.stock > 0 ? "green" : "red"}>
              {product.stockStatus}
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
              { key: "material", label: "Material", children: product.material || "Not set" },
              { key: "color", label: "Color", children: product.color || "Not set" },
              { key: "category", label: "Category", children: product.displayCategory }
            ]}
          />
        </Col>
      </Row>
    </div>
  );
}
