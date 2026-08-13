import api from "./api";
import { normalizeWebsiteConfig } from "../utils/websiteConfig";

export const getStorefrontConfig = async (options = {}) => {
  const response = await api.get("/website/config", {
    params: {
      previewToken: options.previewToken || undefined,
    },
  });
  return {
    ...response.data,
    ...("homepageSections" in response.data ? { homepageSections: normalizeWebsiteConfig(response.data).homepageSections } : {}),
  };
};

export const getWebsiteWorkspace = async () => {
  const response = await api.get("/website/admin/workspace");
  return {
    ...response.data,
    state: {
      ...response.data.state,
      draft: normalizeWebsiteConfig(response.data.state?.draft),
      published: normalizeWebsiteConfig(response.data.state?.published),
    },
  };
};

export const updateWebsiteDraft = async (payload) => {
  const response = await api.put("/website/admin/draft", payload);
  return response.data;
};

export const createWebsitePreviewToken = async (payload) => {
  const response = await api.post("/website/admin/preview-token", payload);
  return response.data;
};

export const publishWebsiteChanges = async (payload) => {
  const response = await api.post("/website/admin/publish", payload);
  return response.data;
};

export const scheduleWebsiteChanges = async (payload) => {
  const response = await api.post("/website/admin/schedule", payload);
  return response.data;
};

export const discardWebsiteDraft = async (payload) => {
  const response = await api.post("/website/admin/discard", payload);
  return response.data;
};

export const getWebsiteVersions = async () => {
  const response = await api.get("/website/admin/versions");
  return response.data;
};

export const restoreWebsiteVersion = async (versionId, payload) => {
  const response = await api.post(`/website/admin/versions/${versionId}/restore`, payload);
  return response.data;
};

export const getWebsiteHistory = async () => {
  const response = await api.get("/website/admin/history");
  return response.data;
};
