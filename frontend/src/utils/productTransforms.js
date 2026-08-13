const PLACEHOLDER_PRODUCT_IMAGE = "/placeholder-jewelry.svg";
const FALLBACK_PRODUCT_NAME = "Untitled Product";
const VALID_STATUSES = new Set(["active", "draft", "archived", "deleted"]);
const VALID_VISIBILITY = new Set(["visible", "hidden"]);
const VALID_MEDIA_TYPES = new Set(["original", "showcase"]);

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

function normalizeMediaType(value, fallback = "showcase") {
  return asEnum(value, VALID_MEDIA_TYPES, fallback);
}

function normalizeImage(image, index, fallbackName) {
  if (typeof image === "string") {
    return {
      id: "",
      url: image,
      key: "",
      alt: fallbackName,
      isPrimary: index === 0,
      mediaType: "showcase"
    };
  }

  return {
    id: image?.id || "",
    url: image?.url || "",
    key: image?.key || "",
    alt: image?.alt || fallbackName,
    isPrimary: Boolean(image?.isPrimary || index === 0),
    mediaType: normalizeMediaType(image?.mediaType, index === 0 ? "showcase" : "original")
  };
}

function deriveWorkflowStatus({ status, visibility, hasCoreDetails, images = [] }) {
  if (status === "deleted") return "archived";
  if (status === "archived") return "archived";
  if (status === "active" && visibility === "visible") return "published";

  const showcaseImages = images.filter((image) => image.mediaType === "showcase");
  if (!showcaseImages.length) return "image_pending";
  if (!hasCoreDetails) return "draft";
  return "ready_to_publish";
}

function getWorkflowStatusLabel(workflowStatus) {
  const labels = {
    draft: "Draft",
    image_pending: "Image Pending",
    ready_to_publish: "Ready to Publish",
    published: "Publish",
    archived: "Archived"
  };

  return labels[workflowStatus] || "Draft";
}

function mapWorkflowStatusToState(workflowStatus) {
  switch (workflowStatus) {
    case "published":
      return { status: "active", visibility: "visible" };
    case "ready_to_publish":
      return { status: "active", visibility: "hidden" };
    case "image_pending":
      return { status: "draft", visibility: "hidden" };
    case "archived":
      return { status: "archived", visibility: "hidden" };
    case "draft":
    default:
      return { status: "draft", visibility: "hidden" };
  }
}

function normalizeStockMovement(movement) {
  const safeMovement = movement || {};
  const previousStock = asNumber(safeMovement.previousStock, 0);
  const newStock = asNumber(safeMovement.newStock, 0);
  const quantityChange = asNumber(safeMovement.quantityChange, newStock - previousStock);
  const rawType = asTrimmedString(safeMovement.type) || "manual_adjustment";
  const displayType =
    rawType === "order_placed"
      ? "Order Placed"
      : rawType === "sale_correction"
        ? "Sale Correction"
      : rawType
          .split("_")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

  return {
    ...safeMovement,
    previousStock,
    newStock,
    quantityChange,
    note: asTrimmedString(safeMovement.note),
    actorName: asTrimmedString(safeMovement.actorName),
    createdAt: safeMovement.createdAt || null,
    displayType,
    displayChangeLabel: quantityChange > 0 ? `+${quantityChange}` : `${quantityChange}`
  };
}

export function calculateSuggestedSellingPrice(totalProductCost, profitPercentage = 35) {
  const safeTotalProductCost = asNumber(totalProductCost, 0);
  const safeProfitPercentage = Math.max(0, asNumber(profitPercentage, 35));
  if (!safeTotalProductCost) {
    return 0;
  }

  return Number((safeTotalProductCost * (1 + safeProfitPercentage / 100)).toFixed(2));
}

export function normalizeProduct(product) {
  const safeProduct = product || {};
  const images = (safeProduct.images || [])
    .map((image, index) => normalizeImage(image, index, safeProduct.name))
    .filter((image) => image.url);

  const normalizedCurrency = asTrimmedString(safeProduct.currency).toUpperCase();
  const sourceCurrency = normalizedCurrency || "AED";
  const name = asTrimmedString(safeProduct.name);
  const categoryName = asTrimmedString(safeProduct.categoryName || safeProduct.category);
  const categoryCode = asTrimmedString(safeProduct.categoryCode);
  const price = asNumber(safeProduct.price, 0);
  const stock = asNumber(safeProduct.stock, 0);
  const lowStockLimit = asNumber(safeProduct.lowStockLimit, 3);
  const purchaseUnitCost = asNumber(safeProduct.purchaseUnitCost, 0);
  const purchaseTotalCost = asNumber(safeProduct.purchaseTotalCost, 0);
  const directProductExpense = asNumber(safeProduct.directProductExpense, 0);
  const allocatedBatchExpense = asNumber(safeProduct.allocatedBatchExpense, 0);
  const packagingCost = asNumber(safeProduct.packagingCost, 0);
  const packagingCostSource =
    safeProduct.packagingCostSource === "profile_default" ? "profile_default" : "custom";
  const totalProductCost =
    asNumber(safeProduct.totalProductCost, 0) ||
    purchaseTotalCost + directProductExpense + allocatedBatchExpense + packagingCost;
  const storedSuggestedSellingPrice = asNumber(safeProduct.suggestedSellingPrice, 0);
  const derivedProfitPercentage =
    totalProductCost > 0 && storedSuggestedSellingPrice > 0
      ? Number((((storedSuggestedSellingPrice / totalProductCost) - 1) * 100).toFixed(2))
      : 35;
  const profitPercentage = Math.max(
    0,
    asNumber(safeProduct.profitPercentage, derivedProfitPercentage),
  );
  const suggestedSellingPrice =
    storedSuggestedSellingPrice || calculateSuggestedSellingPrice(totalProductCost, profitPercentage);
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
  const displayPriceLabel = price ? `${sourceCurrency} ${price}` : "Price not set";
  const displayTotalCostLabel = totalProductCost
    ? `${sourceCurrency} ${totalProductCost.toFixed(2)}`
    : "Cost not set";
  const displaySuggestedPriceLabel = suggestedSellingPrice
    ? `${sourceCurrency} ${suggestedSellingPrice.toFixed(2)}`
    : "Not suggested";
  const displayStockLabel =
    hasCoreDetails || stock > 0 || product.allowBackorder ? `${stock}` : "Stock not added";
  const rawStatus = safeProduct.status || "active";
  const visibility = safeProduct.visibility || "visible";
  const stockMovements = Array.isArray(safeProduct.stockMovements)
    ? safeProduct.stockMovements.map(normalizeStockMovement).sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
    : [];
  const workflowStatus = deriveWorkflowStatus({
    status: rawStatus,
    visibility,
    hasCoreDetails,
    images
  });
  const displayStatusLabel = getWorkflowStatusLabel(workflowStatus);

  return {
    ...safeProduct,
    id: safeProduct.id || safeProduct._id,
    _id: safeProduct._id || safeProduct.id,
    slug: safeProduct.slug || "",
    categoryId: safeProduct.categoryId || "",
    categoryName: displayCategory,
    categoryCode,
    category: displayCategory,
    designNumber: asNumber(safeProduct.designNumber, 0),
    price,
    salePrice: null,
    displayPrice: price,
    hasSale: false,
    currency: sourceCurrency,
    images,
    imageUrls: images.map((image) => image.url),
    primaryImage:
      images.find((image) => image.isPrimary)?.url || images[0]?.url || PLACEHOLDER_PRODUCT_IMAGE,
    stock,
    lowStockLimit,
    stockMovements,
    stockStatus,
    sku: safeProduct.sku || "",
    supplierId: safeProduct.supplierId || "",
    supplierName: safeProduct.supplierName || "",
    purchaseBatchId: safeProduct.purchaseBatchId || "",
    purchaseDate: safeProduct.purchaseDate || null,
    quantityPurchased: asNumber(safeProduct.quantityPurchased, 0),
    purchaseUnitCost,
    purchaseTotalCost,
    directProductExpense,
    allocatedBatchExpense,
    packagingCost,
    packagingProfileId: safeProduct.packagingProfileId || "",
    packagingProfileLabel: safeProduct.packagingProfileLabel || "",
    packagingCostSource,
    totalProductCost,
    profitPercentage,
    suggestedSellingPrice,
    taxIncluded: safeProduct.taxIncluded ?? true,
    allowBackorder: Boolean(safeProduct.allowBackorder),
    material: safeProduct.material || "",
    plating: safeProduct.plating || "",
    stoneType: safeProduct.stoneType || "",
    color: safeProduct.color || "",
    size: safeProduct.size || "",
    variantName: safeProduct.variantName || "",
    variantCode: safeProduct.variantCode || "",
    weight: safeProduct.weight || "",
    occasion: safeProduct.occasion || "",
    careInstructions: safeProduct.careInstructions || "",
    tags: Array.isArray(safeProduct.tags) ? safeProduct.tags : [],
    status: rawStatus,
    workflowStatus,
    visibility,
    isFeatured: Boolean(safeProduct.isFeatured),
    isBestSeller: Boolean(safeProduct.isBestSeller),
    isNewArrival: Boolean(safeProduct.isNewArrival),
    hasCoreDetails,
    originalMedia: images.filter((image) => image.mediaType === "original"),
    showcaseMedia: images.filter((image) => image.mediaType === "showcase"),
    displayName,
    displayCategory,
    displayPriceLabel,
    displayTotalCostLabel,
    displaySuggestedPriceLabel,
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
  const workflowState = mapWorkflowStatusToState(values.workflowStatus);
  const normalizedImages = (Array.isArray(values.images) ? values.images : [])
    .filter(Boolean)
    .map((image) => ({
      id: image.id || "",
      url: asTrimmedString(image.url),
      key: asTrimmedString(image.key),
      alt: asTrimmedString(image.alt) || safeName,
      isPrimary: Boolean(image.isPrimary),
      mediaType: normalizeMediaType(image.mediaType)
    }))
    .filter((image) => image.url);
  const primaryIndex = normalizedImages.findIndex((image) => image.isPrimary);

  return {
    name: safeName,
    slug: asTrimmedString(values.slug) || undefined,
    description: asTrimmedString(values.description),
    categoryId: asTrimmedString(values.categoryId),
    categoryName: asTrimmedString(values.categoryName),
    categoryCode: asTrimmedString(values.categoryCode),
    price: Math.max(0, asNumber(values.price, 0)),
    salePrice: null,
    currency: asTrimmedString(values.currency || "INR").toUpperCase(),
    images: normalizedImages.map((image, index) => ({
      id: image.id,
      url: image.url,
      key: image.key,
      alt: image.alt,
      isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex
    })),
    stock: Math.max(0, asNumber(values.stock, 0)),
    lowStockLimit: Math.max(0, asNumber(values.lowStockLimit, 3)),
    sku: asTrimmedString(values.sku),
    supplierId: asTrimmedString(values.supplierId) || undefined,
    supplierName: asTrimmedString(values.supplierName),
    purchaseBatchId: asTrimmedString(values.purchaseBatchId) || undefined,
    purchaseDate: values.purchaseDate || null,
    quantityPurchased: Math.max(0, asNumber(values.quantityPurchased, 0)),
    purchaseUnitCost: Math.max(0, asNumber(values.purchaseUnitCost, 0)),
    purchaseTotalCost: Math.max(0, asNumber(values.purchaseTotalCost, 0)),
    directProductExpense: Math.max(0, asNumber(values.directProductExpense, 0)),
    allocatedBatchExpense: Math.max(0, asNumber(values.allocatedBatchExpense, 0)),
    packagingCost: Math.max(0, asNumber(values.packagingCost, 0)),
    packagingProfileId: asTrimmedString(values.packagingProfileId),
    packagingProfileLabel: asTrimmedString(values.packagingProfileLabel),
    packagingCostSource:
      values.packagingCostSource === "profile_default" ? "profile_default" : "custom",
    totalProductCost: Math.max(0, asNumber(values.totalProductCost, 0)),
    profitPercentage: Math.max(0, asNumber(values.profitPercentage, 35)),
    suggestedSellingPrice: Math.max(0, asNumber(values.suggestedSellingPrice, 0)),
    taxIncluded: asBoolean(values.taxIncluded, true),
    allowBackorder: asBoolean(values.allowBackorder, false),
    material: asTrimmedString(values.material),
    plating: asOptionalString(values.plating),
    stoneType: asOptionalString(values.stoneType),
    color: asTrimmedString(values.color),
    size: asOptionalString(values.size),
    variantName: asOptionalString(values.variantName),
    variantCode: asOptionalString(values.variantCode),
    weight: asOptionalString(values.weight),
    occasion: asOptionalString(values.occasion),
    careInstructions: asOptionalString(values.careInstructions),
    tags: Array.isArray(values.tags)
      ? values.tags.map((tag) => asTrimmedString(tag)).filter(Boolean)
      : String(values.tags || "")
          .split(",")
          .map((tag) => asTrimmedString(tag))
          .filter(Boolean),
    status: workflowState.status,
    visibility: workflowState.visibility,
    isFeatured: asBoolean(values.isFeatured, false),
    isBestSeller: asBoolean(values.isBestSeller, false),
    isNewArrival: asBoolean(values.isNewArrival, false)
  };
}
