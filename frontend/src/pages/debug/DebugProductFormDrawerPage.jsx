import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductFormDrawer from "../../components/admin/catalog/ProductFormDrawer";
import { mockProducts } from "../../data/mockProducts";
import "../../styles/adminCatalog.css";

const debugCategories = [
  { _id: "rings", name: "Rings", code: "RG", isActive: true },
  { _id: "necklaces", name: "Necklaces", code: "NK", isActive: true },
  { _id: "earrings", name: "Earrings", code: "ER", isActive: true },
  { _id: "bracelets", name: "Bracelets", code: "BR", isActive: true }
];

export default function DebugProductFormDrawerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [diagnostics, setDiagnostics] = useState(null);
  const mode = searchParams.get("mode") || "edit";
  const step = Number(searchParams.get("step") || 0);
  const diagnosticsEnabled = searchParams.get("diagnostics") === "1";
  const drawerOpen = searchParams.get("open") !== "0";

  const productId = useMemo(() => {
    if (mode !== "edit") {
      return undefined;
    }

    return searchParams.get("productId") || mockProducts[0]?._id;
  }, [mode, searchParams]);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      setDiagnostics(null);
      return undefined;
    }

    const collect = () => {
      const selectors = [
        ".catalog-form-drawer-mobile .ant-drawer-content-wrapper",
        ".catalog-form-drawer-mobile .ant-drawer-content",
        ".catalog-form-drawer-mobile .ant-drawer-wrapper-body",
        ".catalog-form-drawer-mobile .ant-drawer-body",
        ".catalog-modal-shell",
        ".catalog-modal-layout",
        ".catalog-modal-main",
        ".catalog-modal-main-scroll"
      ];

      const metrics = Object.fromEntries(
        selectors.map((selector) => {
          const node = document.querySelector(selector);
          const rect = node?.getBoundingClientRect?.();
          const styles = node ? window.getComputedStyle(node) : null;
          return [
            selector,
            node
              ? {
                  clientHeight: node.clientHeight,
                  scrollHeight: node.scrollHeight,
                  scrollTop: node.scrollTop,
                  overflowY: styles?.overflowY,
                  height: styles?.height,
                  minHeight: styles?.minHeight,
                  maxHeight: styles?.maxHeight,
                  top: rect?.top,
                  bottom: rect?.bottom
                }
              : null
          ];
        })
      );

      const viewport = window.visualViewport;
      setDiagnostics({
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          visualHeight: viewport?.height || null,
          offsetTop: viewport?.offsetTop || 0
        },
        metrics
      });
    };

    collect();
    window.addEventListener("resize", collect);
    window.visualViewport?.addEventListener("resize", collect);
    window.visualViewport?.addEventListener("scroll", collect);

    return () => {
      window.removeEventListener("resize", collect);
      window.visualViewport?.removeEventListener("resize", collect);
      window.visualViewport?.removeEventListener("scroll", collect);
    };
  }, [diagnosticsEnabled, step]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #f8f2e8 0%, #f5efe5 100%)"
      }}
    >
      <ProductFormDrawer
        open={drawerOpen}
        productId={productId}
        categories={debugCategories}
        canCreate
        canUpdate
        canManageCategories
        initialStep={Number.isFinite(step) ? step : 0}
        onClose={() => {
          const nextParams = new URLSearchParams();
          nextParams.set("mode", mode);
          nextParams.set("step", String(Number.isFinite(step) ? step : 0));
          nextParams.set("open", "0");
          if (diagnosticsEnabled) {
            nextParams.set("diagnostics", "1");
          }
          setSearchParams(nextParams);
        }}
        onCategoriesUpdated={async () => {}}
        onSaved={async () => {}}
      />
      <div style={{ minHeight: "180vh", padding: "24px 16px 96px" }}>
        <h1 style={{ margin: 0, color: "#3d3128" }}>Product drawer debug surface</h1>
        <p style={{ maxWidth: 560, color: "#6c5f56", lineHeight: 1.6 }}>
          This page stays intentionally tall so we can verify that closing the Add Product overlay restores normal document scrolling underneath it.
        </p>
        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 18,
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(190, 170, 150, 0.45)"
          }}
        >
          <strong>Background scroll probe</strong>
          <p style={{ marginBottom: 0, color: "#6c5f56" }}>
            Scroll this page after closing the drawer to confirm document scrolling still works on mobile.
          </p>
        </div>
      </div>
      {diagnosticsEnabled ? (
        <pre
          id="product-drawer-diagnostics"
          style={{
            position: "fixed",
            inset: "auto 12px 12px 12px",
            zIndex: 9999,
            maxHeight: "40vh",
            padding: 12,
            overflow: "auto",
            background: "rgba(17, 17, 17, 0.88)",
            color: "#fff",
            fontSize: 12
          }}
        >
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
