import { useMemo } from "react";
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
  const mode = searchParams.get("mode") || "edit";
  const step = Number(searchParams.get("step") || 0);

  const productId = useMemo(() => {
    if (mode !== "edit") {
      return undefined;
    }

    return searchParams.get("productId") || mockProducts[0]?._id;
  }, [mode, searchParams]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #f8f2e8 0%, #f5efe5 100%)"
      }}
    >
      <ProductFormDrawer
        open
        productId={productId}
        categories={debugCategories}
        canCreate
        canUpdate
        canManageCategories
        initialStep={Number.isFinite(step) ? step : 0}
        onClose={() => setSearchParams({ mode })}
        onCategoriesUpdated={async () => {}}
        onSaved={async () => {}}
      />
    </div>
  );
}
