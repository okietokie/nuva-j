export const storefrontConfig = {
  announcement: {
    enabled: import.meta.env.VITE_ANNOUNCEMENT_ENABLED === "true",
    message:
      import.meta.env.VITE_ANNOUNCEMENT_MESSAGE ||
      "Complimentary UAE delivery on orders above AED 250.00",
    threshold: Number(import.meta.env.VITE_FREE_DELIVERY_THRESHOLD || 250)
  },
  social: {
    instagramUrl: import.meta.env.VITE_INSTAGRAM_URL || "",
    whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || ""
  },
  content: {
    brandStoryTitle: import.meta.env.VITE_BRAND_STORY_TITLE || "Jewellery for the way you move",
    brandStoryBody:
      import.meta.env.VITE_BRAND_STORY_BODY ||
      "NUVA brings together soft shine, easy styling, and pieces chosen to slip naturally into everyday dressing."
  },
  community: {
    enabled: import.meta.env.VITE_COMMUNITY_ENABLED === "true"
  },
  newsletter: {
    enabled: import.meta.env.VITE_NEWSLETTER_ENABLED === "true"
  },
  reviews: {
    enabled: import.meta.env.VITE_REVIEWS_ENABLED === "true"
  }
};

export function getWhatsappLink(number) {
  const normalized = String(number || "").replace(/[^\d]/g, "");
  return normalized ? `https://wa.me/${normalized}` : "";
}
