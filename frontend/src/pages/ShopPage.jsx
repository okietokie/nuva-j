import { Input, Select, Space } from "antd";
import { useEffect, useMemo, useState } from "react";
import ProductGrid from "../components/ProductGrid";
import { useCart } from "../context/CartContext";
import { getCategories } from "../services/categoryService";
import { getProducts } from "../services/productService";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const { addToCart } = useCart();

  useEffect(() => {
    getProducts().then(setProducts);
    getCategories().then((data) => setCategories(data.map((item) => item.name)));
  }, []);

  const categoryOptions = useMemo(() => ["All", ...categories], [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const keyword = search.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <span className="eyebrow">Shop</span>
        <h1>The NUVA collection</h1>
        <p>Explore softly radiant rings, necklaces, bracelets, and earrings.</p>
      </section>

      <Space wrap size="middle" style={{ marginBottom: 24 }}>
        <Input.Search
          placeholder="Search jewelry"
          allowClear
          style={{ width: 280 }}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={category}
          options={categoryOptions.map((item) => ({ value: item, label: item }))}
          onChange={setCategory}
          style={{ width: 180 }}
        />
      </Space>

      <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
    </div>
  );
}
