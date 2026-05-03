import { useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Modal, Spin, message } from "antd";
import {
  AppstoreOutlined,
  BoxPlotOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusOutlined,
  ProfileOutlined,
  RightOutlined,
  TagOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCategories } from "../../services/categoryService";
import {
  createProductFromImage,
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
import ProductStatusBadge from "../../components/admin/catalog/ProductStatusBadge";
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
    return "/admin/commerce/products";
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
  return [
    {
      key: "total",
      label: "Total Products",
      value: products.length,
      icon: <AppstoreOutlined />,
      tone: "total"
    },
    {
      key: "active",
      label: "Active Products",
      value: products.filter((product) => product.status === "active").length,
      icon: <BoxPlotOutlined />,
      tone: "active"
    },
    {
      key: "draft",
      label: "Draft Products",
      value: products.filter((product) => product.status === "draft").length,
      icon: <ProfileOutlined />,
      tone: "draft"
    },
    {
      key: "out_of_stock",
      label: "Out of Stock",
      value: products.filter((product) => product.stockStatus === "Out of Stock").length,
      icon: <WarningOutlined />,
      tone: "out"
    },
    {
      key: "low_stock",
      label: "Low Stock",
      value: products.filter((product) => product.stockStatus === "Low Stock").length,
      icon: <WarningOutlined />,
      tone: "low"
    }
  ];
}

export default function AdminProductsPage() {
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
  const [orphanLoading, setOrphanLoading] = useState(false);
  const [orphanSectionExpanded, setOrphanSectionExpanded] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);
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
    try {
      const [productData, categoryData] = await Promise.all([
        getProducts({ admin: true }),
        getCategories({ admin: true })
      ]);
      setProducts(productData);
      setCategories(categoryData);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Catalog load failed."));
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
      message.error(getApiErrorMessage(error, "Image import preview failed."));
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

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        [
          product.displayName,
          product.sku,
          product.displayCategory,
          ...(product.tags || [])
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        filters.category === "all" || product.categoryId === filters.category;
      const matchesStatus = filters.status === "all" || product.status === filters.status;
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
  }, [filters, products]);

  const stats = useMemo(() => buildCatalogStats(products), [products]);

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
      message.success("Draft product created from uploaded image.");
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
      message.success(`Product is now ${nextVisibility}.`);
      await loadCatalog();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Visibility update failed."));
    }
  };

  const handleToggleArchive = async (product) => {
    try {
      const nextStatus = product.status === "archived" ? "active" : "archived";
      await updateProductStatus(product._id, nextStatus);
      message.success(`Status updated to ${nextStatus}.`);
      await loadCatalog();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Status update failed."));
    }
  };

  const handleDelete = (product) => {
    Modal.confirm({
      title: "Move this product to deleted status?",
      content: "The product stays recoverable in admin, but customers will not see it.",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProduct(product._id);
          message.success("Product moved to deleted status.");
          await loadCatalog();
        } catch (error) {
          message.error(getApiErrorMessage(error, "Delete failed."));
        }
      }
    });
  };

  const handleImportProducts = async () => {
    await refreshAll();
    message.success("Catalog refreshed from products and uploaded media.");
  };

  const handleDeleteOrphanImage = (image) => {
    if (!canDelete) {
      message.error("You do not have permission to delete this draft image.");
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
        message.success("Draft image deleted.");
        setPendingOrphanDelete(null);
      })
      .catch((error) => {
        message.error(getApiErrorMessage(error, "Image delete failed."));
      })
      .finally(() => {
        setDeletingOrphanKey("");
      });
  };

  return (
    <div className="catalog-admin-page">
      <Card className="nuva-card catalog-shell-card">
        <div className="catalog-header-shell">
          <div>
            <h2>Products</h2>
            <p>Manage all jewelry items visible on the NUVA storefront.</p>
          </div>

          <div className="catalog-header-actions">
            <Button onClick={handleImportProducts}>Import Products</Button>
            <Button onClick={() => setCategoryModalOpen(true)} disabled={!canManageCategories}>
              Add Category
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNewProduct} disabled={!canCreate}>
              Add Product
            </Button>
          </div>
        </div>
      </Card>

      <Card className="nuva-card catalog-shell-card">
        <ProductFilters
          filters={draftFilters}
          categories={categories}
          onChange={(key, value) => setDraftFilters((current) => ({ ...current, [key]: value }))}
          onReset={() => {
            setDraftFilters(defaultFilters);
            setFilters(defaultFilters);
          }}
          onApply={() => setFilters(draftFilters)}
        />
      </Card>

      <Card className="nuva-card catalog-stats-card">
        <div className="catalog-stats-grid">
          {stats.map((stat) => (
            <div className="catalog-stat-tile" key={stat.key}>
              <div className={`catalog-stat-icon ${stat.tone}`}>{stat.icon}</div>
              <div className="catalog-stat-copy">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(orphanLoading || orphanImages.length > 0) && (
        <Card
          title={`Images Awaiting Product Details (${orphanImages.length})`}
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
                  aria-label="Delete draft image"
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
                        <span>Draft</span>
                      </div>
                      <Button
                        type="primary"
                        className="catalog-orphan-cta"
                        disabled={!canCreate}
                        onClick={() => handleCreateDraftFromImage(image)}
                      >
                        <span>Complete Product Details</span>
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
          <Empty description="You do not have permission to view products." />
        ) : filteredProducts.length ? (
          <ProductTable
            products={filteredProducts}
            loading={loading}
            permissions={permissions}
            onEdit={openEditProduct}
            onView={handleViewProduct}
            onDuplicate={handleDuplicate}
            onToggleVisibility={handleToggleVisibility}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDelete}
          />
        ) : (
          <Empty description="No products match the current filters." />
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
        title="Delete this image?"
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
          This will permanently remove the image from “Images Awaiting Product Details” and clean up
          its backend record as well.
        </p>
      </Modal>
    </div>
  );
}
