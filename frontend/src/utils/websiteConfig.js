import { storefrontConfig } from "./storefrontConfig";

export const DEFAULT_WEBSITE_CONFIG = {
  announcement: {
    visible: true,
    message: storefrontConfig.announcement.message,
    destination: "/shop",
    startAt: null,
    endAt: null,
    timezone: "Asia/Dubai",
  },
  navigation: {
    headerLinks: [
      { id: "shop", label: "Shop", href: "/shop", visible: true, essential: true },
      { id: "earrings", label: "Earrings", href: "/shop?category=Earrings", visible: true, essential: false },
      { id: "collections", label: "Collections", href: "/shop", visible: true, essential: false },
    ],
    footerGroups: [
      {
        id: "shop",
        label: "Shop",
        links: [
          { id: "all-products", label: "All Products", href: "/shop", visible: true, essential: true },
          { id: "new-in", label: "New In", href: "/shop?sort=newest", visible: true, essential: false },
          { id: "wishlist", label: "Wishlist", href: "/wishlist", visible: true, essential: false },
          { id: "cart", label: "Cart", href: "/cart", visible: true, essential: true },
        ],
      },
      {
        id: "customer-care",
        label: "Customer Care",
        links: [
          { id: "account", label: "My Account", href: "/orders", visible: true, essential: true },
          { id: "faq", label: "FAQ", href: "/shop", visible: true, essential: false },
          { id: "delivery", label: "Delivery Information", href: "/shop", visible: true, essential: false },
          { id: "care", label: "Jewellery Care", href: "/shop", visible: true, essential: false },
          { id: "privacy", label: "Privacy Policy", href: "/shop", visible: true, essential: false },
        ],
      },
    ],
  },
  social: {
    instagramUrl: storefrontConfig.social.instagramUrl,
    whatsappNumber: storefrontConfig.social.whatsappNumber,
  },
  seo: {
    home: {
      browserTitle: "NUVA Jewellery",
      metaDescription: "Modern jewellery, styled for easy everyday shopping.",
      socialTitle: "NUVA Jewellery",
      socialDescription: "Modern jewellery, styled for easy everyday shopping.",
      socialImageUrl: "/nuva-hero-editorial.png",
      canonicalPath: "/",
      noIndex: false,
    },
  },
  homepageSections: [
    {
      id: "hero-primary",
      type: "hero",
      visible: true,
      locked: true,
      title: "Jewellery for every day.",
      subtitle: "Everyday Styling",
      body: "Modern jewellery, styled for easy everyday shopping.",
      desktopImageUrl: "/nuva-hero-editorial.png",
      mobileImageUrl: "",
      imageAlt: "NUVA jewellery editorial hero",
      primaryCtaLabel: "Shop New Arrivals",
      primaryCtaHref: "/shop?sort=newest",
      secondaryCtaLabel: "Explore Collections",
      secondaryCtaHref: "/shop",
      textAlign: "left",
      textTone: "light",
      overlayStrength: "medium",
      startAt: null,
      endAt: null,
    },
    {
      id: "brand-story",
      type: "brand_story",
      visible: true,
      locked: true,
      title: storefrontConfig.content.brandStoryTitle,
      subtitle: "Brand Story",
      body: storefrontConfig.content.brandStoryBody,
      startAt: null,
      endAt: null,
    },
    {
      id: "new-arrivals",
      type: "new_arrivals",
      visible: true,
      locked: false,
      title: "Fresh additions to the edit.",
      subtitle: "New Arrivals",
      body: "",
      ctaLabel: "View All",
      ctaHref: "/shop?sort=newest",
      selectionMode: "rule_new_arrivals",
      productIds: [],
      categoryId: "",
      limit: 4,
      startAt: null,
      endAt: null,
    },
    {
      id: "featured-products",
      type: "featured_products",
      visible: true,
      locked: false,
      title: "Pieces we are highlighting right now.",
      subtitle: "Featured Selection",
      body: "",
      ctaLabel: "",
      ctaHref: "",
      selectionMode: "rule_featured",
      productIds: [],
      categoryId: "",
      limit: 4,
      startAt: null,
      endAt: null,
    },
  ],
};

export function normalizeWebsiteConfig(config) {
  if (!config) {
    return DEFAULT_WEBSITE_CONFIG;
  }

  return {
    ...DEFAULT_WEBSITE_CONFIG,
    ...config,
    announcement: {
      ...DEFAULT_WEBSITE_CONFIG.announcement,
      ...(config.announcement || {}),
    },
    navigation: {
      headerLinks: config.navigation?.headerLinks || DEFAULT_WEBSITE_CONFIG.navigation.headerLinks,
      footerGroups: config.navigation?.footerGroups || DEFAULT_WEBSITE_CONFIG.navigation.footerGroups,
    },
    social: {
      ...DEFAULT_WEBSITE_CONFIG.social,
      ...(config.social || {}),
    },
    seo: {
      home: {
        ...DEFAULT_WEBSITE_CONFIG.seo.home,
        ...(config.seo?.home || {}),
      },
    },
    homepageSections: config.homepageSections || DEFAULT_WEBSITE_CONFIG.homepageSections,
  };
}

export function isWindowActive(startAt, endAt, reference = new Date()) {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (start && start > reference) {
    return false;
  }
  if (end && end < reference) {
    return false;
  }
  return true;
}

export function getActiveAnnouncement(config, reference = new Date()) {
  const announcement = normalizeWebsiteConfig(config).announcement;
  if (!announcement.visible || !isWindowActive(announcement.startAt, announcement.endAt, reference)) {
    return "";
  }
  return announcement.message || "";
}
