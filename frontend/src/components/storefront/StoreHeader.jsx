import {
  HeartOutlined,
  MenuOutlined,
  SearchOutlined,
  ShoppingOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Badge, Button, Dropdown, Drawer, Tooltip } from "antd";
import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import CurrencySwitcher from "../CurrencySwitcher";
import SearchPanel from "./SearchPanel";

export default function StoreHeader({ categories, products, announcement, websiteConfig, previewMode = false }) {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const primaryLinks = (websiteConfig?.navigation?.headerLinks || [])
    .filter((item) => item.visible)
    .map((item) => ({ label: item.label, href: item.href }));

  const accountItems = useMemo(
    () => ({
      items: [
        !user ? { key: "login", label: <Link to="/login">Login</Link> } : null,
        !user ? { key: "register", label: <Link to="/register">Create account</Link> } : null,
        { key: "account", label: <Link to="/orders">My account</Link> },
        { key: "orders", label: <Link to="/orders">Orders</Link> },
        !previewMode && isAdmin ? { key: "admin", label: <Link to="/admin">Admin</Link> } : null,
        user ? { key: "logout", label: <button type="button" className="menu-plain-button" onClick={logout}>Sign out</button> } : null
      ].filter(Boolean)
    }),
    [isAdmin, logout, previewMode, user]
  );

  return (
    <>
      {announcement ? (
        <div className="announcement-bar">
          <span>{announcement}</span>
        </div>
      ) : null}

      <header className="store-header">
        <div className="store-header-grid">
          <div className="store-header-left">
            <button
              type="button"
              className="icon-shell mobile-only"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <MenuOutlined />
            </button>

            <nav className="store-nav desktop-only" aria-label="Primary">
              {primaryLinks.map((item) => (
                <NavLink key={item.label} to={item.href} className={({ isActive }) => (isActive ? "is-active" : "")}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <Link to="/" className="store-logo" aria-label="NUVA home">
            <span>NUVA</span>
            <small>JEWELLERY</small>
          </Link>

          <div className="store-header-actions">
            <Tooltip title="Search">
              <button
                type="button"
                className="icon-shell"
                aria-label="Open search"
                onClick={() => setSearchOpen(true)}
              >
                <SearchOutlined />
              </button>
            </Tooltip>

            <div className="desktop-only">
              <CurrencySwitcher compact navbar />
            </div>

            {!previewMode ? (
              <Dropdown menu={accountItems} trigger={["click"]} placement="bottomRight">
                <button type="button" className="icon-shell" aria-label="Account menu">
                  <UserOutlined />
                </button>
              </Dropdown>
            ) : null}

            {!previewMode ? (
              <Tooltip title="Wishlist">
                <Link to="/wishlist" className="icon-shell desktop-only" aria-label="Wishlist">
                  <Badge count={wishlistItems.length} size="small">
                    <HeartOutlined />
                  </Badge>
                </Link>
              </Tooltip>
            ) : null}

            {!previewMode ? (
              <Tooltip title="Shopping bag">
                <Link to="/cart" className="icon-shell" aria-label="Shopping bag">
                  <Badge count={itemCount} size="small">
                    <ShoppingOutlined />
                  </Badge>
                </Link>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="left"
        width={320}
        className="mobile-menu"
      >
        <div className="mobile-menu-panel">
          <div className="mobile-currency-row">
            <span>Currency</span>
            <CurrencySwitcher compact navbar />
          </div>
          <nav className="mobile-nav">
            <Link to="/shop" onClick={() => setMenuOpen(false)}>
              Shop
            </Link>
            {primaryLinks
              .filter((item) => item.label !== "Shop")
              .map((item) => (
                <Link key={item.label} to={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            {!previewMode ? (
              <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
                Wishlist
              </Link>
            ) : null}
            {!previewMode ? (
              <Link to="/orders" onClick={() => setMenuOpen(false)}>
                My account
              </Link>
            ) : null}
          </nav>
          <div className="mobile-auth-links">
            {!user ? (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  <Button block>Login</Button>
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}>
                  <Button type="primary" block>
                    Create account
                  </Button>
                </Link>
              </>
            ) : !previewMode ? (
              <Button block onClick={logout}>
                Sign out
              </Button>
            ) : null}
          </div>
        </div>
      </Drawer>

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        categories={categories}
      />
    </>
  );
}
