import { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Select, Space, Table, Tag, Typography, message } from "antd";
import {
  AlertOutlined,
  DollarOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  StockOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminKpiSection from "../../components/admin/AdminKpiSection";
import { useCurrency } from "../../context/CurrencyContext";
import { seedExpenses } from "../../data/adminExpenseSeed";
import { getAllOrders } from "../../services/orderService";
import { getProducts } from "../../services/productService";
import { getPurchaseBatches } from "../../services/purchaseService";
import "../../styles/adminCatalog.css";

const TODAY = dayjs("2026-07-29");
const periodOptions = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Full timeline", value: "all" },
  { label: "Custom range", value: "custom" },
];

const ADMIN_SOURCE_CURRENCY = "INR";

function stripCurrencyPrefix(formattedValue) {
  return String(formattedValue || "").replace(/^[^\d-]+/, "");
}

function formatDate(value) {
  return dayjs(value).format("DD MMM YYYY");
}

function formatModuleLabel(value) {
  if (!value) return "General";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeCsvValue(value) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function buildCsvContent({ periodLabel, previousPeriodLabel, summaryRows, moduleRows }) {
  const summaryHeader = [
    "Metric",
    "Current Period Label",
    "Current Period Value",
    "Previous Period Label",
    "Previous Period Value",
    "Change",
    "Status",
    "Reporting Note",
  ];
  const summaryLines = summaryRows.map((row) =>
    [
      row.metric,
      periodLabel,
      row.currentValue,
      previousPeriodLabel,
      row.previousValue,
      row.delta,
      row.status,
      row.note,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  const moduleHeader = ["Module", "Tracked Expenses", "Tracked Value"];
  const moduleLines = moduleRows.map((row) =>
    [formatModuleLabel(row.module), row.count, row.total.toFixed(2)]
      .map(escapeCsvValue)
      .join(","),
  );

  return [
    summaryHeader.map(escapeCsvValue).join(","),
    ...summaryLines,
    "",
    moduleHeader.map(escapeCsvValue).join(","),
    ...moduleLines,
  ].join("\n");
}

function resolvePeriodRange(period, customRange) {
  if (period === "custom" && customRange?.length === 2) {
    return {
      start: customRange[0].startOf("day"),
      end: customRange[1].endOf("day"),
      label: `${formatDate(customRange[0])} to ${formatDate(customRange[1])}`,
    };
  }

  if (period === "7d") {
    return {
      start: TODAY.subtract(6, "day").startOf("day"),
      end: TODAY.endOf("day"),
      label: "Last 7 days",
    };
  }

  if (period === "30d") {
    return {
      start: TODAY.subtract(29, "day").startOf("day"),
      end: TODAY.endOf("day"),
      label: "Last 30 days",
    };
  }

  if (period === "90d") {
    return {
      start: TODAY.subtract(89, "day").startOf("day"),
      end: TODAY.endOf("day"),
      label: "Last 90 days",
    };
  }

  return {
    start: null,
    end: null,
    label: "Full timeline",
  };
}

function resolvePreviousPeriodRange(periodRange) {
  if (!periodRange.start || !periodRange.end) {
    return null;
  }

  const daySpan =
    periodRange.end.startOf("day").diff(periodRange.start.startOf("day"), "day") + 1;
  const previousEnd = periodRange.start.subtract(1, "day").endOf("day");
  const previousStart = previousEnd.subtract(daySpan - 1, "day").startOf("day");

  return {
    start: previousStart,
    end: previousEnd,
    label: `${formatDate(previousStart)} to ${formatDate(previousEnd)}`,
  };
}

function isWithinRange(value, periodRange) {
  if (!value || !periodRange.start || !periodRange.end) {
    return true;
  }

  const date = dayjs(value);
  return (
    (date.isAfter(periodRange.start) || date.isSame(periodRange.start)) &&
    (date.isBefore(periodRange.end) || date.isSame(periodRange.end))
  );
}

function getPackagingOrderState(order, productMap) {
  const linkedProducts = (order.items || [])
    .map((item) => productMap.get(item.productId))
    .filter(Boolean);

  if (!linkedProducts.length) {
    return { label: "Product Review Needed", color: "default", priority: 70 };
  }

  if (linkedProducts.some((product) => product.packagingCost <= 0)) {
    return { label: "Packaging Missing", color: "red", priority: 95 };
  }

  if (linkedProducts.some((product) => product.stockStatus === "Out of Stock")) {
    return { label: "Stock Conflict", color: "orange", priority: 90 };
  }

  if (linkedProducts.some((product) => product.workflowStatus === "image_pending")) {
    return { label: "Packaging Review", color: "gold", priority: 60 };
  }

  return { label: "Pack Ready", color: "green", priority: 0 };
}

function getExpenseAuditState(expense) {
  if (expense.status === "paid") {
    return expense.paidBy?.trim() && expense.paidOn && expense.proofReference?.trim()
      ? { label: "Payment Verified", priority: 0 }
      : { label: "Proof Missing", priority: 95 };
  }

  if (!expense.approvedBy?.trim()) {
    return { label: "Approval Missing", priority: 85 };
  }

  if (expense.status === "recorded" && !expense.paidBy?.trim()) {
    return { label: "Awaiting Payment Proof", priority: 75 };
  }

  return { label: "Trail Started", priority: 30 };
}

function calculateAttentionItems(products, orders, expenses) {
  const productMap = new Map(products.map((product) => [product._id, product]));

  return (
    products.filter(
      (product) => product.stockStatus === "Low Stock" || product.stockStatus === "Out of Stock",
    ).length +
    orders.filter((order) => {
      const state = getPackagingOrderState(order, productMap);
      return (
        state.label !== "Pack Ready" &&
        order.orderStatus !== "delivered" &&
        order.orderStatus !== "cancelled"
      );
    }).length +
    expenses.filter((expense) => {
      const audit = getExpenseAuditState(expense);
      return audit.priority >= 75 || dayjs(expense.expenseDate).isBefore(TODAY, "day");
    }).length
  );
}

function formatDelta(value, formatter = (input) => String(input)) {
  if (value === 0) {
    return "No change";
  }

  return `${value > 0 ? "+" : "-"}${formatter(Math.abs(value))}`;
}

function buildTopStats(products, orders, purchaseBatches, expenses, formatMoney) {
  const openOrders = orders.filter(
    (order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
  ).length;
  const purchaseSpend = purchaseBatches.reduce(
    (sum, batch) => sum + Number(batch.grandTotal || 0),
    0,
  );
  const expenseSpend = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const attentionItems = calculateAttentionItems(products, orders, expenses);

  return [
    {
      key: "products",
      label: "Tracked Products",
      value: products.length,
      icon: <InboxOutlined />,
      tone: "total",
    },
    {
      key: "orders",
      label: "Open Orders",
      value: openOrders,
      icon: <ShoppingCartOutlined />,
      tone: "total",
    },
    {
      key: "purchases",
      label: "Purchase Spend",
      value: formatMoney(purchaseSpend, ADMIN_SOURCE_CURRENCY),
      icon: <DollarOutlined />,
      tone: "total",
    },
    {
      key: "expenses",
      label: "Tracked Expenses",
      value: formatMoney(expenseSpend, ADMIN_SOURCE_CURRENCY),
      icon: <StockOutlined />,
      tone: "total",
    },
    {
      key: "attention",
      label: "Attention Items",
      value: attentionItems,
      icon: <AlertOutlined />,
      tone: attentionItems ? "low" : "active",
    },
  ];
}

function buildWorkflowRows(products, orders, purchaseBatches, expenses) {
  const lowStock = products.filter((product) => product.stockStatus === "Low Stock").length;
  const outOfStock = products.filter((product) => product.stockStatus === "Out of Stock").length;
  const packagingMissing = products.filter(
    (product) => Number(product.packagingCost || 0) <= 0,
  ).length;
  const readyToPublish = products.filter(
    (product) => product.workflowStatus === "ready_to_publish",
  ).length;
  const openOrders = orders.filter(
    (order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
  );
  const productMap = new Map(products.map((product) => [product._id, product]));
  const ordersNeedingReview = openOrders.filter(
    (order) => getPackagingOrderState(order, productMap).label !== "Pack Ready",
  ).length;
  const purchaseLinkedItems = purchaseBatches.reduce(
    (count, batch) => count + (batch.items || []).filter((item) => item.productId).length,
    0,
  );
  const unlinkedPurchaseItems = purchaseBatches.reduce(
    (count, batch) => count + (batch.items || []).filter((item) => !item.productId).length,
    0,
  );
  const overdueExpenses = expenses.filter(
    (expense) =>
      expense.status === "recorded" && dayjs(expense.expenseDate).isBefore(TODAY, "day"),
  ).length;
  const unverifiedExpenses = expenses.filter(
    (expense) => getExpenseAuditState(expense).label !== "Payment Verified",
  ).length;

  return [
    {
      key: "inventory",
      workspace: "Inventory",
      summary: `${lowStock} low stock / ${outOfStock} out of stock`,
      health: lowStock || outOfStock ? "Needs Attention" : "Healthy",
      nextAction: "Use this to drive replenishment and stock correction.",
    },
    {
      key: "packaging",
      workspace: "Packaging",
      summary: `${packagingMissing} products missing packaging cost / ${readyToPublish} ready to publish`,
      health: packagingMissing ? "Gaps Present" : "Aligned",
      nextAction: "Close packaging-cost gaps before more orders move to dispatch.",
    },
    {
      key: "orders",
      workspace: "Orders",
      summary: `${openOrders.length} open orders / ${ordersNeedingReview} need packaging review`,
      health: ordersNeedingReview ? "Needs Review" : "Stable",
      nextAction: "Focus first on open orders that are not pack-ready.",
    },
    {
      key: "purchases",
      workspace: "Purchases",
      summary: `${purchaseBatches.length} batches / ${purchaseLinkedItems} linked items / ${unlinkedPurchaseItems} unlinked items`,
      health: unlinkedPurchaseItems ? "Link Missing" : "Connected",
      nextAction:
        "Link standalone batch items back to products for better costing continuity.",
    },
    {
      key: "expenses",
      workspace: "Expenses",
      summary: `${overdueExpenses} overdue payments / ${unverifiedExpenses} items without full proof`,
      health: overdueExpenses || unverifiedExpenses ? "Follow-Up Needed" : "Verified",
      nextAction: "Use expense proof and approvals to tighten month-end reporting.",
    },
  ];
}

function buildModuleSpend(expenses) {
  return [...new Map(expenses.map((expense) => [expense.linkedModule, 0])).keys()]
    .map((moduleKey) => {
      const moduleExpenses = expenses.filter((expense) => expense.linkedModule === moduleKey);
      return {
        key: moduleKey,
        module: moduleKey,
        total: moduleExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        count: moduleExpenses.length,
      };
    })
    .sort((left, right) => right.total - left.total);
}

function buildActionQueue(products, orders, purchaseBatches, expenses) {
  const productItems = products
    .filter(
      (product) => product.stockStatus === "Out of Stock" || product.stockStatus === "Low Stock",
    )
    .map((product) => ({
      key: `product-${product._id}`,
      area: "Inventory",
      label: product.displayName,
      state: product.stockStatus,
      detail: product.sku || "No SKU",
      recommendation:
        product.stockStatus === "Out of Stock"
          ? "Restock or link the next supplier delivery."
          : "Prepare replenishment before stock drops further.",
      priority: product.stockStatus === "Out of Stock" ? 100 : 80,
      color: product.stockStatus === "Out of Stock" ? "red" : "orange",
    }));

  const productMap = new Map(products.map((product) => [product._id, product]));
  const orderItems = orders
    .filter((order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled")
    .map((order) => {
      const state = getPackagingOrderState(order, productMap);
      return {
        key: `order-${order._id}`,
        area: "Orders",
        label: order._id,
        state: state.label,
        detail: order.address?.fullName || "Customer",
        recommendation: "Resolve packaging and stock blockers before dispatch.",
        priority: state.priority,
        color: state.color,
      };
    })
    .filter((item) => item.priority > 0);

  const purchaseItems = purchaseBatches
    .filter((batch) => (batch.items || []).some((item) => !item.productId))
    .map((batch) => ({
      key: `purchase-${batch._id}`,
      area: "Purchases",
      label: batch.invoiceNumber || batch._id,
      state: "Unlinked Items",
      detail: `${(batch.items || []).filter((item) => !item.productId).length} batch items need product links`,
      recommendation:
        "Attach standalone items to products so landed cost keeps flowing through.",
      priority: 65,
      color: "gold",
    }));

  const expenseItems = expenses
    .map((expense) => {
      const audit = getExpenseAuditState(expense);
      const overdue =
        expense.status === "recorded" && dayjs(expense.expenseDate).isBefore(TODAY, "day");
      return {
        key: `expense-${expense.id}`,
        area: "Expenses",
        label: expense.title,
        state: overdue ? "Overdue Payment" : audit.label,
        detail: expense.linkedReference,
        recommendation: overdue
          ? "Follow up on payment settlement immediately."
          : "Complete the approval or proof trail for cleaner finance reporting.",
        priority: overdue ? 100 : audit.priority,
        color: overdue
          ? "red"
          : audit.label === "Approval Missing"
            ? "orange"
            : audit.label === "Awaiting Payment Proof"
              ? "gold"
              : "blue",
      };
    })
    .filter((item) => item.priority > 0);

  return [...productItems, ...orderItems, ...purchaseItems, ...expenseItems]
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 10);
}

function buildTrendCards({
  products,
  currentOrders,
  previousOrders,
  currentPurchaseBatches,
  previousPurchaseBatches,
  currentExpenses,
  previousExpenses,
  currentRange,
  previousRange,
  formatMoney,
}) {
  if (!previousRange) {
    return [];
  }

  const currentPurchaseSpend = currentPurchaseBatches.reduce(
    (sum, batch) => sum + Number(batch.grandTotal || 0),
    0,
  );
  const previousPurchaseSpend = previousPurchaseBatches.reduce(
    (sum, batch) => sum + Number(batch.grandTotal || 0),
    0,
  );
  const currentExpenseSpend = currentExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const previousExpenseSpend = previousExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const currentOpenOrders = currentOrders.filter(
    (order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
  ).length;
  const previousOpenOrders = previousOrders.filter(
    (order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
  ).length;
  const currentAttention = calculateAttentionItems(products, currentOrders, currentExpenses);
  const previousAttention = calculateAttentionItems(products, previousOrders, previousExpenses);

  return [
    {
      key: "purchase_trend",
      label: "Purchase Spend Trend",
      currentValue: formatMoney(currentPurchaseSpend, ADMIN_SOURCE_CURRENCY),
      comparison: formatDelta(
        currentPurchaseSpend - previousPurchaseSpend,
        (value) => stripCurrencyPrefix(formatMoney(value, ADMIN_SOURCE_CURRENCY)),
      ),
      tagColor: currentPurchaseSpend > previousPurchaseSpend ? "gold" : "green",
      note: `${currentRange.label} compared with ${previousRange.label}`,
    },
    {
      key: "expense_trend",
      label: "Expense Spend Trend",
      currentValue: formatMoney(currentExpenseSpend, ADMIN_SOURCE_CURRENCY),
      comparison: formatDelta(
        currentExpenseSpend - previousExpenseSpend,
        (value) => stripCurrencyPrefix(formatMoney(value, ADMIN_SOURCE_CURRENCY)),
      ),
      tagColor: currentExpenseSpend > previousExpenseSpend ? "orange" : "green",
      note: "Tracks planned, recorded, and paid operating spend.",
    },
    {
      key: "orders_trend",
      label: "Open Orders Trend",
      currentValue: currentOpenOrders,
      comparison: formatDelta(currentOpenOrders - previousOpenOrders),
      tagColor: currentOpenOrders > previousOpenOrders ? "red" : "green",
      note: "Shows whether fulfillment load is growing or easing.",
    },
    {
      key: "attention_trend",
      label: "Attention Load Trend",
      currentValue: currentAttention,
      comparison: formatDelta(currentAttention - previousAttention),
      tagColor: currentAttention > previousAttention ? "red" : "green",
      note: "Combines stock issues, order blockers, and expense follow-up.",
    },
  ];
}

function buildExportSummaryRows({
  products,
  currentOrders,
  previousOrders,
  currentPurchaseBatches,
  previousPurchaseBatches,
  currentExpenses,
  previousExpenses,
  formatMoney,
}) {
  const currentPurchaseSpend = currentPurchaseBatches.reduce(
    (sum, batch) => sum + Number(batch.grandTotal || 0),
    0,
  );
  const previousPurchaseSpend = previousPurchaseBatches.reduce(
    (sum, batch) => sum + Number(batch.grandTotal || 0),
    0,
  );
  const currentExpenseSpend = currentExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const previousExpenseSpend = previousExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const currentOpenOrders = currentOrders.filter(
    (order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
  ).length;
  const previousOpenOrders = previousOrders.filter(
    (order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
  ).length;
  const currentAttention = calculateAttentionItems(products, currentOrders, currentExpenses);
  const previousAttention = calculateAttentionItems(products, previousOrders, previousExpenses);
  const currentOverdueExpenses = currentExpenses.filter(
    (expense) =>
      expense.status === "recorded" && dayjs(expense.expenseDate).isBefore(TODAY, "day"),
  ).length;
  const previousOverdueExpenses = previousExpenses.filter(
    (expense) =>
      expense.status === "recorded" && dayjs(expense.expenseDate).isBefore(TODAY, "day"),
  ).length;
  const currentLowStock = products.filter(
    (product) => product.stockStatus === "Low Stock" || product.stockStatus === "Out of Stock",
  ).length;

  return [
    {
      key: "purchase_spend",
      metric: "Purchase Spend",
      currentValue: formatMoney(currentPurchaseSpend, ADMIN_SOURCE_CURRENCY),
      previousValue: formatMoney(previousPurchaseSpend, ADMIN_SOURCE_CURRENCY),
      delta: formatDelta(
        currentPurchaseSpend - previousPurchaseSpend,
        (value) => stripCurrencyPrefix(formatMoney(value, ADMIN_SOURCE_CURRENCY)),
      ),
      status: currentPurchaseSpend > previousPurchaseSpend ? "Higher" : "Stable or Lower",
      note: "Supplier batches and landed purchasing activity.",
    },
    {
      key: "expense_spend",
      metric: "Expense Spend",
      currentValue: formatMoney(currentExpenseSpend, ADMIN_SOURCE_CURRENCY),
      previousValue: formatMoney(previousExpenseSpend, ADMIN_SOURCE_CURRENCY),
      delta: formatDelta(
        currentExpenseSpend - previousExpenseSpend,
        (value) => stripCurrencyPrefix(formatMoney(value, ADMIN_SOURCE_CURRENCY)),
      ),
      status: currentExpenseSpend > previousExpenseSpend ? "Higher" : "Stable or Lower",
      note: "Tracked operating costs across modules.",
    },
    {
      key: "open_orders",
      metric: "Open Orders",
      currentValue: currentOpenOrders,
      previousValue: previousOpenOrders,
      delta: formatDelta(currentOpenOrders - previousOpenOrders),
      status: currentOpenOrders > previousOpenOrders ? "Rising" : "Stable or Lower",
      note: "Operational fulfillment load still in progress.",
    },
    {
      key: "attention_load",
      metric: "Attention Load",
      currentValue: currentAttention,
      previousValue: previousAttention,
      delta: formatDelta(currentAttention - previousAttention),
      status: currentAttention > previousAttention ? "Heavier" : "Stable or Lower",
      note: "Combined stock, order, and expense follow-up pressure.",
    },
    {
      key: "overdue_expenses",
      metric: "Overdue Expenses",
      currentValue: currentOverdueExpenses,
      previousValue: previousOverdueExpenses,
      delta: formatDelta(currentOverdueExpenses - previousOverdueExpenses),
      status:
        currentOverdueExpenses > previousOverdueExpenses ? "Worsening" : "Stable or Lower",
      note: "Recorded expenses still awaiting settlement after due date.",
    },
    {
      key: "stock_pressure",
      metric: "Low / Out of Stock Products",
      currentValue: currentLowStock,
      previousValue: currentLowStock,
      delta: "Live snapshot",
      status: currentLowStock ? "Needs Attention" : "Healthy",
      note: "Inventory reflects the current live product records.",
    },
  ];
}

export default function AdminReportsPage() {
  const { formatMoney } = useCurrency();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchaseBatches, setPurchaseBatches] = useState([]);
  const [reportPeriod, setReportPeriod] = useState("30d");
  const [customRange, setCustomRange] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [productResult, orderResult, purchaseResult] = await Promise.allSettled([
        getProducts({ admin: true, includeArchived: true }),
        getAllOrders(),
        getPurchaseBatches(),
      ]);

      if (!active) {
        return;
      }

      setProducts(productResult.status === "fulfilled" ? productResult.value : []);
      setOrders(orderResult.status === "fulfilled" ? orderResult.value : []);
      setPurchaseBatches(purchaseResult.status === "fulfilled" ? purchaseResult.value : []);
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const periodRange = useMemo(
    () => resolvePeriodRange(reportPeriod, customRange),
    [reportPeriod, customRange],
  );
  const previousPeriodRange = useMemo(
    () => resolvePreviousPeriodRange(periodRange),
    [periodRange],
  );
  const filteredOrders = useMemo(
    () => orders.filter((order) => isWithinRange(order.createdAt, periodRange)),
    [orders, periodRange],
  );
  const filteredPurchaseBatches = useMemo(
    () => purchaseBatches.filter((batch) => isWithinRange(batch.purchaseDate, periodRange)),
    [periodRange, purchaseBatches],
  );
  const filteredExpenses = useMemo(
    () => seedExpenses.filter((expense) => isWithinRange(expense.expenseDate, periodRange)),
    [periodRange],
  );
  const previousOrders = useMemo(
    () =>
      previousPeriodRange
        ? orders.filter((order) => isWithinRange(order.createdAt, previousPeriodRange))
        : [],
    [orders, previousPeriodRange],
  );
  const previousPurchaseBatches = useMemo(
    () =>
      previousPeriodRange
        ? purchaseBatches.filter((batch) => isWithinRange(batch.purchaseDate, previousPeriodRange))
        : [],
    [previousPeriodRange, purchaseBatches],
  );
  const previousExpenses = useMemo(
    () =>
      previousPeriodRange
        ? seedExpenses.filter((expense) => isWithinRange(expense.expenseDate, previousPeriodRange))
        : [],
    [previousPeriodRange],
  );

  const topStats = useMemo(
    () =>
      buildTopStats(products, filteredOrders, filteredPurchaseBatches, filteredExpenses, (value) =>
        formatMoney(value, ADMIN_SOURCE_CURRENCY),
      ),
    [products, filteredExpenses, filteredOrders, filteredPurchaseBatches, formatMoney],
  );
  const trendCards = useMemo(
    () =>
      buildTrendCards({
        products,
        currentOrders: filteredOrders,
        previousOrders,
        currentPurchaseBatches: filteredPurchaseBatches,
        previousPurchaseBatches,
        currentExpenses: filteredExpenses,
        previousExpenses,
        currentRange: periodRange,
        previousRange: previousPeriodRange,
        formatMoney,
      }),
    [
      filteredExpenses,
      filteredOrders,
      filteredPurchaseBatches,
      periodRange,
      previousExpenses,
      previousOrders,
      previousPeriodRange,
      previousPurchaseBatches,
      products,
      formatMoney,
    ],
  );
  const workflowRows = useMemo(
    () => buildWorkflowRows(products, filteredOrders, filteredPurchaseBatches, filteredExpenses),
    [products, filteredExpenses, filteredOrders, filteredPurchaseBatches],
  );
  const moduleSpend = useMemo(() => buildModuleSpend(filteredExpenses), [filteredExpenses]);
  const actionQueue = useMemo(
    () => buildActionQueue(products, filteredOrders, filteredPurchaseBatches, filteredExpenses),
    [products, filteredExpenses, filteredOrders, filteredPurchaseBatches],
  );
  const exportSummaryRows = useMemo(
    () =>
      buildExportSummaryRows({
        products,
        currentOrders: filteredOrders,
        previousOrders,
        currentPurchaseBatches: filteredPurchaseBatches,
        previousPurchaseBatches,
        currentExpenses: filteredExpenses,
        previousExpenses,
        formatMoney,
      }),
    [
      filteredExpenses,
      filteredOrders,
      filteredPurchaseBatches,
      previousExpenses,
      previousOrders,
      previousPurchaseBatches,
      products,
      formatMoney,
    ],
  );

  const handleExportCsv = () => {
    try {
      const csvContent = buildCsvContent({
        periodLabel: periodRange.label,
        previousPeriodLabel: previousPeriodRange?.label || "Comparison unavailable",
        summaryRows: exportSummaryRows,
        moduleRows: moduleSpend,
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `nuva-report-summary-${TODAY.format("YYYY-MM-DD")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      message.success("CSV summary exported.");
    } catch (error) {
      message.error("Unable to export the CSV summary right now.");
    }
  };

  return (
    <div className="catalog-admin-page">
      <Card
        className="catalog-admin-hero"
        bordered={false}
        title="Reports Workspace"
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Reporting now shows both the current window and how it compares with the previous one, so
          the team can tell whether spend and operational pressure are rising or settling.
        </Typography.Paragraph>
      </Card>

      <Card bordered={false} title="Reporting Period" extra={periodRange.label}>
        <div className="inventory-filter-grid">
          <Select
            value={reportPeriod}
            options={periodOptions}
            onChange={(value) => setReportPeriod(value)}
          />
          <DatePicker.RangePicker
            allowClear
            disabled={reportPeriod !== "custom"}
            value={customRange}
            onChange={(value) => setCustomRange(value)}
            style={{ width: "100%" }}
          />
        </div>
        <Typography.Paragraph style={{ marginBottom: 0, marginTop: 16 }}>
          Orders, purchases, and expenses respect the selected period. Inventory remains a live
          operational snapshot based on the latest product records.
        </Typography.Paragraph>
      </Card>

      <AdminKpiSection title="Reporting Overview" items={topStats} />

      <Card
        bordered={false}
        className="report-section-card"
        title="Period Trends"
        extra={
          previousPeriodRange
            ? `Compared with ${previousPeriodRange.label}`
            : "Comparison unavailable for full timeline"
        }
      >
        {trendCards.length ? (
          <section className="admin-insight-grid">
            {trendCards.map((card) => (
              <Card key={card.key} className="catalog-stat-card admin-insight-card" bordered={false}>
                <div className="catalog-stat-copy admin-insight-copy">
                  <span>{card.label}</span>
                  <strong>{card.currentValue}</strong>
                  <Tag color={card.tagColor}>{card.comparison}</Tag>
                  <Typography.Text type="secondary">{card.note}</Typography.Text>
                </div>
              </Card>
            ))}
          </section>
        ) : (
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Choose a bounded reporting period to compare this window with the previous one.
          </Typography.Paragraph>
        )}
      </Card>

      <Card
        bordered={false}
        title="Workspace Health Summary"
        extra="First operational reporting pass"
      >
        <Table
          rowKey="key"
          pagination={false}
          dataSource={workflowRows}
          columns={[
            { title: "Workspace", dataIndex: "workspace", key: "workspace", width: 140 },
            { title: "Summary", dataIndex: "summary", key: "summary" },
            {
              title: "Health",
              dataIndex: "health",
              key: "health",
              width: 160,
              render: (value) => (
                <Tag
                  color={
                    value === "Healthy" ||
                    value === "Aligned" ||
                    value === "Stable" ||
                    value === "Connected" ||
                    value === "Verified"
                      ? "green"
                      : "orange"
                  }
                >
                  {value}
                </Tag>
              ),
            },
            { title: "Next Action", dataIndex: "nextAction", key: "nextAction", width: 320 },
          ]}
        />
      </Card>

      <Card
        bordered={false}
        title="Month-End Summary Table"
        extra={
          <Space>
            <span>
              {previousPeriodRange
                ? `Current period vs ${previousPeriodRange.label}`
                : "Use a bounded period for full comparisons"}
            </span>
            <Button type="primary" onClick={handleExportCsv}>
              Export CSV
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="key"
          pagination={false}
          dataSource={exportSummaryRows}
          columns={[
            { title: "Metric", dataIndex: "metric", key: "metric", width: 220 },
            { title: "Current Period", dataIndex: "currentValue", key: "currentValue", width: 160 },
            { title: "Previous Period", dataIndex: "previousValue", key: "previousValue", width: 160 },
            {
              title: "Change",
              dataIndex: "delta",
              key: "delta",
              width: 160,
              render: (value) => <Tag color={String(value).startsWith("+") ? "red" : "green"}>{value}</Tag>,
            },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              width: 170,
              render: (value) => (
                <Tag
                  color={
                    value === "Healthy" || value === "Stable or Lower"
                      ? "green"
                      : value === "Needs Attention"
                        ? "orange"
                        : "red"
                  }
                >
                  {value}
                </Tag>
              ),
            },
            { title: "Reporting Note", dataIndex: "note", key: "note" },
          ]}
        />
      </Card>

      <Card bordered={false} title="Spend by Module" extra="Expense view carried into reporting">
        <div className="inventory-queue-list">
          {moduleSpend.map((module) => (
            <div className="inventory-queue-item" key={module.key}>
              <div className="inventory-queue-copy">
                <div className="inventory-queue-topline">
                  <strong>{formatModuleLabel(module.module)}</strong>
                  <Tag color="blue">{module.count} expense(s)</Tag>
                </div>
                <span>{formatMoney(module.total, ADMIN_SOURCE_CURRENCY)} currently tracked in this module.</span>
              </div>
            </div>
          ))}
          {!moduleSpend.length ? (
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              No expense records fall inside the selected reporting period.
            </Typography.Paragraph>
          ) : null}
        </div>
      </Card>

      <Card bordered={false} title="Cross-Module Action Queue" extra="What needs attention first">
        <div className="inventory-queue-list">
          {actionQueue.map((item) => (
            <div className="inventory-queue-item" key={item.key}>
              <div className="inventory-queue-copy">
                <div className="inventory-queue-topline">
                  <strong>
                    {item.area} / {item.label}
                  </strong>
                  <Space wrap>
                    <Tag color={item.color}>{item.state}</Tag>
                  </Space>
                </div>
                <span>{item.detail}</span>
                <p>{item.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
