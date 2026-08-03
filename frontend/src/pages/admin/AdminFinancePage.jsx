import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Tooltip, Typography, message } from "antd";
import {
  DollarOutlined,
  FileTextOutlined,
  RiseOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
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
const defaultFinanceFilters = {
  orderSearch: "",
  orderConfidence: "all",
  orderRanking: "margin_desc",
  productSearch: "",
  productState: "all",
  productRanking: "risk_first",
};

const ADMIN_SOURCE_CURRENCY = "INR";
const ORDER_CONFIDENCE_META = {
  "Margin Ready": {
    shortLabel: "Profit Calculated",
    tooltip: "This order has enough cost details to show a basic profit estimate.",
    color: "green",
  },
  "Partial Costing": {
    shortLabel: "Some Costs Missing",
    tooltip: "This order is missing some cost details, so the profit estimate is incomplete.",
    color: "orange",
  },
  "Link Missing": {
    shortLabel: "Product Not Connected",
    tooltip: "One or more items in this order are not connected to a product yet.",
    color: "red",
  },
};

const PRODUCT_MARGIN_META = {
  "Cost Missing": {
    shortLabel: "Purchase Cost Missing",
    tooltip: "The product does not have a purchase cost yet, so profit cannot be calculated correctly.",
    color: "red",
  },
  "Packaging Missing": {
    shortLabel: "Packaging Cost Missing",
    tooltip: "The packaging cost is missing, so the product profit may look higher than it really is.",
    color: "orange",
  },
  "Margin At Risk": {
    shortLabel: "Possible Loss",
    tooltip: "This product may lose money after costs are included.",
    color: "red",
  },
  "Thin Margin": {
    shortLabel: "Low Profit",
    tooltip: "This product still makes money, but only a small amount.",
    color: "gold",
  },
  Healthy: {
    shortLabel: "Good Profit",
    tooltip: "This product currently shows a healthy profit after costs.",
    color: "green",
  },
};

function renderFinanceStatusTag(label, metaMap) {
  const meta = metaMap[label];

  if (!meta) {
    return <Tag>{label}</Tag>;
  }

  return (
    <Tooltip title={meta.tooltip}>
      <Tag color={meta.color}>{meta.shortLabel}</Tag>
    </Tooltip>
  );
}

function escapeCsvValue(value) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function getPackagingOrderState(order, productMap) {
  const linkedProducts = (order.items || [])
    .map((item) => productMap.get(item.productId))
    .filter(Boolean);

  if (!linkedProducts.length) {
    return { label: "Product Review Needed", color: "default", priority: 70 };
  }

  if (linkedProducts.some((product) => Number(product.packagingCost || 0) <= 0)) {
    return { label: "Packaging Missing", color: "red", priority: 95 };
  }

  if (linkedProducts.some((product) => product.stockStatus === "Out of Stock")) {
    return { label: "Stock Conflict", color: "orange", priority: 90 };
  }

  return { label: "Pack Ready", color: "green", priority: 0 };
}

function getLatestPurchaseCostMap(purchaseBatches) {
  const sortedBatches = [...purchaseBatches].sort(
    (left, right) =>
      new Date(right.purchaseDate || 0).getTime() - new Date(left.purchaseDate || 0).getTime(),
  );
  const costMap = new Map();

  sortedBatches.forEach((batch) => {
    (batch.items || []).forEach((item) => {
      if (!item.productId || costMap.has(item.productId)) {
        return;
      }

      const quantity = Number(item.quantity || 0);
      const landedTotal =
        Number(item.totalPurchaseCost || 0) + Number(item.allocatedSharedExpense || 0);
      const landedUnitCost =
        quantity > 0
          ? landedTotal / quantity
          : Number(item.unitCost || 0) + Number(item.manualAllocatedSharedExpense || 0);

      costMap.set(item.productId, {
        landedUnitCost,
        source: batch.invoiceNumber || batch._id || "purchase batch",
        purchaseDate: batch.purchaseDate || null,
      });
    });
  });

  return costMap;
}

function getProductUnitCost(product, purchaseCostMap) {
  const purchaseCost = purchaseCostMap.get(product._id);

  if (purchaseCost?.landedUnitCost > 0) {
    return {
      value: purchaseCost.landedUnitCost,
      confidence: "linked_batch",
      source: purchaseCost.source,
    };
  }

  if (Number(product.totalProductCost || 0) > 0) {
    return {
      value: Number(product.totalProductCost || 0),
      confidence: "product_record",
      source: "product record",
    };
  }

  if (Number(product.purchaseUnitCost || 0) > 0) {
    return {
      value: Number(product.purchaseUnitCost || 0),
      confidence: "purchase_unit",
      source: "product purchase unit cost",
    };
  }

  return {
    value: 0,
    confidence: "missing",
    source: "missing cost link",
  };
}

function buildFinanceSummary(products, orders, purchaseBatches, expenses) {
  const productMap = new Map(products.map((product) => [product._id, product]));
  const purchaseCostMap = getLatestPurchaseCostMap(purchaseBatches);
  const orderRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const purchaseSpend = purchaseBatches.reduce(
    (sum, batch) => sum + Number(batch.grandTotal || 0),
    0,
  );
  const operatingExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const packagingReserve = orders.reduce((sum, order) => {
    const lineReserve = (order.items || []).reduce((itemSum, item) => {
      const product = productMap.get(item.productId);
      return itemSum + Number(product?.packagingCost || 0) * Number(item.quantity || 0);
    }, 0);
    return sum + lineReserve;
  }, 0);
  const productCostReserve = orders.reduce((sum, order) => {
    const lineCost = (order.items || []).reduce((itemSum, item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        return itemSum;
      }

      const cost = getProductUnitCost(product, purchaseCostMap);
      return itemSum + cost.value * Number(item.quantity || 0);
    }, 0);
    return sum + lineCost;
  }, 0);
  const estimatedMargin =
    orderRevenue - purchaseSpend - operatingExpense - packagingReserve - productCostReserve;

  return {
    orderRevenue,
    purchaseSpend,
    operatingExpense,
    packagingReserve,
    productCostReserve,
    estimatedMargin,
    openOrders: orders.filter(
      (order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled",
    ).length,
  };
}

function buildFinanceStats(summary, formatMoney) {
  return [
    {
      key: "revenue",
      label: "Order Revenue",
      value: formatMoney(summary.orderRevenue, ADMIN_SOURCE_CURRENCY),
      icon: <ShoppingCartOutlined />,
      tone: "active",
    },
    {
      key: "purchases",
      label: "Purchase Spend",
      value: formatMoney(summary.purchaseSpend, ADMIN_SOURCE_CURRENCY),
      icon: <DollarOutlined />,
      tone: "total",
    },
    {
      key: "expenses",
      label: "Operating Expenses",
      value: formatMoney(summary.operatingExpense, ADMIN_SOURCE_CURRENCY),
      icon: <FileTextOutlined />,
      tone: "total",
    },
    {
      key: "product_cost",
      label: "Product Cost Reserve",
      value: formatMoney(summary.productCostReserve, ADMIN_SOURCE_CURRENCY),
      icon: <WarningOutlined />,
      tone: "total",
    },
    {
      key: "margin",
      label: "Estimated Margin",
      value: formatMoney(summary.estimatedMargin, ADMIN_SOURCE_CURRENCY),
      icon: <RiseOutlined />,
      tone: summary.estimatedMargin >= 0 ? "active" : "out",
    },
  ];
}

function buildMarginBridge(summary) {
  return [
    {
      key: "revenue",
      lineItem: "Order Revenue",
      amount: summary.orderRevenue,
      direction: "positive",
      note: "Total order value currently visible to the business.",
    },
    {
      key: "purchases",
      lineItem: "Purchase Spend",
      amount: summary.purchaseSpend,
      direction: "negative",
      note: "Supplier batch cost and landed purchasing activity.",
    },
    {
      key: "expenses",
      lineItem: "Operating Expenses",
      amount: summary.operatingExpense,
      direction: "negative",
      note: "Tracked delivery, operations, supplier, and marketing costs.",
    },
    {
      key: "packaging",
      lineItem: "Packaging Reserve",
      amount: summary.packagingReserve,
      direction: "negative",
      note: "Packaging cost expected from currently recorded orders.",
    },
    {
      key: "product_cost",
      lineItem: "Product Cost Reserve",
      amount: summary.productCostReserve,
      direction: "negative",
      note: "Estimated product cost carried by linked items in active orders.",
    },
    {
      key: "margin",
      lineItem: "Estimated Operating Margin",
      amount: summary.estimatedMargin,
      direction: summary.estimatedMargin >= 0 ? "positive" : "negative",
      note: "Current lightweight view before deeper profit accounting.",
    },
  ];
}

function buildOrderProfitabilityRows(orders, products, purchaseBatches) {
  const productMap = new Map(products.map((product) => [product._id, product]));
  const purchaseCostMap = getLatestPurchaseCostMap(purchaseBatches);

  return orders.map((order) => {
    const items = order.items || [];
    const revenue =
      items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ) || Number(order.totalAmount || 0);

    let packagingReserve = 0;
    let productCostReserve = 0;
    let linkedCount = 0;
    let costedCount = 0;
    let packagingCount = 0;

    items.forEach((item) => {
      const product = productMap.get(item.productId);
      const quantity = Number(item.quantity || 0);

      if (!product) {
        return;
      }

      linkedCount += 1;

      if (Number(product.packagingCost || 0) > 0) {
        packagingReserve += Number(product.packagingCost || 0) * quantity;
        packagingCount += 1;
      }

      const cost = getProductUnitCost(product, purchaseCostMap);
      if (cost.value > 0) {
        productCostReserve += cost.value * quantity;
        costedCount += 1;
      }
    });

    const estimatedMargin = revenue - packagingReserve - productCostReserve;
    const missingLinks = items.length - linkedCount;
    const missingCosts = linkedCount - costedCount;
    const missingPackaging = linkedCount - packagingCount;
    const riskScore =
      (missingLinks > 0 ? 100 : 0) +
      (missingCosts > 0 ? 80 : 0) +
      (missingPackaging > 0 ? 60 : 0) +
      (estimatedMargin <= 0 ? 40 : 0);

    let confidenceLabel = "Margin Ready";
    let confidenceColor = "green";

    if (missingLinks > 0) {
      confidenceLabel = "Link Missing";
      confidenceColor = "red";
    } else if (missingCosts > 0 || missingPackaging > 0) {
      confidenceLabel = "Partial Costing";
      confidenceColor = "orange";
    }

    return {
      key: order._id,
      orderId: order._id,
      customer: order.address?.fullName || "Customer",
      revenue,
      packagingReserve,
      productCostReserve,
      estimatedMargin,
      confidenceLabel,
      confidenceColor,
      riskScore,
      costingCoverage: `${costedCount}/${linkedCount || items.length} costed`,
      packagingCoverage: `${packagingCount}/${linkedCount || items.length} packaging set`,
      note:
        missingLinks > 0
          ? "One or more items are not linked to current products."
          : missingCosts > 0
            ? "Some linked items still have no trusted cost source."
            : missingPackaging > 0
              ? "Packaging cost is still missing on some linked items."
              : "Order has enough linkage for a lightweight profitability signal.",
    };
  });
}

function buildProductProfitabilityRows(products, purchaseBatches) {
  const purchaseCostMap = getLatestPurchaseCostMap(purchaseBatches);

  return products.map((product) => {
    const salePrice = Number(product.salePrice || product.price || 0);
    const cost = getProductUnitCost(product, purchaseCostMap);
    const packagingCost = Number(product.packagingCost || 0);
    const estimatedUnitMargin = salePrice - cost.value - packagingCost;

    let marginState = "Healthy";
    let marginColor = "green";
    let riskScore = 10;

    if (cost.confidence === "missing") {
      marginState = "Cost Missing";
      marginColor = "red";
      riskScore = 100;
    } else if (packagingCost <= 0) {
      marginState = "Packaging Missing";
      marginColor = "orange";
      riskScore = 80;
    } else if (estimatedUnitMargin <= 0) {
      marginState = "Margin At Risk";
      marginColor = "red";
      riskScore = 90;
    } else if (estimatedUnitMargin < salePrice * 0.2) {
      marginState = "Thin Margin";
      marginColor = "gold";
      riskScore = 60;
    }

    return {
      key: product._id,
      productName: product.displayName,
      sku: product.sku || "No SKU",
      sellingPrice: salePrice,
      unitCost: cost.value,
      packagingCost,
      estimatedUnitMargin,
      marginState,
      marginColor,
      riskScore,
      source: cost.source,
    };
  });
}

function buildOrderConfidenceBuckets(orderRows) {
  const bucketMap = new Map([
    ["Margin Ready", { key: "ready", label: "Margin Ready", color: "green", orders: 0, revenue: 0 }],
    ["Partial Costing", { key: "partial", label: "Partial Costing", color: "orange", orders: 0, revenue: 0 }],
    ["Link Missing", { key: "missing", label: "Link Missing", color: "red", orders: 0, revenue: 0 }],
  ]);

  orderRows.forEach((row) => {
    const bucket = bucketMap.get(row.confidenceLabel);
    if (!bucket) {
      return;
    }

    bucket.orders += 1;
    bucket.revenue += Number(row.revenue || 0);
  });

  return Array.from(bucketMap.values());
}

function buildProductRiskBuckets(productRows) {
  const bucketMap = new Map([
    ["Cost Missing", { key: "cost_missing", label: "Cost Missing", color: "red", products: 0, potentialValue: 0 }],
    ["Packaging Missing", { key: "packaging_missing", label: "Packaging Missing", color: "orange", products: 0, potentialValue: 0 }],
    ["Margin At Risk", { key: "margin_risk", label: "Margin At Risk", color: "red", products: 0, potentialValue: 0 }],
    ["Thin Margin", { key: "thin_margin", label: "Thin Margin", color: "gold", products: 0, potentialValue: 0 }],
    ["Healthy", { key: "healthy", label: "Healthy", color: "green", products: 0, potentialValue: 0 }],
  ]);

  productRows.forEach((row) => {
    const bucket = bucketMap.get(row.marginState);
    if (!bucket) {
      return;
    }

    bucket.products += 1;
    bucket.potentialValue += Number(row.sellingPrice || 0);
  });

  return Array.from(bucketMap.values());
}

function buildFinanceBucketSummaryRows(orderBuckets, productBuckets) {
  const orderRows = orderBuckets.map((bucket) => ({
    key: `order-${bucket.key}`,
    area: "Orders",
    bucket: bucket.label,
    count: bucket.orders,
    exposure: bucket.revenue,
    interpretation: "Revenue exposure by order-confidence bucket.",
    color: bucket.color,
  }));

  const productRows = productBuckets.map((bucket) => ({
    key: `product-${bucket.key}`,
    area: "Products",
    bucket: bucket.label,
    count: bucket.products,
    exposure: bucket.potentialValue,
    interpretation: "Selling-price exposure by product-risk bucket.",
    color: bucket.color,
  }));

  return [...orderRows, ...productRows];
}

function buildFinanceBucketCsv(summaryRows) {
  const header = ["Area", "Bucket", "Record Count", "Exposure Value", "Interpretation"];
  const rows = summaryRows.map((row) =>
    [row.area, row.bucket, row.count, Number(row.exposure || 0).toFixed(2), row.interpretation]
      .map(escapeCsvValue)
      .join(","),
  );

  return [header.map(escapeCsvValue).join(","), ...rows].join("\n");
}

function buildFinanceAlerts(products, orders, purchaseBatches, expenses) {
  const productMap = new Map(products.map((product) => [product._id, product]));
  const orderAlerts = orders
    .map((order) => {
      const state = getPackagingOrderState(order, productMap);
      return {
        key: `order-${order._id}`,
        area: "Orders",
        label: order._id,
        state: state.label,
        detail: order.address?.fullName || "Customer",
        recommendation:
          "Clear packaging and stock blockers before using this order in margin review.",
        priority: state.priority,
        color: state.color,
      };
    })
    .filter((item) => item.priority > 0);

  const purchaseAlerts = purchaseBatches
    .filter((batch) => (batch.items || []).some((item) => !item.productId))
    .map((batch) => ({
      key: `batch-${batch._id}`,
      area: "Purchases",
      label: batch.invoiceNumber || batch._id,
      state: "Unlinked Items",
      detail: `${(batch.items || []).filter((item) => !item.productId).length} items not linked to products`,
      recommendation: "Link these items back to products so cost attribution stays reliable.",
      priority: 75,
      color: "gold",
    }));

  const expenseAlerts = expenses
    .filter(
      (expense) =>
        expense.status === "recorded" && dayjs(expense.expenseDate).isBefore(TODAY, "day"),
    )
    .map((expense) => ({
      key: `expense-${expense.id}`,
      area: "Expenses",
      label: expense.title,
      state: "Overdue Payment",
      detail: expense.linkedReference,
      recommendation:
        "Close the payment gap so margin reporting is not carrying unsettled costs.",
      priority: 90,
      color: "red",
    }));

  const packagingGaps = products
    .filter((product) => Number(product.packagingCost || 0) <= 0)
    .map((product) => ({
      key: `product-${product._id}`,
      area: "Packaging",
      label: product.displayName,
      state: "Cost Missing",
      detail: product.sku || "No SKU",
      recommendation: "Set packaging cost so order margin is not understated.",
      priority: 80,
      color: "orange",
    }));

  return [...orderAlerts, ...purchaseAlerts, ...expenseAlerts, ...packagingGaps]
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 8);
}

export default function AdminFinancePage() {
  const { formatMoney } = useCurrency();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchaseBatches, setPurchaseBatches] = useState([]);
  const [filters, setFilters] = useState(defaultFinanceFilters);

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

  const financeSummary = useMemo(
    () => buildFinanceSummary(products, orders, purchaseBatches, seedExpenses),
    [orders, products, purchaseBatches],
  );
  const financeStats = useMemo(
    () => buildFinanceStats(financeSummary, (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY)),
    [financeSummary, formatMoney],
  );
  const marginBridge = useMemo(() => buildMarginBridge(financeSummary), [financeSummary]);
  const orderProfitability = useMemo(
    () => buildOrderProfitabilityRows(orders, products, purchaseBatches),
    [orders, products, purchaseBatches],
  );
  const productProfitability = useMemo(
    () => buildProductProfitabilityRows(products, purchaseBatches),
    [products, purchaseBatches],
  );
  const orderConfidenceBuckets = useMemo(
    () => buildOrderConfidenceBuckets(orderProfitability),
    [orderProfitability],
  );
  const productRiskBuckets = useMemo(
    () => buildProductRiskBuckets(productProfitability),
    [productProfitability],
  );
  const financeBucketSummary = useMemo(
    () => buildFinanceBucketSummaryRows(orderConfidenceBuckets, productRiskBuckets),
    [orderConfidenceBuckets, productRiskBuckets],
  );
  const filteredOrders = useMemo(() => {
    const search = filters.orderSearch.trim().toLowerCase();

    const rows = orderProfitability.filter((row) => {
      const matchesSearch =
        !search ||
        [row.orderId, row.customer, row.note].join(" ").toLowerCase().includes(search);
      const matchesConfidence =
        filters.orderConfidence === "all" || row.confidenceLabel === filters.orderConfidence;
      return matchesSearch && matchesConfidence;
    });

    if (filters.orderRanking === "risk_first") {
      return [...rows].sort(
        (left, right) => right.riskScore - left.riskScore || left.estimatedMargin - right.estimatedMargin,
      );
    }

    if (filters.orderRanking === "value_desc") {
      return [...rows].sort((left, right) => right.revenue - left.revenue);
    }

    if (filters.orderRanking === "margin_asc") {
      return [...rows].sort((left, right) => left.estimatedMargin - right.estimatedMargin);
    }

    return [...rows].sort((left, right) => right.estimatedMargin - left.estimatedMargin);
  }, [filters.orderConfidence, filters.orderRanking, filters.orderSearch, orderProfitability]);
  const filteredProducts = useMemo(() => {
    const search = filters.productSearch.trim().toLowerCase();

    const rows = productProfitability.filter((row) => {
      const matchesSearch =
        !search ||
        [row.productName, row.sku, row.source].join(" ").toLowerCase().includes(search);
      const matchesState =
        filters.productState === "all" || row.marginState === filters.productState;
      return matchesSearch && matchesState;
    });

    if (filters.productRanking === "margin_low") {
      return [...rows].sort((left, right) => left.estimatedUnitMargin - right.estimatedUnitMargin);
    }

    if (filters.productRanking === "value_desc") {
      return [...rows].sort((left, right) => right.sellingPrice - left.sellingPrice);
    }

    return [...rows].sort(
      (left, right) => right.riskScore - left.riskScore || left.estimatedUnitMargin - right.estimatedUnitMargin,
    );
  }, [filters.productRanking, filters.productSearch, filters.productState, productProfitability]);
  const financeAlerts = useMemo(
    () => buildFinanceAlerts(products, orders, purchaseBatches, seedExpenses),
    [orders, products, purchaseBatches],
  );

  const handleExportFinanceBuckets = () => {
    try {
      const csvContent = buildFinanceBucketCsv(financeBucketSummary);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `nuva-finance-buckets-${TODAY.format("YYYY-MM-DD")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      message.success("Finance bucket summary exported.");
    } catch (error) {
      message.error("Unable to export the finance bucket summary right now.");
    }
  };

  return (
    <div className="catalog-admin-page finance-page">
      <Card
        className="catalog-admin-hero finance-hero-card"
        bordered={false}
        title="Finance Workspace"
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Review revenue, product costs, packaging costs, and profit signals in one organized
          workspace with cleaner status tracking and follow-up priorities.
        </Typography.Paragraph>
      </Card>

      <AdminKpiSection title="Financial Overview" items={financeStats} className="finance-section-card" />

      <Card
        className="finance-section-card"
        bordered={false}
        title="Finance Confidence Snapshot"
        extra="Revenue and product exposure by bucket"
      >
        <section className="finance-snapshot-grid">
          {orderConfidenceBuckets.map((bucket) => (
            <Card key={bucket.key} className="catalog-stat-card finance-snapshot-card" bordered={false}>
              <div className="catalog-stat-copy finance-snapshot-copy">
                <span>{ORDER_CONFIDENCE_META[bucket.label]?.shortLabel || bucket.label}</span>
                <strong>{formatMoney(bucket.revenue, ADMIN_SOURCE_CURRENCY)}</strong>
                <Tag color={bucket.color}>{bucket.orders} order(s)</Tag>
                <Typography.Text type="secondary">
                  {ORDER_CONFIDENCE_META[bucket.label]?.tooltip || "Revenue currently sitting inside this group."}
                </Typography.Text>
              </div>
            </Card>
          ))}
        </section>
        <section className="finance-snapshot-grid finance-snapshot-grid-secondary">
          {productRiskBuckets.map((bucket) => (
            <Card key={bucket.key} className="catalog-stat-card finance-snapshot-card" bordered={false}>
              <div className="catalog-stat-copy finance-snapshot-copy">
                <span>{PRODUCT_MARGIN_META[bucket.label]?.shortLabel || bucket.label}</span>
                <strong>{bucket.products}</strong>
                <Tag color={bucket.color}>{formatMoney(bucket.potentialValue, ADMIN_SOURCE_CURRENCY)}</Tag>
                <Typography.Text type="secondary">
                  {PRODUCT_MARGIN_META[bucket.label]?.tooltip || "Selling-price exposure currently sitting in this group."}
                </Typography.Text>
              </div>
            </Card>
          ))}
        </section>
      </Card>

      <Card
        className="finance-section-card"
        bordered={false}
        title="Finance Quality Summary"
        extra={
          <Button type="primary" onClick={handleExportFinanceBuckets}>
            Export Finance CSV
          </Button>
        }
      >
        <Table
          rowKey="key"
          pagination={false}
          dataSource={financeBucketSummary}
          columns={[
            { title: "Area", dataIndex: "area", key: "area", width: 120 },
            {
              title: "Bucket",
              key: "bucket",
              width: 180,
              render: (_, record) =>
                record.area === "Orders"
                  ? renderFinanceStatusTag(record.bucket, ORDER_CONFIDENCE_META)
                  : renderFinanceStatusTag(record.bucket, PRODUCT_MARGIN_META),
            },
            { title: "Records", dataIndex: "count", key: "count", width: 120 },
            {
              title: "Exposure",
              dataIndex: "exposure",
              key: "exposure",
              width: 160,
              render: (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY),
            },
            { title: "Interpretation", dataIndex: "interpretation", key: "interpretation" },
          ]}
        />
      </Card>

      <Card
        className="finance-section-card"
        bordered={false}
        title="Margin Bridge"
        extra={`${financeSummary.openOrders} open orders currently influencing operations`}
      >
        <Table
          rowKey="key"
          pagination={false}
          dataSource={marginBridge}
          columns={[
            { title: "Line Item", dataIndex: "lineItem", key: "lineItem", width: 220 },
            {
              title: "Direction",
              dataIndex: "direction",
              key: "direction",
              width: 140,
              render: (value) => (
                <Tag color={value === "positive" ? "green" : "red"}>
                  {value === "positive" ? "Adds Value" : "Reduces Value"}
                </Tag>
              ),
            },
            {
              title: "Amount",
              dataIndex: "amount",
              key: "amount",
              width: 180,
              render: (value, record) =>
                `${record.direction === "negative" ? "-" : ""}${formatMoney(Math.abs(value), ADMIN_SOURCE_CURRENCY)}`,
            },
            { title: "Note", dataIndex: "note", key: "note" },
          ]}
        />
      </Card>

      <Card
        className="finance-section-card"
        bordered={false}
        title="Order Profitability"
        extra={`${filteredOrders.length} order records after filtering`}
      >
        <div className="inventory-filter-grid" style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search order, customer, or note"
            value={filters.orderSearch}
            onChange={(event) =>
              setFilters((current) => ({ ...current, orderSearch: event.target.value }))
            }
          />
          <Select
            value={filters.orderConfidence}
            onChange={(value) =>
              setFilters((current) => ({ ...current, orderConfidence: value }))
            }
            options={[
              { label: "All confidence states", value: "all" },
              { label: "Profit Calculated", value: "Margin Ready" },
              { label: "Some Costs Missing", value: "Partial Costing" },
              { label: "Product Not Connected", value: "Link Missing" },
            ]}
          />
          <Select
            value={filters.orderRanking}
            onChange={(value) =>
              setFilters((current) => ({ ...current, orderRanking: value }))
            }
            options={[
              { label: "Highest Margin First", value: "margin_desc" },
              { label: "Lowest Margin First", value: "margin_asc" },
              { label: "Highest Risk First", value: "risk_first" },
              { label: "Highest Revenue First", value: "value_desc" },
            ]}
          />
        </div>

        <Table
          rowKey="key"
          pagination={{ pageSize: 6 }}
          dataSource={filteredOrders}
          columns={[
            {
              title: "Order",
              key: "order",
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>{record.orderId}</strong>
                  <span>{record.customer}</span>
                </div>
              ),
            },
            {
              title: "Status",
              key: "confidence",
              width: 160,
              render: (_, record) => renderFinanceStatusTag(record.confidenceLabel, ORDER_CONFIDENCE_META),
            },
            {
              title: "Revenue",
              dataIndex: "revenue",
              key: "revenue",
              width: 140,
              render: (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY),
            },
            {
              title: "Product Cost",
              dataIndex: "productCostReserve",
              key: "productCostReserve",
              width: 140,
              render: (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY),
            },
            {
              title: "Packaging",
              dataIndex: "packagingReserve",
              key: "packagingReserve",
              width: 140,
              render: (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY),
            },
            {
              title: "Estimated Margin",
              dataIndex: "estimatedMargin",
              key: "estimatedMargin",
              width: 160,
              render: (value) => (
                <Tag color={value >= 0 ? "green" : "red"}>{formatMoney(value, ADMIN_SOURCE_CURRENCY)}</Tag>
              ),
            },
            {
              title: "Coverage",
              key: "coverage",
              width: 200,
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>{record.costingCoverage}</strong>
                  <span>{record.packagingCoverage}</span>
                </div>
              ),
            },
            { title: "Note", dataIndex: "note", key: "note" },
          ]}
        />
      </Card>

      <Card
        className="finance-section-card"
        bordered={false}
        title="Product Margin Watchlist"
        extra={`${filteredProducts.length} product records after filtering`}
      >
        <div className="inventory-filter-grid" style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search product, SKU, or source"
            value={filters.productSearch}
            onChange={(event) =>
              setFilters((current) => ({ ...current, productSearch: event.target.value }))
            }
          />
          <Select
            value={filters.productState}
            onChange={(value) =>
              setFilters((current) => ({ ...current, productState: value }))
            }
            options={[
              { label: "All product states", value: "all" },
              { label: "Purchase Cost Missing", value: "Cost Missing" },
              { label: "Packaging Cost Missing", value: "Packaging Missing" },
              { label: "Possible Loss", value: "Margin At Risk" },
              { label: "Low Profit", value: "Thin Margin" },
              { label: "Good Profit", value: "Healthy" },
            ]}
          />
          <Select
            value={filters.productRanking}
            onChange={(value) =>
              setFilters((current) => ({ ...current, productRanking: value }))
            }
            options={[
              { label: "Highest Risk First", value: "risk_first" },
              { label: "Lowest Margin First", value: "margin_low" },
              { label: "Highest Selling Price", value: "value_desc" },
            ]}
          />
        </div>

        <Table
          rowKey="key"
          pagination={{ pageSize: 8 }}
          dataSource={filteredProducts}
          columns={[
            {
              title: "Product",
              key: "product",
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>{record.productName}</strong>
                  <span>{record.sku}</span>
                </div>
              ),
            },
            {
              title: "Profit Status",
              key: "marginState",
              width: 160,
              render: (_, record) => renderFinanceStatusTag(record.marginState, PRODUCT_MARGIN_META),
            },
            {
              title: "Selling Price",
              dataIndex: "sellingPrice",
              key: "sellingPrice",
              width: 140,
              render: (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY),
            },
            {
              title: "Unit Cost",
              dataIndex: "unitCost",
              key: "unitCost",
              width: 140,
              render: (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY),
            },
            {
              title: "Packaging",
              dataIndex: "packagingCost",
              key: "packagingCost",
              width: 140,
              render: (value) => formatMoney(value, ADMIN_SOURCE_CURRENCY),
            },
            {
              title: "Est. Unit Margin",
              dataIndex: "estimatedUnitMargin",
              key: "estimatedUnitMargin",
              width: 160,
              render: (value) => (
                <Tag color={value > 0 ? "green" : "red"}>{formatMoney(value, ADMIN_SOURCE_CURRENCY)}</Tag>
              ),
            },
            {
              title: "Cost Source",
              dataIndex: "source",
              key: "source",
            },
          ]}
        />
      </Card>

      <Card
        className="finance-section-card"
        bordered={false}
        title="Finance Follow-Up Queue"
        extra="Fix these first to make margin signals more trustworthy"
      >
        <div className="inventory-queue-list">
          {financeAlerts.map((item) => (
            <div className="inventory-queue-item" key={item.key}>
              <div className="inventory-queue-copy">
                <div className="inventory-queue-topline">
                  <strong>{`${item.area} - ${item.label}`}</strong>
                  <Space wrap>
                    <Tag color={item.color}>{item.state}</Tag>
                  </Space>
                </div>
                <span>{item.detail}</span>
                <p>{item.recommendation}</p>
              </div>
            </div>
          ))}
          {!financeAlerts.length ? (
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              No urgent finance cleanup items are currently blocking this view.
            </Typography.Paragraph>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
