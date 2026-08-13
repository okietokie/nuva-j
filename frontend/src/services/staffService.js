import api from "./api";

export const getStaffCatalog = async () => {
  const response = await api.get("/admin/staff/catalog");
  return response.data;
};

export const searchRegisteredUsers = async (query) => {
  const response = await api.get("/admin/staff/search", {
    params: { query },
  });
  return response.data;
};

export const getStaffDirectory = async (params = {}) => {
  const response = await api.get("/admin/staff/directory", { params });
  return response.data;
};

export const getStaffMember = async (userId) => {
  const response = await api.get(`/admin/staff/members/${userId}`);
  return response.data;
};

export const updateStaffAccess = async (userId, payload) => {
  const response = await api.put(`/admin/staff/members/${userId}/access`, payload);
  return response.data;
};

export const getStaffRoles = async () => {
  const response = await api.get("/admin/staff/roles");
  return response.data;
};

export const createStaffRole = async (payload) => {
  const response = await api.post("/admin/staff/roles", payload);
  return response.data;
};

export const updateStaffRole = async (roleId, payload) => {
  const response = await api.put(`/admin/staff/roles/${roleId}`, payload);
  return response.data;
};

export const duplicateStaffRole = async (roleId) => {
  const response = await api.post(`/admin/staff/roles/${roleId}/duplicate`);
  return response.data;
};

export const deleteStaffRole = async (roleId) => {
  const response = await api.delete(`/admin/staff/roles/${roleId}`);
  return response.data;
};

export const getStaffAudit = async (limit = 50) => {
  const response = await api.get("/admin/staff/audit", { params: { limit } });
  return response.data;
};
