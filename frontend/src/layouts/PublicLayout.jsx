import { Layout, Menu, Button, Space } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import CartDrawer from "../components/CartDrawer";
import CurrencySwitcher from "../components/CurrencySwitcher";
import { useAuth } from "../context/AuthContext";

const { Header, Content, Footer } = Layout;

export default function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const items = [
    { key: "/", label: <Link to="/">Home</Link> },
    { key: "/shop", label: <Link to="/shop">Shop</Link> },
    { key: "/orders", label: <Link to="/orders">My Orders</Link> }
  ];

  return (
    <Layout className="site-shell">
      <Header className="nuva-header">
        <div className="brand-block" onClick={() => navigate("/")}>
          <span className="brand-mark">NUVA</span>
          <span className="brand-subtitle">Fine Jewelry Atelier</span>
        </div>
        <Menu
          mode="horizontal"
          items={items}
          selectedKeys={[location.pathname === "/shop" ? "/shop" : location.pathname]}
          className="nuva-menu"
        />
        <Space size="middle">
          <CurrencySwitcher />
          {isAdmin ? (
            <Link to="/admin">
              <Button>Admin</Button>
            </Link>
          ) : null}
          {user ? (
            <Button onClick={logout}>Logout</Button>
          ) : (
            <>
              <Link to="/login">
                <Button>Login</Button>
              </Link>
              <Link to="/register">
                <Button type="primary">Join NUVA</Button>
              </Link>
            </>
          )}
          <CartDrawer />
        </Space>
      </Header>
      <Content className="nuva-content">
        <Outlet />
      </Content>
      <Footer className="nuva-footer">
        <div>NUVA</div>
        <div>Elegant pieces for everyday rituals and unforgettable moments.</div>
      </Footer>
    </Layout>
  );
}
