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
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminPlaceholderPage from "./pages/admin/AdminPlaceholderPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";

function getAdminElement(section, item) {
  if (item.slug === "dashboard") {
    return <AdminDashboardPage section={section} />;
  }

  if (item.slug === "orders") {
    return <AdminOrdersPage />;
  }

  if (item.slug === "products") {
    return <AdminProductsPage />;
  }

  if (item.slug === "inventory") {
    return <AdminInventoryPage />;
  }

  if (item.slug === "categories") {
    return <AdminCategoriesPage />;
  }

  return <AdminPlaceholderPage title={item.title} />;
}

const adminRoutes = [
  { index: true, element: <Navigate to={adminSections[0].basePath} replace /> },
  ...adminSections.map((section) => ({
    path: section.key,
    children: section.items
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
            element: getAdminElement(section, item)
          }
        ];
      })
  }))
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "shop", element: <ShopPage /> },
      { path: "products/:productSlug", element: <ProductDetailsPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "checkout", element: <CheckoutPage /> },
          { path: "orders", element: <MyOrdersPage /> }
        ]
      }
    ]
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
