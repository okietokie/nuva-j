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
  Row,
  Select,
  Space,
  Steps,
  Spin,
  message
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createProduct, getProduct, updateProduct, uploadProductImage } from "../../../services/productService";
import { createCategory } from "../../../services/categoryService";
import { buildProductPayload } from "../../../utils/productTransforms";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import ProductImageUploader from "./ProductImageUploader";

const occasionOptions = ["Daily Wear", "Wedding", "Gift", "Party", "Office", "Travel"];

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
  salePrice: null,
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
  { key: "basic", label: "Basic Information" },
  { key: "pricing", label: "Pricing & Inventory" },
  { key: "images", label: "Images" },
  { key: "details", label: "Product Details" },
  { key: "visibility", label: "Visibility & Labels" }
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
    ["price", "salePrice", "currency", "stock", "lowStockLimit", "taxIncluded", "allowBackorder"],
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
    if (currentStep === 0) {
      return (
        <section className="catalog-form-step">
          <h4>Basic Information</h4>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Product Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="Enter product name" disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Category" name="categoryId">
                <Select
                  showSearch
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
            <Col xs={24} md={12}>
              <Form.Item label="SKU" name="sku">
                <Input placeholder="Enter SKU" disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} maxLength={1000} showCount disabled={!canSave} />
          </Form.Item>
        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <section className="catalog-form-step">
          <h4>Pricing & Inventory</h4>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Price" name="price" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Sale Price" name="salePrice">
                <InputNumber min={0} style={{ width: "100%" }} disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Currency" name="currency">
                <Select options={[{ label: "AED", value: "AED" }]} disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Stock Quantity" name="stock">
                <InputNumber min={0} style={{ width: "100%" }} disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Low Stock Limit" name="lowStockLimit">
                <InputNumber min={0} style={{ width: "100%" }} disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Tax Included" name="taxIncluded" valuePropName="checked">
                <Checkbox disabled={!canSave}>Yes</Checkbox>
              </Form.Item>
              <Form.Item
                label="Allow purchase when out of stock"
                name="allowBackorder"
                valuePropName="checked"
              >
                <Checkbox disabled={!canSave}>Yes</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </section>
      );
    }

    if (currentStep === 2) {
      return (
        <section className="catalog-form-step">
          <h4>Product Images</h4>
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
        </section>
      );
    }

    if (currentStep === 3) {
      return (
        <section className="catalog-form-step">
          <h4>Product Details</h4>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Material" name="material">
                <Input disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Plating" name="plating">
                <Input disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Stone Type" name="stoneType">
                <Input disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Color" name="color">
                <Input disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Size" name="size">
                <Input disabled={!canSave} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Weight" name="weight">
                <Input disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Occasion" name="occasion">
                <Select
                  allowClear
                  options={occasionOptions.map((value) => ({ value, label: value }))}
                  disabled={!canSave}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Care Instructions" name="careInstructions">
                <Input.TextArea rows={3} disabled={!canSave} />
              </Form.Item>
            </Col>
          </Row>
        </section>
      );
    }

    return (
      <section className="catalog-form-step">
        <h4>Visibility & Labels</h4>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Status" name="status">
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
          <Col xs={24} md={12}>
            <Form.Item label="Visibility" name="visibility">
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

        <div className="catalog-label-checks">
          <Form.Item name="isFeatured" valuePropName="checked" noStyle>
            <Checkbox disabled={!canSave}>Featured Product</Checkbox>
          </Form.Item>
          <Form.Item name="isBestSeller" valuePropName="checked" noStyle>
            <Checkbox disabled={!canSave}>Bestseller</Checkbox>
          </Form.Item>
          <Form.Item name="isNewArrival" valuePropName="checked" noStyle>
            <Checkbox disabled={!canSave}>New Arrival</Checkbox>
          </Form.Item>
        </div>

        <Form.Item label="Tags" name="tags">
          <Select mode="tags" tokenSeparators={[","]} disabled={!canSave} />
        </Form.Item>
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
        width={920}
        onCancel={onClose}
        className="catalog-form-modal"
        title={productId ? "Edit Product" : "Add Product"}
        footer={
          <div className="catalog-modal-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={goBack} disabled={currentStep === 0}>
              Back
            </Button>
            <Button
              onClick={async () => {
                try {
                  const values = form.getFieldsValue(true);
                  await handleSubmit(values, { status: "draft", visibility: "hidden" });
                } catch (error) {
                  const detail = getApiErrorMessage(error, "Draft save failed.");
                  setSaveError(detail);
                  message.error(detail);
                }
              }}
              disabled={!canSave}
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
          </div>
        }
      >
        <div className="catalog-modal-shell">
          <Steps
            current={currentStep}
            items={sectionItems.map((item) => ({ title: item.label }))}
            className="catalog-form-steps"
          />

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
