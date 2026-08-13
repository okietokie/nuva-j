import {
  AppstoreOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  InboxOutlined,
  LogoutOutlined,
  PictureOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";

export const adminSections = [
  {
    key: "core",
    label: "ADMIN",
    basePath: "/admin",
    description: "CENTRAL BUSINESS MANAGEMENT FOR PRODUCTS, SALES, OPERATIONS, AND REPORTING.",
    items: [
      {
        slug: "dashboard",
        label: "Dashboard",
        icon: DashboardOutlined,
        title: "Dashboard",
        group: "Overview"
      },
      {
        slug: "products",
        label: "Products",
        icon: AppstoreOutlined,
        title: "Products",
        group: "Catalog"
      },
      {
        slug: "inventory",
        label: "Inventory",
        icon: InboxOutlined,
        title: "Inventory",
        group: "Catalog"
      },
      {
        slug: "media",
        label: "Media",
        icon: PictureOutlined,
        title: "Media",
        group: "Catalog"
      },
      {
        slug: "purchases",
        label: "Purchases",
        icon: SolutionOutlined,
        title: "Purchases",
        group: "Operations"
      },
      {
        slug: "orders",
        label: "Orders",
        icon: ShoppingCartOutlined,
        title: "Orders",
        group: "Operations"
      },
      {
        slug: "customers",
        label: "Customers",
        icon: TeamOutlined,
        title: "Customers",
        group: "Operations"
      },
      {
        slug: "packaging",
        label: "Packaging",
        icon: InboxOutlined,
        title: "Packaging",
        group: "Operations"
      },
      {
        slug: "expenses",
        label: "Expenses",
        icon: FileTextOutlined,
        title: "Expenses",
        group: "Finance"
      },
      {
        slug: "finance",
        label: "Finance",
        icon: DollarOutlined,
        title: "Finance",
        group: "Finance"
      },
      {
        slug: "reports",
        label: "Reports",
        icon: FileTextOutlined,
        title: "Reports",
        group: "Finance"
      },
      {
        slug: "website",
        label: "Website",
        icon: FileTextOutlined,
        title: "Website",
        group: "Workspace"
      },
      {
        slug: "staff",
        label: "Staff",
        icon: TeamOutlined,
        title: "Staff",
        group: "Workspace"
      },
      {
        slug: "settings",
        label: "Settings",
        icon: SettingOutlined,
        title: "Settings",
        group: "Workspace"
      },
      {
        slug: "profile",
        label: "Profile",
        icon: UserOutlined,
        title: "Profile",
        group: "Workspace"
      },
      {
        slug: "logout",
        label: "Logout",
        icon: LogoutOutlined,
        title: "Logout",
        action: "logout",
        group: "Workspace"
      }
    ],
    dashboard: {
      title: "Dashboard",
      subtitle: "Track products, purchases, orders, customers, stock, expenses, and reporting from one central workspace.",
      stats: [
        { label: "TOTAL PRODUCTS", value: "128", note: "Catalog records in the system", tone: "gold" },
        { label: "IN STOCK", value: "94", note: "Products currently available", tone: "green" },
        { label: "PENDING ORDERS", value: "18", note: "Orders waiting for action", tone: "amber" },
        { label: "LOW STOCK", value: "7", note: "Products below alert level", tone: "violet" }
      ],
      highlights: [
        {
          title: "Monthly Sales",
          value: "AED 24,560",
          note: "Across website, Instagram, and WhatsApp",
          tone: "rose"
        },
        {
          title: "Monthly Expenses",
          value: "AED 6,840",
          note: "Purchases, packaging, delivery, and operations",
          tone: "sand"
        },
        {
          title: "Estimated Profit",
          value: "AED 17,720",
          note: "Based on current stock and order records",
          tone: "green"
        }
      ],
      panels: [
        {
          title: "Recent Order Activity",
          action: "Central order workflow",
          lines: [
            "#ORD-1043  Website  AED 460  Ready for Dispatch",
            "#ORD-1042  Instagram  AED 320  Packing",
            "#ORD-1041  WhatsApp  AED 240  Confirmed",
            "#ORD-1040  Direct Sale  AED 580  Delivered"
          ]
        },
        {
          title: "Stock and Media Follow-Up",
          action: "Shared product records",
          lines: [
            "7 products are below their low-stock limit",
            "12 products still need showcase images",
            "5 products are ready to publish",
            "3 products have been in stock for more than 90 days"
          ]
        },
        {
          title: "Operations Snapshot",
          action: "Operations overview",
          lines: [
            "Purchases will feed shared costing into product records",
            "Customers and orders will use one central database",
            "Packaging and expenses will flow into profit reporting",
            "Reports will replace manual month-end spreadsheet copying"
          ]
        },
        {
          title: "Current Priorities",
          action: "Focus areas",
          lines: [
            "Unified admin navigation complete",
            "Dashboard and language aligned to business workflow",
            "Products and inventory treated as one connected system",
            "Next: statuses, media structure, and mobile admin polish"
          ]
        }
      ]
    }
  }
];

export const adminPrimaryMobileSlugs = [
  "dashboard",
  "products",
  "orders",
  "inventory",
  "purchases",
  "finance",
  "reports",
  "website",
  "staff",
  "packaging",
  "expenses",
  "media",
  "customers",
  "settings",
  "profile"
];

export function getAdminItemPath(section, item) {
  return item.slug === "dashboard" ? section.basePath : `${section.basePath}/${item.slug}`;
}

export function findAdminSectionByPath() {
  return adminSections[0];
}

export function findAdminItemByPath(pathname) {
  const section = adminSections[0];
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  return (
    section.items.find((item) => {
      const itemPath = getAdminItemPath(section, item);
      return normalizedPath === itemPath || normalizedPath.startsWith(`${itemPath}/`);
    }) || section.items[0]
  );
}

export function getAdminGroups(section) {
  return section.items.reduce((groups, item) => {
    const groupName = item.group || "General";
    const existingGroup = groups.find((group) => group.label === groupName);

    if (existingGroup) {
      existingGroup.items.push(item);
      return groups;
    }

    groups.push({
      label: groupName,
      items: [item]
    });

    return groups;
  }, []);
}
