import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { useCurrency } from "./CurrencyContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("nuva_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [messageApi, contextHolder] = message.useMessage();
  const { convertAmount } = useCurrency();

  useEffect(() => {
    localStorage.setItem("nuva_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product, quantity = 1) => {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item._id === product._id);

      if (existing) {
        return currentItems.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...currentItems, { ...product, quantity }];
    });

    messageApi.success(`${product.name} added to cart.`);
  };

  const updateQuantity = (_id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(_id);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => (item._id === _id ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (_id) => {
    setItems((currentItems) => currentItems.filter((item) => item._id !== _id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        convertAmount(item.displayPrice ?? item.price, item.currency || "AED") * item.quantity,
      0
    );
    const shipping = items.length ? convertAmount(20, "AED") : 0;
    return {
      subtotal,
      shipping,
      total: subtotal + shipping
    };
  }, [convertAmount, items]);

  const baseTotals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        convertAmount(item.displayPrice ?? item.price, item.currency || "AED", "AED") * item.quantity,
      0
    );
    const shipping = items.length ? 20 : 0;

    return {
      subtotal,
      shipping,
      total: subtotal + shipping
    };
  }, [convertAmount, items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totals,
        baseTotals,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
      }}
    >
      {contextHolder}
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
