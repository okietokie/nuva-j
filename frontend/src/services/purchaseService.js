import api from "./api";

export const getSuppliers = async (options = {}) => {
  const response = await api.get("/admin/purchases/suppliers", {
    params: {
      active_only: options.activeOnly || undefined
    }
  });
  return response.data;
};

export const getSupplier = async (supplierId) => {
  const response = await api.get(`/admin/purchases/suppliers/${supplierId}`);
  return response.data;
};

export const createSupplier = async (payload) => {
  const response = await api.post("/admin/purchases/suppliers", payload);
  return response.data;
};

export const updateSupplier = async (supplierId, payload) => {
  const response = await api.put(`/admin/purchases/suppliers/${supplierId}`, payload);
  return response.data;
};

export const deleteSupplier = async (supplierId) => {
  const response = await api.delete(`/admin/purchases/suppliers/${supplierId}`);
  return response.data;
};

export const getPurchaseBatches = async () => {
  const response = await api.get("/admin/purchases/batches");
  return response.data;
};

export const getPurchaseBatch = async (batchId) => {
  const response = await api.get(`/admin/purchases/batches/${batchId}`);
  return response.data;
};

export const createPurchaseBatch = async (payload) => {
  const response = await api.post("/admin/purchases/batches", payload);
  return response.data;
};

export const updatePurchaseBatch = async (batchId, payload) => {
  const response = await api.put(`/admin/purchases/batches/${batchId}`, payload);
  return response.data;
};
