import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import theme from "./theme";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { WishlistProvider } from "./context/WishlistContext";
import "./styles/global.css";
import "./styles/storefront.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <CurrencyProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <RouterProvider router={router} />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ConfigProvider>
  </React.StrictMode>
);
