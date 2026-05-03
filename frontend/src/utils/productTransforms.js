const PLACEHOLDER_PRODUCT_IMAGE = "/placeholder-jewelry.svg";
const FALLBACK_PRODUCT_NAME = "Untitled Product";
const VALID_STATUSES = new Set(["active", "draft", "archived", "deleted"]);
const VALID_VISIBILITY = new Set(["visible", "hidden"]);

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value) {
  return asTrimmedString(value) || null;
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asEnum(value, validValues, fallback) {
  return validValues.has(value) ? value : fallback;
}

function normalizeImage(image, index, fallbackName) {
  if (typeof image === "string") {
    return {
      id: "",
      url: image,
      key: "",
      alt: fallbackName,
      isPrimary: index === 0
    };
  }

  return {
    id: image?.id || "",
    url: image?.url || "",
    key: image?.key || "",
    alt: image?.alt || fallbackName,
    isPrimary: Boolean(image?.isPrimary || index === 0)
  };
}

export function normalizeProduct(product) {
  const safeProduct = product || {};
  const images = (safeProduct.images || [])
    .map((image, index) => normalizeImage(image, index, safeProduct.name))
    .filter((image) => image.url);

  const name = asTrimmedString(safeProduct.name);
  const categoryName = asTrimmedString(safeProduct.categoryName || safeProduct.category);
  const price = asNumber(safeProduct.price, 0);
  const stock = asNumber(safeProduct.stock, 0);
  const lowStockLimit = asNumber(safeProduct.lowStockLimit, 3);
  const hasCoreDetails =
    Boolean(name && name !== "Untitled Product") &&
    Boolean(categoryName) &&
    price > 0 &&
    safeProduct.stock != null &&
    Boolean(asTrimmedString(safeProduct.description)) &&
    Boolean(asTrimmedString(safeProduct.sku));

  let stockStatus = "In Stock";
  if (!hasCoreDetails && safeProduct.status === "draft") {
    stockStatus = "Not set";
  } else if (stock === 0) {
    stockStatus = "Out of Stock";
  } else if (stock <= lowStockLimit) {
    stockStatus = "Low Stock";
  }

  const displayName = name || "Untitled Product";
  const displayCategory = categoryName || "No category";
  const displayPriceLabel = price ? `AED ${price}` : "Price not set";
  const displayStockLabel =
    hasCoreDetails || stock > 0 || product.allowBackorder ? `${stock}` : "Stock not added";
  const displayStatusLabel = product.status || "Draft";

  return {
    ...safeProduct,
    id: safeProduct.id || safeProduct._id,
    _id: safeProduct._id || safeProduct.id,
    slug: safeProduct.slug || "",
    categoryId: safeProduct.categoryId || "",
    categoryName: displayCategory,
    category: displayCategory,
    price,
    salePrice: null,
    displayPrice: price,
    hasSale: false,
    currency: product.currency || "AED",
    images,
    imageUrls: images.map((image) => image.url),
    primaryImage:
      images.find((image) => image.isPrimary)?.url || images[0]?.url || PLACEHOLDER_PRODUCT_IMAGE,
    stock,
    lowStockLimit,
    stockStatus,
    sku: safeProduct.sku || "",
    taxIncluded: safeProduct.taxIncluded ?? true,
    allowBackorder: Boolean(safeProduct.allowBackorder),
    material: safeProduct.material || "",
    plating: safeProduct.plating || "",
    stoneType: safeProduct.stoneType || "",
    color: safeProduct.color || "",
    size: safeProduct.size || "",
    weight: safeProduct.weight || "",
    occasion: safeProduct.occasion || "",
    careInstructions: safeProduct.careInstructions || "",
    tags: Array.isArray(safeProduct.tags) ? safeProduct.tags : [],
    status: safeProduct.status || "active",
    visibility: safeProduct.visibility || "visible",
    isFeatured: Boolean(safeProduct.isFeatured),
    isBestSeller: Boolean(safeProduct.isBestSeller),
    isNewArrival: Boolean(safeProduct.isNewArrival),
    hasCoreDetails,
    displayName,
    displayCategory,
    displayPriceLabel,
    displayStockLabel,
    displayStatusLabel,
    fallbackPriceLabel: displayPriceLabel,
    fallbackStockLabel: displayStockLabel
  };
}

export function normalizeProductList(products) {
  return (products || []).map(normalizeProduct);
}

export function buildProductPayload(values = {}) {
  const safeName = asTrimmedString(values.name) || FALLBACK_PRODUCT_NAME;
  const normalizedImages = (Array.isArray(values.images) ? values.images : [])
    .filter(Boolean)
    .map((image) => ({
      id: image.id || "",
      url: asTrimmedString(image.url),
      key: asTrimmedString(image.key),
      alt: asTrimmedString(image.alt) || safeName,
      isPrimary: Boolean(image.isPrimary)
    }))
    .filter((image) => image.url);
  const primaryIndex = normalizedImages.findIndex((image) => image.isPrimary);

  return {
    name: safeName,
    slug: asTrimmedString(values.slug) || undefined,
    description: asTrimmedString(values.description),
    categoryId: asTrimmedString(values.categoryId),
    categoryName: asTrimmedString(values.categoryName),
    price: Math.max(0, asNumber(values.price, 0)),
    salePrice: null,
    currency: asTrimmedString(values.currency || "AED").toUpperCase(),
    images: normalizedImages.map((image, index) => ({
      ...image,
      isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex
    })),
    stock: Math.max(0, asNumber(values.stock, 0)),
    lowStockLimit: Math.max(0, asNumber(values.lowStockLimit, 3)),
    sku: asTrimmedString(values.sku),
    taxIncluded: asBoolean(values.taxIncluded, true),
    allowBackorder: asBoolean(values.allowBackorder, false),
    material: asTrimmedString(values.material),
    plating: asOptionalString(values.plating),
    stoneType: asOptionalString(values.stoneType),
    color: asTrimmedString(values.color),
    size: asOptionalString(values.size),
    weight: asOptionalString(values.weight),
    occasion: asOptionalString(values.occasion),
    careInstructions: asOptionalString(values.careInstructions),
    tags: Array.isArray(values.tags)
      ? values.tags.map((tag) => asTrimmedString(tag)).filter(Boolean)
      : String(values.tags || "")
          .split(",")
          .map((tag) => asTrimmedString(tag))
          .filter(Boolean),
    status: asEnum(values.status, VALID_STATUSES, "draft"),
    visibility: asEnum(values.visibility, VALID_VISIBILITY, "hidden"),
    isFeatured: asBoolean(values.isFeatured, false),
    isBestSeller: asBoolean(values.isBestSeller, false),
    isNewArrival: asBoolean(values.isNewArrival, false)
  };
}
