import { Button, Card, Checkbox, Form, Input, InputNumber, Select, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createProduct,
  getProduct,
  updateProduct,
  uploadProductImage
} from "../../services/productService";

export default function ProductFormPage() {
  const [form] = Form.useForm();
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { productId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(productId);

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    getProduct(productId).then((product) => {
      setImageUrls(product.images || []);
      form.setFieldsValue(product);
    });
  }, [form, isEdit, productId]);

  const handleUpload = async ({ file, onSuccess, onError }) => {
    try {
      setUploading(true);
      const data = await uploadProductImage(file);
      setImageUrls((current) => [...current, data.url]);
      onSuccess("ok");
    } catch (error) {
      onError(error);
      message.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values) => {
    const payload = { ...values, images: imageUrls };

    if (isEdit) {
      await updateProduct(productId, payload);
    } else {
      await createProduct(payload);
    }

    navigate("/admin/products");
  };

  return (
    <Card title={isEdit ? "Edit Product" : "Add Product"} className="nuva-card">
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Product name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item label="Category" name="category" rules={[{ required: true }]}>
          <Select
            options={["Rings", "Necklaces", "Bracelets", "Earrings"].map((value) => ({
              label: value,
              value
            }))}
          />
        </Form.Item>
        <Form.Item label="Material" name="material" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Color" name="color" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Price" name="price" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Stock" name="stock" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="isFeatured" valuePropName="checked">
          <Checkbox>Show on homepage</Checkbox>
        </Form.Item>
        <Form.Item label="Product images">
          <Upload customRequest={handleUpload} showUploadList={false} multiple>
            <Button icon={<UploadOutlined />} loading={uploading}>
              Upload to Backblaze B2
            </Button>
          </Upload>
          <div className="uploaded-image-list">
            {imageUrls.map((url) => (
              <img key={url} src={url} alt="Uploaded product" className="uploaded-thumb" />
            ))}
          </div>
        </Form.Item>
        <Button type="primary" htmlType="submit">
          {isEdit ? "Update Product" : "Create Product"}
        </Button>
      </Form>
    </Card>
  );
}
