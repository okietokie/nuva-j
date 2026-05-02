import { Button, Card, Col, Row, Tag } from "antd";
import { Link } from "react-router-dom";

export default function ProductGrid({ products, onAddToCart }) {
  return (
    <Row gutter={[24, 24]}>
      {products.map((product) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={product._id}>
          <Card
            hoverable
            cover={
              <img
                alt={product.name}
                src={product.images[0]}
                style={{ height: 300, objectFit: "cover" }}
              />
            }
            className="nuva-card"
          >
            <div className="card-topline">
              <Tag color="gold">{product.category}</Tag>
              {product.isFeatured ? <Tag color="brown">Featured</Tag> : null}
            </div>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <div className="product-grid-footer">
              <strong>${product.price}</strong>
              <div className="product-grid-actions">
                <Link to={`/products/${product._id}`}>
                  <Button>Details</Button>
                </Link>
                <Button type="primary" onClick={() => onAddToCart(product)}>
                  Add to Cart
                </Button>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
