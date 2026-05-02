import { Card, Select, Space, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { getAllOrders, updateOrderStatus } from "../../services/orderService";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  const loadOrders = async () => {
    const data = await getAllOrders();
    setOrders(data);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, value) => {
    await updateOrderStatus(orderId, { orderStatus: value });
    await loadOrders();
  };

  return (
    <Card title="Customer Orders" className="nuva-card">
      <Table
        rowKey="_id"
        dataSource={orders}
        columns={[
          { title: "Order ID", dataIndex: "_id" },
          { title: "Customer", render: (_, record) => record.address?.fullName || "Customer" },
          { title: "Amount", dataIndex: "totalAmount", render: (value) => `$${value}` },
          {
            title: "Payment",
            dataIndex: "paymentStatus",
            render: (value) => <Tag color={value === "paid" ? "green" : "orange"}>{value}</Tag>
          },
          {
            title: "Order Status",
            render: (_, record) => (
              <Space>
                <Tag color="gold">{record.orderStatus}</Tag>
                <Select
                  size="small"
                  value={record.orderStatus}
                  onChange={(value) => handleStatusChange(record._id, value)}
                  options={["placed", "processing", "shipped", "delivered", "cancelled"].map(
                    (value) => ({ value, label: value })
                  )}
                  style={{ width: 140 }}
                />
              </Space>
            )
          }
        ]}
      />
    </Card>
  );
}
