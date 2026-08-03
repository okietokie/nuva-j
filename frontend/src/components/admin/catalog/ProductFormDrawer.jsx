import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  Form,
  Alert,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Spin,
  Tag,
  message
} from "antd";
import {
  AppstoreOutlined,
  BulbOutlined,
  CheckOutlined,
  EyeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  PlusOutlined,
  TagOutlined
} from "@ant-design/icons";
import {
  createProduct,
  getProduct,
  previewProductSku,
  updateProduct,
  uploadProductImage
} from "../../../services/productService";
import { createCategory, getVariantCodes } from "../../../services/categoryService";
import { useCurrency } from "../../../context/CurrencyContext";
import { getPurchaseBatches, getSuppliers } from "../../../services/purchaseService";
import { buildProductPayload } from "../../../utils/productTransforms";
import { CURRENCY_OPTIONS, convertCurrencyAmount } from "../../../utils/currency";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import ProductImageUploader from "./ProductImageUploader";

const occasionOptions = ["Daily Wear", "Wedding", "Gift", "Party", "Office", "Travel"];
const materialOptions = ["Sterling Silver", "18K Gold", "14K Gold", "Gold Vermeil", "Rose Gold"];
const platingOptions = ["Gold Plated", "Rhodium Plated", "Silver Finish", "Rose Gold Finish"];
const stoneOptions = ["Diamond", "Pearl", "Cubic Zirconia", "Moissanite", "Emerald", "None"];
const colorOptions = ["Gold", "Silver", "Rose Gold", "White", "Black", "Multicolor"];
const labelOptions = [
  { name: "isFeatured", label: "Featured Product" },
  { name: "isBestSeller", label: "Best Seller" },
  { name: "isNewArrival", label: "New Arrival" }
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
  purchaseBatchId: "",
  purchaseDate: "",
  quantityPurchased: 0,
  purchaseUnitCost: 0,
  purchaseTotalCost: 0,
  directProductExpense: 0,
  allocatedBatchExpense: 0,
  packagingCost: 0,
  totalProductCost: 0,
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

export default function ProductFormDrawer({
  open,
  productId,
  categories,
  canCreate,
  canUpdate,
  canManageCategories = false,
  onClose,
  onCategoriesUpdated,
  onSaved
}) {
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [purchaseLinksLoading, setPurchaseLinksLoading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [variantCodes, setVariantCodes] = useState([]);
  const [purchaseBatches, setPurchaseBatches] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [skuPreviewLoading, setSkuPreviewLoading] = useState(false);
  const [imageList, setImageList] = useState([]);
  const { rates } = useCurrency();
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
      "purchaseBatchId",
      "purchaseDate",
      "quantityPurchased",
      "purchaseUnitCost",
      "purchaseTotalCost",
      "directProductExpense",
      "allocatedBatchExpense",
      "packagingCost",
      "totalProductCost",
      "suggestedSellingPrice",
      "taxIncluded",
      "allowBackorder"
    ],
    ["images"],
    ["material", "plating", "stoneType", "color", "size", "weight", "occasion", "careInstructions"],
    ["workflowStatus", "isFeatured", "isBestSeller", "isNewArrival", "tags"]
  ];
  const currentSection = sectionItems[currentStep];

  const handleCurrencyFieldChange = (nextCurrency) => {
    const currentCurrency = form.getFieldValue("currency") || "INR";
    if (currentCurrency === nextCurrency) {
      return;
    }

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
  const originalMediaCount = imageList.filter((image) => image.mediaType === "original").length;
  const showcaseMediaCount = imageList.filter((image) => image.mediaType !== "original").length;
  const watchedPurchaseTotalCost = Form.useWatch("purchaseTotalCost", form);
  const watchedDirectProductExpense = Form.useWatch("directProductExpense", form);
  const watchedAllocatedBatchExpense = Form.useWatch("allocatedBatchExpense", form);
  const watchedPackagingCost = Form.useWatch("packagingCost", form);
  const watchedSuggestedSellingPrice = Form.useWatch("suggestedSellingPrice", form);
  const watchedSupplierId = Form.useWatch("supplierId", form);
  const watchedSku = Form.useWatch("sku", form);
  const watchedName = Form.useWatch("name", form);
  const watchedCategoryId = Form.useWatch("categoryId", form);
  const watchedCategoryName = Form.useWatch("categoryName", form);
  const watchedColor = Form.useWatch("color", form);
  const watchedSize = Form.useWatch("size", form);
  const watchedMaterial = Form.useWatch("material", form);
  const watchedVariantCode = Form.useWatch("variantCode", form);

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

    if (currentTotal !== totalProductCost) {
      form.setFieldValue("totalProductCost", totalProductCost);
    }

    const currentSuggested = Number(watchedSuggestedSellingPrice) || 0;
    const suggestedSellingPrice = totalProductCost
      ? Number((totalProductCost * 1.35).toFixed(2))
      : 0;

    if (currentSuggested === 0 || currentSuggested === currentTotal || !currentSuggested) {
      if (currentSuggested !== suggestedSellingPrice) {
        form.setFieldValue("suggestedSellingPrice", suggestedSellingPrice);
      }
    }
  }, [
    form,
    open,
    watchedAllocatedBatchExpense,
    watchedDirectProductExpense,
    watchedPackagingCost,
    watchedPurchaseTotalCost,
    watchedSuggestedSellingPrice
  ]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setCurrentStep(0);
      setSaveError("");
      setImageList([]);
      return;
    }

    if (!productId) {
      form.setFieldsValue(defaultValues);
      setCurrentStep(0);
      setSaveError("");
      setImageList([]);
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
        setImageList(product.images || []);
        setCurrentStep(0);
      })
      .catch((error) => {
        setSaveError(getApiErrorMessage(error, "Unable to load this product for editing."));
      })
      .finally(() => {
        setProductLoading(false);
      });
  }, [form, open, productId]);

  useEffect(() => {
    if (!open) {
      setSuppliers([]);
      setPurchaseBatches([]);
      setVariantCodes([]);
      return;
    }

    let cancelled = false;
    setPurchaseLinksLoading(true);

    Promise.allSettled([getSuppliers({ activeOnly: true }), getPurchaseBatches(), getVariantCodes({ admin: true })])
      .then(([supplierResult, batchResult, variantCodeResult]) => {
        if (cancelled) {
          return;
        }

        setSuppliers(supplierResult.status === "fulfilled" ? supplierResult.value : []);
        setPurchaseBatches(batchResult.status === "fulfilled" ? batchResult.value : []);
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

  const colorVariantOptions = useMemo(
    () =>
      variantCodes
        .filter((item) => (item.type || "").toLowerCase() === "color" && item.isActive !== false)
        .map((item) => ({
          label: `${item.name} (${item.code})`,
          value: item.name
        })),
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

  const purchaseBatchOptions = useMemo(
    () =>
      purchaseBatches
        .filter((batch) => !watchedSupplierId || batch.supplierId === watchedSupplierId)
        .map((batch) => {
          const purchaseDate = batch.purchaseDate
            ? new Date(batch.purchaseDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })
            : "No date";

          return {
            label: `${batch.supplierName} • ${purchaseDate}${batch.invoiceNumber ? ` • ${batch.invoiceNumber}` : ""}`,
            value: batch._id
          };
        }),
    [purchaseBatches, watchedSupplierId]
  );

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
        if (cancelled) {
          return;
        }

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

  const updateImages = (updater) => {
    setImageList((currentImages) => {
      const nextImages = updater(currentImages || []);
      form.setFieldValue("images", nextImages);
      return nextImages;
    });
  };

  const findBatchItemForProduct = (batch) => {
    if (!batch) {
      return null;
    }

    const activeProductId = productId || form.getFieldValue("id") || form.getFieldValue("_id");
    const currentSku = (watchedSku || form.getFieldValue("sku") || "").trim().toLowerCase();
    const currentName = (watchedName || form.getFieldValue("name") || "").trim().toLowerCase();

    return (
      (batch.items || []).find((item) => item.productId && activeProductId && item.productId === activeProductId) ||
      (batch.items || []).find((item) => item.sku && currentSku && item.sku.trim().toLowerCase() === currentSku) ||
      (batch.items || []).find(
        (item) => item.productName && currentName && item.productName.trim().toLowerCase() === currentName
      ) ||
      batch.items?.[0] ||
      null
    );
  };

  const handleSupplierSelect = (supplierId) => {
    const supplier = suppliers.find((item) => item._id === supplierId);
    form.setFieldValue("supplierId", supplierId || "");
    form.setFieldValue("supplierName", supplier?.name || "");

    const selectedBatchId = form.getFieldValue("purchaseBatchId");
    if (selectedBatchId) {
      const selectedBatch = purchaseBatches.find((batch) => batch._id === selectedBatchId);
      if (selectedBatch && selectedBatch.supplierId !== supplierId) {
        form.setFieldValue("purchaseBatchId", "");
      }
    }
  };

  const handlePurchaseBatchSelect = (batchId) => {
    const batch = purchaseBatches.find((item) => item._id === batchId);
    if (!batch) {
      form.setFieldValue("purchaseBatchId", "");
      return;
    }

    const linkedItem = findBatchItemForProduct(batch);
    form.setFieldsValue({
      supplierId: batch.supplierId || "",
      supplierName: batch.supplierName || "",
      purchaseBatchId: batch._id,
      purchaseDate: batch.purchaseDate ? String(batch.purchaseDate).slice(0, 10) : "",
      quantityPurchased: linkedItem?.quantity ?? form.getFieldValue("quantityPurchased") ?? 0,
      purchaseUnitCost: linkedItem?.unitCost ?? 0,
      purchaseTotalCost: linkedItem?.totalPurchaseCost ?? 0,
      allocatedBatchExpense: linkedItem?.allocatedSharedExpense ?? 0
    });
  };

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
      const croppedFile = await cropImageToFile(
        currentImage.url,
        cropPixels,
        buildCropFileName(currentImage, index)
      );
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
        const firstError = errorInfo?.errorFields?.[0];
        if (firstError) {
          const stepIndex = stepFieldMap.findIndex((fields) =>
            fields.includes(firstError.name?.[0])
          );
          if (stepIndex >= 0) {
            setCurrentStep(stepIndex);
          }
          const errorText = firstError.errors?.[0] || "Please complete the required fields.";
          setSaveError(errorText);
          message.error(errorText);
        }
      }
      return;
    }
    try {
      await form.validateFields(stepFieldMap[currentStep]);
      setSaveError("");
      setCurrentStep((step) => step + 1);
    } catch (errorInfo) {
      const errorText =
        errorInfo?.errorFields?.[0]?.errors?.[0] || "Please complete this step before continuing.";
      setSaveError(errorText);
      message.error(errorText);
    }
  };

  const goBack = () => {
    setSaveError("");
    setCurrentStep((step) => Math.max(0, step - 1));
  };

  const renderStepContent = () => {
    const renderStageHeader = () => (
      <div className="catalog-form-stage-head">
        <div>
          <span className="catalog-form-stage-kicker">
            Step {currentStep + 1} of {sectionItems.length}
          </span>
          <h4>{currentSection.label}</h4>
          <p>{currentSection.description}</p>
        </div>
        <div className="catalog-mobile-workflow-strip">
          <div className="catalog-mobile-workflow-chip">
            <strong>Status</strong>
            <span>{form.getFieldValue("workflowStatus") || "draft"}</span>
          </div>
          <div className="catalog-mobile-workflow-chip">
            <strong>Original</strong>
            <span>{originalMediaCount}</span>
          </div>
          <div className="catalog-mobile-workflow-chip">
            <strong>Showcase</strong>
            <span>{showcaseMediaCount}</span>
          </div>
        </div>
      </div>
    );

    const renderEmptyState = () => (
      <div className="catalog-form-stage-empty">
        <div className="catalog-form-stage-empty-icon">
          <currentSection.icon />
        </div>
        <strong>Content for this section is coming next.</strong>
        <p>
          The layout is ready and responsive. We can plug in the fields for
          {` ${currentSection.label.toLowerCase()}`} in the next pass.
        </p>
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
                          <Button
                            type="text"
                            icon={<PlusOutlined />}
                            onClick={() => setCategoryModalOpen(true)}
                          >
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
              <Form.Item label="SKU" name="sku">
                <Input
                  placeholder="SKU will be generated automatically"
                  disabled
                  suffix={skuPreviewLoading ? "Updating..." : null}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <div className="catalog-cost-summary-card">
                <strong>Generated SKU Preview</strong>
                <span>
                  This updates automatically as you choose the category, color, size, or another
                  variant. The number is saved only when the product is created successfully.
                </span>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag color="magenta">Prefix: NV</Tag>
                  {form.getFieldValue("categoryCode") ? (
                    <Tag color="pink">Category: {form.getFieldValue("categoryCode")}</Tag>
                  ) : null}
                  {form.getFieldValue("designNumber") ? (
                    <Tag color="pink">
                      Design No: {String(form.getFieldValue("designNumber")).padStart(3, "0")}
                    </Tag>
                  ) : null}
                  {form.getFieldValue("sku") ? <Tag color="success">{form.getFieldValue("sku")}</Tag> : null}
                </div>
              </div>
            </Col>
            <Col xs={24}>
              <Form.Item label="Description" name="description">
                <Input.TextArea
                  rows={6}
                  maxLength={1000}
                  showCount
                  placeholder="Enter product description..."
                  disabled={!canSave}
                />
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
                  itemIndex === index
                    ? { ...image, alt: value, mediaType: mediaType || image.mediaType || "showcase" }
                    : image
                )
              )
            }
          />
          <div className="catalog-inline-tip">
            <BulbOutlined />
            <span>
              Tip: Keep raw photos in Original Media, and move website-ready edits into Showcase Media.
            </span>
          </div>
        </section>
      );
    }

    if (currentSection.key === "pricing") {
      return (
        <section className="catalog-form-stage">
          {renderStageHeader()}
          <Row gutter={[16, 18]}>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Price" name="price" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Currency" name="currency" rules={[{ required: true }]}>
                <Select
                  options={CURRENCY_OPTIONS}
                  onChange={handleCurrencyFieldChange}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Stock Quantity" name="stock" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Low Stock Limit" name="lowStockLimit">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Supplier" name="supplierId">
                <Select
                  allowClear
                  showSearch
                  options={supplierOptions}
                  placeholder={purchaseLinksLoading ? "Loading suppliers..." : "Select supplier"}
                  disabled={!canSave || purchaseLinksLoading}
                  onChange={handleSupplierSelect}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Purchase Batch ID" name="purchaseBatchId">
                <Select
                  allowClear
                  showSearch
                  options={purchaseBatchOptions}
                  placeholder={purchaseLinksLoading ? "Loading batches..." : "Select purchase batch"}
                  disabled={!canSave || purchaseLinksLoading}
                  onChange={handlePurchaseBatchSelect}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Supplier Name" name="supplierName">
                <Input placeholder="Auto-filled from supplier or batch" disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Purchase Date" name="purchaseDate">
                <Input type="date" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Quantity Purchased" name="quantityPurchased">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Purchase Unit Cost" name="purchaseUnitCost">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Purchase Total Cost" name="purchaseTotalCost">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Direct Product Expense" name="directProductExpense">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Allocated Batch Expense" name="allocatedBatchExpense">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Packaging Cost" name="packagingCost">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Total Product Cost" name="totalProductCost">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Suggested Selling Price" name="suggestedSellingPrice">
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} xl={8}>
              <div className="catalog-choice-card compact">
                <div className="catalog-choice-head">
                  <strong>Tax Included</strong>
                </div>
                <Form.Item name="taxIncluded" className="catalog-choice-form-item">
                  <Radio.Group className="catalog-choice-group" disabled={!canSave}>
                    <Radio value>Yes</Radio>
                    <Radio value={false}>No</Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} xl={16}>
              <div className="catalog-choice-card">
                <div className="catalog-choice-head">
                  <strong>Allow purchase when out of stock</strong>
                  <span>Choose whether customers can still place orders when stock reaches zero.</span>
                </div>
                <Form.Item name="allowBackorder" className="catalog-choice-form-item">
                  <Radio.Group className="catalog-choice-group" disabled={!canSave}>
                    <Radio value>
                      <span className="catalog-choice-label">Yes</span>
                      <span className="catalog-choice-copy">
                        Customers can place orders even when stock is out.
                      </span>
                    </Radio>
                    <Radio value={false}>
                      <span className="catalog-choice-label">No</span>
                      <span className="catalog-choice-copy">
                        Customers cannot place orders when stock is out.
                      </span>
                    </Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            </Col>
            <Col xs={24}>
              <div className="catalog-cost-summary-card">
                <strong>Cost rollup</strong>
                <span>
                  Total product cost is calculated from purchase total, direct expenses, allocated
                  batch expenses, and packaging. Suggested selling price starts at a 35% markup and
                  can be adjusted before saving.
                </span>
              </div>
            </Col>
          </Row>
          <div className="catalog-inline-tip">
            <BulbOutlined />
            <span>
              Tip: Fill in supplier and purchase fields here when a product is linked to a batch so
              margin checks stay visible to the team.
            </span>
          </div>
        </section>
      );
    }

    if (currentSection.key === "details") {
      return (
        <section className="catalog-form-stage">
          {renderStageHeader()}
          <Row gutter={[16, 18]}>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Material" name="material">
                <Select
                  allowClear
                  placeholder="Select material"
                  options={materialOptions.map((value) => ({ value, label: value }))}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Plating" name="plating">
                <Select
                  allowClear
                  placeholder="Select plating"
                  options={platingOptions.map((value) => ({ value, label: value }))}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Stone Type" name="stoneType">
                <Select
                  allowClear
                  placeholder="Select stone type"
                  options={stoneOptions.map((value) => ({ value, label: value }))}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Color" name="color">
                <Select
                  allowClear
                  placeholder="Select color"
                  options={
                    colorVariantOptions.length
                      ? colorVariantOptions
                      : colorOptions.map((value) => ({ value, label: value }))
                  }
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Size" name="size">
                <Input placeholder="Enter size" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item
                label="Other Variant Code"
                name="variantCode"
                extra="Optional code for variants that affect inventory or SKU grouping."
                rules={[{ pattern: /^[A-Za-z]{0,4}$/, message: "Use up to 4 letters only." }]}
              >
                <Input placeholder="CL" maxLength={4} disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Variant Notes" name="variantName">
                <Input placeholder="Optional variant note" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Weight" name="weight">
                <Input placeholder="Enter weight" addonAfter="grams" disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={8}>
              <Form.Item label="Occasion" name="occasion">
                <Select
                  allowClear
                  placeholder="Select occasion"
                  options={occasionOptions.map((value) => ({ value, label: value }))}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={16}>
              <Form.Item label="Care Instructions" name="careInstructions">
                <Input.TextArea
                  rows={5}
                  maxLength={500}
                  showCount
                  placeholder="Enter care instructions..."
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
          </Row>
          <div className="catalog-inline-tip">
            <InfoCircleOutlined />
            <span>
              Tip: Accurate details help customers make better purchasing decisions and reduce returns.
            </span>
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
                    { label: "Published", value: "published" },
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
            <Select
              mode="tags"
              tokenSeparators={[","]}
              placeholder="gift, minimal, pearl"
              disabled={!canSave}
            />
          </Form.Item>

          <div className="catalog-inline-tip">
            <BulbOutlined />
            <span>
              Tip: Use Draft, Image Pending, and Ready to Publish to track work before a product goes live.
            </span>
          </div>
        </section>
      );
    }

    return (
      <section className="catalog-form-stage">
        {renderStageHeader()}
        {renderEmptyState()}
      </section>
    );
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        forceRender
        destroyOnHidden={false}
        width="min(1320px, calc(100vw - 24px))"
        onCancel={onClose}
        className="catalog-form-modal"
        title={null}
        footer={null}
      >
        <div className="catalog-modal-shell">
          <header className="catalog-modal-header">
            <div>
              <h3>{productId ? "Edit Product" : "Add Product"}</h3>
              <p className="catalog-modal-subtitle">
                Move through the workflow step by step and keep product media, stock, and publishing in one place.
              </p>
            </div>
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
                    className={[
                      "catalog-step-card",
                      isActive ? "is-active" : "",
                      isComplete ? "is-complete" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setSaveError("");
                      setCurrentStep(index);
                    }}
                  >
                    <div className="catalog-step-marker">
                      {isComplete ? <CheckOutlined /> : index + 1}
                    </div>
                    <div className="catalog-step-icon">
                      <Icon />
                    </div>
                    <div className="catalog-step-copy">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                  </button>
                );
              })}
            </aside>

            <Form
              form={form}
              layout="vertical"
              className="catalog-modal-form"
              onFinish={(values) => handleSubmit(values)}
            >
              {saveError ? (
                <Alert
                  type="error"
                  showIcon
                  message={saveError}
                  className="catalog-form-alert"
                />
              ) : null}
              {productLoading ? <Spin /> : renderStepContent()}
            </Form>
          </div>

          <footer className="catalog-modal-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={goBack} disabled={currentStep === 0}>
              Back
            </Button>
            <Button
              disabled={!canSave}
              onClick={() => handleSubmit(form.getFieldsValue(true), { workflowStatus: "draft" })}
            >
              Save as Draft
            </Button>
            <Button
              type="primary"
              loading={saving}
              disabled={!canSave}
              onClick={goNext}
            >
              {currentStep === sectionItems.length - 1 ? "Save Product" : "Next"}
            </Button>
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
    </>
  );
}
