import { Layout, Spin } from "antd";
import { Outlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import StoreFooter from "../components/storefront/StoreFooter";
import StoreHeader from "../components/storefront/StoreHeader";
import { getCategories } from "../services/categoryService";
import { getProducts } from "../services/productService";
import { getStorefrontConfig } from "../services/websiteService";
import { DEFAULT_WEBSITE_CONFIG, getActiveAnnouncement, normalizeWebsiteConfig } from "../utils/websiteConfig";

const { Content } = Layout;

export default function PublicLayout({ previewMode = false }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [websiteConfig, setWebsiteConfig] = useState(DEFAULT_WEBSITE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const previewToken = new URLSearchParams(window.location.search).get("previewToken");

    async function loadStorefrontData() {
      const [categoryResult, productResult, websiteResult] = await Promise.allSettled([
        getCategories(),
        getProducts(),
        getStorefrontConfig({ previewToken }),
      ]);

      if (!active) {
        return;
      }

      const nextCategories =
        categoryResult.status === "fulfilled" && Array.isArray(categoryResult.value)
          ? categoryResult.value.filter((category) => category.isActive !== false)
          : [];
      const nextProducts =
        productResult.status === "fulfilled" && Array.isArray(productResult.value)
          ? productResult.value
          : [];
      const nextWebsiteConfig =
        websiteResult.status === "fulfilled"
          ? normalizeWebsiteConfig(websiteResult.value)
          : DEFAULT_WEBSITE_CONFIG;

      setCategories(nextCategories);
      setProducts(nextProducts);
      setWebsiteConfig(nextWebsiteConfig);
      setLoading(false);
    }

    loadStorefrontData();
    return () => {
      active = false;
    };
  }, []);

  const activeCategoryNames = useMemo(() => {
    const used = new Set(products.map((product) => product.displayCategory).filter(Boolean));
    return categories.filter((category) => used.has(category.name));
  }, [categories, products]);

  const announcement = getActiveAnnouncement(websiteConfig);

  return (
    <Layout className="site-shell">
      <StoreHeader
        categories={activeCategoryNames}
        products={products}
        announcement={announcement}
        websiteConfig={websiteConfig}
        previewMode={previewMode}
      />
      <Content className="nuva-content">
        <main className="site-main">
          {loading ? (
            <div className="empty-panel" style={{ display: "grid", placeItems: "center", minHeight: 220 }}>
              <Spin size="large" />
            </div>
          ) : (
            <Outlet context={{ categories: activeCategoryNames, products, websiteConfig, previewMode }} />
          )}
          <StoreFooter websiteConfig={websiteConfig} previewMode={previewMode} />
        </main>
      </Content>
    </Layout>
  );
}
