import { Card, Empty, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { getMyOrders } from "../services/orderService";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const { formatMoney } = useCurrency();
  const { user } = useAuth();

  useEffect(() => {
    getMyOrders().then(setOrders);
  }, []);

  return (
    <div className="store-page account-shell">
      <section className="page-intro">
        <span className="section-kicker">My Account</span>
        <h1>Your order history</h1>
        <p>Track recent orders, check payment state, and keep your account details close while you shop.</p>
      </section>

      <section className="account-grid">
        <article className="account-card">
          <span className="section-kicker">Profile</span>
          <h3>{user?.name || "NUVA Customer"}</h3>
          <p className="muted-copy">{user?.email || "Sign in to see saved account details."}</p>
        </article>
        <article className="account-card">
          <span className="section-kicker">Orders</span>
          <h3>{orders.length}</h3>
          <p className="muted-copy">Orders currently linked to your account.</p>
        </article>
        <article className="account-card">
          <span className="section-kicker">Status</span>
          <h3>{orders.filter((order) => order.paymentStatus === "paid").length} paid</h3>
          <p className="muted-copy">Live payment and order states from the current order service.</p>
        </article>
      </section>

      <Card className="nuva-card">
        {orders.length ? (
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
        ) : (
          <Empty description="No orders yet." />
        )}
      </Card>
    </div>
  );
}
