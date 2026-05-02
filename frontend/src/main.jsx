import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import theme from "./theme";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <CartProvider>
          
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>
);
