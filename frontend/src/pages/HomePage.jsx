import { ArrowRightOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Link, useOutletContext } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useCart } from "../context/CartContext";
import { isWindowActive, normalizeWebsiteConfig } from "../utils/websiteConfig";

export default function HomePage() {
  const { products, websiteConfig } = useOutletContext();
  const { addToCart } = useCart();
  const config = normalizeWebsiteConfig(websiteConfig);
  const productMap = new Map(products.map((product) => [product._id || product.id, product]));
  const homepageSections = (config.homepageSections || []).filter(
    (section) => section.visible && isWindowActive(section.startAt, section.endAt),
  );

  const resolveSectionProducts = (section) => {
    if (section.type === "new_arrivals") {
      return products
        .filter((product) => product.isNewArrival)
        .slice(0, section.limit || 4);
    }

    if (section.type === "featured_products") {
      if (section.selectionMode === "manual") {
        return (section.productIds || [])
          .map((id) => productMap.get(id))
          .filter(Boolean)
          .slice(0, section.limit || 4);
      }
      return products.filter((product) => product.isFeatured).slice(0, section.limit || 4);
    }

    return [];
  };

  return (
    <div className="store-page">
      {homepageSections.map((section) => {
        if (section.type === "hero") {
          return (
            <section key={section.id} className="hero-editorial">
              <img
                src={section.desktopImageUrl || section.mobileImageUrl || "/nuva-hero-editorial.png"}
                alt={section.imageAlt || "NUVA hero"}
                className="hero-editorial-image"
              />
              <div className="hero-editorial-copy">
                <span className="section-kicker">{section.subtitle}</span>
                <h1>{section.title}</h1>
                <p>{section.body}</p>
                <div className="hero-actions">
                  {section.primaryCtaLabel && section.primaryCtaHref ? (
                    <Link to={section.primaryCtaHref}>
                      <Button type="primary" size="large">
                        {section.primaryCtaLabel}
                      </Button>
                    </Link>
                  ) : null}
                  {section.secondaryCtaLabel && section.secondaryCtaHref ? (
                    <Link to={section.secondaryCtaHref}>
                      <Button size="large">{section.secondaryCtaLabel}</Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "brand_story") {
          return (
            <section key={section.id} className="hero-story">
              <div>
                <span className="section-kicker">{section.subtitle}</span>
                <h2>{section.title}</h2>
              </div>
              <p>{section.body}</p>
            </section>
          );
        }

        if (section.type === "new_arrivals" || section.type === "featured_products") {
          const sectionProducts = resolveSectionProducts(section);
          if (!sectionProducts.length) {
            return null;
          }

          return (
            <section key={section.id}>
              <div className="section-header">
                <div>
                  <span className="section-kicker">{section.subtitle}</span>
                  <h2>{section.title}</h2>
                </div>
                {section.ctaLabel && section.ctaHref ? (
                  <Link to={section.ctaHref}>
                    <Button type="link" icon={<ArrowRightOutlined />}>
                      {section.ctaLabel}
                    </Button>
                  </Link>
                ) : null}
              </div>
              <ProductGrid products={sectionProducts} onAddToCart={addToCart} />
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
