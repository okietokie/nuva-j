import { useMemo, useState } from "react";
import { Button, Drawer, Grid, Input, Radio, Select, Space } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined
} from "@ant-design/icons";

export default function ProductFilters({
  filters,
  appliedFilters = filters,
  categories,
  onChange,
  onReset,
  onApply,
  sortValue = "default",
  sortOptions = [{ label: "Newest", value: "default" }],
  onSortChange
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const categoryOptions = [
    { label: "All Categories", value: "all" },
    ...categories.map((category) => ({
      label: category.name,
      value: category._id
    }))
  ];

  const activeFilterCount = useMemo(
    () =>
      ["category", "status", "visibility", "stock"].filter(
        (key) => appliedFilters?.[key] && appliedFilters[key] !== "all"
      ).length,
    [appliedFilters]
  );

  const sortLabel =
    sortOptions.find((option) => option.value === sortValue)?.label || sortOptions[0]?.label || "Newest";

  const filterFields = (
    <>
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
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="catalog-mobile-filters">
          <Input
            value={filters.search}
            placeholder="Search products or SKU"
            className="catalog-search-input catalog-search-input-mobile"
            prefix={<SearchOutlined aria-hidden="true" />}
            onChange={(event) => onChange("search", event.target.value)}
            allowClear
          />

          <div className="catalog-mobile-filter-row">
            <Button
              className="catalog-mobile-filter-trigger"
              icon={<FilterOutlined aria-hidden="true" />}
              onClick={() => setMobileFilterOpen(true)}
            >
              Filters
              {activeFilterCount ? (
                <span className="catalog-mobile-filter-count">{activeFilterCount}</span>
              ) : null}
            </Button>
            <Button
              className="catalog-mobile-sort-trigger"
              icon={<SwapOutlined aria-hidden="true" />}
              onClick={() => setMobileSortOpen(true)}
            >
              Sort: {sortLabel}
            </Button>
          </div>
        </div>

        <Drawer
          open={mobileFilterOpen}
          placement="bottom"
          height="auto"
          onClose={() => setMobileFilterOpen(false)}
          className="catalog-mobile-drawer catalog-mobile-filter-drawer"
          title="Filter products"
          closeIcon={<CloseOutlined />}
        >
          <div className="catalog-mobile-sheet">
            <div className="catalog-mobile-sheet__meta">
              <span>{activeFilterCount ? `${activeFilterCount} active` : "No active filters"}</span>
              <Button type="text" onClick={onReset}>
                Reset All
              </Button>
            </div>
            <div className="catalog-mobile-sheet__body">
              {filterFields}
            </div>
            <div className="catalog-mobile-sheet__footer">
              <Button
                type="primary"
                className="catalog-mobile-sheet__submit"
                icon={<CheckOutlined aria-hidden="true" />}
                onClick={() => {
                  onApply();
                  setMobileFilterOpen(false);
                }}
              >
                Show Products
              </Button>
            </div>
          </div>
        </Drawer>

        <Drawer
          open={mobileSortOpen}
          placement="bottom"
          height="auto"
          onClose={() => setMobileSortOpen(false)}
          className="catalog-mobile-drawer catalog-mobile-sort-drawer"
          title="Sort products"
          closeIcon={<CloseOutlined />}
        >
          <Radio.Group
            value={sortValue}
            className="catalog-mobile-sort-group"
            onChange={(event) => {
              onSortChange?.(event.target.value);
              setMobileSortOpen(false);
            }}
          >
            {sortOptions.map((option) => (
              <Radio.Button key={option.value} value={option.value}>
                {option.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Drawer>
      </>
    );
  }

  return (
    <div className="catalog-filters-shell">
      <Input
        value={filters.search}
        placeholder="Search by product name, SKU, category, or tag..."
        className="catalog-search-input"
        prefix={<SearchOutlined aria-hidden="true" />}
        onChange={(event) => onChange("search", event.target.value)}
        allowClear
      />
      {filterFields}

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
