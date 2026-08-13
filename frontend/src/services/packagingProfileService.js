import api from "./api";

export function normalizePackagingProfile(profile = {}) {
  return {
    ...profile,
    id: profile.id || profile._id || "",
    _id: profile._id || profile.id || "",
    name: profile.name || "",
    description: profile.description || "",
    defaultCost: Number(profile.defaultCost || 0),
    currency: (profile.currency || "AED").toUpperCase(),
    active: profile.active !== false,
    sortOrder: Number(profile.sortOrder || 0),
    recommendationRules: profile.recommendationRules || null
  };
}

export async function getPackagingProfiles() {
  const response = await api.get("/admin/packaging-profiles");
  return (response.data || []).map(normalizePackagingProfile);
}

export async function createPackagingProfile(payload) {
  const response = await api.post("/admin/packaging-profiles", payload);
  return normalizePackagingProfile(response.data);
}

export async function updatePackagingProfile(profileId, payload) {
  const response = await api.patch(`/admin/packaging-profiles/${profileId}`, payload);
  return normalizePackagingProfile(response.data);
}
