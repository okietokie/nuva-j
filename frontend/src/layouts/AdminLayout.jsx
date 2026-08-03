import { Avatar, Dropdown, Layout, Typography, message } from "antd";
import { DownOutlined, LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  adminSections,
  getAdminGroups,
  findAdminItemByPath,
  findAdminSectionByPath,
  getAdminItemPath
} from "../admin/adminNavigation";
import CurrencySwitcher from "../components/CurrencySwitcher";
import { useAuth } from "../context/AuthContext";

const { Content } = Layout;

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const currentSection = findAdminSectionByPath(location.pathname);
  const currentItem = findAdminItemByPath(location.pathname);
  const groupedItems = getAdminGroups(currentSection);

  const handleMenuSelect = (item) => {
    const key = getAdminItemPath(currentSection, item);

    if (item?.action === "logout") {
      logout();
      navigate("/", { replace: true });
      return;
    }

    navigate(key);
  };

  const handleUserMenuClick = ({ key }) => {
    if (key === "settings") {
      messageApi.info("Settings will be available soon.");
      return;
    }

    if (key === "logout") {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const adminMenuItems = [
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings"
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true
    }
  ];

  const userLabel = user?.name || "Admin";
  const userInitial = userLabel.trim().charAt(0).toUpperCase() || "A";

  return (
    <Layout className="admin-shell">
      {contextHolder}
      <Content className="admin-content">
        <div className="admin-shell-grid">
          <aside className="admin-brand-rail">
            <Link to="/" aria-label="Go to NUVA home page" className="admin-brand-link">
              <div className="admin-brand-mark">NUVA</div>
              <div className="admin-brand-subtitle">JEWELRY</div>
            </Link>
            <div className="admin-side-intro">
              <Typography.Text className="admin-side-kicker">Admin workspace</Typography.Text>
              <Typography.Paragraph className="admin-side-description">
                {currentSection.description}
              </Typography.Paragraph>
            </div>
            <nav className="admin-side-nav" aria-label="Admin navigation">
              {groupedItems.map((group) => (
                <div className="admin-nav-group" key={group.label}>
                  <Typography.Text className="admin-nav-group-label">{group.label}</Typography.Text>
                  <div className="admin-nav-group-items">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const itemPath = getAdminItemPath(currentSection, item);
                      const isActive = currentItem.slug === item.slug;

                      return (
                        <button
                          key={item.slug}
                          type="button"
                          className={`admin-nav-item${isActive ? " is-active" : ""}${
                            item.action === "logout" ? " is-danger" : ""
                          }`}
                          onClick={() => handleMenuSelect(item)}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <span className="admin-nav-item-icon">
                            <Icon />
                          </span>
                          <span className="admin-nav-item-copy">
                            <strong>{item.label}</strong>
                            <small>{item.title}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="admin-stage">
            <header className="admin-topbar">
              <div className="admin-header-copy">
                <Typography.Text className="admin-header-kicker">
                  {currentItem.group || adminSections[0].label}
                </Typography.Text>
                <div>
                  <Typography.Title level={3} className="admin-header-title">
                    {currentItem.title}
                  </Typography.Title>
                  <Typography.Paragraph className="admin-header-description">
                    Navigate products, operations, finance, and team workflows from a cleaner
                    control center.
                  </Typography.Paragraph>
                </div>
              </div>
              <Dropdown
                menu={{ items: adminMenuItems, onClick: handleUserMenuClick }}
                trigger={["click"]}
                placement="bottomRight"
                overlayClassName="admin-user-dropdown"
              >
                <div className="admin-topbar-actions">
                  <CurrencySwitcher compact />
                  <button className="admin-user-chip" type="button" aria-label="Open admin menu">
                    <Avatar size={28} className="admin-user-avatar">
                      {userInitial}
                    </Avatar>
                    <span className="admin-user-label">{userLabel}</span>
                    <DownOutlined style={{ fontSize: 10 }} />
                  </button>
                </div>
              </Dropdown>
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
