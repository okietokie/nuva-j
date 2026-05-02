import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import { useEffect, useState } from "react";
import { productLabels } from "../../admin/catalogMeta";
import { useAuth } from "../../context/AuthContext";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory
} from "../../services/categoryService";

function buildCategoryPayload(values) {
  return {
    name: values.name.trim(),
    slug: values.slug?.trim() || undefined,
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    isActive: Boolean(values.isActive),
    sortOrder: Number(values.sortOrder ?? 0)
  };
}

export default function AdminCategoriesPage() {
  const { hasPermission } = useAuth();
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const canRead = hasPermission("categories.read");
  const canManage = hasPermission("categories.manage");

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories({ admin: true });
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) {
      loadCategories();
    }
  }, [canRead]);

  const openCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: categories.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    form.setFieldsValue(category);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = buildCategoryPayload(values);
      if (editingCategory) {
        await updateCategory(editingCategory._id, payload);
        message.success("Category updated.");
      } else {
        await createCategory(payload);
        message.success("Category created.");
      }
      setModalOpen(false);
      form.resetFields();
      await loadCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (category, checked) => {
    await updateCategory(category._id, { isActive: checked });
    message.success(`Category ${checked ? "activated" : "deactivated"}.`);
    await loadCategories();
  };

  const handleDelete = (category) => {
    Modal.confirm({
      title: `Delete ${category.name}?`,
      content: "Deletion is blocked if products are still linked to this category.",
      onOk: async () => {
        await deleteCategory(category._id);
        message.success("Category deleted.");
        await loadCategories();
      }
    });
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Categories"
        className="nuva-card"
        extra={
            <Button type="primary" onClick={openCreate} disabled={!canManage}>
              Add Category
            </Button>
          }
      >
        {!canRead ? (
          <Typography.Paragraph>You do not have permission to view categories.</Typography.Paragraph>
        ) : (
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={categories}
          scroll={{ x: 980 }}
          columns={[
            {
              title: "Category",
              render: (_, record) => (
                <Space>
                  {record.imageUrl ? (
                    <img
                      src={record.imageUrl}
                      alt={record.name}
                      style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 12 }}
                    />
                  ) : null}
                  <div>
                    <Typography.Text strong>{record.name}</Typography.Text>
                    <div>{record.slug}</div>
                  </div>
                </Space>
              )
            },
            { title: "Description", dataIndex: "description" },
            { title: "Sort", dataIndex: "sortOrder" },
            {
              title: "Status",
              render: (_, record) => (
                <Tag color={record.isActive ? "green" : "default"}>
                  {record.isActive ? "Active" : "Inactive"}
                </Tag>
              )
            },
            {
              title: "Visible in form",
              render: (_, record) => (
                <Switch
                  checked={record.isActive}
                  disabled={!canManage}
                  onChange={(checked) => handleToggleActive(record, checked)}
                />
              )
            },
            {
              title: "Actions",
              render: (_, record) => (
                <Space>
                  <Button disabled={!canManage} onClick={() => openEdit(record)}>
                    Edit
                  </Button>
                  <Button danger disabled={!canManage} onClick={() => handleDelete(record)}>
                    Delete
                  </Button>
                </Space>
              )
            }
          ]}
        />
        )}
      </Card>

      <Card title="Labels" className="nuva-card">
        <Typography.Paragraph>
          Labels are not stored as categories. They are product-level filters and badges.
        </Typography.Paragraph>
        <Row gutter={[16, 16]}>
          {productLabels.map((label) => (
            <Col xs={24} md={12} key={label.key}>
              <Card size="small">
                <Typography.Text strong>{label.name}</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {label.description}
                </Typography.Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Modal
        open={modalOpen}
        title={editingCategory ? "Edit Category" : "Add Category"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingCategory ? "Update" : "Create"}
        confirmLoading={saving}
        okButtonProps={{ disabled: !canManage }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Slug" name="slug">
            <Input placeholder="Optional auto-generated slug" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Image URL" name="imageUrl">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Sort Order" name="sortOrder" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Active" name="isActive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
