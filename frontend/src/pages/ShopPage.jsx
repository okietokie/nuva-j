import { FilterOutlined } from "@ant-design/icons";
import { Button, Drawer, Input, Select, Slider, Spin, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useCart } from "../context/CartContext";

export default function ShopPage() {
  const { products, categories } = useOutletContext();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "All");
  const [sort, setSort] = useState(searchParams.get("sort") || "featured");
  const [availability, setAvailability] = useState(searchParams.get("availability") || "all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const maxPrice = useMemo(
    () => Math.max(...products.map((product) => product.price || 0), 0),
    [products]
  );
  const [priceRange, setPriceRange] = useState([0, maxPrice || 1000]);

  useEffect(() => {
    setPriceRange([0, maxPrice || 1000]);
  }, [maxPrice]);

  useEffect(() => {
    const next = {};
    if (search) next.search = search;
    if (category !== "All") next.category = category;
    if (sort !== "featured") next.sort = sort;
    if (availability !== "all") next.availability = availability;
    setSearchParams(next, { replace: true });
  }, [availability, category, search, setSearchParams, sort]);

  const categoryOptions = useMemo(() => ["All", ...categories.map((item) => item.name)], [categories]);

  const filteredProducts = useMemo(() => {
    const list = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const keyword = search.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword);
      const matchesAvailability =
        availability === "all" ||
        (availability === "in_stock" ? product.stock > 0 : product.stock <= 0);
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesCategory && matchesSearch && matchesAvailability && matchesPrice;
    });

    if (sort === "newest") {
      return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    if (sort === "price_low") {
      return [...list].sort((a, b) => a.price - b.price);
    }

    if (sort === "price_high") {
      return [...list].sort((a, b) => b.price - a.price);
    }

    return [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }, [availability, category, priceRange, products, search, sort]);

  const activeFilterLabels = [
    category !== "All" ? category : "",
    search ? `Search: ${search}` : "",
    availability === "in_stock" ? "In Stock" : availability === "sold_out" ? "Sold Out" : "",
    sort !== "featured"
      ? {
          newest: "Newest",
          price_low: "Price: Low to High",
          price_high: "Price: High to Low"
        }[sort]
      : ""
  ].filter(Boolean);

  const clearAll = () => {
    setCategory("All");
    setAvailability("all");
    setSearch("");
    setSort("featured");
    setPriceRange([0, maxPrice || 1000]);
  };

  const filterContent = (
    <>
      <div className="filter-group">
        <h3>Category</h3>
        <Select
          value={category}
          options={categoryOptions.map((item) => ({ value: item, label: item }))}
          onChange={setCategory}
        />
      </div>
      <div className="filter-group">
        <h3>Availability</h3>
        <Select
          value={availability}
          onChange={setAvailability}
          options={[
            { value: "all", label: "All products" },
            { value: "in_stock", label: "In stock" },
            { value: "sold_out", label: "Sold out" }
          ]}
        />
      </div>
      <div className="filter-group">
        <h3>Price</h3>
        <Slider
          range
          min={0}
          max={Math.max(maxPrice || 1000, 100)}
          value={priceRange}
          onChange={setPriceRange}
        />
      </div>
      <Button onClick={clearAll}>Clear All</Button>
    </>
  );

  return (
    <div className="store-page">
      <section className="page-intro">
        <span className="section-kicker">Shop</span>
        <h1>The NUVA collection</h1>
        <p>Filter by category, search live products, and sort the catalogue without leaving the page.</p>
      </section>

      <div className="catalog-layout">
        <aside className="filter-panel">
          <span className="section-kicker">Filters</span>
          {filterContent}
        </aside>

        <section className="catalog-toolbar">
          <div className="catalog-toolbar-top">
            <Input.Search
              placeholder="Search within products"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              value={sort}
              onChange={setSort}
              options={[
                { value: "featured", label: "Featured" },
                { value: "newest", label: "Newest" },
                { value: "price_low", label: "Price: Low to High" },
                { value: "price_high", label: "Price: High to Low" }
              ]}
            />
            <Button
              className="mobile-only"
              icon={<FilterOutlined />}
              onClick={() => setMobileFiltersOpen(true)}
            >
              Filters
            </Button>
          </div>

          {activeFilterLabels.length ? (
            <div className="active-filters">
              {activeFilterLabels.map((item) => (
                <Tag key={item}>{item}</Tag>
              ))}
            </div>
          ) : null}

          <div className="section-header">
            <div>
              <h2>{category === "All" ? "All Products" : category}</h2>
              <p>{filteredProducts.length} products found</p>
            </div>
          </div>

          {products.length ? (
            <ProductGrid
              products={filteredProducts}
              onAddToCart={addToCart}
              emptyTitle="No products matched these filters."
            />
          ) : (
            <div className="catalog-state">
              <Spin />
            </div>
          )}
        </section>
      </div>

      <Drawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        placement="bottom"
        height="70vh"
      >
        <div className="filter-panel" style={{ display: "grid" }}>
          {filterContent}
        </div>
      </Drawer>
    </div>
  );
}
