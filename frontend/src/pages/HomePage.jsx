import { Button, Card, Col, Row, Statistic } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useCart } from "../context/CartContext";
import { getProducts } from "../services/productService";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const featured = products.filter((product) => product.isFeatured).slice(0, 4);

  return (
    <div className="page-wrap">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Modern heirlooms</span>
          <h1>Jewelry that feels soft, luminous, and unforgettable.</h1>
          <p>
            NUVA blends sculptural design with quiet luxury, creating premium pieces for
            everyday elegance.
          </p>
          <div className="hero-actions">
            <Link to="/shop">
              <Button type="primary" size="large">
                Explore the Collection
              </Button>
            </Link>
            <Link to="/register">
              <Button size="large">Create an Account</Button>
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=80"
            alt="NUVA hero jewelry"
          />
        </div>
      </section>

      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic title="Signature pieces" value={48} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic title="Happy collectors" value={1260} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic title="Average rating" value={4.9} suffix="/5" />
          </Card>
        </Col>
      </Row>

      <section className="section-block">
        <div className="section-head">
          <div>
            <span className="eyebrow">Featured selection</span>
            <h2>Crafted to elevate the everyday.</h2>
          </div>
        </div>
        <ProductGrid products={featured} onAddToCart={addToCart} />
      </section>
    </div>
  );
}
