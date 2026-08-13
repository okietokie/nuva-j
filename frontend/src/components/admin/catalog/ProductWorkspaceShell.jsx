import { Button, Tag } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PRODUCT_WORKSPACE_SECTIONS } from "./productWorkspaceSections";

function getSaveTone(saveState) {
  if (saveState === "saving") return "processing";
  if (saveState === "error") return "error";
  if (saveState === "dirty") return "warning";
  return "success";
}

function getSaveLabel(saveState) {
  if (saveState === "saving") return "Saving";
  if (saveState === "error") return "Failed to save";
  if (saveState === "dirty") return "Unsaved changes";
  return "Saved";
}

export default function ProductWorkspaceShell({
  product,
  activeSection,
  onSectionChange,
  onBack,
  backLabel,
  saveState,
  children,
  actions
}) {
  return (
    <div className="product-workspace-page">
      <header className="product-workspace-header">
        <div className="product-workspace-header__top">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
            {backLabel}
          </Button>
          <Tag color={getSaveTone(saveState)}>{getSaveLabel(saveState)}</Tag>
        </div>
        <div className="product-workspace-header__main">
          <div>
            <p className="product-workspace-kicker">Product Workspace</p>
            <h1>{product.displayName}</h1>
            <div className="product-workspace-meta">
              <span>SKU {product.sku || "Not set"}</span>
              <span>{product.displayCategory || "No category"}</span>
              <span>{product.displayStatusLabel}</span>
            </div>
          </div>
          {actions ? <div className="product-workspace-header__actions">{actions}</div> : null}
        </div>
      </header>

      <div className="product-workspace-layout">
        <aside className="product-workspace-nav" aria-label="Product workspace sections">
          {PRODUCT_WORKSPACE_SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`product-workspace-nav__item${section.key === activeSection ? " is-active" : ""}`}
              onClick={() => onSectionChange(section.key)}
            >
              {section.label}
            </button>
          ))}
        </aside>

        <div className="product-workspace-content">{children}</div>
      </div>
    </div>
  );
}
