import { useEffect, useMemo, useState } from "react";
import { Card, Select, Space, Table, Tag, Typography } from "antd";
import {
  CheckCircleOutlined,
  GiftOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  WarningOutlined
} from "@ant-design/icons";
import AdminKpiSection from "../../components/admin/AdminKpiSection";
import { getAllOrders, updateOrderStatus } from "../../services/orderService";
import { useCurrency } from "../../context/CurrencyContext";
import { getProducts } from "../../services/productService";
import "../../styles/adminCatalog.css";

const orderStatusOptions = ["placed", "processing", "shipped", "delivered", "cancelled"].map(
  (value) => ({ value, label: value })
);

function getPackagingOrderState(order, productMap) {
  const items = order.items || [];
  const linkedProducts = items
    .map((item) => productMap.get(item.productId))
    .filter(Boolean);

  if (!linkedProducts.length) {
    return {
      label: "Product Review Needed",
      color: "default",
      note: "One or more order items are not linked to a current product record."
    };
  }

  if (linkedProducts.some((product) => product.packagingCost <= 0)) {
    return {
      label: "Packaging Missing",
      color: "red",
      note: "At least one ordered product still has no packaging profile or cost saved."
    };
  }

  if (linkedProducts.some((product) => product.stockStatus === "Out of Stock")) {
    return {
      label: "Stock Conflict",
      color: "orange",
      note: "Packaging is known, but at least one ordered product is now out of stock."
    };
  }

  if (linkedProducts.some((product) => product.workflowStatus === "image_pending")) {
    return {
      label: "Packaging Review",
      color: "gold",
      note: "Product setup is not fully complete. Review packaging before dispatch."
    };
  }

  return {
    label: "Pack Ready",
    color: "green",
    note: "Every linked product has packaging cost and profile information available."
  };
}

function buildOrderStats(orders, productMap) {
  const enriched = orders.map((order) => getPackagingOrderState(order, productMap));
  const packagingMissingCount = enriched.filter((state) => state.label === "Packaging Missing").length;
  const reviewCount = enriched.filter((state) => state.label === "Packaging Review").length;
  const processingCount = orders.filter((order) => order.orderStatus === "processing").length;

  return [
    {
      key: "total",
      label: "Open Orders",
      value: orders.filter((order) => order.orderStatus !== "delivered" && order.orderStatus !== "cancelled").length,
      icon: <ShoppingCartOutlined />,
      tone: "total"
    },
    {
      key: "pack_ready",
      label: "Pack Ready",
      value: enriched.filter((state) => state.label === "Pack Ready").length,
      icon: <CheckCircleOutlined />,
      tone: "active"
    },
    {
      key: "packaging_missing",
      label: "Packaging Missing",
      value: packagingMissingCount,
      icon: <GiftOutlined />,
      tone: packagingMissingCount > 0 ? "out" : "active"
    },
    {
      key: "review",
      label: "Needs Review",
      value: reviewCount,
      icon: <WarningOutlined />,
      tone: reviewCount > 0 ? "low" : "total"
    },
    {
      key: "processing",
      label: "Processing",
      value: processingCount,
      icon: <InboxOutlined />,
      tone: processingCount > 0 ? "low" : "total"
    }
  ];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const { formatMoney: formatCurrency } = useCurrency();

  const loadOrders = async () => {
    const [orderData, productData] = await Promise.all([
      getAllOrders(),
      getProducts({ admin: true, includeArchived: true })
    ]);
    setOrders(orderData);
    setProducts(productData);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product._id, product])),
    [products]
  );

  const orderStats = useMemo(() => buildOrderStats(orders, productMap), [orders, productMap]);

  const orderQueue = useMemo(
    () =>
      orders
        .map((order) => ({
          ...order,
          packagingState: getPackagingOrderState(order, productMap)
        }))
        .filter(
          (order) =>
            order.orderStatus !== "delivered" &&
            order.orderStatus !== "cancelled" &&
            order.packagingState.label !== "Pack Ready"
        )
        .slice(0, 6),
    [orders, productMap]
  );

  const handleStatusChange = async (orderId, value) => {
    await updateOrderStatus(orderId, { orderStatus: value });
    await loadOrders();
  };

  const renderOrderItems = (order) => (
    <div className="inventory-history-panel">
      <div className="inventory-history-head">
        <strong>Packaging Handoff</strong>
        <span>{order.items?.length || 0} item(s) in this order</span>
      </div>
      <div className="inventory-history-list">
        {(order.items || []).map((item, index) => {
          const product = productMap.get(item.productId);
          return (
            <div className="inventory-history-item" key={`${order._id}-${item.productId}-${index}`}>
              <div className="inventory-history-topline">
                <strong>{item.name}</strong>
                <span className="tone-in">Qty {item.quantity}</span>
              </div>
              <div className="inventory-history-meta">
                <span>SKU: {product?.sku || "Not linked"}</span>
                <span>
                  Profile: {product?.packagingProfileLabel || "Not assigned"}
                </span>
                <span>
                  Cost: {product?.packagingCost > 0 ? formatCurrency(product.packagingCost) : "Not set"}
                </span>
              </div>
              <p>
                {product
                  ? getPackagingOrderState({ items: [item] }, productMap).note
                  : "Link this ordered item back to a product record before packing."}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="catalog-admin-page">
      <Card
        title="Customer Orders"
        className="nuva-card catalog-shell-card"
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Orders now surface packaging readiness directly from shared product records so the team can
          see whether each order is pack-ready, missing packaging data, or needs a quick review
          before dispatch.
        </Typography.Paragraph>
      </Card>

      <AdminKpiSection title="Order Status" items={orderStats} />

      <Card className="nuva-card catalog-shell-card" title="Orders Needing Packaging Attention">
        {orderQueue.length ? (
          <div className="inventory-queue-list">
            {orderQueue.map((order) => (
              <div className="inventory-queue-item" key={order._id}>
                <div className="inventory-queue-copy">
                  <div className="inventory-queue-topline">
                    <strong>{order._id}</strong>
                    <Tag color={order.packagingState.color}>{order.packagingState.label}</Tag>
                  </div>
                  <span>
                    {order.address?.fullName || "Customer"} - {order.items?.length || 0} item(s) -{" "}
                    {formatCurrency(order.totalAmount, order.currency || "AED")}
                  </span>
                  <p>{order.packagingState.note}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            No open orders currently need packaging follow-up.
          </Typography.Paragraph>
        )}
      </Card>

      <Card className="nuva-card catalog-table-card">
        <Table
          rowKey="_id"
          dataSource={orders.map((order) => ({
            ...order,
            packagingState: getPackagingOrderState(order, productMap)
          }))}
          expandable={{
            expandedRowRender: renderOrderItems,
            rowExpandable: (record) => Boolean(record.items?.length)
          }}
          columns={[
            { title: "Order ID", dataIndex: "_id", width: 220 },
            {
              title: "Customer",
              width: 180,
              render: (_, record) => record.address?.fullName || "Customer"
            },
            {
              title: "Amount",
              width: 120,
              dataIndex: "totalAmount",
              render: (value, record) => formatCurrency(value, record.currency || "AED")
            },
            {
              title: "Payment",
              width: 120,
              dataIndex: "paymentStatus",
              render: (value) => <Tag color={value === "paid" ? "green" : "orange"}>{value}</Tag>
            },
            {
              title: "Packaging Handoff",
              width: 200,
              render: (_, record) => (
                <div className="inventory-link-cell">
                  <strong>{record.packagingState.label}</strong>
                  <span>{record.packagingState.note}</span>
                </div>
              )
            },
            {
              title: "Order Status",
              width: 220,
              render: (_, record) => (
                <Space>
                  <Tag color="gold">{record.orderStatus}</Tag>
                  <Select
                    size="small"
                    value={record.orderStatus}
                    onChange={(value) => handleStatusChange(record._id, value)}
                    options={orderStatusOptions}
                    style={{ width: 140 }}
                  />
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
