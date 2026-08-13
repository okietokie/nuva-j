import { Navigate, createBrowserRouter } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminWorkspaceGuard from "./components/AdminWorkspaceGuard";
import { adminSections } from "./admin/adminNavigation";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import WishlistPage from "./pages/WishlistPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminExpensesPage from "./pages/admin/AdminExpensesPage";
import AdminFinancePage from "./pages/admin/AdminFinancePage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminPackagingPage from "./pages/admin/AdminPackagingPage";
import AdminPlaceholderPage from "./pages/admin/AdminPlaceholderPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminPurchasesPage from "./pages/admin/AdminPurchasesPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AdminWebsitePage from "./pages/admin/AdminWebsitePage";
import DebugProductFormDrawerPage from "./pages/debug/DebugProductFormDrawerPage";

const adminSection = adminSections[0];

function getAdminElement(item) {
  const wrapWorkspace = (element) => (
    <AdminWorkspaceGuard workspace={item.slug === "dashboard" ? "dashboard" : item.slug}>
      {element}
    </AdminWorkspaceGuard>
  );

  if (item.slug === "dashboard") {
    return wrapWorkspace(<AdminDashboardPage section={adminSection} />);
  }

  if (item.slug === "orders") {
    return wrapWorkspace(<AdminOrdersPage />);
  }

  if (item.slug === "products") {
    return wrapWorkspace(<AdminProductsPage />);
  }

  if (item.slug === "purchases") {
    return wrapWorkspace(<AdminPurchasesPage />);
  }

  if (item.slug === "inventory") {
    return wrapWorkspace(<AdminInventoryPage />);
  }

  if (item.slug === "packaging") {
    return wrapWorkspace(<AdminPackagingPage />);
  }

  if (item.slug === "expenses") {
    return wrapWorkspace(<AdminExpensesPage />);
  }

  if (item.slug === "finance") {
    return wrapWorkspace(<AdminFinancePage />);
  }

  if (item.slug === "reports") {
    return wrapWorkspace(<AdminReportsPage />);
  }

  if (item.slug === "categories") {
    return wrapWorkspace(<AdminCategoriesPage />);
  }

  if (item.slug === "staff") {
    return wrapWorkspace(<AdminStaffPage />);
  }

  if (item.slug === "website") {
    return wrapWorkspace(<AdminWebsitePage />);
  }

  return wrapWorkspace(<AdminPlaceholderPage title={item.title} />);
}

const adminRoutes = [
  { index: true, element: <Navigate to={adminSection.basePath} replace /> },
  ...adminSection.items
    .filter((item) => item.action !== "logout")
    .flatMap((item) => {
      if (item.slug === "products") {
        return [
          {
            path: "products",
            element: getAdminElement(item)
          },
          {
            path: "products/new",
            element: getAdminElement(item)
          },
          {
            path: "products/:productId",
            element: getAdminElement(item)
          }
        ];
      }

      return [
        {
          index: item.slug === "dashboard",
          path: item.slug === "dashboard" ? undefined : item.slug,
          element: getAdminElement(item)
        }
      ];
    })
];

const publicChildren = [
  { index: true, element: <HomePage /> },
  { path: "shop", element: <ShopPage /> },
  { path: "products/:productSlug", element: <ProductDetailsPage /> },
  { path: "cart", element: <CartPage /> },
  { path: "wishlist", element: <WishlistPage /> },
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
  import.meta.env.DEV ? { path: "debug/product-form-drawer", element: <DebugProductFormDrawerPage /> } : null,
  {
    element: <ProtectedRoute />,
    children: [
      { path: "checkout", element: <CheckoutPage /> },
      { path: "orders", element: <MyOrdersPage /> }
    ]
  }
].filter(Boolean);

const previewChildren = [
  { index: true, element: <HomePage /> },
  { path: "shop", element: <ShopPage /> },
  { path: "products/:productSlug", element: <ProductDetailsPage /> },
  { path: "cart", element: <CartPage /> },
  { path: "wishlist", element: <WishlistPage /> },
  { path: "orders", element: <MyOrdersPage /> },
].filter(Boolean);

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: publicChildren
  },
  {
    path: "/preview/storefront",
    element: <PublicLayout previewMode />,
    children: previewChildren
  },
  {
    element: <AdminRoute />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: adminRoutes
      }
    ]
  }
]);

export default router;
