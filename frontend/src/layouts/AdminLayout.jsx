import { Avatar, Button, Layout, Menu, Typography } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  adminSections,
  findAdminItemByPath,
  findAdminSectionByPath,
  getAdminItemPath
} from "../admin/adminNavigation";
import { useAuth } from "../context/AuthContext";

const { Content } = Layout;

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const currentSection = findAdminSectionByPath(location.pathname);
  const currentItem = findAdminItemByPath(location.pathname);
  const menuItems = currentSection.items.map((item) => {
    const Icon = item.icon;
    return {
      key: getAdminItemPath(currentSection, item),
      icon: <Icon />,
      label: item.label
    };
  });

  const handleMenuSelect = ({ key }) => {
    const selectedItem = currentSection.items.find(
      (item) => getAdminItemPath(currentSection, item) === key
    );

    if (selectedItem?.action === "logout") {
      logout();
      navigate("/", { replace: true });
      return;
    }

    navigate(key);
  };

  return (
    <Layout className="admin-shell">
      <Content className="admin-content">
        <div className="admin-shell-grid">
          <aside className="admin-brand-rail">
            <Link to="/" aria-label="Go to NUVA home page" className="admin-brand-link">
              <div className="admin-brand-mark">NUVA</div>
              <div className="admin-brand-subtitle">JEWELRY</div>
            </Link>
            <Typography.Paragraph className="admin-side-description">
              {currentSection.description}
            </Typography.Paragraph>
            <Menu
              mode="inline"
              selectedKeys={[getAdminItemPath(currentSection, currentItem)]}
              items={menuItems}
              onClick={handleMenuSelect}
              className="admin-side-menu"
            />
          </aside>

          <div className="admin-stage">
            <header className="admin-topbar">
              <div className="admin-top-tabs">
                <div className="admin-top-tabs-inner">
                  {adminSections.map((section) => (
                    <Button
                      key={section.key}
                      type="text"
                      className={`admin-top-tab${
                        section.key === currentSection.key ? " admin-top-tab-active" : ""
                      }`}
                      onClick={() => navigate(section.basePath)}
                    >
                      {section.label}
                    </Button>
                  ))}
                </div>
              </div>
              <button className="admin-user-chip" type="button">
                <Avatar size={28} className="admin-user-avatar">
                  A
                </Avatar>
                <span className="admin-user-label">Admin</span>
                <DownOutlined style={{ fontSize: 10 }} />
              </button>
            </header>

            <div className="admin-main-panel">
              <Outlet />
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}
