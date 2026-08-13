import { useEffect, useMemo, useState } from "react";
import { Button, Card, Drawer, Empty, Grid, Modal, Skeleton, Spin, message } from "antd";
import {
  AppstoreOutlined,
  BoxPlotOutlined,
  CheckOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  FolderAddOutlined,
  InboxOutlined,
  PlusOutlined,
  ProfileOutlined,
  ReloadOutlined,
  RightOutlined,
  TagOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminKpiSection from "../../components/admin/AdminKpiSection";
import { getCategories } from "../../services/categoryService";
import {
  createProductFromImage,
  bulkDeleteProducts,
  deleteOrphanedProductImage,
  deleteProduct,
  duplicateProduct,
  getOrphanedProductImages,
  getProducts,
  updateProductStatus,
  updateProductVisibility
} from "../../services/productService";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import CategoryModal from "../../components/admin/catalog/CategoryModal";
import ProductFilters from "../../components/admin/catalog/ProductFilters";
import ProductFormDrawer from "../../components/admin/catalog/ProductFormDrawer";
import ProductTable from "../../components/admin/catalog/ProductTable";
import "../../styles/adminCatalog.css";

const defaultFilters = {
  search: "",
  category: "all",
  status: "all",
  visibility: "all",
  stock: "all"
};

function getProductsBasePath(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const productIndex = segments.indexOf("products");
  if (productIndex === -1) {
    return "/admin/products";
  }
  return `/${segments.slice(0, productIndex + 1).join("/")}`;
}

function matchesStockFilter(product, stock) {
  if (stock === "all") return true;
  if (stock === "in_stock") return product.stockStatus === "In Stock";
  if (stock === "low_stock") return product.stockStatus === "Low Stock";
  if (stock === "out_of_stock") return product.stockStatus === "Out of Stock";
  if (stock === "not_set") return product.stockStatus === "Not set";
  return true;
}

function buildCatalogStats(products) {
  const outOfStockCount = products.filter((product) => product.stockStatus === "Out of Stock").length;
  const lowStockCount = products.filter((product) => product.stockStatus === "Low Stock").length;

  return [
    {
      key: "total",
      label: "Total Products",
      value: products.length,
      icon: <AppstoreOutlined />,
      tone: "total"
    },
    {
      key: "published",
      label: "Publish",
      value: products.filter((product) => product.workflowStatus === "published").length,
      icon: <BoxPlotOutlined />,
      tone: "active"
    },
    {
      key: "ready",
      label: "Ready to Publish",
      value: products.filter((product) => product.workflowStatus === "ready_to_publish").length,
      icon: <ProfileOutlined />,
      tone: "active"
    },
    {
      key: "out_of_stock",
      label: "Out of Stock",
      value: outOfStockCount,
      icon: <WarningOutlined />,
      tone: outOfStockCount > 0 ? "out" : "total"
    },
    {
      key: "low_stock",
      label: "Low Stock",
      value: lowStockCount,
      icon: <WarningOutlined />,
      tone: lowStockCount > 0 ? "low" : "total"
    }
  ];
}

function getCatalogSummary(products) {
  return {
    published: products.filter((product) => product.workflowStatus === "published").length,
    ready: products.filter((product) => product.workflowStatus === "ready_to_publish").length,
    imagePending: products.filter((product) => product.workflowStatus === "image_pending").length
  };
}

export default function AdminProductsPage() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orphanImages, setOrphanImages] = useState([]);
  const [pendingOrphanDelete, setPendingOrphanDelete] = useState(null);
  const [deletingOrphanKey, setDeletingOrphanKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [orphanLoading, setOrphanLoading] = useState(false);
  const [orphanSectionExpanded, setOrphanSectionExpanded] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [pageActionsOpen, setPageActionsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);
  const [sortValue, setSortValue] = useState("default");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const productsBasePath = useMemo(() => getProductsBasePath(location.pathname), [location.pathname]);
  const drawerOpen = location.pathname.endsWith("/new") || Boolean(productId);
  const canRead = hasPermission("products.read");
  const canCreate = hasPermission("products.create");
  const canUpdate = hasPermission("products.update");
  const canDelete = hasPermission("products.delete");
  const canManageCategories = hasPermission("categories.manage");
  const permissions = { canCreate, canUpdate, canDelete };

  const loadCatalog = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [productData, categoryData] = await Promise.all([
        getProducts({ admin: true }),
        getCategories({ admin: true })
      ]);
      setProducts(productData);
      setCategories(categoryData);
    } catch (error) {
      const detail = getApiErrorMessage(error, "Catalog load failed.");
      setLoadError(detail);
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const loadOrphanImages = async () => {
    setOrphanLoading(true);
    try {
      const data = await getOrphanedProductImages();
      setOrphanImages(data);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Media intake preview failed."));
    } finally {
      setOrphanLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadCatalog(), loadOrphanImages()]);
  };

  useEffect(() => {
    if (!canRead) {
      setProducts([]);
      setCategories([]);
      return;
    }
    refreshAll();
  }, [canRead]);

  const filteredProducts = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const matches = products.filter((product) => {
      const matchesSearch =
        !search ||
        [product.displayName, product.sku, product.displayCategory, ...(product.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        filters.category === "all" || product.categoryId === filters.category;
      const matchesStatus =
        filters.status === "all" || product.workflowStatus === filters.status;
      const matchesVisibility =
        filters.visibility === "all" || product.visibility === filters.visibility;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesVisibility &&
        matchesStockFilter(product, filters.stock)
      );
    });

    return matches;
  }, [filters, products]);

  const stats = useMemo(() => buildCatalogStats(products), [products]);
  const summary = useMemo(() => getCatalogSummary(products), [products]);
  const isRefreshing = loading || orphanLoading;
  const mobileSummary = useMemo(
    () => ({
      total: products.length,
      ready: products.filter((product) => product.workflowStatus === "ready_to_publish").length,
      lowStock: products.filter((product) => product.stockStatus === "Low Stock").length
    }),
    [products]
  );
  const activeFilterCount = useMemo(
    () =>
      ["category", "status", "visibility", "stock"].filter(
        (key) => filters[key] && filters[key] !== "all"
      ).length,
    [filters]
  );

  const closeDrawer = () => {
    navigate(productsBasePath);
  };

  const openNewProduct = () => {
    navigate(`${productsBasePath}/new`);
  };

  const openEditProduct = (product) => {
    navigate(`${productsBasePath}/${product._id}`);
  };

  const handleViewProduct = (product) => {
    navigate(`/products/${product.slug || product._id}?preview=${product._id}`);
  };

  const handleCreateDraftFromImage = async (image) => {
    try {
      const product = await createProductFromImage({
        imageUrl: image.url,
        imageKey: image.key,
        imageAlt: "Untitled Product"
      });
      message.success("Product record created in draft mode.");
      await refreshAll();
      navigate(`${productsBasePath}/${product._id}`);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Draft creation failed."));
    }
  };

  const handleDuplicate = async (product) => {
    try {
      const duplicated = await duplicateProduct(product._id);
      message.success("Product duplicated as draft.");
      await loadCatalog();
      navigate(`${productsBasePath}/${duplicated._id}`);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Duplicate failed."));
    }
  };

  const handleToggleVisibility = async (product) => {
    try {
      const nextVisibility = product.visibility === "visible" ? "hidden" : "visible";
      await updateProductVisibility(product._id, nextVisibility);
      message.success(`Visibility updated to ${nextVisibility}.`);
      await loadCatalog();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Visibility update failed."));
    }
  };

  const handleToggleArchive = async (product) => {
    try {
      const nextStatus = product.workflowStatus === "archived" ? "active" : "archived";
      await updateProductStatus(product._id, nextStatus);
      message.success(`Workflow updated to ${nextStatus}.`);
      await loadCatalog();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Status update failed."));
    }
  };

  const removeDeletedProductsFromState = async (deletedIds) => {
    if (!deletedIds.length) {
      return;
    }

    setProducts((current) => current.filter((product) => !deletedIds.includes(product._id)));
    await loadOrphanImages();
  };

  const handleDeleteSingle = async (product) => {
    try {
      const response = await deleteProduct(product._id);
      await removeDeletedProductsFromState([product._id]);
      message.success(response?.message || "Product deleted successfully.");
      return { success: true, deletedIds: [product._id] };
    } catch (error) {
      message.error(getApiErrorMessage(error, "Delete failed."));
      return { success: false, deletedIds: [] };
    }
  };

  const handleDeleteBulk = async (productIds) => {
    try {
      const response = await bulkDeleteProducts(productIds);
      const deletedIds = (response?.results || [])
        .filter((result) => result.success)
        .map((result) => result.productId);
      const failedResults = (response?.results || []).filter((result) => !result.success);

      await removeDeletedProductsFromState(deletedIds);

      if (deletedIds.length && !failedResults.length) {
        message.success(`${deletedIds.length} products deleted successfully.`);
      } else if (deletedIds.length && failedResults.length) {
        const firstFailure = failedResults[0]?.reason || "One product could not be deleted.";
        message.warning(
          `${deletedIds.length} products deleted. ${failedResults.length} product${failedResults.length === 1 ? "" : "s"} could not be deleted because ${firstFailure.charAt(0).toLowerCase()}${firstFailure.slice(1)}`,
        );
      } else if (failedResults.length) {
        message.error(failedResults[0]?.reason || "No selected products could be deleted.");
      }

      return { success: deletedIds.length > 0, deletedIds, failedResults };
    } catch (error) {
      message.error(getApiErrorMessage(error, "Bulk delete failed."));
      return { success: false, deletedIds: [] };
    }
  };

  const handleImportProducts = async () => {
    await refreshAll();
    message.success("Catalog refreshed from saved product and media records.");
  };

  const handleDeleteOrphanImage = (image) => {
    if (!canDelete) {
      message.error("You do not have permission to remove this intake media item.");
      return;
    }

    setPendingOrphanDelete(image);
  };

  const confirmDeleteOrphanImage = () => {
    if (!pendingOrphanDelete) {
      return;
    }

    setDeletingOrphanKey(pendingOrphanDelete.key);
    deleteOrphanedProductImage(pendingOrphanDelete.key)
      .then(() => {
        setOrphanImages((current) =>
          current.filter((entry) => entry.key !== pendingOrphanDelete.key)
        );
        message.success("Media item removed from intake.");
        setPendingOrphanDelete(null);
      })
      .catch((error) => {
        message.error(getApiErrorMessage(error, "Media delete failed."));
      })
      .finally(() => {
        setDeletingOrphanKey("");
      });
  };

  const renderMobileLoadingState = () => (
    <div className="catalog-mobile-skeleton-list" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="catalog-mobile-skeleton-row">
          <Skeleton.Avatar active shape="square" size={92} />
          <Skeleton active paragraph={{ rows: 3 }} title={{ width: "55%" }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="catalog-admin-page">
      {isMobile ? (
        <>
          <div className="catalog-mobile-intro">
            <div className="catalog-mobile-intro__copy">
              <h1>Products</h1>
              <p>Manage products, pricing, stock and publishing.</p>
            </div>
            <Button
              type="text"
              className="catalog-mobile-page-menu"
              icon={<EllipsisOutlined />}
              aria-label="More product actions"
              onClick={() => setPageActionsOpen(true)}
            />
          </div>

          {selectionMode ? (
            <div className="catalog-mobile-selection-banner">
              <strong>{selectedProductIds.length} selected</strong>
              <Button
                type="text"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedProductIds([]);
                }}
              >
                Exit selection
              </Button>
            </div>
          ) : null}

          <ProductFilters
            filters={draftFilters}
            appliedFilters={filters}
            categories={categories}
            sortValue={sortValue}
            sortOptions={[{ label: "Newest", value: "default" }]}
            onSortChange={setSortValue}
            onChange={(key, value) => setDraftFilters((current) => ({ ...current, [key]: value }))}
            onReset={() => {
              setDraftFilters(defaultFilters);
              setFilters(defaultFilters);
            }}
            onApply={() => setFilters(draftFilters)}
          />

          <div className="catalog-mobile-summary-strip" aria-label="Catalog summary">
            <span>
              <strong>{mobileSummary.total}</strong> Products
            </span>
            <span>
              <strong>{mobileSummary.ready}</strong> Ready
            </span>
            <span>
              <strong>{mobileSummary.lowStock}</strong> Low stock
            </span>
          </div>
        </>
      ) : (
        <>
          <Card className="nuva-card catalog-shell-card catalog-header-card">
            <div className="catalog-header-shell">
              <div className="catalog-header-content">
                <h1>Products</h1>
                <p className="catalog-header-description">
                  Manage one complete record for each NUVA product, including workflow readiness,
                  media, pricing, and shared stock details.
                </p>
              </div>

              <div className="catalog-header-actions">
                <Button
                  className="catalog-header-button catalog-header-button-refresh"
                  icon={<ReloadOutlined />}
                  onClick={handleImportProducts}
                  loading={isRefreshing}
                  disabled={isRefreshing}
                >
                  Refresh
                </Button>
                <Button
                  className="catalog-header-button catalog-header-button-secondary"
                  icon={<FolderAddOutlined />}
                  onClick={() => setCategoryModalOpen(true)}
                  disabled={!canManageCategories}
                >
                  Add Category
                </Button>
                <Button
                  type="primary"
                  className="catalog-header-button catalog-header-button-primary"
                  icon={<PlusOutlined />}
                  onClick={openNewProduct}
                  disabled={!canCreate}
                >
                  Add Product
                </Button>
              </div>
            </div>
          </Card>

          <Card className="nuva-card catalog-shell-card">
            <div className="catalog-phase-note">
              <strong>Publishing readiness:</strong> {summary.ready} ready to publish,{" "}
              {summary.imagePending} waiting on showcase media, and {summary.published} already live.
            </div>
            <ProductFilters
              filters={draftFilters}
              appliedFilters={filters}
              categories={categories}
              sortValue={sortValue}
              sortOptions={[{ label: "Newest", value: "default" }]}
              onSortChange={setSortValue}
              onChange={(key, value) => setDraftFilters((current) => ({ ...current, [key]: value }))}
              onReset={() => {
                setDraftFilters(defaultFilters);
                setFilters(defaultFilters);
              }}
              onApply={() => setFilters(draftFilters)}
            />
          </Card>

          <AdminKpiSection title="Product Readiness" items={stats} />
        </>
      )}

      {(orphanLoading || orphanImages.length > 0) && (
        <Card
          title={`Media Awaiting Product Details (${orphanImages.length})`}
          className="nuva-card catalog-orphan-card"
          extra={
            <Button type="text" onClick={() => setOrphanSectionExpanded((current) => !current)}>
              {orphanSectionExpanded ? "Hide" : "Show"}
            </Button>
          }
        >
          {orphanSectionExpanded ? (
            orphanLoading ? (
              <div className="catalog-orphan-loading">
                <Spin />
              </div>
            ) : (
              <div className="catalog-orphan-grid">
                {orphanImages.map((image) => (
                  <div className="catalog-orphan-tile" key={image.key}>
                    <button
                      type="button"
                      className="catalog-orphan-delete"
                      aria-label="Delete intake media"
                      aria-busy={deletingOrphanKey === image.key}
                      disabled={deletingOrphanKey === image.key}
                      onClick={() => handleDeleteOrphanImage(image)}
                    >
                      <DeleteOutlined />
                    </button>
                    <div className="catalog-orphan-image-wrap">
                      <img src={image.url} alt="Existing Backblaze B2 upload" />
                    </div>
                    <div className="catalog-orphan-copy">
                      <strong>Untitled Product</strong>
                      <div className="catalog-orphan-meta">
                        <span>
                          <TagOutlined />
                          No category
                        </span>
                        <span>
                          <TagOutlined />
                          Price not set
                        </span>
                        <span>
                          <InboxOutlined />
                          Stock not added
                        </span>
                      </div>
                      <div className="catalog-orphan-status">
                        <FileTextOutlined />
                        <span>Image Pending</span>
                      </div>
                      <Button
                        type="primary"
                        className="catalog-orphan-cta"
                        disabled={!canCreate}
                        onClick={() => handleCreateDraftFromImage(image)}
                      >
                        <span>Complete Product Record</span>
                        <RightOutlined />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </Card>
      )}

      <Card className="nuva-card catalog-table-card">
        {!canRead ? (
          <Empty description="You do not have permission to view central product records." />
        ) : loading && isMobile ? (
          renderMobileLoadingState()
        ) : loadError ? (
          <Empty
            description={loadError}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button icon={<ReloadOutlined />} onClick={refreshAll}>
              Retry
            </Button>
          </Empty>
        ) : filteredProducts.length ? (
          <ProductTable
            products={filteredProducts}
            loading={loading}
            permissions={permissions}
            selectionMode={selectionMode}
            selectedProductIds={selectedProductIds}
            onSelectedProductIdsChange={setSelectedProductIds}
            onSelectionModeChange={setSelectionMode}
            onEdit={openEditProduct}
            onView={handleViewProduct}
            onDuplicate={handleDuplicate}
            onToggleVisibility={handleToggleVisibility}
            onToggleArchive={handleToggleArchive}
            onDeleteSingle={handleDeleteSingle}
            onDeleteBulk={handleDeleteBulk}
          />
        ) : (
          <Empty
            description={
              products.length
                ? "No product records match the current workflow, stock, or media filters."
                : "No products yet."
            }
          />
        )}
      </Card>

      <CategoryModal
        open={categoryModalOpen}
        categories={categories}
        products={products}
        canManage={canManageCategories}
        onClose={() => setCategoryModalOpen(false)}
        onUpdated={loadCatalog}
      />

      <ProductFormDrawer
        open={drawerOpen}
        productId={productId}
        categories={categories}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canManageCategories={canManageCategories}
        onClose={closeDrawer}
        onCategoriesUpdated={loadCatalog}
        onSaved={async () => {
          await refreshAll();
          closeDrawer();
        }}
      />

      <Modal
        open={Boolean(pendingOrphanDelete)}
        title="Delete this media item?"
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true, loading: deletingOrphanKey === pendingOrphanDelete?.key }}
        onOk={confirmDeleteOrphanImage}
        onCancel={() => {
          if (!deletingOrphanKey) {
            setPendingOrphanDelete(null);
          }
        }}
      >
        <p>
          This will permanently remove the media item from the product intake queue and clean up
          its backend record as well.
        </p>
      </Modal>

      <Drawer
        open={pageActionsOpen}
        placement="bottom"
        height="auto"
        onClose={() => setPageActionsOpen(false)}
        className="catalog-mobile-drawer catalog-mobile-page-drawer"
        title="More Actions"
      >
        <div className="catalog-mobile-action-list">
          <Button
            type="text"
            className="catalog-mobile-action-item"
            icon={<ReloadOutlined />}
            loading={isRefreshing}
            disabled={isRefreshing}
            onClick={async () => {
              await handleImportProducts();
              setPageActionsOpen(false);
            }}
          >
            Refresh Products
          </Button>
          <Button
            type="text"
            className="catalog-mobile-action-item"
            icon={<FolderAddOutlined />}
            disabled={!canManageCategories}
            onClick={() => {
              setCategoryModalOpen(true);
              setPageActionsOpen(false);
            }}
          >
            Manage/Add Category
          </Button>
          <Button
            type="text"
            className="catalog-mobile-action-item"
            icon={<CheckOutlined />}
            disabled={!canDelete}
            onClick={() => {
              setSelectionMode(true);
              setPageActionsOpen(false);
            }}
          >
            Select Products
          </Button>
        </div>
      </Drawer>

      {isMobile ? (
        <div className="catalog-mobile-add-bar">
          <Button
            type="primary"
            className="catalog-mobile-add-button"
            icon={<PlusOutlined />}
            onClick={openNewProduct}
            disabled={!canCreate}
          >
            Add Product
          </Button>
        </div>
      ) : null}
    </div>
  );
}
