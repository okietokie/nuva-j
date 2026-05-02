import api from "./api";
import { mockProducts } from "../data/mockProducts";

export const getProducts = async () => {
  try {
    const response = await api.get("/products");
    return response.data;
  } catch (error) {
    return mockProducts;
  }
};

export const getProduct = async (productId) => {
  try {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  } catch (error) {
    return mockProducts.find((product) => product._id === productId) || mockProducts[0];
  }
};

export const createProduct = async (payload) => {
  const response = await api.post("/products", payload);
  return response.data;
};

export const updateProduct = async (productId, payload) => {
  const response = await api.put(`/products/${productId}`, payload);
  return response.data;
};

export const deleteProduct = async (productId) => {
  const response = await api.delete(`/products/${productId}`);
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

export const updateStock = async (productId, stock) => {
  const response = await api.patch(`/products/${productId}/stock`, { stock });
  return response.data;
};
