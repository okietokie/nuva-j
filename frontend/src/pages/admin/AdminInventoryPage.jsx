import { Button, Card, InputNumber, Space, Table } from "antd";
import { useEffect, useState } from "react";
import { getProducts, updateStock } from "../../services/productService";

export default function AdminInventoryPage() {
  const [products, setProducts] = useState([]);
  const [draftStock, setDraftStock] = useState({});

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSave = async (productId) => {
    await updateStock(productId, Number(draftStock[productId] ?? 0));
    await loadProducts();
  };

  return (
    <Card title="Inventory Management" className="nuva-card">
      <Table
        rowKey="_id"
        dataSource={products}
        columns={[
          { title: "Product", dataIndex: "name" },
          { title: "Current Stock", dataIndex: "stock" },
          {
            title: "Update Stock",
            render: (_, record) => (
              <Space>
                <InputNumber
                  min={0}
                  defaultValue={record.stock}
                  onChange={(value) =>
                    setDraftStock((current) => ({ ...current, [record._id]: value }))
                  }
                />
                <Button onClick={() => handleSave(record._id)}>Save</Button>
              </Space>
            )
          }
        ]}
      />
    </Card>
  );
}
