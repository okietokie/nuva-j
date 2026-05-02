import { Button, Card, InputNumber, Space, Table, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getProducts, updateProduct, updateStock } from "../../services/productService";

function stockColor(stockStatus) {
  if (stockStatus === "Out of Stock") return "red";
  if (stockStatus === "Low Stock") return "orange";
  return "green";
}

export default function AdminInventoryPage() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const canUpdateInventory = hasPermission("inventory.update");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts({ admin: true, includeArchived: true });
      setProducts(data);
      setDrafts(
        Object.fromEntries(
          data.map((product) => [
            product._id,
            { stock: product.stock, lowStockLimit: product.lowStockLimit }
          ])
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSave = async (productId) => {
    const next = drafts[productId];
    await updateStock(productId, Number(next.stock ?? 0));
    await updateProduct(productId, { lowStockLimit: Number(next.lowStockLimit ?? 0) });
    message.success("Inventory updated.");
    await loadProducts();
  };

  return (
    <Card title="Inventory Management" className="nuva-card">
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={products}
        scroll={{ x: 960 }}
        columns={[
          { title: "Product", dataIndex: "name" },
          { title: "SKU", dataIndex: "sku" },
          {
            title: "Status",
            render: (_, record) => <Tag color={stockColor(record.stockStatus)}>{record.stockStatus}</Tag>
          },
          { title: "Visibility", dataIndex: "visibility" },
          {
            title: "Current Stock",
            render: (_, record) => `${record.stock} units`
          },
          {
            title: "Low Stock Limit",
            render: (_, record) => (
                <InputNumber
                  min={0}
                  disabled={!canUpdateInventory}
                  value={drafts[record._id]?.lowStockLimit}
                onChange={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [record._id]: {
                      ...current[record._id],
                      lowStockLimit: value
                    }
                  }))
                }
              />
            )
          },
          {
            title: "Update Stock",
            render: (_, record) => (
              <Space>
                <InputNumber
                  min={0}
                  disabled={!canUpdateInventory}
                  value={drafts[record._id]?.stock}
                  onChange={(value) =>
                    setDrafts((current) => ({
                      ...current,
                      [record._id]: {
                        ...current[record._id],
                        stock: value
                      }
                    }))
                  }
                />
                <Button disabled={!canUpdateInventory} onClick={() => handleSave(record._id)}>
                  Save
                </Button>
              </Space>
            )
          }
        ]}
      />
    </Card>
  );
}
