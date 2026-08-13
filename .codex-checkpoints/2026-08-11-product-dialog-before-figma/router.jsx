import { Navigate, createBrowserRouter } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
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
import DebugProductFormDrawerPage from "./pages/debug/DebugProductFormDrawerPage";

const adminSection = adminSections[0];

function getAdminElement(item) {
  if (item.slug === "dashboard") {
    return <AdminDashboardPage section={adminSection} />;
  }

  if (item.slug === "orders") {
    return <AdminOrdersPage />;
  }

  if (item.slug === "products") {
    return <AdminProductsPage />;
  }

  if (item.slug === "purchases") {
    return <AdminPurchasesPage />;
  }

  if (item.slug === "inventory") {
    return <AdminInventoryPage />;
  }

  if (item.slug === "packaging") {
    return <AdminPackagingPage />;
  }

  if (item.slug === "expenses") {
    return <AdminExpensesPage />;
  }

  if (item.slug === "finance") {
    return <AdminFinancePage />;
  }

  if (item.slug === "reports") {
    return <AdminReportsPage />;
  }

  if (item.slug === "categories") {
    return <AdminCategoriesPage />;
  }

  return <AdminPlaceholderPage title={item.title} />;
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
            element: <AdminProductsPage />
          },
          {
            path: "products/new",
            element: <AdminProductsPage />
          },
          {
            path: "products/:productId",
            element: <AdminProductsPage />
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

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: publicChildren
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
