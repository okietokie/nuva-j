import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { message } from "antd";

const STORAGE_KEY = "nuva_wishlist";
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => {
    const isSaved = (productId) => items.some((item) => item._id === productId);

    const toggleWishlist = (product) => {
      setItems((currentItems) => {
        const exists = currentItems.some((item) => item._id === product._id);

        if (exists) {
          messageApi.info(`${product.displayName || product.name} removed from your wishlist.`);
          return currentItems.filter((item) => item._id !== product._id);
        }

        messageApi.success(`${product.displayName || product.name} saved to your wishlist.`);
        return [...currentItems, product];
      });
    };

    return {
      items,
      isSaved,
      toggleWishlist,
      clearWishlist: () => setItems([])
    };
  }, [items, messageApi]);

  return (
    <WishlistContext.Provider value={value}>
      {contextHolder}
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider.");
  }

  return context;
}
