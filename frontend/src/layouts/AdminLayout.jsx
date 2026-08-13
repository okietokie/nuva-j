import { useMemo, useState } from "react";
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Typography, message } from "antd";
import {
  DownOutlined,
  LogoutOutlined,
  MoreOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  adminSections,
  adminPrimaryMobileSlugs,
  getAdminGroups,
  findAdminItemByPath,
  findAdminSectionByPath,
  getAdminItemPath
} from "../admin/adminNavigation";
import CurrencySwitcher from "../components/CurrencySwitcher";
import { useAuth } from "../context/AuthContext";

const { Content } = Layout;

export default function AdminLayout() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, hasWorkspaceAccess } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const currentSection = findAdminSectionByPath(location.pathname);
  const currentItem = findAdminItemByPath(location.pathname);
  const visibleItems = useMemo(
    () =>
      currentSection.items.filter((item) => {
        if (item.action === "logout") {
          return true;
        }
        if (item.slug === "dashboard") {
          return hasWorkspaceAccess("dashboard");
        }
        return hasWorkspaceAccess(item.slug);
      }),
    [currentSection.items, hasWorkspaceAccess]
  );
  const groupedItems = getAdminGroups({
    ...currentSection,
    items: visibleItems
  })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.action !== "logout")
    }))
    .filter((group) => group.items.length > 0);

  const primaryMobileItems = useMemo(
    () => visibleItems
      .filter((item) => item.action !== "logout" && adminPrimaryMobileSlugs.includes(item.slug))
      .sort(
        (left, right) =>
          adminPrimaryMobileSlugs.indexOf(left.slug) - adminPrimaryMobileSlugs.indexOf(right.slug)
      )
      .slice(0, 3),
    [visibleItems]
  );

  const mobileMoreGroups = useMemo(
    () => {
      const primarySlugs = new Set(primaryMobileItems.map((item) => item.slug));
      const groups = groupedItems
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !primarySlugs.has(item.slug))
        }))
        .filter((group) => group.items.length > 0);
      const logoutItem = visibleItems.find((item) => item.action === "logout");

      if (logoutItem) {
        groups.push({
          label: "Account",
          items: [logoutItem]
        });
      }

      return groups;
    },
    [groupedItems, primaryMobileItems, visibleItems]
  );

  const handleMenuSelect = (item) => {
    const key = getAdminItemPath(currentSection, item);

    if (item?.action === "logout") {
      logout();
      navigate("/", { replace: true });
      return;
    }

    setMobileMoreOpen(false);
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

  const renderDesktopSidebar = () => (
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
  );

  const renderUserMenuTrigger = () => (
    <div className="admin-topbar-actions">
      <CurrencySwitcher compact />
      <button className="admin-user-chip" type="button" aria-label="Open admin menu">
        <Avatar size={28} className="admin-user-avatar">
          {userInitial}
        </Avatar>
        {!isMobile ? <span className="admin-user-label">{userLabel}</span> : null}
        <DownOutlined style={{ fontSize: 10 }} />
      </button>
    </div>
  );

  const renderMobileShell = () => (
    <>
      <header className="admin-mobile-appbar">
        <div className="admin-mobile-appbar__brand">
          <Link to="/" aria-label="Go to NUVA home page" className="admin-mobile-brand-link">
            <span className="admin-mobile-brand-mark">NUVA</span>
            <span className="admin-mobile-brand-subtitle">JEWELLERY</span>
          </Link>
          <div className="admin-mobile-appbar__copy">
            <span className="admin-mobile-appbar__label">Admin workspace</span>
            <strong>{currentItem.title}</strong>
          </div>
        </div>
        <div className="admin-mobile-appbar__actions">
          <CurrencySwitcher compact />
          <Dropdown
            menu={{ items: adminMenuItems, onClick: handleUserMenuClick }}
            trigger={["click"]}
            placement="bottomRight"
            overlayClassName="admin-user-dropdown"
          >
            <button className="admin-user-chip admin-user-chip-mobile" type="button" aria-label="Open admin menu">
              <Avatar size={28} className="admin-user-avatar">
                {userInitial}
              </Avatar>
              <DownOutlined style={{ fontSize: 10 }} />
            </button>
          </Dropdown>
        </div>
      </header>

      <div className="admin-stage admin-stage-mobile">
        <div className="admin-main-panel admin-main-panel-mobile">
          <Outlet />
        </div>
      </div>

      <nav className="admin-mobile-bottom-nav" aria-label="Primary admin destinations">
        {primaryMobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentItem.slug === item.slug;

          return (
            <button
              key={item.slug}
              type="button"
              className={`admin-mobile-tab${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleMenuSelect(item)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`admin-mobile-tab${mobileMoreOpen ? " is-active" : ""}`}
          aria-expanded={mobileMoreOpen}
          onClick={() => setMobileMoreOpen(true)}
        >
          <MoreOutlined aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      <Drawer
        open={mobileMoreOpen}
        placement="bottom"
        height="auto"
        onClose={() => setMobileMoreOpen(false)}
        className="admin-mobile-more-drawer"
        title="More"
      >
        <div className="admin-mobile-more-sheet">
          {mobileMoreGroups.map((group) => (
            <section key={group.label} className="admin-mobile-more-group">
              <span className="admin-mobile-more-group__label">{group.label}</span>
              <div className="admin-mobile-more-group__items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentItem.slug === item.slug;

                  return (
                    <Button
                      key={item.slug}
                      type="text"
                      className={`admin-mobile-more-item${isActive ? " is-active" : ""}${
                        item.action === "logout" ? " is-danger" : ""
                      }`}
                      onClick={() => handleMenuSelect(item)}
                    >
                      <span className="admin-mobile-more-item__icon">
                        <Icon />
                      </span>
                      <span className="admin-mobile-more-item__copy">
                        <strong>{item.label}</strong>
                        <small>{item.title}</small>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Drawer>
    </>
  );

  return (
    <Layout className="admin-shell">
      {contextHolder}
      <Content className="admin-content">
        {isMobile ? (
          renderMobileShell()
        ) : (
          <div className="admin-shell-grid">
            {renderDesktopSidebar()}

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
                  {renderUserMenuTrigger()}
                </Dropdown>
              </header>

              <div className="admin-main-panel">
                <Outlet />
              </div>
            </div>
          </div>
        )}
      </Content>
    </Layout>
  );
}
