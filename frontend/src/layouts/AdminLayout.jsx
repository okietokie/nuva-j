import { Layout, Menu } from "antd";
import {
  AppstoreOutlined,
  DashboardOutlined,
  InboxOutlined,
  ShoppingCartOutlined
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Sider, Content } = Layout;

export default function AdminLayout() {
  const location = useLocation();

  const items = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: <Link to="/admin">Dashboard</Link>
    },
    {
      key: "/admin/products",
      icon: <AppstoreOutlined />,
      label: <Link to="/admin/products">Products</Link>
    },
    {
      key: "/admin/orders",
      icon: <ShoppingCartOutlined />,
      label: <Link to="/admin/orders">Orders</Link>
    },
    {
      key: "/admin/inventory",
      icon: <InboxOutlined />,
      label: <Link to="/admin/inventory">Inventory</Link>
    }
  ];

  const selectedKey =
    items.find((item) => location.pathname.startsWith(item.key))?.key || "/admin";

  return (
    <Layout className="admin-shell">
      <Sider width={250} theme="light" className="admin-sider">
        <div className="admin-logo">NUVA Admin</div>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={items} />
      </Sider>
      <Content className="admin-content">
        <Outlet />
      </Content>
    </Layout>
  );
}
