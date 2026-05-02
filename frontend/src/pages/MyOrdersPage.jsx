import { Card, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { getMyOrders } from "../services/orderService";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getMyOrders().then(setOrders);
  }, []);

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <span className="eyebrow">Orders</span>
        <h1>Your order history</h1>
      </section>
      <Card className="nuva-card">
        <Table
          rowKey="_id"
          dataSource={orders}
          pagination={false}
          columns={[
            { title: "Order ID", dataIndex: "_id" },
            {
              title: "Date",
              dataIndex: "createdAt",
              render: (value) => new Date(value).toLocaleDateString()
            },
            {
              title: "Total",
              dataIndex: "totalAmount",
              render: (value) => `$${value}`
            },
            {
              title: "Payment",
              dataIndex: "paymentStatus",
              render: (value) => <Tag color={value === "paid" ? "green" : "orange"}>{value}</Tag>
            },
            {
              title: "Status",
              dataIndex: "orderStatus",
              render: (value) => <Tag color="gold">{value}</Tag>
            }
          ]}
        />
      </Card>
    </div>
  );
}
