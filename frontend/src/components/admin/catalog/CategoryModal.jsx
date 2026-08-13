import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  createCategory,
  deleteCategory,
  updateCategory
} from "../../../services/categoryService";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

function buildPayload(values) {
  return {
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    slug: values.slug?.trim() || undefined,
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    sortOrder: Number(values.sortOrder ?? 0),
    isActive: Boolean(values.isActive)
  };
}

export default function CategoryModal({
  open,
  categories,
  products,
  canManage,
  onClose,
  onUpdated
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const watchedIsActive = Form.useWatch("isActive", form);

  useEffect(() => {
    if (!open) {
      setEditingCategory(null);
      setDeleteTarget(null);
      setQuery("");
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      name: "",
      code: "",
      slug: "",
      description: "",
      imageUrl: "",
      sortOrder: categories.length + 1,
      isActive: true
    });
  }, [categories.length, form, open]);

  const filteredCategories = useMemo(() => {
    const pattern = query.trim().toLowerCase();
    if (!pattern) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.code, category.description, category.slug]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(pattern))
    );
  }, [categories, query]);

  const usageCounts = useMemo(() => {
    const counts = new Map();

    products.forEach((product) => {
      if (product.categoryId) {
        counts.set(product.categoryId, (counts.get(product.categoryId) || 0) + 1);
      }
    });

    return counts;
  }, [products]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = buildPayload(values);
      if (editingCategory) {
        await updateCategory(editingCategory._id, payload);
        message.success("Category updated.");
      } else {
        await createCategory(payload);
        message.success("Category created.");
      }
      setEditingCategory(null);
      form.resetFields();
      await onUpdated();
      form.setFieldsValue({
        sortOrder: categories.length + 1,
        isActive: true
      });
    } catch (error) {
      message.error(getApiErrorMessage(error, "Category save failed."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      ...category,
      isActive: category.isActive
    });
  };

  const handleDelete = (category) => {
    setDeleteTarget(category);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteCategory(deleteTarget._id);
      if (editingCategory?._id === deleteTarget._id) {
        setEditingCategory(null);
        form.resetFields();
        form.setFieldsValue({
          name: "",
          code: "",
          slug: "",
          description: "",
          imageUrl: "",
          sortOrder: categories.length,
          isActive: true
        });
      }
      setDeleteTarget(null);
      message.success("Category deleted.");
      await onUpdated();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Category delete failed."));
    } finally {
      setDeleteLoading(false);
    }
  };

  const categoryBody = (
    <div className={`category-modal-shell${isMobile ? " is-mobile" : ""}`}>
      <div className={`category-modal-list${isMobile ? " category-modal-panel" : ""}`}>
        <div className="category-modal-section-head">
          <div>
            <strong>Existing Categories</strong>
            <span>{filteredCategories.length} visible in this view</span>
          </div>
        </div>
        <Input.Search
          value={query}
          placeholder="Search categories..."
          onChange={(event) => setQuery(event.target.value)}
          allowClear
        />
        <Table
          rowKey="_id"
          dataSource={filteredCategories}
          pagination={false}
          className="category-table"
          columns={[
            {
              title: "Category",
              dataIndex: "name",
              render: (_, category) => (
                <div>
                  <div className="catalog-cell-title">{category.name}</div>
                  <div className="catalog-cell-subtitle">
                    {category.code ? `${category.code} - ` : ""}{category.description || "No description"}
                  </div>
                </div>
              )
            },
            {
              title: "Products",
              render: (_, category) => usageCounts.get(category._id) || 0
            },
            {
              title: "Status",
              render: (_, category) => (
                <Tag color={category.isActive ? "green" : "red"}>
                  {category.isActive ? "Active" : "Inactive"}
                </Tag>
              )
            },
            {
              title: "Actions",
              width: isMobile ? 110 : undefined,
              render: (_, category) => (
                <Space size={isMobile ? 4 : 8}>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    disabled={!canManage}
                    onClick={() => handleEdit(category)}
                  />
                  <Button
                    type="text"
                    danger
                    disabled={!canManage}
                    onClick={() => handleDelete(category)}
                  >
                    Delete
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </div>

      <div className={`category-modal-form${isMobile ? " category-modal-panel" : ""}`}>
        {isMobile ? (
          <div className="category-mobile-progress-card">
            <div className="category-mobile-progress-badge">
              {editingCategory ? "Edit" : "New"}
            </div>
            <div className="category-mobile-progress-copy">
              <span>{editingCategory ? "Updating category" : "Step 1 of 1"}</span>
              <strong>{editingCategory ? "Category Details" : "Basic Details"}</strong>
            </div>
          </div>
        ) : null}
        <div className="category-form-head">
          <div>
            <h4>{editingCategory ? "Edit Category" : "Add Category"}</h4>
            <p>
              Set the name, code, and display order. Keep codes short so SKU generation stays clean.
            </p>
          </div>
          <Button
            type="primary"
            className="category-form-reset-button"
            icon={<PlusOutlined />}
            disabled={!canManage}
            onClick={() => {
              setEditingCategory(null);
              form.resetFields();
              form.setFieldsValue({
                sortOrder: categories.length + 1,
                isActive: true
              });
            }}
          >
            Add Category
          </Button>
        </div>

        <Form form={form} layout="vertical" className="category-modal-form-grid">
          <div className="category-form-card">
            <Form.Item label="Category Name" name="name" rules={[{ required: true }]}>
              <Input disabled={!canManage} placeholder="Example: Earrings" />
            </Form.Item>
            <div className="category-form-inline">
              <Form.Item
                label="Category Code"
                name="code"
                rules={[
                  { required: true, message: "Please enter a category code." },
                  { pattern: /^[A-Za-z]{2,3}$/, message: "Use 2 or 3 letters only." }
                ]}
              >
                <Input maxLength={3} disabled={!canManage} placeholder="ER" />
              </Form.Item>
              <Form.Item label="Sort Order" name="sortOrder">
                <InputNumber min={0} style={{ width: "100%" }} disabled={!canManage} />
              </Form.Item>
            </div>
            <Form.Item label="Slug" name="slug">
              <Input disabled={!canManage} placeholder="Optional custom slug" />
            </Form.Item>
          </div>

          <div className="category-form-card">
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={isMobile ? 5 : 4} disabled={!canManage} placeholder="Short category description" />
            </Form.Item>
            <Form.Item label="Category Image" name="imageUrl">
              <Input disabled={!canManage} placeholder="https://..." />
            </Form.Item>
            <Form.Item label="Status" name="isActive">
              <Select
                disabled={!canManage}
                value={watchedIsActive === false ? "inactive" : "active"}
                onChange={(value) => form.setFieldValue("isActive", value === "active")}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
                ]}
              />
            </Form.Item>
          </div>
          <Space className="category-modal-form-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={saving} disabled={!canManage} onClick={handleSubmit}>
              {editingCategory ? "Update Category" : "Save Category"}
            </Button>
          </Space>
        </Form>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          open={open}
          onClose={onClose}
          placement="bottom"
          height="100%"
          title="Manage Categories"
          className="catalog-category-drawer-mobile"
        >
          {categoryBody}
        </Drawer>
      ) : (
        <Modal
          open={open}
          onCancel={onClose}
          footer={null}
          width={1080}
          forceRender
          centered
          title={
            <div className="category-modal-titlebar">
              <div>
                <Typography.Title level={4}>Manage Categories</Typography.Title>
                <Typography.Paragraph>
                  Organize product types, keep category codes tidy, and update the catalog structure in one place.
                </Typography.Paragraph>
              </div>
            </div>
          }
          className="catalog-category-modal"
        >
          {categoryBody}
        </Modal>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : "Delete category?"}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{
          danger: true,
          loading: deleteLoading,
          disabled:
            !canManage || ((deleteTarget && usageCounts.get(deleteTarget._id)) || 0) > 0
        }}
        onOk={handleDeleteConfirm}
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteTarget(null);
          }
        }}
      >
        <p>
          {deleteTarget && (usageCounts.get(deleteTarget._id) || 0) > 0
            ? `This category is used by ${usageCounts.get(deleteTarget._id) || 0} products. Move products before deleting.`
            : "This category will be removed from the catalog."}
        </p>
      </Modal>
    </>
  );
}
