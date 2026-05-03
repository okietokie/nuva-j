import { Button, Card, Col, Row, Statistic } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useCart } from "../context/CartContext";
import { getCategories } from "../services/categoryService";
import { getProducts } from "../services/productService";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categoryCount, setCategoryCount] = useState(0);
  const { addToCart } = useCart();

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      const [productResults, categoryResults] = await Promise.allSettled([
        getProducts(),
        getCategories()
      ]);

      if (!isMounted) {
        return;
      }

      if (productResults.status === "fulfilled") {
        setProducts(productResults.value);
      } else {
        setProducts([]);
      }

      if (categoryResults.status === "fulfilled") {
        setCategoryCount(Array.isArray(categoryResults.value) ? categoryResults.value.length : 0);
      } else {
        setCategoryCount(0);
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const featured = products.filter((product) => product.isFeatured).slice(0, 4);
  const featuredCount = products.filter((product) => product.isFeatured).length;
  const inStockCount = products.filter((product) => product.stock > 0).length;

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
            <Statistic title="Available pieces" value={products.length} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic title="Featured designs" value={featuredCount} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic
              title={categoryCount > 0 ? "Active collections" : "Ready to ship"}
              value={categoryCount > 0 ? categoryCount : inStockCount}
            />
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
