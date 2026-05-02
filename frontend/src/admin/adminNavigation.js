import {
  AppstoreOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  FileTextOutlined,
  GiftOutlined,
  InboxOutlined,
  LineChartOutlined,
  LogoutOutlined,
  PictureOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  StarOutlined,
  TeamOutlined,
  TruckOutlined,
  UserOutlined
} from "@ant-design/icons";

export const adminSections = [
  {
    key: "storefront",
    label: "STOREFRONT",
    basePath: "/admin/storefront",
    description: "CORE STORE OPERATIONS AND CATALOG MANAGEMENT.",
    items: [
      { slug: "dashboard", label: "Dashboard", icon: DashboardOutlined, title: "Dashboard" },
      { slug: "orders", label: "Orders", icon: ShoppingCartOutlined, title: "Orders" },
      { slug: "products", label: "Products", icon: AppstoreOutlined, title: "Products" },
      { slug: "categories", label: "Categories", icon: FileTextOutlined, title: "Categories" },
      { slug: "inventory", label: "Inventory", icon: InboxOutlined, title: "Inventory" },
      { slug: "customers", label: "Customers", icon: TeamOutlined, title: "Customers" }
    ],
    dashboard: {
      title: "Dashboard",
      subtitle: "Welcome back, Admin!",
      stats: [
        { label: "TOTAL ORDERS", value: "128", note: "+ 12% vs last week", tone: "gold" },
        { label: "PENDING ORDERS", value: "18", note: "+ 3% vs last week", tone: "amber" },
        { label: "TOTAL REVENUE", value: "AED 24,560", note: "+ 15% vs last week", tone: "green" },
        { label: "LOW STOCK ITEMS", value: "7", note: "View all", tone: "violet" }
      ],
      panels: [
        {
          title: "RECENT ORDERS",
          action: "View all orders",
          lines: [
            "#ORD-1028  Fatima Ali  AED 320  Pending",
            "#ORD-1027  Sarah Khan  AED 550  Confirmed",
            "#ORD-1026  Ayesha Noor  AED 450  Shipped",
            "#ORD-1025  Mariam Abbas  AED 230  Delivered"
          ]
        },
        {
          title: "LOW STOCK ITEMS",
          action: "View inventory",
          lines: [
            "Pearl Drop Necklace  Stock: 2",
            "Gold Hoop Earrings  Stock: 3",
            "Minimalist Ring  Stock: 1",
            "Charm Bracelet  Stock: 2"
          ]
        }
      ]
    }
  },
  {
    key: "commerce",
    label: "COMMERCE",
    basePath: "/admin/commerce",
    description: "SALES, ORDERS AND FINANCIAL MANAGEMENT.",
    items: [
      { slug: "dashboard", label: "Dashboard", icon: DashboardOutlined, title: "Dashboard" },
      { slug: "orders", label: "Orders", icon: ShoppingCartOutlined, title: "Orders" },
      { slug: "products", label: "Products", icon: AppstoreOutlined, title: "Products" },
      { slug: "categories", label: "Categories", icon: FileTextOutlined, title: "Categories" },
      { slug: "inventory", label: "Inventory", icon: InboxOutlined, title: "Inventory" },
      { slug: "customers", label: "Customers", icon: TeamOutlined, title: "Customers" },
      { slug: "discounts", label: "Discounts", icon: GiftOutlined, title: "Discounts" },
      { slug: "reviews", label: "Reviews", icon: StarOutlined, title: "Reviews" },
      { slug: "payments", label: "Payments", icon: CreditCardOutlined, title: "Payments" },
      { slug: "returns", label: "Returns", icon: SolutionOutlined, title: "Returns" }
    ],
    dashboard: {
      title: "Dashboard",
      subtitle: "Welcome back, Admin!",
      stats: [
        { label: "TOTAL ORDERS", value: "128", note: "+ 12% vs last week", tone: "gold" },
        { label: "TOTAL SALES", value: "AED 24,560", note: "+ 15% vs last week", tone: "green" },
        { label: "TOTAL PAYMENTS", value: "AED 23,890", note: "+ 18% vs last week", tone: "violet" },
        { label: "LOW RTO REQUESTS", value: "6", note: "- 14% vs last week", tone: "amber" }
      ],
      panels: [
        {
          title: "RECENT ORDERS",
          action: "View all orders",
          lines: [
            "#ORD-1028  Fatima Ali  AED 320  Pending",
            "#ORD-1027  Sarah Khan  AED 550  Confirmed",
            "#ORD-1026  Ayesha Noor  AED 450  Shipped",
            "#ORD-1025  Mariam Abbas  AED 230  Delivered"
          ]
        },
        {
          title: "SALES OVERVIEW",
          action: "View report",
          lines: [
            "Mon  10K",
            "Tue  15K",
            "Wed  11K",
            "Thu  12K",
            "Fri  9K",
            "Sat  14K",
            "Sun  10K"
          ]
        }
      ]
    }
  },
  {
    key: "operations",
    label: "OPERATIONS",
    basePath: "/admin/operations",
    description: "STORE OPERATIONS AND CONTENT MANAGEMENT.",
    items: [
      { slug: "dashboard", label: "Dashboard", icon: DashboardOutlined, title: "Dashboard" },
      { slug: "admins-staff", label: "Admins / Staff", icon: TeamOutlined, title: "Admins / Staff" },
      {
        slug: "website-content",
        label: "Website Content",
        icon: FileTextOutlined,
        title: "Website Content"
      },
      {
        slug: "media-library",
        label: "Media Library",
        icon: PictureOutlined,
        title: "Media Library"
      },
      { slug: "shipping", label: "Shipping", icon: TruckOutlined, title: "Shipping" }
    ],
    dashboard: {
      title: "Dashboard",
      subtitle: "Welcome back, Admin!",
      stats: [
        { label: "TOTAL ADMINS", value: "6", note: "Active Staff", tone: "gold" },
        { label: "PUBLISHED CONTENT", value: "12", note: "Pages & Sections", tone: "teal" },
        { label: "MEDIA FILES", value: "356", note: "Total Files", tone: "cyan" },
        { label: "SHIPPING ZONES", value: "4", note: "Active Zones", tone: "mint" }
      ],
      panels: [
        {
          title: "ADMIN ACTIVITY",
          action: "",
          lines: [
            "Admin User  Super Admin  Active",
            "Aisha Khan  Inventory Manager  Active",
            "Omar Ali  Order Manager  Active",
            "Sara Malik  Content Manager  Inactive"
          ]
        },
        {
          title: "QUICK ACTIONS",
          action: "",
          lines: [
            "Add Admin",
            "Add Content",
            "Upload Media",
            "Manage Shipping"
          ]
        }
      ]
    }
  },
  {
    key: "account",
    label: "ACCOUNT",
    basePath: "/admin/account",
    description: "ACCOUNT SETTINGS AND REPORTS.",
    items: [
      { slug: "dashboard", label: "Dashboard", icon: DashboardOutlined, title: "Dashboard" },
      { slug: "reports", label: "Reports", icon: LineChartOutlined, title: "Reports" },
      { slug: "settings", label: "Settings", icon: SettingOutlined, title: "Settings" },
      { slug: "profile", label: "Profile", icon: UserOutlined, title: "Profile" },
      { slug: "logout", label: "Logout", icon: LogoutOutlined, title: "Logout", action: "logout" }
    ],
    dashboard: {
      title: "Dashboard",
      subtitle: "Welcome back, Admin!",
      stats: [
        { label: "TOTAL REVENUE", value: "AED 24,560", note: "+ 15% vs last week", tone: "gold" },
        { label: "TOTAL ORDERS", value: "128", note: "+ 12% vs last week", tone: "amber" },
        { label: "TOTAL CUSTOMERS", value: "236", note: "+ 10% vs last week", tone: "green" },
        { label: "GROWTH RATE", value: "18.6%", note: "+ 3.2% vs last week", tone: "mint" }
      ],
      panels: [
        {
          title: "SALES SUMMARY",
          action: "View full report",
          lines: [
            "Today  AED 4,250  +12%",
            "This Week  AED 24,560  +15%",
            "This Month  AED 98,450  +18%",
            "This Year  AED 1,245,600  +20%"
          ]
        },
        {
          title: "RECENT REPORTS",
          action: "View all reports",
          lines: [
            "Sales Report (May 20 - May 26, 2024)",
            "Orders Report (May 20 - May 26, 2024)",
            "Inventory Report (May 20 - May 26, 2024)",
            "Customers Report (May 20 - May 26, 2024)"
          ]
        }
      ]
    }
  }
];

export function getAdminItemPath(section, item) {
  return item.slug === "dashboard" ? section.basePath : `${section.basePath}/${item.slug}`;
}

export function findAdminSectionByPath(pathname) {
  return adminSections.find((section) => pathname.startsWith(section.basePath)) || adminSections[0];
}

export function findAdminItemByPath(pathname) {
  const section = findAdminSectionByPath(pathname);
  return (
    section.items.find((item) => pathname === getAdminItemPath(section, item)) || section.items[0]
  );
}
