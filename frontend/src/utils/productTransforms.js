const PLACEHOLDER_PRODUCT_IMAGE = "/placeholder-jewelry.svg";

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
  const images = (product.images || [])
    .map((image, index) => normalizeImage(image, index, product.name))
    .filter((image) => image.url);

  const name = (product.name || "").trim();
  const categoryName = (product.categoryName || product.category || "").trim();
  const price = Number(product.price || 0);
  const salePrice = product.salePrice == null ? null : Number(product.salePrice);
  const stock = Number(product.stock || 0);
  const lowStockLimit = Number(product.lowStockLimit ?? 3);
  const hasSale = salePrice != null && salePrice < price;
  const hasCoreDetails =
    Boolean(name && name !== "Untitled Product") &&
    Boolean(categoryName) &&
    Number(product.price || 0) > 0 &&
    (product.stock != null) &&
    Boolean((product.description || "").trim()) &&
    Boolean((product.sku || "").trim());

  let stockStatus = "In Stock";
  if (!hasCoreDetails && product.status === "draft") {
    stockStatus = "Not set";
  } else if (stock === 0) {
    stockStatus = "Out of Stock";
  } else if (stock <= lowStockLimit) {
    stockStatus = "Low Stock";
  }

  const displayName = name || "Untitled Product";
  const displayCategory = categoryName || "No category";
  const displayPriceLabel = price ? `AED ${salePrice ?? price}` : "Price not set";
  const displayStockLabel =
    hasCoreDetails || stock > 0 || product.allowBackorder ? `${stock}` : "Stock not added";
  const displayStatusLabel = product.status || "Draft";

  return {
    ...product,
    id: product.id || product._id,
    _id: product._id || product.id,
    slug: product.slug || "",
    categoryId: product.categoryId || "",
    categoryName: displayCategory,
    category: displayCategory,
    price,
    salePrice,
    displayPrice: salePrice ?? price,
    hasSale,
    currency: product.currency || "AED",
    images,
    imageUrls: images.map((image) => image.url),
    primaryImage:
      images.find((image) => image.isPrimary)?.url || images[0]?.url || PLACEHOLDER_PRODUCT_IMAGE,
    stock,
    lowStockLimit,
    stockStatus,
    sku: product.sku || "",
    taxIncluded: product.taxIncluded ?? true,
    allowBackorder: Boolean(product.allowBackorder),
    material: product.material || "",
    plating: product.plating || "",
    stoneType: product.stoneType || "",
    color: product.color || "",
    size: product.size || "",
    weight: product.weight || "",
    occasion: product.occasion || "",
    careInstructions: product.careInstructions || "",
    tags: product.tags || [],
    status: product.status || "active",
    visibility: product.visibility || "visible",
    isFeatured: Boolean(product.isFeatured),
    isBestSeller: Boolean(product.isBestSeller),
    isNewArrival: Boolean(product.isNewArrival),
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

export function buildProductPayload(values) {
  const normalizedImages = (values.images || [])
    .map((image) => ({
      id: image.id || "",
      url: image.url.trim(),
      key: image.key?.trim() || "",
      alt: image.alt?.trim() || values.name.trim(),
      isPrimary: Boolean(image.isPrimary)
    }))
    .filter((image) => image.url);
  const primaryIndex = normalizedImages.findIndex((image) => image.isPrimary);

  return {
    name: values.name.trim(),
    slug: values.slug?.trim() || undefined,
    description: values.description.trim(),
    categoryId: values.categoryId?.trim() || "",
    categoryName: values.categoryName.trim(),
    price: Number(values.price || 0),
    salePrice: values.salePrice == null ? null : Number(values.salePrice),
    currency: (values.currency || "AED").trim().toUpperCase(),
    images: normalizedImages.map((image, index) => ({
      ...image,
      isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex
    })),
    stock: Number(values.stock || 0),
    lowStockLimit: Number(values.lowStockLimit ?? 3),
    sku: values.sku.trim(),
    taxIncluded: Boolean(values.taxIncluded),
    allowBackorder: Boolean(values.allowBackorder),
    material: values.material.trim(),
    plating: values.plating?.trim() || null,
    stoneType: values.stoneType?.trim() || null,
    color: values.color.trim(),
    size: values.size?.trim() || null,
    weight: values.weight?.trim() || null,
    occasion: values.occasion?.trim() || null,
    careInstructions: values.careInstructions?.trim() || null,
    tags: Array.isArray(values.tags)
      ? values.tags.map((tag) => tag.trim()).filter(Boolean)
      : String(values.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    status: values.status,
    visibility: values.visibility,
    isFeatured: Boolean(values.isFeatured),
    isBestSeller: Boolean(values.isBestSeller),
    isNewArrival: Boolean(values.isNewArrival)
  };
}
