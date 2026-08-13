import { InstagramOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { Link } from "react-router-dom";
import { getWhatsappLink } from "../../utils/storefrontConfig";

export default function StoreFooter({ websiteConfig }) {
  const whatsappLink = getWhatsappLink(websiteConfig?.social?.whatsappNumber);
  const footerGroups = websiteConfig?.navigation?.footerGroups || [];

  return (
    <footer className="store-footer">
      <div className="store-footer-grid">
        <div className="store-footer-brand">
          <p className="store-footer-kicker">NUVA</p>
          <h2>Light, polished pieces for everyday styling.</h2>
          <p>
            Discover the latest selection, explore category edits, and shop with a clear,
            effortless path from browse to checkout.
          </p>
          <div className="store-social-row">
            {websiteConfig?.social?.instagramUrl ? (
              <a href={websiteConfig.social.instagramUrl} target="_blank" rel="noreferrer">
                <InstagramOutlined /> Instagram
              </a>
            ) : null}
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                <WhatsAppOutlined /> WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        {footerGroups.map((group) => (
          <div key={group.id}>
            <h3>{group.label}</h3>
            <div className="store-footer-links">
              {(group.links || [])
                .filter((linkItem) => linkItem.visible)
                .map((linkItem) =>
                  linkItem.href?.startsWith("/") ? (
                    <Link key={linkItem.id} to={linkItem.href}>
                      {linkItem.label}
                    </Link>
                  ) : (
                    <a key={linkItem.id} href={linkItem.href} target="_blank" rel="noreferrer">
                      {linkItem.label}
                    </a>
                  ),
                )}
            </div>
          </div>
        ))}

        <div>
          <h3>Join the list</h3>
          <p className="muted-copy">
            Newsletter signup is shown here when a live subscription flow is configured.
          </p>
          <div className="footer-newsletter">
            <Input placeholder="Your email address" disabled />
            <Button disabled>Subscribe</Button>
          </div>
        </div>
      </div>
      <div className="store-footer-meta">
        <span>© {new Date().getFullYear()} NUVA. All rights reserved.</span>
        <span>Customer-facing content is rendered only from NUVA-owned copy and product data.</span>
      </div>
    </footer>
  );
}
