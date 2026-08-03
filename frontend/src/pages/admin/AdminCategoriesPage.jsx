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
  createVariantCode,
  bulkDeleteCategories,
  bulkDeleteVariantCodes,
  deleteCategory,
  deleteVariantCode,
  getCategories,
  getVariantCodes,
  updateCategory,
  updateVariantCode
} from "../../services/categoryService";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import AdminBulkActionBar from "../../components/admin/AdminBulkActionBar";
import AdminDeleteConfirmDialog from "../../components/admin/AdminDeleteConfirmDialog";

function buildCategoryPayload(values) {
  return {
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    slug: values.slug?.trim() || undefined,
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    isActive: Boolean(values.isActive),
    sortOrder: Number(values.sortOrder ?? 0)
  };
}

function buildVariantCodePayload(values) {
  return {
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    type: values.type?.trim().toLowerCase() || "color",
    description: values.description?.trim() || null,
    isActive: Boolean(values.isActive),
    sortOrder: Number(values.sortOrder ?? 0)
  };
}

export default function AdminCategoriesPage() {
  const { hasPermission } = useAuth();
  const [form] = Form.useForm();
  const [variantForm] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [variantCodes, setVariantCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variantSaving, setVariantSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingVariantCode, setEditingVariantCode] = useState(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedVariantCodeIds, setSelectedVariantCodeIds] = useState([]);
  const [deleteState, setDeleteState] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  const loadVariantCodes = async () => {
    const data = await getVariantCodes({ admin: true });
    setVariantCodes(data);
  };

  useEffect(() => {
    if (canRead) {
      loadCategories();
      loadVariantCodes();
    }
  }, [canRead]);

  useEffect(() => {
    setSelectedCategoryIds((current) =>
      current.filter((categoryId) => categories.some((category) => category._id === categoryId))
    );
  }, [categories]);

  useEffect(() => {
    setSelectedVariantCodeIds((current) =>
      current.filter((variantCodeId) =>
        variantCodes.some((variantCode) => variantCode._id === variantCodeId)
      )
    );
  }, [variantCodes]);

  const openCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: categories.length + 1, code: "" });
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    form.setFieldsValue(category);
    setModalOpen(true);
  };

  const openVariantCreate = () => {
    setEditingVariantCode(null);
    variantForm.resetFields();
    variantForm.setFieldsValue({ isActive: true, sortOrder: variantCodes.length + 1, type: "color" });
    setVariantModalOpen(true);
  };

  const openVariantEdit = (variantCode) => {
    setEditingVariantCode(variantCode);
    variantForm.setFieldsValue(variantCode);
    setVariantModalOpen(true);
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

  const handleVariantSubmit = async () => {
    const values = await variantForm.validateFields();
    setVariantSaving(true);
    try {
      const payload = buildVariantCodePayload(values);
      if (editingVariantCode) {
        await updateVariantCode(editingVariantCode._id, payload);
        message.success("Variant code updated.");
      } else {
        await createVariantCode(payload);
        message.success("Variant code created.");
      }
      setVariantModalOpen(false);
      variantForm.resetFields();
      await loadVariantCodes();
    } finally {
      setVariantSaving(false);
    }
  };

  const handleToggleActive = async (category, checked) => {
    await updateCategory(category._id, { isActive: checked });
    message.success(`Category ${checked ? "activated" : "deactivated"}.`);
    await loadCategories();
  };

  const handleDelete = (category) => {
    setDeleteState({
      type: "category-single",
      target: category,
      title: "Delete category?",
      message: `Are you sure you want to delete '${category.name}'? This action cannot be undone.`,
      confirmLabel: "Delete category",
    });
  };

  const handleDeleteVariantCode = (variantCode) => {
    setDeleteState({
      type: "variant-single",
      target: variantCode,
      title: "Delete variant code?",
      message: `Are you sure you want to delete '${variantCode.name}'? This action cannot be undone.`,
      confirmLabel: "Delete variant code",
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteState) {
      return;
    }

    setDeleteLoading(true);
    try {
      if (deleteState.type === "category-single") {
        await deleteCategory(deleteState.target._id);
        setCategories((current) => current.filter((category) => category._id !== deleteState.target._id));
        setSelectedCategoryIds((current) => current.filter((id) => id !== deleteState.target._id));
        message.success("Category deleted.");
      } else if (deleteState.type === "variant-single") {
        await deleteVariantCode(deleteState.target._id);
        setVariantCodes((current) =>
          current.filter((variantCode) => variantCode._id !== deleteState.target._id)
        );
        setSelectedVariantCodeIds((current) =>
          current.filter((id) => id !== deleteState.target._id)
        );
        message.success("Variant code deleted.");
      } else if (deleteState.type === "category-bulk") {
        const response = await bulkDeleteCategories(selectedCategoryIds);
        const deletedIds = response.results.filter((result) => result.success).map((result) => result.id);
        const failed = response.results.filter((result) => !result.success);
        setCategories((current) => current.filter((category) => !deletedIds.includes(category._id)));
        setSelectedCategoryIds((current) => current.filter((id) => !deletedIds.includes(id)));
        if (deletedIds.length && !failed.length) {
          message.success(`${deletedIds.length} categories deleted successfully.`);
        } else if (deletedIds.length && failed.length) {
          message.warning(
            `${deletedIds.length} categories deleted. ${failed.length} could not be deleted because ${String(failed[0].reason || "").toLowerCase()}`
          );
        } else if (failed.length) {
          message.error(failed[0].reason || "No selected categories could be deleted.");
          return;
        }
      } else if (deleteState.type === "variant-bulk") {
        const response = await bulkDeleteVariantCodes(selectedVariantCodeIds);
        const deletedIds = response.results.filter((result) => result.success).map((result) => result.id);
        const failed = response.results.filter((result) => !result.success);
        setVariantCodes((current) =>
          current.filter((variantCode) => !deletedIds.includes(variantCode._id))
        );
        setSelectedVariantCodeIds((current) => current.filter((id) => !deletedIds.includes(id)));
        if (deletedIds.length && !failed.length) {
          message.success(`${deletedIds.length} variant codes deleted successfully.`);
        } else if (deletedIds.length && failed.length) {
          message.warning(
            `${deletedIds.length} variant codes deleted. ${failed.length} could not be deleted because ${String(failed[0].reason || "").toLowerCase()}`
          );
        } else if (failed.length) {
          message.error(failed[0].reason || "No selected variant codes could be deleted.");
          return;
        }
      }

      setDeleteState(null);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Delete failed."));
    } finally {
      setDeleteLoading(false);
    }
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
        <>
        {canManage ? (
          <AdminBulkActionBar
            selectedCount={selectedCategoryIds.length}
            pageCount={categories.length}
            totalCount={categories.length}
            noun="categories"
            onDeleteSelected={() =>
              setDeleteState({
                type: "category-bulk",
                title: "Delete selected categories?",
                message: `You are about to permanently delete ${selectedCategoryIds.length} categories. This action cannot be undone.`,
                confirmLabel: `Delete ${selectedCategoryIds.length} categories`,
              })
            }
            onClearSelection={() => setSelectedCategoryIds([])}
            deleting={deleteLoading}
          />
        ) : null}
        <Table
          rowKey="_id"
          rowSelection={{
            selectedRowKeys: selectedCategoryIds,
            onChange: (keys) => setSelectedCategoryIds(keys),
            getCheckboxProps: () => ({ disabled: !canManage }),
          }}
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
                    <div>{record.slug} - Code: {record.code}</div>
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
        </>
        )}
      </Card>

      <Card
        title="Variant Codes"
        className="nuva-card"
        extra={
          <Button type="primary" onClick={openVariantCreate} disabled={!canManage}>
            Add Variant Code
          </Button>
        }
      >
        <Typography.Paragraph>
          These codes are used in automatic SKU generation for color and other inventory variants.
        </Typography.Paragraph>
        {canManage ? (
          <AdminBulkActionBar
            selectedCount={selectedVariantCodeIds.length}
            pageCount={variantCodes.length}
            totalCount={variantCodes.length}
            noun="variant codes"
            onDeleteSelected={() =>
              setDeleteState({
                type: "variant-bulk",
                title: "Delete selected variant codes?",
                message: `You are about to permanently delete ${selectedVariantCodeIds.length} variant codes. This action cannot be undone.`,
                confirmLabel: `Delete ${selectedVariantCodeIds.length} variant codes`,
              })
            }
            onClearSelection={() => setSelectedVariantCodeIds([])}
            deleting={deleteLoading}
          />
        ) : null}
        <Table
          rowKey="_id"
          rowSelection={{
            selectedRowKeys: selectedVariantCodeIds,
            onChange: (keys) => setSelectedVariantCodeIds(keys),
            getCheckboxProps: () => ({ disabled: !canManage }),
          }}
          dataSource={variantCodes}
          pagination={false}
          scroll={{ x: 760 }}
          columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Code", dataIndex: "code", width: 120 },
            { title: "Type", dataIndex: "type", width: 140 },
            { title: "Description", dataIndex: "description" },
            {
              title: "Status",
              width: 120,
              render: (_, record) => (
                <Tag color={record.isActive ? "green" : "default"}>
                  {record.isActive ? "Active" : "Inactive"}
                </Tag>
              )
            },
            {
              title: "Actions",
              width: 180,
              render: (_, record) => (
                <Space>
                  <Button disabled={!canManage} onClick={() => openVariantEdit(record)}>
                    Edit
                  </Button>
                  <Button danger disabled={!canManage} onClick={() => handleDeleteVariantCode(record)}>
                    Delete
                  </Button>
                </Space>
              )
            }
          ]}
        />
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
          <Form.Item
            label="Category Code"
            name="code"
            rules={[
              { required: true, message: "Please enter a category code." },
              { pattern: /^[A-Za-z]{2,3}$/, message: "Use 2 or 3 letters only." }
            ]}
          >
            <Input placeholder="ER" maxLength={3} />
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

      <Modal
        open={variantModalOpen}
        title={editingVariantCode ? "Edit Variant Code" : "Add Variant Code"}
        onCancel={() => {
          setVariantModalOpen(false);
          variantForm.resetFields();
        }}
        onOk={handleVariantSubmit}
        okText={editingVariantCode ? "Update" : "Create"}
        confirmLoading={variantSaving}
        okButtonProps={{ disabled: !canManage }}
      >
        <Form form={variantForm} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Gold" />
          </Form.Item>
          <Form.Item
            label="Code"
            name="code"
            rules={[
              { required: true, message: "Please enter a variant code." },
              { pattern: /^[A-Za-z]{2,4}$/, message: "Use 2 to 4 letters only." }
            ]}
          >
            <Input placeholder="GD" maxLength={4} />
          </Form.Item>
          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Input placeholder="color" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
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

      <AdminDeleteConfirmDialog
        open={Boolean(deleteState)}
        title={deleteState?.title || "Delete record?"}
        message={deleteState?.message || ""}
        confirmLabel={deleteState?.confirmLabel || "Delete"}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleteLoading && setDeleteState(null)}
        loading={deleteLoading}
      />
    </Space>
  );
}
