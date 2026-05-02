import api from "./api";

export const getCategories = async (options = {}) => {
  const endpoint = options.admin ? "/admin/categories" : "/categories";
  const response = await api.get(endpoint);
  return response.data;
};

export const getCategory = async (categoryId) => {
  const response = await api.get(`/admin/categories/${categoryId}`);
  return response.data;
};

export const createCategory = async (payload) => {
  const response = await api.post("/admin/categories", payload);
  return response.data;
};

export const updateCategory = async (categoryId, payload) => {
  const response = await api.put(`/admin/categories/${categoryId}`, payload);
  return response.data;
};

export const deleteCategory = async (categoryId) => {
  const response = await api.delete(`/admin/categories/${categoryId}`);
  return response.data;
};

export const getProductLabels = async () => {
  const response = await api.get("/categories/labels");
  return response.data;
};
