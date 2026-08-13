import { Button, Input, Select, Space } from "antd";
import { FilterOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

export default function ProductFilters({
  filters,
  categories,
  onChange,
  onReset,
  onApply
}) {
  const categoryOptions = [
    { label: "All Categories", value: "all" },
    ...categories.map((category) => ({
      label: category.name,
      value: category._id
    }))
  ];

  return (
    <div className="catalog-filters-shell">
      <Input
        value={filters.search}
        placeholder="Search by product name, SKU, category, or tag..."
        className="catalog-search-input"
        prefix={<SearchOutlined />}
        onChange={(event) => onChange("search", event.target.value)}
        allowClear
      />

      <Select
        value={filters.category}
        className="catalog-filter-select"
        options={categoryOptions}
        onChange={(value) => onChange("category", value)}
      />

      <Select
        value={filters.status}
        className="catalog-filter-select"
        options={[
          { label: "All Statuses", value: "all" },
          { label: "Draft", value: "draft" },
          { label: "Image Pending", value: "image_pending" },
          { label: "Ready to Publish", value: "ready_to_publish" },
          { label: "Publish", value: "published" },
          { label: "Archived", value: "archived" }
        ]}
        onChange={(value) => onChange("status", value)}
      />

      <Select
        value={filters.visibility}
        className="catalog-filter-select"
        options={[
          { label: "All Visibility", value: "all" },
          { label: "Visible", value: "visible" },
          { label: "Hidden", value: "hidden" }
        ]}
        onChange={(value) => onChange("visibility", value)}
      />

      <Select
        value={filters.stock}
        className="catalog-filter-select"
        options={[
          { label: "All Stock Status", value: "all" },
          { label: "In Stock", value: "in_stock" },
          { label: "Low Stock", value: "low_stock" },
          { label: "Out of Stock", value: "out_of_stock" },
          { label: "Not Set", value: "not_set" }
        ]}
        onChange={(value) => onChange("stock", value)}
      />

      <Space.Compact>
        <Button icon={<ReloadOutlined />} onClick={onReset}>
          Reset
        </Button>
        <Button type="primary" icon={<FilterOutlined />} onClick={onApply}>
          Apply
        </Button>
      </Space.Compact>
    </div>
  );
}
