import { Card, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { getMyOrders } from "../services/orderService";
import { useCurrency } from "../context/CurrencyContext";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const { formatMoney } = useCurrency();

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
              render: (value, record) => formatMoney(value, record.currency || "AED")
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
