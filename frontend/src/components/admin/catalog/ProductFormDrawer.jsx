import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Spin,
  Tag,
  Tooltip,
  message
} from "antd";
import {
  AppstoreOutlined,
  BulbOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  TagOutlined
} from "@ant-design/icons";
import {
  createProduct,
  getProduct,
  previewProductSku,
  updateProduct,
  uploadProductImage
} from "../../../services/productService";
import { createCategory, createVariantCode, getVariantCodes } from "../../../services/categoryService";
import { createSupplier, getSuppliers } from "../../../services/purchaseService";
import { useCurrency } from "../../../context/CurrencyContext";
import { buildProductPayload, calculateSuggestedSellingPrice } from "../../../utils/productTransforms";
import { CURRENCY_OPTIONS, convertCurrencyAmount } from "../../../utils/currency";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import ProductImageUploader from "./ProductImageUploader";

const occasionOptions = ["Daily Wear", "Wedding", "Gift", "Party", "Office", "Travel"];
const materialOptions = ["Sterling Silver", "18K Gold", "14K Gold", "Gold Vermeil", "Rose Gold"];
const platingOptions = ["Gold Plated", "Rhodium Plated", "Silver Finish", "Rose Gold Finish"];
const stoneOptions = ["Diamond", "Pearl", "Cubic Zirconia", "Moissanite", "Emerald", "None"];
const colorOptions = ["Gold", "Silver", "Rose Gold", "White", "Black", "Multicolor"];
const variantTypeLabels = {
  color: "Color",
  material: "Material",
  plating: "Plating",
  stone: "Stone Type"
};
const labelOptions = [
  { name: "isFeatured", label: "Featured Product" },
  { name: "isBestSeller", label: "Best Seller" },
  { name: "isNewArrival", label: "New Arrival" }
];

const FAQ_TOPICS = [
  {
    key: "selling-price",
    label: "Selling Price",
    tooltip: "What does selling price mean?",
    keywords: ["price", "selling", "original", "showcase", "mrp"],
    content:
      "This is the price your customer pays for one piece. Example: if you want to sell one bracelet for 199, enter 199 here."
  },
  {
    key: "sku",
    label: "SKU",
    tooltip: "What does SKU mean?",
    keywords: ["sku", "stock keeping unit", "code"],
    content:
      "SKU is your internal product code. It helps your team identify the exact item, color, size, or variant quickly."
  },
  {
    key: "stock-quantity",
    label: "Stock Quantity",
    tooltip: "What does stock quantity mean?",
    keywords: ["stock", "quantity"],
    content:
      "This is how many sellable units you currently have. Example: if you have 8 bracelets ready to sell, stock quantity is 8."
  },
  {
    key: "low-stock-limit",
    label: "Low-Stock Limit",
    tooltip: "What does low-stock limit mean?",
    keywords: ["low stock", "limit", "threshold"],
    content:
      "This is the warning point where your team should restock. Example: if the alert should appear when only 2 pieces remain, enter 2."
  },
  {
    key: "purchase-date",
    label: "Purchase Date",
    tooltip: "What does purchase date mean?",
    keywords: ["purchase date", "date bought"],
    content:
      "This is the date you bought or received this product from the supplier."
  },
  {
    key: "quantity-purchased",
    label: "Quantity Purchased",
    tooltip: "What does quantity purchased mean?",
    keywords: ["quantity purchased", "bought quantity"],
    content:
      "This is how many units were purchased from the supplier in that order. Example: if you bought 12 rings, enter 12."
  },
  {
    key: "purchase-unit-cost",
    label: "Purchase Unit Cost",
    tooltip: "What does purchase unit cost mean?",
    keywords: ["purchase unit cost", "unit cost", "buying cost"],
    content:
      "This is what you pay for one single unit from the supplier. Example: if one bracelet costs 25, purchase unit cost is 25."
  },
  {
    key: "purchase-total-cost",
    label: "Purchase Total Cost",
    tooltip: "What does purchase total cost mean?",
    keywords: ["purchase total cost", "total supplier cost"],
    content:
      "This is the total supplier cost for the purchased quantity. Example: 10 bracelets x 25 each = 250."
  },
  {
    key: "direct-product-expense",
    label: "Direct Product Expense",
    tooltip: "What does direct product expense mean?",
    keywords: ["direct product expense", "direct expense"],
    content:
      "This is an extra cost that belongs only to this product, not the whole batch. Example: a custom stone setting charge for only this item."
  },
  {
    key: "allocated-batch-expense",
    label: "Allocated Batch Expense",
    tooltip: "What does allocated batch expense mean?",
    keywords: ["allocated batch expense", "shared expense", "shipping share"],
    content:
      "This is this product's share of batch-level costs like shipping, customs, or delivery. It helps you see the real landed cost per item."
  },
  {
    key: "packaging-cost",
    label: "Packaging Cost",
    tooltip: "What does packaging cost mean?",
    keywords: ["packaging cost", "box", "pouch"],
    content:
      "This is the packaging cost for one item, such as a box, pouch, card, or sticker."
  },
  {
    key: "total-product-cost",
    label: "Total Product Cost",
    tooltip: "What does total product cost mean?",
    keywords: ["total product cost", "landed cost"],
    content:
      "This is the final internal cost of the product after adding purchase total cost, direct product expense, allocated batch expense, and packaging cost."
  },
  {
    key: "suggested-selling-price",
    label: "Suggested Selling Price",
    tooltip: "What does suggested selling price mean?",
    keywords: ["suggested selling price", "recommended price"],
    content:
      "This is a recommended starting sale price based on the current product cost. You can still adjust it before saving."
  },
  {
    key: "tax-included",
    label: "Tax Included",
    tooltip: "What does tax included mean?",
    keywords: ["tax included", "vat", "gst"],
    content:
      "Choose Yes when the selling price already includes tax. Choose No when tax should be added separately."
  },
  {
    key: "variant-family",
    label: "Variant Family",
    tooltip: "What does variant family mean?",
    keywords: ["variant family", "same design", "multi color", "variants"],
    content:
      "Use Variant Family to group the same design sold in different colors, sizes, materials, platings, or stones. Example: Luna Bracelet can have gold, silver, and rose-gold variants in one family."
  }
];

const defaultValues = {
  name: "",
  slug: "",
  description: "",
  categoryId: undefined,
  categoryName: "",
  categoryCode: "",
  sku: "",
  designNumber: 0,
  workflowStatus: "draft",
  visibility: "hidden",
  price: 0,
  currency: "INR",
  supplierId: "",
  supplierName: "",
  purchaseDate: "",
  quantityPurchased: 0,
  purchaseUnitCost: 0,
  purchaseTotalCost: 0,
  directProductExpense: 0,
  allocatedBatchExpense: 0,
  packagingCost: 0,
  totalProductCost: 0,
  profitPercentage: 35,
  suggestedSellingPrice: 0,
  taxIncluded: true,
  stock: 0,
  lowStockLimit: 3,
  allowBackorder: false,
  images: [],
  material: "",
  plating: "",
  stoneType: "",
  color: "",
  size: "",
  variantName: "",
  variantCode: "",
  weight: "",
  occasion: "",
  careInstructions: "",
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: false,
  tags: []
};

const sectionItems = [
  {
    key: "basic",
    label: "Basic Information",
    description: "Name, category, SKU and product story.",
    icon: FileTextOutlined
  },
  {
    key: "pricing",
    label: "Pricing & Inventory",
    description: "Price, stock, tax and availability settings.",
    icon: TagOutlined
  },
  {
    key: "images",
    label: "Media",
    description: "Organize original and showcase media in one product record.",
    icon: PictureOutlined
  },
  {
    key: "details",
    label: "Product Details",
    description: "Material, size, weight and extra attributes.",
    icon: AppstoreOutlined
  },
  {
    key: "visibility",
    label: "Workflow & Labels",
    description: "Set the product workflow stage and storefront presentation.",
    icon: EyeOutlined
  }
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function cropImageToFile(imageUrl, cropPixels, fileName = "product-image.jpg") {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const context = canvas.getContext("2d");

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  if (!blob) {
    throw new Error("Unable to crop image.");
  }

  return new File([blob], fileName, { type: "image/jpeg" });
}

function buildCropFileName(image, index) {
  const source = image.key || image.url || `product-image-${index + 1}.jpg`;
  const namePart = source.split("/").pop()?.split("?")[0] || `product-image-${index + 1}.jpg`;
  const safeBase = namePart.replace(/\.[^.]+$/, "");
  return `${safeBase}-cropped.jpg`;
}

function buildTempImageId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateAlphaCode(value, maxLength = 4) {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .trim();
  if (!cleaned) return "";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const initials = parts.map((part) => part[0]).join("");
  if (initials.length >= 2) {
    return initials.slice(0, maxLength);
  }

  return cleaned.replace(/\s+/g, "").slice(0, maxLength);
}

function buildVariantOptions(items = []) {
  return items.map((item) => ({
    label: item.name,
    value: item.name
  }));
}

function buildFaqItems(topics, activeKey, highlightedKey, itemRefs) {
  return topics.map((topic) => ({
    key: topic.key,
    label: (
      <span
        ref={(node) => {
          itemRefs.current[topic.key] = node;
        }}
        tabIndex={-1}
        className="catalog-faq-item-heading"
      >
        {topic.label}
      </span>
    ),
    children: (
      <div
        className={[
          "catalog-faq-item-body",
          activeKey?.[0] === topic.key ? "is-open" : "",
          highlightedKey === topic.key ? "is-highlighted" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p>{topic.content}</p>
      </div>
    )
  }));
}

export default function ProductFormDrawer({
  open,
  productId,
  categories,
  canCreate,
  canUpdate,
  canManageCategories = false,
  initialStep = 0,
  onClose,
  onCategoriesUpdated,
  onSaved
}) {
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [supplierForm] = Form.useForm();
  const [variantForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [purchaseLinksLoading, setPurchaseLinksLoading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [variantSaving, setVariantSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [variantCodes, setVariantCodes] = useState([]);
  const [activeVariantType, setActiveVariantType] = useState("color");
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [skuPreviewLoading, setSkuPreviewLoading] = useState(false);
  const [imageList, setImageList] = useState([]);
  const [faqPanelOpen, setFaqPanelOpen] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqActiveKey, setFaqActiveKey] = useState(["purchase-unit-cost"]);
  const [faqHighlightedKey, setFaqHighlightedKey] = useState("");
  const [faqTriggerKey, setFaqTriggerKey] = useState("");
  const [isMobileFaq, setIsMobileFaq] = useState(false);
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const { rates } = useCurrency();
  const faqHeadingRefs = useRef({});
  const faqTriggerRefs = useRef({});
  const faqHighlightTimeoutRef = useRef(null);
  const formScrollRef = useRef(null);
  const pendingFocusFieldRef = useRef(null);
  const isEdit = Boolean(productId);
  const canSave = isEdit ? canUpdate : canCreate;

  const stepFieldMap = [
    ["name", "categoryId", "sku", "description"],
    [
      "price",
      "currency",
      "stock",
      "lowStockLimit",
      "supplierName",
      "purchaseDate",
      "quantityPurchased",
      "purchaseUnitCost",
      "purchaseTotalCost",
      "directProductExpense",
      "allocatedBatchExpense",
      "packagingCost",
      "totalProductCost",
      "profitPercentage",
      "suggestedSellingPrice",
      "taxIncluded",
      "allowBackorder"
    ],
    ["images"],
    ["material", "plating", "stoneType", "color", "size", "weight", "occasion", "careInstructions"],
    ["workflowStatus", "isFeatured", "isBestSeller", "isNewArrival", "tags"]
  ];
  const currentSection = sectionItems[currentStep];
  const clampedInitialStep = Math.min(Math.max(initialStep, 0), sectionItems.length - 1);

  const watchedPurchaseTotalCost = Form.useWatch("purchaseTotalCost", form);
  const watchedDirectProductExpense = Form.useWatch("directProductExpense", form);
  const watchedAllocatedBatchExpense = Form.useWatch("allocatedBatchExpense", form);
  const watchedPackagingCost = Form.useWatch("packagingCost", form);
  const watchedProfitPercentage = Form.useWatch("profitPercentage", form);
  const watchedSuggestedSellingPrice = Form.useWatch("suggestedSellingPrice", form);
  const watchedPrice = Form.useWatch("price", form);
  const watchedCategoryId = Form.useWatch("categoryId", form);
  const watchedCategoryName = Form.useWatch("categoryName", form);
  const watchedColor = Form.useWatch("color", form);
  const watchedSize = Form.useWatch("size", form);
  const watchedMaterial = Form.useWatch("material", form);
  const watchedVariantCode = Form.useWatch("variantCode", form);

  const faqTopicMap = useMemo(
    () => Object.fromEntries(FAQ_TOPICS.map((topic) => [topic.key, topic])),
    []
  );

  const filteredFaqTopics = useMemo(() => {
    const query = faqSearch.trim().toLowerCase();
    if (!query) return FAQ_TOPICS;
    return FAQ_TOPICS.filter(
      (topic) =>
        topic.label.toLowerCase().includes(query) ||
        topic.content.toLowerCase().includes(query) ||
        topic.keywords.some((keyword) => keyword.toLowerCase().includes(query))
    );
  }, [faqSearch]);

  const faqItems = useMemo(
    () => buildFaqItems(filteredFaqTopics, faqActiveKey, faqHighlightedKey, faqHeadingRefs),
    [filteredFaqTopics, faqActiveKey, faqHighlightedKey]
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.isActive ? category.name : `${category.name} (Inactive)`,
        value: category._id,
        categoryName: category.name,
        categoryCode: category.code
      })),
    [categories]
  );

  const activeVariantItems = useMemo(
    () => variantCodes.filter((item) => item.isActive !== false),
    [variantCodes]
  );

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        label: supplier.name,
        value: supplier._id
      })),
    [suppliers]
  );

  const colorVariantOptions = useMemo(
    () => buildVariantOptions(activeVariantItems.filter((item) => (item.type || "").toLowerCase() === "color")),
    [activeVariantItems]
  );

  const materialVariantOptions = useMemo(
    () => buildVariantOptions(activeVariantItems.filter((item) => (item.type || "").toLowerCase() === "material")),
    [activeVariantItems]
  );

  const platingVariantOptions = useMemo(
    () => buildVariantOptions(activeVariantItems.filter((item) => (item.type || "").toLowerCase() === "plating")),
    [activeVariantItems]
  );

  const stoneVariantOptions = useMemo(
    () => buildVariantOptions(activeVariantItems.filter((item) => (item.type || "").toLowerCase() === "stone")),
    [activeVariantItems]
  );

  const currentTotalProductCost = Number(form.getFieldValue("totalProductCost")) || 0;
  const currentSuggestedSellingPrice = Number(watchedSuggestedSellingPrice) || 0;
  const currentProfitPercentage = Number(watchedProfitPercentage) || 0;
  const currentSellingPrice = Number(watchedPrice) || 0;
  const targetProfitAmount = Math.max(0, Number((currentSuggestedSellingPrice - currentTotalProductCost).toFixed(2)));

  const handleCurrencyFieldChange = (nextCurrency) => {
    const currentCurrency = form.getFieldValue("currency") || "INR";
    if (currentCurrency === nextCurrency) return;

    const nextValues = {};
    ["price", "suggestedSellingPrice"].forEach((field) => {
      const currentValue = Number(form.getFieldValue(field) ?? 0);
      nextValues[field] = convertCurrencyAmount(currentValue, currentCurrency, nextCurrency, rates);
    });

    form.setFieldsValue({
      ...nextValues,
      currency: nextCurrency
    });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileFaq(window.innerWidth < 992);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const purchaseTotalCost = Number(watchedPurchaseTotalCost) || 0;
    const directProductExpense = Number(watchedDirectProductExpense) || 0;
    const allocatedBatchExpense = Number(watchedAllocatedBatchExpense) || 0;
    const packagingCost = Number(watchedPackagingCost) || 0;
    const totalProductCost = Number(
      (purchaseTotalCost + directProductExpense + allocatedBatchExpense + packagingCost).toFixed(2)
    );
    const currentTotal = Number(form.getFieldValue("totalProductCost")) || 0;
    const profitPercentage = Number(watchedProfitPercentage) || 0;

    if (currentTotal !== totalProductCost) {
      form.setFieldValue("totalProductCost", totalProductCost);
    }

    const suggestedSellingPrice = calculateSuggestedSellingPrice(totalProductCost, profitPercentage);
    if (Number(watchedSuggestedSellingPrice) !== suggestedSellingPrice) {
      form.setFieldValue("suggestedSellingPrice", suggestedSellingPrice);
    }

    if (!priceManuallyEdited) {
      const nextPrice = suggestedSellingPrice;
      if (Number(form.getFieldValue("price")) !== nextPrice) {
        form.setFieldValue("price", nextPrice);
      }
    }
  }, [
    form,
    open,
    priceManuallyEdited,
    watchedAllocatedBatchExpense,
    watchedDirectProductExpense,
    watchedPackagingCost,
    watchedProfitPercentage,
    watchedPurchaseTotalCost,
    watchedSuggestedSellingPrice
  ]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setCurrentStep(clampedInitialStep);
      setSaveError("");
      setImageList([]);
      setPriceManuallyEdited(false);
      setFaqPanelOpen(false);
      setFaqSearch("");
      return;
    }

    if (!productId) {
      form.setFieldsValue(defaultValues);
      setCurrentStep(clampedInitialStep);
      setSaveError("");
      setImageList([]);
      setPriceManuallyEdited(false);
      return;
    }

    setProductLoading(true);
    setSaveError("");
    getProduct(productId, { admin: true })
      .then((product) => {
        form.setFieldsValue({
          ...defaultValues,
          ...product,
          images: product.images || [],
          purchaseDate: product.purchaseDate ? String(product.purchaseDate).slice(0, 10) : "",
          workflowStatus: product.workflowStatus || "draft",
          tags: product.tags || []
        });
        setPriceManuallyEdited(
          Math.abs(Number(product.price || 0) - Number(product.suggestedSellingPrice || 0)) > 0.009
        );
        setImageList(product.images || []);
        setCurrentStep(clampedInitialStep);
      })
      .catch((error) => {
        setSaveError(getApiErrorMessage(error, "Unable to load this product for editing."));
      })
      .finally(() => {
        setProductLoading(false);
      });
  }, [clampedInitialStep, form, open, productId]);

  useEffect(() => {
    if (!open) return undefined;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    formScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });

    if (!pendingFocusFieldRef.current) return;

    const fieldName = pendingFocusFieldRef.current;
    pendingFocusFieldRef.current = null;

    window.setTimeout(() => {
      form.scrollToField(fieldName, { block: "center", behavior: "smooth" });
      const leafField = Array.isArray(fieldName) ? fieldName[0] : fieldName;
      const instance = form.getFieldInstance?.(leafField);
      if (instance?.focus) {
        instance.focus();
      } else if (instance?.input?.focus) {
        instance.input.focus();
      }
    }, 60);
  }, [currentStep, form, open]);

  useEffect(() => {
    if (!open) {
      setSuppliers([]);
      setVariantCodes([]);
      return;
    }

    let cancelled = false;
    setPurchaseLinksLoading(true);

    Promise.allSettled([getSuppliers({ activeOnly: true }), getVariantCodes({ admin: true })])
      .then(([supplierResult, variantCodeResult]) => {
        if (cancelled) return;
        setSuppliers(supplierResult.status === "fulfilled" ? supplierResult.value : []);
        setVariantCodes(variantCodeResult.status === "fulfilled" ? variantCodeResult.value : []);
      })
      .finally(() => {
        if (!cancelled) {
          setPurchaseLinksLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || isEdit || !watchedCategoryId) {
      return;
    }

    let cancelled = false;
    setSkuPreviewLoading(true);

    previewProductSku({
      categoryId: watchedCategoryId,
      categoryName: watchedCategoryName,
      color: watchedColor || undefined,
      size: watchedSize || undefined,
      material: watchedMaterial || undefined,
      variantCode: watchedVariantCode || undefined
    })
      .then((preview) => {
        if (cancelled) return;
        form.setFieldsValue({
          sku: preview.sku || "",
          designNumber: preview.designNumber || 0,
          categoryCode: preview.categoryCode || form.getFieldValue("categoryCode") || ""
        });
      })
      .catch(() => {
        if (!cancelled) {
          form.setFieldValue("sku", "");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSkuPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    form,
    isEdit,
    open,
    watchedCategoryId,
    watchedCategoryName,
    watchedColor,
    watchedMaterial,
    watchedSize,
    watchedVariantCode
  ]);

  useEffect(() => {
    if (!faqPanelOpen) return;

    const activeKey = faqActiveKey?.[0];
    if (!activeKey) return;

    const timeoutId = window.setTimeout(() => {
      faqHeadingRefs.current[activeKey]?.focus?.();
      faqHeadingRefs.current[activeKey]?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      setFaqHighlightedKey(activeKey);
      window.clearTimeout(faqHighlightTimeoutRef.current);
      faqHighlightTimeoutRef.current = window.setTimeout(() => {
        setFaqHighlightedKey("");
      }, 1500);
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, [faqPanelOpen, faqActiveKey]);

  const updateImages = (updater) => {
    setImageList((currentImages) => {
      const nextImages = updater(currentImages || []);
      form.setFieldValue("images", nextImages);
      return nextImages;
    });
  };

  const openFaqTopic = (topicKey) => {
    setFaqTriggerKey(topicKey);
    setFaqSearch("");
    setFaqActiveKey([topicKey]);
    setFaqPanelOpen(true);
  };

  const closeFaqPanel = () => {
    setFaqPanelOpen(false);
    const trigger = faqTriggerRefs.current[faqTriggerKey];
    if (trigger?.focus) {
      window.setTimeout(() => trigger.focus(), 0);
    }
  };

  const renderFaqLabel = (label, topicKey) => {
    const topic = faqTopicMap[topicKey];
    return (
      <span className="catalog-field-label-inline">
        <span>{label}</span>
        <Tooltip title={topic?.tooltip || `Learn about ${label.toLowerCase()}.`}>
          <button
            ref={(node) => {
              faqTriggerRefs.current[topicKey] = node;
            }}
            type="button"
            className="catalog-field-help-button"
            aria-label={topic?.tooltip || `Learn about ${label.toLowerCase()}.`}
            onClick={() => openFaqTopic(topicKey)}
          >
            <QuestionCircleOutlined />
          </button>
        </Tooltip>
      </span>
    );
  };

  const handleSupplierSelect = (supplierId) => {
    const supplier = suppliers.find((item) => item._id === supplierId);
    form.setFieldValue("supplierId", supplierId || "");
    form.setFieldValue("supplierName", supplier?.name || "");
  };

  const openCreateSupplier = () => {
    supplierForm.resetFields();
    setSupplierModalOpen(true);
  };

  const handleCreateSupplier = async () => {
    const values = await supplierForm.validateFields();
    setSupplierSaving(true);
    try {
      const createdSupplier = await createSupplier({
        name: values.name.trim(),
        contactPerson: values.contactPerson?.trim() || null,
        phone: values.phone?.trim() || null,
        isActive: true
      });

      setSuppliers((current) => [...current, createdSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      form.setFieldsValue({
        supplierId: createdSupplier._id,
        supplierName: createdSupplier.name
      });
      setSupplierModalOpen(false);
      supplierForm.resetFields();
      message.success("Supplier created and selected.");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Supplier creation failed."));
    } finally {
      setSupplierSaving(false);
    }
  };

  const openCreateVariantOption = (type) => {
    setActiveVariantType(type);
    variantForm.resetFields();
    variantForm.setFieldsValue({
      type,
      code: "",
      description: `${variantTypeLabels[type] || "Option"} created from Add Product`
    });
    setVariantModalOpen(true);
  };

  const handleVariantNameChange = (event) => {
    const nextName = event?.target?.value || "";
    const currentCode = variantForm.getFieldValue("code");
    if (!currentCode) {
      variantForm.setFieldValue("code", generateAlphaCode(nextName));
    }
  };

  const handleCreateVariantOption = async () => {
    const values = await variantForm.validateFields();
    setVariantSaving(true);
    try {
      const type = (values.type || activeVariantType || "color").trim().toLowerCase();
      const createdOption = await createVariantCode({
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        type,
        description: values.description?.trim() || null,
        isActive: true,
        sortOrder: activeVariantItems.filter((item) => (item.type || "").toLowerCase() === type).length + 1
      });

      setVariantCodes((current) =>
        [...current, createdOption].sort((a, b) => `${a.name}`.localeCompare(`${b.name}`))
      );

      const fieldName =
        type === "material" ? "material" : type === "plating" ? "plating" : type === "stone" ? "stoneType" : "color";
      form.setFieldValue(fieldName, createdOption.name);
      setVariantModalOpen(false);
      variantForm.resetFields();
      message.success(`${variantTypeLabels[type] || "Option"} created and selected.`);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Option creation failed."));
    } finally {
      setVariantSaving(false);
    }
  };

  const renderManagedSelect = ({ fieldName, label, placeholder, options, createType, fallbackOptions = [] }) => (
    <Form.Item label={label} name={fieldName}>
      <Select
        allowClear
        showSearch
        placeholder={placeholder}
        options={options.length ? options : fallbackOptions.map((value) => ({ value, label: value }))}
        disabled={!canSave}
        dropdownRender={(menu) => (
          <>
            {menu}
            <div style={{ padding: 8 }}>
              <Button type="text" icon={<PlusOutlined />} onClick={() => openCreateVariantOption(createType)}>
                Add {label.toLowerCase()}
              </Button>
            </div>
          </>
        )}
      />
    </Form.Item>
  );

  const handleUpload = async ({ file, onSuccess, onError }) => {
    const tempId = buildTempImageId();
    const previewUrl = URL.createObjectURL(file);
    try {
      setUploading(true);
      updateImages((images) => [
        ...images,
        {
          id: tempId,
          url: previewUrl,
          key: "",
          alt: form.getFieldValue("name") || file.name || "NUVA product image",
          isPrimary: images.length === 0,
          mediaType: images.length === 0 ? "showcase" : "original"
        }
      ]);

      const data = await uploadProductImage(file);
      updateImages((images) =>
        images.map((image) =>
          image.id === tempId
            ? {
                ...image,
                url: data.url,
                key: data.key || ""
              }
            : image
        )
      );
      URL.revokeObjectURL(previewUrl);
      onSuccess("ok");
    } catch (error) {
      updateImages((images) => images.filter((image) => image.id !== tempId));
      URL.revokeObjectURL(previewUrl);
      onError(error);
      message.error(getApiErrorMessage(error, "Image upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const handleCropImage = async (index, cropPixels) => {
    try {
      setUploading(true);
      const images = form.getFieldValue("images") || [];
      const currentImage = images[index];
      const croppedFile = await cropImageToFile(currentImage.url, cropPixels, buildCropFileName(currentImage, index));
      const uploaded = await uploadProductImage(croppedFile);

      updateImages((currentImages) =>
        currentImages.map((image, itemIndex) =>
          itemIndex === index
            ? {
                ...image,
                url: uploaded.url,
                key: uploaded.key || "",
                id: image.id || ""
              }
            : image
        )
      );
      message.success("Image cropped and updated.");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Image crop failed."));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values, overrides = {}) => {
    setSaving(true);
    setSaveError("");
    try {
      const fullValues = {
        ...defaultValues,
        ...form.getFieldsValue(true),
        images: imageList,
        ...values,
        ...overrides
      };
      const payload = buildProductPayload(fullValues);
      if (productId) {
        const savedProduct = await updateProduct(productId, payload);
        message.success("Product updated.");
        if (savedProduct?.sku) {
          form.setFieldValue("sku", savedProduct.sku);
        }
      } else {
        const savedProduct = await createProduct(payload);
        message.success(`Product created successfully. SKU: ${savedProduct?.sku || "Pending"}`);
      }
      await onSaved();
    } catch (error) {
      const detail = getApiErrorMessage(error, "Product save failed.");
      setSaveError(detail);
      message.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const focusFirstError = (errorInfo, fallbackMessage) => {
    const firstError = errorInfo?.errorFields?.[0];
    const fieldName = firstError?.name;
    const errorText = firstError?.errors?.[0] || fallbackMessage;

    if (fieldName?.length) {
      const stepIndex = stepFieldMap.findIndex((fields) => fields.includes(fieldName[0]));
      if (stepIndex >= 0 && stepIndex !== currentStep) {
        pendingFocusFieldRef.current = fieldName;
        setCurrentStep(stepIndex);
      } else {
        form.scrollToField(fieldName, { block: "center", behavior: "smooth" });
        window.setTimeout(() => {
          const instance = form.getFieldInstance?.(fieldName[0]);
          if (instance?.focus) {
            instance.focus();
          } else if (instance?.input?.focus) {
            instance.input.focus();
          }
        }, 60);
      }
    }

    setSaveError(errorText);
    message.error(errorText);
  };

  const handleCreateCategory = async () => {
    const values = await categoryForm.validateFields();
    setCategorySaving(true);
    try {
      const createdCategory = await createCategory({
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || null,
        imageUrl: null,
        sortOrder: categories.length + 1,
        isActive: true
      });

      if (onCategoriesUpdated) {
        await onCategoriesUpdated();
      }

      form.setFieldValue("categoryId", createdCategory._id);
      form.setFieldValue("categoryName", createdCategory.name);
      form.setFieldValue("categoryCode", createdCategory.code || "");
      setCategoryModalOpen(false);
      categoryForm.resetFields();
      message.success("Category created and selected.");
    } catch (error) {
      message.error(getApiErrorMessage(error, "Category creation failed."));
    } finally {
      setCategorySaving(false);
    }
  };

  const goNext = async () => {
    if (currentStep === sectionItems.length - 1) {
      try {
        const values = await form.validateFields();
        await handleSubmit(values);
      } catch (errorInfo) {
        focusFirstError(errorInfo, "Please complete the required fields.");
      }
      return;
    }

    try {
      await form.validateFields(stepFieldMap[currentStep]);
      setSaveError("");
      setCurrentStep((step) => step + 1);
    } catch (errorInfo) {
      focusFirstError(errorInfo, "Please complete this step before continuing.");
    }
  };

  const goBack = () => {
    setSaveError("");
    setCurrentStep((step) => Math.max(0, step - 1));
  };

  const renderFaqPanel = () => (
    <div className="catalog-faq-panel" aria-label="Product help and FAQs">
      <div className="catalog-faq-panel-head">
        <div>
          <strong>Field Help</strong>
          <span>Search or review the meaning of the selected term.</span>
        </div>
        <Button type="text" icon={<CloseOutlined />} aria-label="Close help panel" onClick={closeFaqPanel} />
      </div>

      <div className="catalog-faq-search">
        <SearchOutlined />
        <Input
          value={faqSearch}
          onChange={(event) => setFaqSearch(event.target.value)}
          placeholder="Search help topics"
          aria-label="Search help topics"
          bordered={false}
        />
      </div>

      <Collapse
        accordion
        activeKey={faqActiveKey}
        onChange={(nextKey) => setFaqActiveKey(Array.isArray(nextKey) ? nextKey : [nextKey].filter(Boolean))}
        items={faqItems}
        className="catalog-faq-collapse"
      />
    </div>
  );

  const renderStepContent = () => {
    const originalMediaCount = imageList.filter((image) => image.mediaType === "original").length;
    const showcaseMediaCount = imageList.filter((image) => image.mediaType !== "original").length;

    const renderStageHeader = () => (
      <div className="catalog-form-stage-head">
        <div>
          <span className="catalog-form-stage-kicker">
            Step {currentStep + 1} of {sectionItems.length}
          </span>
          <h4>{currentSection.label}</h4>
          <p>{currentSection.description}</p>
        </div>
        <div className="catalog-stage-summary" aria-label="Current product summary">
          <span className="catalog-stage-summary-chip">{form.getFieldValue("workflowStatus") || "draft"}</span>
          <span className="catalog-stage-summary-chip">{originalMediaCount} original media</span>
          <span className="catalog-stage-summary-chip">{showcaseMediaCount} showcase media</span>
        </div>
      </div>
    );

    if (currentSection.key === "basic") {
      return (
        <section className="catalog-form-stage">
          {renderStageHeader()}
          <Row gutter={[16, 18]}>
            <Col xs={24}>
              <Form.Item label="Product Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="Untitled Product" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Category" name="categoryId">
                <Select
                  showSearch
                  allowClear
                  options={categoryOptions}
                  placeholder="Select category"
                  disabled={!canSave}
                  onChange={(_, option) => {
                    form.setFieldValue("categoryName", option?.categoryName || "");
                    form.setFieldValue("categoryCode", option?.categoryCode || "");
                  }}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {canManageCategories ? (
                        <div style={{ padding: 8 }}>
                          <Button type="text" icon={<PlusOutlined />} onClick={() => setCategoryModalOpen(true)}>
                            Create category
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("SKU", "sku")} name="sku">
                <Input placeholder="SKU will be generated automatically" disabled suffix={skuPreviewLoading ? "Updating..." : null} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <div className="catalog-cost-summary-card">
                <strong>Generated SKU Preview</strong>
                <span>
                  This updates automatically as you choose the category, color, size, or another variant. The number is saved only when the product is created successfully.
                </span>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag color="magenta">Prefix: NV</Tag>
                  {form.getFieldValue("categoryCode") ? <Tag color="pink">Category: {form.getFieldValue("categoryCode")}</Tag> : null}
                  {form.getFieldValue("designNumber") ? (
                    <Tag color="pink">Design No: {String(form.getFieldValue("designNumber")).padStart(3, "0")}</Tag>
                  ) : null}
                  {form.getFieldValue("sku") ? <Tag color="success">{form.getFieldValue("sku")}</Tag> : null}
                </div>
              </div>
            </Col>
            <Col xs={24}>
              <Form.Item label="Description" name="description">
                <Input.TextArea rows={6} maxLength={1000} showCount placeholder="Enter product description..." disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
        </section>
      );
    }

    if (currentSection.key === "images") {
      return (
        <section className="catalog-form-stage">
          {renderStageHeader()}
          <ProductImageUploader
            images={imageList}
            uploading={uploading}
            onUpload={handleUpload}
            onCrop={handleCropImage}
            onRemove={(index) =>
              updateImages((images) => {
                const next = images.filter((_, itemIndex) => itemIndex !== index);
                if (next.length && !next.some((image) => image.isPrimary)) {
                  next[0] = { ...next[0], isPrimary: true };
                }
                return next;
              })
            }
            onSetPrimary={(index) =>
              updateImages((images) =>
                images.map((image, itemIndex) => ({
                  ...image,
                  isPrimary: itemIndex === index
                }))
              )
            }
            onAltChange={(index, value, mediaType) =>
              updateImages((images) =>
                images.map((image, itemIndex) =>
                  itemIndex === index ? { ...image, alt: value, mediaType: mediaType || image.mediaType || "showcase" } : image
                )
              )
            }
          />
          <div className="catalog-inline-tip">
            <BulbOutlined />
            <span>Tip: Keep raw photos in Original Media, and move website-ready edits into Showcase Media.</span>
          </div>
        </section>
      );
    }

    if (currentSection.key === "pricing") {
      return (
        <section className="catalog-form-stage">
          {renderStageHeader()}
          <Row gutter={[16, 18]}>
            <Col xs={24} lg={12}>
              <Form.Item
                label={renderFaqLabel("Selling Price", "selling-price")}
                name="price"
                rules={[{ required: true }]}
                extra={
                  priceManuallyEdited
                    ? "Manual override is on. Use the reset button to switch back to auto pricing from cost and profit."
                    : "This updates automatically from total product cost and your target profit percentage."
                }
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                  onChange={() => {
                    if (canSave) {
                      setPriceManuallyEdited(true);
                    }
                  }}
                />
              </Form.Item>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: -8, marginBottom: 4 }}>
                <Tag color={priceManuallyEdited ? "gold" : "green"}>
                  {priceManuallyEdited ? "Manual price" : "Auto price"}
                </Tag>
                {canSave ? (
                  <Button
                    size="small"
                    onClick={() => {
                      setPriceManuallyEdited(false);
                      form.setFieldValue("price", currentSuggestedSellingPrice);
                    }}
                  >
                    Use Auto Price
                  </Button>
                ) : null}
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Currency" name="currency" rules={[{ required: true }]}>
                <Select options={CURRENCY_OPTIONS} onChange={handleCurrencyFieldChange} disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <div className="catalog-form-section-heading">
                <strong>Inventory Settings</strong>
                <span>Track stock, restock alerts, and supplier details in one place.</span>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Stock Quantity", "stock-quantity")} name="stock" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Low Stock Limit", "low-stock-limit")} name="lowStockLimit">
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Supplier" name="supplierId">
                <Select
                  allowClear
                  showSearch
                  options={supplierOptions}
                  placeholder={purchaseLinksLoading ? "Loading suppliers..." : "Select supplier"}
                  disabled={!canSave || purchaseLinksLoading}
                  onChange={handleSupplierSelect}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ padding: 8 }}>
                        <Button type="text" icon={<PlusOutlined />} onClick={openCreateSupplier}>
                          Create supplier
                        </Button>
                      </div>
                    </>
                  )}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Supplier Name" name="supplierName">
                <Input placeholder="Auto-filled from supplier" disabled />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <div className="catalog-form-section-heading">
                <strong>Purchase Details</strong>
                <span>Capture the supplier transaction that informs your landed product cost.</span>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Purchase Date", "purchase-date")} name="purchaseDate">
                <Input type="date" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Quantity Purchased", "quantity-purchased")} name="quantityPurchased">
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Purchase Unit Cost", "purchase-unit-cost")} name="purchaseUnitCost">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Purchase Total Cost", "purchase-total-cost")} name="purchaseTotalCost">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <div className="catalog-form-section-heading">
                <strong>Cost Breakdown</strong>
                <span>Use total cost plus your target profit percentage to auto-calculate a selling price.</span>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Direct Product Expense", "direct-product-expense")} name="directProductExpense">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Allocated Batch Expense", "allocated-batch-expense")} name="allocatedBatchExpense">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Packaging Cost", "packaging-cost")} name="packagingCost">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Total Product Cost", "total-product-cost")} name="totalProductCost">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" disabled />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                label="Target Profit Percentage"
                name="profitPercentage"
                extra="Set the profit you want from this product. The system uses total product cost plus this percentage to generate the selling price."
              >
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="35.00" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label={renderFaqLabel("Suggested Selling Price", "suggested-selling-price")} name="suggestedSellingPrice">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" disabled />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <div className="catalog-choice-card compact">
                <div className="catalog-choice-head">
                  <strong>{renderFaqLabel("Tax Included", "tax-included")}</strong>
                </div>
                <Form.Item name="taxIncluded" className="catalog-choice-form-item">
                  <Radio.Group className="catalog-choice-group" disabled={!canSave}>
                    <Radio value>Yes</Radio>
                    <Radio value={false}>No</Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            </Col>
            <Col xs={24}>
              <div className="catalog-choice-card">
                <div className="catalog-choice-head">
                  <strong>Allow purchase when out of stock</strong>
                  <span>Choose whether customers can still place orders when stock reaches zero.</span>
                </div>
                <Form.Item name="allowBackorder" className="catalog-choice-form-item">
                  <Radio.Group className="catalog-choice-group" disabled={!canSave}>
                    <Radio value>
                      <span className="catalog-choice-label">Yes</span>
                      <span className="catalog-choice-copy">Customers can place orders even when stock is out.</span>
                    </Radio>
                    <Radio value={false}>
                      <span className="catalog-choice-label">No</span>
                      <span className="catalog-choice-copy">Customers cannot place orders when stock is out.</span>
                    </Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            </Col>
            <Col xs={24}>
              <div className="catalog-cost-summary-card">
                <strong>Cost rollup</strong>
                <span>
                  Total product cost is calculated from purchase total, direct expenses, allocated batch expenses, and packaging. The suggested selling price then uses your target profit percentage, and the selling price follows automatically unless you switch to a manual override.
                </span>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag color="blue">Cost: {currentTotalProductCost.toFixed(2)}</Tag>
                  <Tag color="purple">Profit: {currentProfitPercentage.toFixed(2)}%</Tag>
                  <Tag color="green">Target Gain: {targetProfitAmount.toFixed(2)}</Tag>
                  <Tag color={priceManuallyEdited ? "gold" : "success"}>Selling Price: {currentSellingPrice.toFixed(2)}</Tag>
                </div>
              </div>
            </Col>
          </Row>
          <div className="catalog-inline-tip">
            <BulbOutlined />
            <span>Tip: Click the small question-mark icons beside unfamiliar labels to open the matching explanation without losing your draft.</span>
          </div>
        </section>
      );
    }

    if (currentSection.key === "details") {
      return (
        <section className="catalog-form-stage">
          {renderStageHeader()}
          <Row gutter={[16, 18]}>
            <Col xs={24} lg={12}>
              {renderManagedSelect({
                fieldName: "material",
                label: "Material",
                placeholder: "Select material",
                options: materialVariantOptions,
                createType: "material",
                fallbackOptions: materialOptions
              })}
            </Col>
            <Col xs={24} lg={12}>
              {renderManagedSelect({
                fieldName: "plating",
                label: "Plating",
                placeholder: "Select plating",
                options: platingVariantOptions,
                createType: "plating",
                fallbackOptions: platingOptions
              })}
            </Col>
            <Col xs={24} lg={12}>
              {renderManagedSelect({
                fieldName: "stoneType",
                label: "Stone Type",
                placeholder: "Select stone type",
                options: stoneVariantOptions,
                createType: "stone",
                fallbackOptions: stoneOptions
              })}
            </Col>
            <Col xs={24} lg={12}>
              {renderManagedSelect({
                fieldName: "color",
                label: "Color",
                placeholder: "Select color",
                options: colorVariantOptions,
                createType: "color",
                fallbackOptions: colorOptions
              })}
            </Col>
            <Col xs={24}>
              <div className="catalog-form-section-heading">
                <strong>Variant Family</strong>
                <span>Keep related sizes, materials, stones, and colors grouped under one design family.</span>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Size" name="size">
                <Input placeholder="Enter size" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                label="Variant Family Code"
                name="variantCode"
                extra="Optional short code used for internal grouping or SKU suffixes."
                rules={[{ pattern: /^[A-Za-z]{0,4}$/, message: "Use up to 4 letters only." }]}
              >
                <Input placeholder="Example: LUNA" maxLength={4} disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label={renderFaqLabel("Variant Family", "variant-family")}
                name="variantName"
                extra="Use the same family name for one design available in multiple colors, sizes, materials, platings, or stones."
              >
                <Input placeholder="Example: Luna Bracelet" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Weight" name="weight">
                <Input placeholder="Enter weight" addonAfter="grams" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Occasion" name="occasion">
                <Select
                  allowClear
                  placeholder="Select occasion"
                  options={occasionOptions.map((value) => ({ value, label: value }))}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Care Instructions" name="careInstructions">
                <Input.TextArea rows={5} maxLength={500} showCount placeholder="Enter care instructions..." disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
          <div className="catalog-inline-tip">
            <InfoCircleOutlined />
            <span>Tip: Use Variant Family to group the same design sold in different colors, finishes, stones, or sizes.</span>
          </div>
        </section>
      );
    }

    if (currentSection.key === "visibility") {
      return (
        <section className="catalog-form-stage">
          {renderStageHeader()}
          <Row gutter={[16, 18]}>
            <Col xs={24} lg={12}>
              <Form.Item label="Workflow Status" name="workflowStatus">
                <Select
                  options={[
                    { label: "Draft", value: "draft" },
                    { label: "Image Pending", value: "image_pending" },
                    { label: "Ready to Publish", value: "ready_to_publish" },
                    { label: "Publish", value: "published" },
                    { label: "Archived", value: "archived" }
                  ]}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <div className="catalog-choice-card compact">
                <div className="catalog-choice-head">
                  <strong>Storefront Visibility</strong>
                  <span>Visibility now follows the workflow status in this phase.</span>
                </div>
                <div className="catalog-inline-readonly">
                  Draft and Image Pending stay hidden. Published items become visible automatically.
                </div>
              </div>
            </Col>
          </Row>

          <div className="catalog-visibility-panel">
            <div className="catalog-visibility-panel-head">
              <strong>Product Labels</strong>
              <span>Select labels that help merchandise this item once it is ready for the storefront.</span>
            </div>
            <div className="catalog-label-grid">
              {labelOptions.map((item) => (
                <Form.Item key={item.name} name={item.name} valuePropName="checked" noStyle>
                  <Checkbox className="catalog-label-chip" disabled={!canSave}>
                    {item.label}
                  </Checkbox>
                </Form.Item>
              ))}
            </div>
          </div>

          <Form.Item label="Tags" name="tags">
            <Select mode="tags" tokenSeparators={[","]} placeholder="gift, minimal, pearl" disabled={!canSave} />
          </Form.Item>

          <div className="catalog-inline-tip">
            <BulbOutlined />
            <span>Tip: Use Draft, Image Pending, and Ready to Publish to track work before a product goes live.</span>
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        forceRender
        destroyOnHidden={false}
        width="min(1456px, calc(100vw - 32px))"
        centered
        closable={false}
        onCancel={onClose}
        className="catalog-form-modal"
        title={null}
        footer={null}
      >
        <div className="catalog-modal-shell">
          <header className="catalog-modal-header">
            <div className="catalog-modal-header-copy">
              <h3>{productId ? "Edit Product" : "Add Product"}</h3>
              <p className="catalog-modal-subtitle">Manage product details step by step without losing context or entered data.</p>
            </div>
            <Button
              type="text"
              className="catalog-modal-close"
              icon={<CloseOutlined />}
              aria-label="Close add or edit product dialog"
              onClick={onClose}
            />
          </header>

          <div className="catalog-modal-layout">
            <aside className="catalog-modal-sidebar" aria-label="Product form sections">
              {sectionItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentStep === index;
                const isComplete = index < currentStep;

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={["catalog-step-card", isActive ? "is-active" : "", isComplete ? "is-complete" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => {
                      setSaveError("");
                      setCurrentStep(index);
                    }}
                  >
                    <div className="catalog-step-marker">{isComplete ? <CheckOutlined /> : index + 1}</div>
                    <div className="catalog-step-copy">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                    <div className="catalog-step-state" aria-hidden="true">
                      {isComplete ? <CheckOutlined /> : <Icon />}
                    </div>
                  </button>
                );
              })}
            </aside>

            <div className="catalog-modal-main">
              <div
                ref={formScrollRef}
                className={["catalog-modal-main-scroll", faqPanelOpen && !isMobileFaq ? "has-faq-open" : ""].filter(Boolean).join(" ")}
              >
                <Form form={form} layout="vertical" className="catalog-modal-form" onFinish={(values) => handleSubmit(values)}>
                  {saveError ? <Alert type="error" showIcon message={saveError} className="catalog-form-alert" /> : null}
                  {productLoading ? <Spin /> : renderStepContent()}
                </Form>

                {faqPanelOpen && !isMobileFaq ? renderFaqPanel() : null}
              </div>
            </div>
          </div>

          <footer className="catalog-modal-footer">
            <div className="catalog-modal-footer-start">
              <Button type="text" onClick={onClose}>
                Cancel
              </Button>
            </div>
            <div className="catalog-modal-footer-actions">
              <Button className="catalog-modal-footer-back" onClick={goBack} disabled={currentStep === 0}>
                Back
              </Button>
              <Button
                className="catalog-modal-footer-draft"
                disabled={!canSave}
                onClick={() => handleSubmit(form.getFieldsValue(true), { workflowStatus: "draft" })}
              >
                Save as Draft
              </Button>
              <Button className="catalog-modal-footer-next" type="primary" loading={saving} disabled={!canSave} onClick={goNext}>
                {currentStep === sectionItems.length - 1 ? (productId ? "Update Product" : "Save Product") : "Next"}
              </Button>
            </div>
          </footer>
        </div>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onCancel={() => {
          setCategoryModalOpen(false);
          categoryForm.resetFields();
        }}
        title="Create Category"
        onOk={handleCreateCategory}
        okText="Create Category"
        confirmLoading={categorySaving}
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item label="Category Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Necklaces" />
          </Form.Item>
          <Form.Item
            label="Category Code"
            name="code"
            rules={[
              { required: true, message: "Please enter a category code." },
              { pattern: /^[A-Za-z]{2,3}$/, message: "Use 2 or 3 letters only." }
            ]}
          >
            <Input placeholder="NK" maxLength={3} />
          </Form.Item>
          <Form.Item label="Slug" name="slug">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Short category description" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={supplierModalOpen}
        onCancel={() => {
          setSupplierModalOpen(false);
          supplierForm.resetFields();
        }}
        title="Create Supplier"
        onOk={handleCreateSupplier}
        okText="Create Supplier"
        confirmLoading={supplierSaving}
      >
        <Form form={supplierForm} layout="vertical">
          <Form.Item label="Supplier Name" name="name" rules={[{ required: true, message: "Please enter a supplier name." }]}>
            <Input placeholder="Enter supplier name" />
          </Form.Item>
          <Form.Item label="Contact Person" name="contactPerson">
            <Input placeholder="Optional contact person" />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input placeholder="Optional phone number" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={variantModalOpen}
        onCancel={() => {
          setVariantModalOpen(false);
          variantForm.resetFields();
        }}
        title={`Add ${variantTypeLabels[activeVariantType] || "Option"}`}
        onOk={handleCreateVariantOption}
        okText="Create Option"
        confirmLoading={variantSaving}
      >
        <Form form={variantForm} layout="vertical">
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>
          <Form.Item label={`${variantTypeLabels[activeVariantType] || "Option"} Name`} name="name" rules={[{ required: true, message: "Please enter a name." }]}>
            <Input placeholder="Enter name" onChange={handleVariantNameChange} />
          </Form.Item>
          <Form.Item
            label="Code"
            name="code"
            extra="2 to 4 letters used for internal reference and SKU logic."
            rules={[
              { required: true, message: "Please enter a code." },
              { pattern: /^[A-Za-z]{2,4}$/, message: "Use 2 to 4 letters only." }
            ]}
          >
            <Input placeholder="Example: RG" maxLength={4} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Optional note" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={faqPanelOpen && isMobileFaq}
        footer={null}
        onCancel={closeFaqPanel}
        className="catalog-mobile-faq-modal"
        title="Field Help"
      >
        {renderFaqPanel()}
      </Modal>
    </>
  );
}
