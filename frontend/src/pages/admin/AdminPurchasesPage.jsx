import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { getProducts } from "../../services/productService";
import {
  createPurchaseBatch,
  createSupplier,
  deleteSupplier,
  getPurchaseBatches,
  getSuppliers,
  updatePurchaseBatch,
  updateSupplier
} from "../../services/purchaseService";

function buildSupplierPayload(values) {
  return {
    name: values.name.trim(),
    contactPerson: values.contactPerson?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    whatsapp: values.whatsapp?.trim() || null,
    address: values.address?.trim() || null,
    city: values.city?.trim() || null,
    country: values.country?.trim() || null,
    notes: values.notes?.trim() || null,
    isActive: Boolean(values.isActive)
  };
}

function buildBatchPayload(values) {
  return {
    supplierId: values.supplierId,
    purchaseDate: values.purchaseDate.toISOString(),
    invoiceNumber: values.invoiceNumber?.trim() || null,
    paymentMethod: values.paymentMethod?.trim() || null,
    receiptImageUrl: values.receiptImageUrl?.trim() || null,
    notes: values.notes?.trim() || null,
    transportExpense: Number(values.transportExpense ?? 0),
    supplierDeliveryExpense: Number(values.supplierDeliveryExpense ?? 0),
    customsExpense: Number(values.customsExpense ?? 0),
    otherSharedExpense: Number(values.otherSharedExpense ?? 0),
    allocationMethod: values.allocationMethod,
    items: (values.items || []).map((item) => ({
      productId: item.productId || null,
      productName: item.productName.trim(),
      quantity: Number(item.quantity ?? 1),
      unitCost: Number(item.unitCost ?? 0),
      categoryName: item.categoryName?.trim() || null,
      sku: item.sku?.trim() || null,
      notes: item.notes?.trim() || null,
      manualAllocatedSharedExpense: Number(item.manualAllocatedSharedExpense ?? 0)
    }))
  };
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getBatchLandedCost(item) {
  return Number(item?.totalPurchaseCost || 0) + Number(item?.allocatedSharedExpense || 0);
}

export default function AdminPurchasesPage() {
  const { hasPermission } = useAuth();
  const { formatMoney: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [supplierForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseBatches, setPurchaseBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const canRead = hasPermission("purchases.read");
  const canManage = hasPermission("purchases.manage");

  const loadPurchasesData = async () => {
    setLoading(true);
    try {
      const [supplierData, batchData, productData] = await Promise.all([
        getSuppliers(),
        getPurchaseBatches(),
        getProducts({ admin: true })
      ]);
      setSuppliers(supplierData);
      setPurchaseBatches(batchData);
      setProducts(productData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) {
      loadPurchasesData();
    }
  }, [canRead]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        label: supplier.isActive ? supplier.name : `${supplier.name} (Inactive)`,
        value: supplier._id
      })),
    [suppliers]
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        label: `${product.displayName} (${product.sku || "No SKU"})`,
        value: product._id,
        product
      })),
    [products]
  );

  const purchaseSummary = useMemo(() => {
    const linkedItems = purchaseBatches.reduce(
      (count, batch) => count + (batch.items || []).filter((item) => item.productId).length,
      0
    );

    return {
      batches: purchaseBatches.length,
      linkedItems,
      sharedExpense: purchaseBatches.reduce(
        (sum, batch) => sum + Number(batch.totalSharedExpense || 0),
        0
      ),
      grandTotal: purchaseBatches.reduce((sum, batch) => sum + Number(batch.grandTotal || 0), 0)
    };
  }, [purchaseBatches]);

  const handleOpenLinkedProduct = (productId) => {
    if (!productId) {
      return;
    }
    navigate(`/admin/products/${productId}`);
  };

  const renderBatchExpandedRow = (batch) => (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space size="large" wrap>
        <Typography.Text>
          <strong>Invoice:</strong> {batch.invoiceNumber || "Not added"}
        </Typography.Text>
        <Typography.Text>
          <strong>Payment:</strong> {batch.paymentMethod || "Not added"}
        </Typography.Text>
        <Typography.Text>
          <strong>Receipt:</strong> {batch.receiptImageUrl ? "Attached by URL" : "Not added"}
        </Typography.Text>
      </Space>
      {batch.notes ? (
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <strong>Notes:</strong> {batch.notes}
        </Typography.Paragraph>
      ) : null}
      <Divider style={{ margin: "4px 0" }} />
      <Table
        rowKey={(item, index) => `${batch._id}-${item.productId || item.sku || item.productName}-${index}`}
        pagination={false}
        size="small"
        dataSource={batch.items || []}
        scroll={{ x: 960 }}
        columns={[
          {
            title: "Product",
            render: (_, item) => (
              <div>
                <Typography.Text strong>{item.productName}</Typography.Text>
                <div>{item.productId ? "Linked to product record" : "Standalone batch item"}</div>
              </div>
            )
          },
          {
            title: "SKU / Category",
            render: (_, item) => (
              <div>
                <div>{item.sku || "No SKU"}</div>
                <div>{item.categoryName || "No category"}</div>
              </div>
            )
          },
          {
            title: "Quantity",
            render: (_, item) => item.quantity || 0
          },
          {
            title: "Unit Cost",
            render: (_, item) => formatCurrency(item.unitCost)
          },
          {
            title: "Purchase Cost",
            render: (_, item) => formatCurrency(item.totalPurchaseCost)
          },
          {
            title: "Allocated Expense",
            render: (_, item) => formatCurrency(item.allocatedSharedExpense)
          },
          {
            title: "Landed Cost",
            render: (_, item) => formatCurrency(getBatchLandedCost(item))
          },
          {
            title: "Product Record",
            render: (_, item) =>
              item.productId ? (
                <Button type="link" style={{ paddingInline: 0 }} onClick={() => handleOpenLinkedProduct(item.productId)}>
                  Open Product
                </Button>
              ) : (
                <Typography.Text type="secondary">Not linked</Typography.Text>
              )
          }
        ]}
      />
    </Space>
  );

  const openCreateSupplier = () => {
    setEditingSupplier(null);
    supplierForm.resetFields();
    supplierForm.setFieldsValue({ isActive: true });
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    supplierForm.setFieldsValue({ ...supplier, isActive: supplier.isActive });
    setSupplierModalOpen(true);
  };

  const openCreateBatch = () => {
    setEditingBatch(null);
    batchForm.resetFields();
    batchForm.setFieldsValue({
      purchaseDate: dayjs(),
      allocationMethod: "value",
      transportExpense: 0,
      supplierDeliveryExpense: 0,
      customsExpense: 0,
      otherSharedExpense: 0,
      items: [{ quantity: 1, unitCost: 0, manualAllocatedSharedExpense: 0 }]
    });
    setBatchModalOpen(true);
  };

  const openEditBatch = (batch) => {
    setEditingBatch(batch);
    batchForm.setFieldsValue({
      ...batch,
      purchaseDate: batch.purchaseDate ? dayjs(batch.purchaseDate) : dayjs(),
      items: (batch.items || []).map((item) => ({
        ...item,
        manualAllocatedSharedExpense: item.manualAllocatedSharedExpense ?? 0
      }))
    });
    setBatchModalOpen(true);
  };

  const handleSupplierSubmit = async () => {
    const values = await supplierForm.validateFields();
    setSupplierSaving(true);
    try {
      const payload = buildSupplierPayload(values);
      if (editingSupplier) {
        await updateSupplier(editingSupplier._id, payload);
        message.success("Supplier updated.");
      } else {
        await createSupplier(payload);
        message.success("Supplier created.");
      }
      setSupplierModalOpen(false);
      supplierForm.resetFields();
      await loadPurchasesData();
    } finally {
      setSupplierSaving(false);
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    await deleteSupplier(supplier._id);
    message.success("Supplier deleted.");
    await loadPurchasesData();
  };

  const handleBatchSubmit = async () => {
    const values = await batchForm.validateFields();
    setBatchSaving(true);
    try {
      const payload = buildBatchPayload(values);
      if (editingBatch) {
        await updatePurchaseBatch(editingBatch._id, payload);
        message.success("Purchase batch updated.");
      } else {
        await createPurchaseBatch(payload);
        message.success("Purchase batch created.");
      }
      setBatchModalOpen(false);
      batchForm.resetFields();
      await loadPurchasesData();
    } finally {
      setBatchSaving(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        className="nuva-card"
        title="Purchases"
        extra={
          <Space>
            <Button onClick={openCreateSupplier} disabled={!canManage}>
              Add Supplier
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateBatch} disabled={!canManage}>
              Add Purchase Batch
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Record suppliers and purchase batches first, then connect costs back into product records
          for pricing and profitability.
        </Typography.Paragraph>
      </Card>

      <Card className="nuva-card" title="Purchase Snapshot">
        <Space size="large" wrap>
          <Typography.Text>
            <strong>Total batches:</strong> {purchaseSummary.batches}
          </Typography.Text>
          <Typography.Text>
            <strong>Linked items:</strong> {purchaseSummary.linkedItems}
          </Typography.Text>
          <Typography.Text>
            <strong>Shared expense:</strong> {formatCurrency(purchaseSummary.sharedExpense)}
          </Typography.Text>
          <Typography.Text>
            <strong>Grand total:</strong> {formatCurrency(purchaseSummary.grandTotal)}
          </Typography.Text>
        </Space>
      </Card>

      <Card title="Suppliers" className="nuva-card">
        {!canRead ? (
          <Typography.Paragraph>You do not have permission to view suppliers.</Typography.Paragraph>
        ) : (
          <Table
            rowKey="_id"
            loading={loading}
            dataSource={suppliers}
            scroll={{ x: 980 }}
            columns={[
              {
                title: "Supplier",
                render: (_, record) => (
                  <div>
                    <Typography.Text strong>{record.name}</Typography.Text>
                    <div>{record.contactPerson || "No contact person"}</div>
                  </div>
                )
              },
              { title: "Phone", dataIndex: "phone" },
              { title: "WhatsApp", dataIndex: "whatsapp" },
              { title: "City", dataIndex: "city" },
              {
                title: "Status",
                render: (_, record) => (
                  <Tag color={record.isActive ? "green" : "default"}>
                    {record.isActive ? "Active" : "Inactive"}
                  </Tag>
                )
              },
              {
                title: "Actions",
                render: (_, record) => (
                  <Space>
                    <Button disabled={!canManage} onClick={() => openEditSupplier(record)}>
                      Edit
                    </Button>
                    <Popconfirm
                      title={`Delete ${record.name}?`}
                      description="Deletion is blocked if purchase batches are still linked."
                      disabled={!canManage}
                      onConfirm={() => handleDeleteSupplier(record)}
                    >
                      <Button danger disabled={!canManage}>
                        Delete
                      </Button>
                    </Popconfirm>
                  </Space>
                )
              }
            ]}
          />
        )}
      </Card>

      <Card title="Purchase Batches" className="nuva-card">
        {!canRead ? (
          <Typography.Paragraph>You do not have permission to view purchase batches.</Typography.Paragraph>
        ) : (
          <Table
            rowKey="_id"
            loading={loading}
            dataSource={purchaseBatches}
            scroll={{ x: 1200 }}
            expandable={{
              expandedRowRender: renderBatchExpandedRow,
              rowExpandable: (record) => Boolean(record.items?.length)
            }}
            columns={[
              { title: "Supplier", dataIndex: "supplierName" },
              { title: "Purchase Date", render: (_, record) => formatDate(record.purchaseDate) },
              { title: "Invoice", dataIndex: "invoiceNumber" },
              { title: "Items", render: (_, record) => `${record.items?.length || 0} items` },
              { title: "Purchase Value", render: (_, record) => formatCurrency(record.totalPurchaseValue) },
              { title: "Shared Expense", render: (_, record) => formatCurrency(record.totalSharedExpense) },
              { title: "Grand Total", render: (_, record) => formatCurrency(record.grandTotal) },
              {
                title: "Allocation",
                render: (_, record) => <Tag>{record.allocationMethod}</Tag>
              },
              {
                title: "Actions",
                render: (_, record) => (
                  <Button disabled={!canManage} onClick={() => openEditBatch(record)}>
                    Edit
                  </Button>
                )
              }
            ]}
          />
        )}
      </Card>

      <Modal
        open={supplierModalOpen}
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
        onCancel={() => setSupplierModalOpen(false)}
        onOk={handleSupplierSubmit}
        okText={editingSupplier ? "Update" : "Create"}
        confirmLoading={supplierSaving}
        okButtonProps={{ disabled: !canManage }}
      >
        <Form form={supplierForm} layout="vertical">
          <Form.Item label="Supplier Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Contact Person" name="contactPerson">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="WhatsApp" name="whatsapp">
            <Input />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="City" name="city">
            <Input />
          </Form.Item>
          <Form.Item label="Country" name="country">
            <Input />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={batchModalOpen}
        title={editingBatch ? "Edit Purchase Batch" : "Add Purchase Batch"}
        onCancel={() => setBatchModalOpen(false)}
        onOk={handleBatchSubmit}
        okText={editingBatch ? "Update" : "Create"}
        confirmLoading={batchSaving}
        okButtonProps={{ disabled: !canManage }}
        width={980}
      >
        <Form form={batchForm} layout="vertical">
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space size="middle" style={{ width: "100%" }} wrap>
              <Form.Item label="Supplier" name="supplierId" rules={[{ required: true }]} style={{ minWidth: 240 }}>
                <Select options={supplierOptions} placeholder="Select supplier" />
              </Form.Item>
              <Form.Item label="Purchase Date" name="purchaseDate" rules={[{ required: true }]} style={{ minWidth: 220 }}>
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
              <Form.Item label="Allocation Method" name="allocationMethod" rules={[{ required: true }]} style={{ minWidth: 220 }}>
                <Select
                  options={[
                    { label: "By Purchase Value", value: "value" },
                    { label: "By Quantity", value: "quantity" },
                    { label: "Equal Split", value: "equal" },
                    { label: "Manual", value: "manual" }
                  ]}
                />
              </Form.Item>
            </Space>

            <Space size="middle" style={{ width: "100%" }} wrap>
              <Form.Item label="Invoice Number" name="invoiceNumber" style={{ minWidth: 220 }}>
                <Input />
              </Form.Item>
              <Form.Item label="Payment Method" name="paymentMethod" style={{ minWidth: 220 }}>
                <Input />
              </Form.Item>
              <Form.Item label="Receipt Image URL" name="receiptImageUrl" style={{ minWidth: 280 }}>
                <Input />
              </Form.Item>
            </Space>

            <Space size="middle" style={{ width: "100%" }} wrap>
              <Form.Item label="Transport Expense" name="transportExpense">
                <InputNumber min={0} style={{ width: 180 }} />
              </Form.Item>
              <Form.Item label="Supplier Delivery" name="supplierDeliveryExpense">
                <InputNumber min={0} style={{ width: 180 }} />
              </Form.Item>
              <Form.Item label="Customs" name="customsExpense">
                <InputNumber min={0} style={{ width: 180 }} />
              </Form.Item>
              <Form.Item label="Other Shared Expense" name="otherSharedExpense">
                <InputNumber min={0} style={{ width: 180 }} />
              </Form.Item>
            </Space>

            <Form.Item label="Notes" name="notes">
              <Input.TextArea rows={3} />
            </Form.Item>

            <Form.List name="items">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Typography.Text strong>Purchase Items</Typography.Text>
                  {fields.map((field) => (
                    <Card
                      key={field.key}
                      size="small"
                      extra={
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      }
                    >
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        <Space size="middle" style={{ width: "100%" }} wrap>
                          <Form.Item
                            {...field}
                            label="Linked Product"
                            name={[field.name, "productId"]}
                            style={{ minWidth: 260 }}
                          >
                            <Select
                              allowClear
                              options={productOptions}
                              placeholder="Optional linked product"
                              onChange={(value, option) => {
                                const selectedProduct = option?.product;
                                if (selectedProduct) {
                                  batchForm.setFieldValue(
                                    ["items", field.name, "productName"],
                                    selectedProduct.displayName
                                  );
                                  batchForm.setFieldValue(
                                    ["items", field.name, "sku"],
                                    selectedProduct.sku || ""
                                  );
                                  batchForm.setFieldValue(
                                    ["items", field.name, "categoryName"],
                                    selectedProduct.displayCategory || ""
                                  );
                                }
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            label="Product Name"
                            name={[field.name, "productName"]}
                            rules={[{ required: true }]}
                            style={{ minWidth: 240 }}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item {...field} label="SKU" name={[field.name, "sku"]} style={{ minWidth: 180 }}>
                            <Input />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            label="Category"
                            name={[field.name, "categoryName"]}
                            style={{ minWidth: 180 }}
                          >
                            <Input />
                          </Form.Item>
                        </Space>
                        <Space size="middle" style={{ width: "100%" }} wrap>
                          <Form.Item
                            {...field}
                            label="Quantity"
                            name={[field.name, "quantity"]}
                            rules={[{ required: true }]}
                          >
                            <InputNumber min={1} style={{ width: 140 }} />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            label="Unit Cost"
                            name={[field.name, "unitCost"]}
                            rules={[{ required: true }]}
                          >
                            <InputNumber min={0} style={{ width: 160 }} />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            label="Manual Shared Expense"
                            name={[field.name, "manualAllocatedSharedExpense"]}
                          >
                            <InputNumber min={0} style={{ width: 180 }} />
                          </Form.Item>
                        </Space>
                        <Form.Item {...field} label="Notes" name={[field.name, "notes"]}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Space>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ quantity: 1, unitCost: 0, manualAllocatedSharedExpense: 0 })}
                  >
                    Add Purchase Item
                  </Button>
                </Space>
              )}
            </Form.List>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
}
