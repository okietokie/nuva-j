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
import { createProduct, getProduct, updateProduct, uploadProductImage } from "../../../services/productService";
import { createCategory } from "../../../services/categoryService";
import { buildProductPayload } from "../../../utils/productTransforms";
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
  sku: "",
  status: "draft",
  visibility: "hidden",
  price: 0,
  currency: "AED",
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
    label: "Images",
    description: "Upload, order and crop product visuals.",
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
    label: "Visibility & Labels",
    description: "Status, storefront visibility and merchandising tags.",
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
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [imageList, setImageList] = useState([]);
  const isEdit = Boolean(productId);
  const canSave = isEdit ? canUpdate : canCreate;
  const stepFieldMap = [
    ["name", "categoryId", "sku", "description"],
    ["price", "currency", "stock", "lowStockLimit", "taxIncluded", "allowBackorder"],
    ["images"],
    ["material", "plating", "stoneType", "color", "size", "weight", "occasion", "careInstructions"],
    ["status", "visibility", "isFeatured", "isBestSeller", "isNewArrival", "tags"]
  ];

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

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.isActive ? category.name : `${category.name} (Inactive)`,
        value: category._id,
        categoryName: category.name
      })),
    [categories]
  );

  const updateImages = (updater) => {
    setImageList((currentImages) => {
      const nextImages = updater(currentImages || []);
      form.setFieldValue("images", nextImages);
      return nextImages;
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
          isPrimary: images.length === 0
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
        await updateProduct(productId, payload);
        message.success("Product updated.");
      } else {
        await createProduct(payload);
        message.success("Product created.");
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
    const currentSection = sectionItems[currentStep];

    const renderStageHeader = () => (
      <div className="catalog-form-stage-head">
        <div>
          <span className="catalog-form-stage-kicker">
            Step {currentStep + 1} of {sectionItems.length}
          </span>
          <h4>{currentSection.label}</h4>
          <p>{currentSection.description}</p>
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
                  onChange={(_, option) =>
                    form.setFieldValue("categoryName", option?.categoryName || "")
                  }
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
                <Input placeholder="Enter SKU" disabled={!canSave} />
              </Form.Item>
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
            onAltChange={(index, value) =>
              updateImages((images) =>
                images.map((image, itemIndex) =>
                  itemIndex === index ? { ...image, alt: value } : image
                )
              )
            }
          />
          <div className="catalog-inline-tip">
            <BulbOutlined />
            <span>Tip: Use clean, well-lit images with a plain background for the best results.</span>
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
                  options={[{ label: "AED", value: "AED" }]}
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
          </Row>
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
                  options={colorOptions.map((value) => ({ value, label: value }))}
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
              <Form.Item label="Product Status" name="status">
                <Select
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Draft", value: "draft" },
                    { label: "Archived", value: "archived" }
                  ]}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Storefront Visibility" name="visibility">
                <Select
                  options={[
                    { label: "Visible", value: "visible" },
                    { label: "Hidden", value: "hidden" }
                  ]}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="catalog-visibility-panel">
            <div className="catalog-visibility-panel-head">
              <strong>Product Labels</strong>
              <span>Select labels that help merchandise this item across the storefront.</span>
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
            <span>Tip: Use clear labels and tags so products are easier to discover and promote.</span>
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
            <Button disabled>Save as Draft</Button>
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
