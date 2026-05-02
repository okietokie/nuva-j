import api from "./api";
import { mockProducts } from "../data/mockProducts";
import { normalizeProduct, normalizeProductList } from "../utils/productTransforms";

export const getProducts = async (options = {}) => {
  try {
    if (options.admin) {
      const response = await api.get("/admin/products", {
        params: {
          search: options.search || undefined,
          category: options.category || undefined,
          status: options.status || undefined,
          visibility: options.visibility || undefined,
          stock: options.stock || undefined
        }
      });
      return normalizeProductList(response.data);
    }

    const response = await api.get("/products");
    return normalizeProductList(response.data);
  } catch (error) {
    const normalized = normalizeProductList(mockProducts);
    return options.admin
      ? normalized
      : normalized.filter(
          (product) => product.status === "active" && product.visibility === "visible"
        );
  }
};

export const getProduct = async (productId, options = {}) => {
  try {
    const endpoint = options.admin ? `/admin/products/${productId}` : `/products/${productId}`;
    const response = await api.get(endpoint);
    return normalizeProduct(response.data);
  } catch (error) {
    return normalizeProduct(
      mockProducts.find(
        (product) =>
          product._id === productId || product.id === productId || product.slug === productId
      ) ||
        mockProducts[0]
    );
  }
};

export const createProduct = async (payload) => {
  const response = await api.post("/admin/products", payload);
  return normalizeProduct(response.data);
};

export const createProductFromImage = async (payload) => {
  const response = await api.post("/admin/products/from-image", payload);
  return normalizeProduct(response.data);
};

export const updateProduct = async (productId, payload) => {
  const response = await api.put(`/admin/products/${productId}`, payload);
  return normalizeProduct(response.data);
};

export const duplicateProduct = async (productId) => {
  const response = await api.post(`/admin/products/${productId}/duplicate`);
  return normalizeProduct(response.data);
};

export const updateProductVisibility = async (productId, visibility) => {
  const response = await api.patch(`/admin/products/${productId}/visibility`, { visibility });
  return normalizeProduct(response.data);
};

export const updateProductStatus = async (productId, status) => {
  const response = await api.patch(`/admin/products/${productId}/status`, { status });
  return normalizeProduct(response.data);
};

export const deleteProduct = async (productId) => {
  const response = await api.delete(`/admin/products/${productId}`);
  return response.data;
};

export const uploadProductImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/uploads/product-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

export const getOrphanedProductImages = async () => {
  const response = await api.get("/uploads/product-images/orphaned");
  return response.data;
};

export const updateStock = async (productId, stock) => {
  const response = await api.patch(`/products/${productId}/stock`, { stock });
  return normalizeProduct(response.data);
};
