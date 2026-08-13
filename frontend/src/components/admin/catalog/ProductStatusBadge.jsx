const BADGE_STYLES = {
  status: {
    draft: { label: "Draft", tone: "warning" },
    image_pending: { label: "Image Pending", tone: "amber" },
    ready_to_publish: { label: "Ready to Publish", tone: "ink" },
    published: { label: "Publish", tone: "success" },
    archived: { label: "Archived", tone: "neutral" },
    deleted: { label: "Archived", tone: "danger" }
  },
  visibility: {
    visible: { label: "Visible", tone: "soft" },
    hidden: { label: "Hidden", tone: "neutral" }
  },
  stock: {
    "In Stock": { label: "In Stock", tone: "success" },
    "Low Stock": { label: "Low Stock", tone: "warning" },
    "Out of Stock": { label: "Out of Stock", tone: "danger" },
    "Not set": { label: "Not set", tone: "neutral" }
  },
  label: {
    bestseller: { label: "Bestseller", tone: "ink" },
    new: { label: "New", tone: "gold" },
    sale: { label: "Sale", tone: "rose" },
    featured: { label: "Featured", tone: "lavender" }
  }
};

export default function ProductStatusBadge({ type, value, className = "" }) {
  const config = BADGE_STYLES[type]?.[value];

  if (!config) {
    return null;
  }

  return (
    <span className={`product-status-badge tone-${config.tone} ${className}`.trim()}>
      {config.label}
    </span>
  );
}
