import { Card, Col, Row, Statistic, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { getAllOrders } from "../../services/orderService";
import { getProducts } from "../../services/productService";

export default function AdminDashboardPage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getProducts().then(setProducts);
    getAllOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic title="Products" value={products.length} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic title="Orders" value={orders.length} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="nuva-card">
            <Statistic title="Revenue" value={revenue} prefix="$" />
          </Card>
        </Col>
      </Row>
      <Card title="Recent orders" className="nuva-card">
        <Table
          rowKey="_id"
          pagination={false}
          dataSource={orders.slice(0, 5)}
          columns={[
            { title: "Order", dataIndex: "_id" },
            { title: "Customer", render: (_, record) => record.address.fullName },
            { title: "Amount", dataIndex: "totalAmount", render: (value) => `$${value}` },
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
