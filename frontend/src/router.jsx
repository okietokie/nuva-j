import { createBrowserRouter } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import ProductFormPage from "./pages/admin/ProductFormPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "shop", element: <ShopPage /> },
      { path: "products/:productId", element: <ProductDetailsPage /> },
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
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "products", element: <AdminProductsPage /> },
          { path: "products/new", element: <ProductFormPage /> },
          { path: "products/:productId", element: <ProductFormPage /> },
          { path: "orders", element: <AdminOrdersPage /> },
          { path: "inventory", element: <AdminInventoryPage /> }
        ]
      }
    ]
  }
]);

export default router;
