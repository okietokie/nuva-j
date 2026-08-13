import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Skeleton, message } from "antd";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPackagingProfiles } from "../../services/packagingProfileService";
import { getProduct, updateProductPackaging } from "../../services/productService";
import {
  getProductWorkspaceReturnTarget,
  getValidatedWorkspaceContext,
} from "../../utils/productWorkspaceNavigation";
import { normalizeProductWorkspaceSection } from "../../utils/productWorkspaceNavigation";
import ProductOverviewSection from "../../components/admin/catalog/ProductOverviewSection";
import ProductPackagingSection from "../../components/admin/catalog/ProductPackagingSection";
import ProductInventorySection from "../../components/admin/catalog/ProductInventorySection";
import ProductPurchaseSection from "../../components/admin/catalog/ProductPurchaseSection";
import ProductWorkspaceShell from "../../components/admin/catalog/ProductWorkspaceShell";

function buildPackagingDraft(product) {
  return {
    packagingProfileId: product.packagingProfileId || "",
    packagingProfileLabel: product.packagingProfileLabel || "",
    packagingCost: Number(product.packagingCost || 0),
    packagingCostSource: product.packagingCostSource || "custom"
  };
}

export default function ProductWorkspacePage({ onProductSaved }) {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const [product, setProduct] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const [packagingDraft, setPackagingDraft] = useState(null);
  const [packagingSaving, setPackagingSaving] = useState(false);

  const workspaceContext = useMemo(
    () => getValidatedWorkspaceContext(searchParams, location.state),
    [searchParams, location.state]
  );

  const canViewProducts = hasPermission("products.read");
  const canEditProducts = hasPermission("products.update");
  const canReadInventory = hasPermission("inventory.read");
  const canReadPurchases = hasPermission("purchases.read");
  const canManageProfiles = hasPermission("packaging.profiles.manage");

  useEffect(() => {
    const nextSection = normalizeProductWorkspaceSection(searchParams.get("section"));
    const nextFrom = workspaceContext.from;
    const needsCanonicalSearch =
      searchParams.get("section") !== nextSection || searchParams.get("from") !== nextFrom;
    if (needsCanonicalSearch) {
      setSearchParams({ section: nextSection, from: nextFrom }, { replace: true });
    }
  }, [searchParams, setSearchParams, workspaceContext.from]);

  useEffect(() => {
    if (!canViewProducts) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getProduct(productId, { admin: true }), getPackagingProfiles()])
      .then(([productData, profileData]) => {
        if (cancelled) return;
        setProduct(productData);
        setProfiles(profileData.filter((profile) => profile.active !== false));
        setPackagingDraft(buildPackagingDraft(productData));
        setSaveState("saved");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("The product workspace could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewProducts, productId]);

  useEffect(() => {
    const shouldWarn = saveState === "dirty";
    const handleBeforeUnload = (event) => {
      if (!shouldWarn) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveState]);

  const openSection = (section) => {
    if (saveState === "dirty" && !window.confirm("You have unsaved changes. Leave this section?")) {
      return;
    }
    setSearchParams({ section, from: workspaceContext.from });
  };

  const goBack = () => {
    if (saveState === "dirty" && !window.confirm("You have unsaved changes. Leave this workspace?")) {
      return;
    }
    navigate(`${workspaceContext.returnTarget.pathname}${workspaceContext.returnTarget.search || ""}`);
  };

  const handlePackagingChange = (updates) => {
    setPackagingDraft((current) => ({ ...current, ...updates }));
    setSaveState("dirty");
  };

  const handlePackagingSave = async () => {
    if (!product || !packagingDraft) return;
    setPackagingSaving(true);
    setSaveState("saving");
    try {
      const updated = await updateProductPackaging(product._id, packagingDraft);
      setProduct(updated);
      setPackagingDraft(buildPackagingDraft(updated));
      setSaveState("saved");
      onProductSaved?.(updated);
      message.success("Packaging section saved.");
    } catch {
      setSaveState("error");
      message.error("Packaging section could not be saved.");
    } finally {
      setPackagingSaving(false);
    }
  };

  if (!canViewProducts) {
    return (
      <Card className="nuva-card">
        <Empty description="You do not have permission to view product records." />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="nuva-card">
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  if (loadError || !product) {
    return (
      <Card className="nuva-card">
        <Alert type="error" showIcon message={loadError || "Product not found."} />
      </Card>
    );
  }

  const activeSection = workspaceContext.section;
  const backLabelMap = {
    products: "Back to Products",
    packaging: "Back to Packaging",
    inventory: "Back to Inventory",
    purchases: "Back to Purchase Batch"
  };

  let sectionContent = (
    <Card className="nuva-card">
      <Alert
        type="info"
        showIcon
        message="This section is queued for migration."
        description="The first implementation phase keeps add-product intact and fully implements Overview plus Packaging first."
      />
    </Card>
  );

  if (activeSection === "overview") {
    sectionContent = <ProductOverviewSection product={product} onOpenSection={openSection} />;
  } else if (activeSection === "packaging") {
    sectionContent = (
      <ProductPackagingSection
        product={product}
        draft={packagingDraft || buildPackagingDraft(product)}
        profiles={profiles}
        canEdit={canEditProducts}
        canManageProfiles={canManageProfiles}
        saving={packagingSaving}
        onChange={handlePackagingChange}
        onSave={handlePackagingSave}
        onOpenPackagingWorkflow={() =>
          navigate(getProductWorkspaceReturnTarget("packaging"), { state: location.state })
        }
      />
    );
  } else if (activeSection === "inventory") {
    sectionContent = (
      <ProductInventorySection
        product={product}
        canEdit={canEditProducts}
        canReadInventory={canReadInventory}
        onOpenInventoryWorkflow={() =>
          navigate(getProductWorkspaceReturnTarget("inventory"), { state: location.state })
        }
      />
    );
  } else if (activeSection === "purchase") {
    sectionContent = (
      <ProductPurchaseSection
        product={product}
        canReadPurchases={canReadPurchases}
        onBackToPurchases={() =>
          navigate(getProductWorkspaceReturnTarget("purchases"), { state: location.state })
        }
      />
    );
  }

  return (
    <ProductWorkspaceShell
      product={product}
      activeSection={activeSection}
      onSectionChange={openSection}
      onBack={goBack}
      backLabel={backLabelMap[workspaceContext.from] || "Back to Products"}
      saveState={saveState}
      actions={
        activeSection === "packaging" ? (
          <Button type="primary" loading={packagingSaving} disabled={!canEditProducts} onClick={handlePackagingSave}>
            Save Packaging
          </Button>
        ) : null
      }
    >
      {sectionContent}
    </ProductWorkspaceShell>
  );
}
