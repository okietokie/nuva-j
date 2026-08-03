import {
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Upload,
  message
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCurrency } from "../../context/CurrencyContext";
import { getCategories } from "../../services/categoryService";
import {
  createProduct,
  getProduct,
  updateProduct,
  uploadProductImage
} from "../../services/productService";
import { buildProductPayload } from "../../utils/productTransforms";
import { CURRENCY_OPTIONS, convertCurrencyAmount } from "../../utils/currency";

const occasionOptions = ["Daily Wear", "Wedding", "Gift", "Party", "Office", "Travel"];

function moveItem(list, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= list.length) {
    return list;
  }

  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function ProductFormPage() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(productId);
  const { rates } = useCurrency();
  const productsBasePath = useMemo(() => {
    const parts = location.pathname.split("/");
    return `/admin/${parts[2]}/products`;
  }, [location.pathname]);

  const handleCurrencyFieldChange = (nextCurrency) => {
    const currentCurrency = form.getFieldValue("currency") || "INR";
    if (currentCurrency === nextCurrency) {
      return;
    }

    const currentPrice = Number(form.getFieldValue("price") ?? 0);
    form.setFieldsValue({
      price: convertCurrencyAmount(currentPrice, currentCurrency, nextCurrency, rates),
      currency: nextCurrency
    });
  };

  useEffect(() => {
    getCategories({ admin: true }).then((categories) => {
      setCategoryOptions(categories);
    });
  }, []);

  useEffect(() => {
    if (!isEdit) {
      form.setFieldsValue({
        currency: "INR",
        status: "draft",
        visibility: "hidden",
        lowStockLimit: 3,
        taxIncluded: true,
        allowBackorder: false,
        tags: [],
        images: [],
        categoryId: undefined,
        categoryName: "",
        price: 0,
        stock: 0
      });
      return;
    }

    getProduct(productId, { admin: true }).then((product) => {
      form.setFieldsValue({
        ...product,
        images: product.images,
        tags: product.tags || []
      });
    });
  }, [form, isEdit, productId]);

  const appendUploadedImage = async ({ file, onSuccess, onError }) => {
    try {
      setUploading(true);
      const data = await uploadProductImage(file);
      const currentImages = form.getFieldValue("images") || [];
      form.setFieldValue("images", [
        ...currentImages,
        {
          url: data.url,
          key: data.key || "",
          alt: form.getFieldValue("name") || "NUVA product image",
          isPrimary: currentImages.length === 0
        }
      ]);
      onSuccess("ok");
      message.success("Image uploaded.");
    } catch (error) {
      onError(error);
      message.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const updateImages = (updater) => {
    const currentImages = form.getFieldValue("images") || [];
    form.setFieldValue("images", updater(currentImages));
  };

  const setPrimaryImage = (targetIndex) => {
    updateImages((images) =>
      images.map((image, index) => ({
        ...image,
        isPrimary: index === targetIndex
      }))
    );
  };

  const moveImage = (fromIndex, toIndex) => {
    updateImages((images) => moveItem(images, fromIndex, toIndex));
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = buildProductPayload(values);

      if (isEdit) {
        await updateProduct(productId, payload);
        message.success("Product updated.");
      } else {
        await createProduct(payload);
        message.success("Product created.");
      }

      navigate(productsBasePath);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={isEdit ? "Edit Product" : "Add Product"} className="nuva-card">
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Divider orientation="left">Basic Details</Divider>

        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <Form.Item label="Product Name" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} lg={8}>
            <Form.Item label="Slug" name="slug">
              <Input placeholder="Optional auto-generated slug" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Category" name="categoryId">
              <Select
                showSearch
                allowClear
                options={categoryOptions.map((category) => ({
                  label: category.isActive ? category.name : `${category.name} (Inactive)`,
                  value: category._id,
                  categoryName: category.name
                }))}
                onChange={(_, option) =>
                  form.setFieldValue("categoryName", option?.categoryName || "")
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Category Name" name="categoryName">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="SKU" name="sku">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Status" name="status" rules={[{ required: true }]}>
              <Radio.Group
                options={[
                  { label: "Active", value: "active" },
                  { label: "Draft", value: "draft" },
                  { label: "Archived", value: "archived" }
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Visibility" name="visibility" rules={[{ required: true }]}>
              <Radio.Group
                options={[
                  { label: "Visible", value: "visible" },
                  { label: "Hidden", value: "hidden" }
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Pricing</Divider>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Price" name="price" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Currency" name="currency" rules={[{ required: true }]}>
              <Select options={CURRENCY_OPTIONS} onChange={handleCurrencyFieldChange} />
            </Form.Item>
          </Col>
        </Row>

        <Space wrap size="large" style={{ marginBottom: 20 }}>
          <Form.Item label="Tax Included" name="taxIncluded" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>

        <Divider orientation="left">Inventory</Divider>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Stock Quantity" name="stock" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Low Stock Alert Limit" name="lowStockLimit" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Allow Purchase When Out Of Stock" name="allowBackorder" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Images</Divider>

        <Form.List name="images">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Upload customRequest={appendUploadedImage} showUploadList={false} multiple>
                <Button icon={<UploadOutlined />} loading={uploading}>
                  Upload Images To Backblaze B2
                </Button>
              </Upload>

              {fields.map((field, index) => (
                <Card
                  key={field.key}
                  size="small"
                  title={`Image ${field.name + 1}`}
                  extra={
                    <Space>
                      <Button
                        type="text"
                        icon={<ArrowUpOutlined />}
                        onClick={() => moveImage(index, index - 1)}
                      />
                      <Button
                        type="text"
                        icon={<ArrowDownOutlined />}
                        onClick={() => moveImage(index, index + 1)}
                      />
                      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col xs={24} lg={8}>
                      <Form.Item
                        label="Image URL"
                        name={[field.name, "url"]}
                        rules={[{ required: true }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} lg={8}>
                      <Form.Item label="Storage Key" name={[field.name, "key"]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} lg={6}>
                      <Form.Item label="Alt Text" name={[field.name, "alt"]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} lg={2}>
                      <Form.Item
                        label="Primary"
                        name={[field.name, "isPrimary"]}
                        valuePropName="checked"
                      >
                        <Checkbox onChange={() => setPrimaryImage(index)} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => add({ url: "", key: "", alt: "", isPrimary: fields.length === 0 })}
              >
                Add Image Manually
              </Button>
            </Space>
          )}
        </Form.List>

        <Divider orientation="left">Jewelry Details</Divider>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Material" name="material">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Plating" name="plating">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Stone Type" name="stoneType">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Color" name="color">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Size" name="size">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Weight" name="weight">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Occasion" name="occasion">
              <Select allowClear options={occasionOptions.map((value) => ({ value, label: value }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Care Instructions" name="careInstructions">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Marketing Labels</Divider>

        <Space wrap size="large" style={{ marginBottom: 20 }}>
          <Form.Item name="isFeatured" valuePropName="checked" noStyle>
            <Checkbox>Featured Product</Checkbox>
          </Form.Item>
          <Form.Item name="isNewArrival" valuePropName="checked" noStyle>
            <Checkbox>New Arrival</Checkbox>
          </Form.Item>
          <Form.Item name="isBestSeller" valuePropName="checked" noStyle>
            <Checkbox>Best Seller</Checkbox>
          </Form.Item>
        </Space>

        <Form.Item label="Tags" name="tags">
          <Select mode="tags" tokenSeparators={[","]} placeholder="gift, minimal, pearl" />
        </Form.Item>

        <Space style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
          <Button onClick={() => navigate(productsBasePath)}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
