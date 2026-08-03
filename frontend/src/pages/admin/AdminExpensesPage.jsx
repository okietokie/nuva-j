import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AuditOutlined,
  BulbOutlined,
  CarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  ReadOutlined,
  SearchOutlined,
  ShopOutlined,
  TagOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useCurrency } from "../../context/CurrencyContext";
import {
  expenseCategoryOptions,
  expenseModuleOptions,
  expenseStatusOptions,
  seedExpenses,
} from "../../data/adminExpenseSeed";
import "../../styles/adminCatalog.css";

const TODAY = dayjs("2026-07-29");

const defaultFilters = {
  search: "",
  category: "all",
  status: "all",
  module: "all",
};

const expenseTutorialFlow = [
  {
    key: "plan",
    title: "Plan",
    badge: "Step 1",
    tone: "sand",
    note: "Use Planned when you know this cost is coming, but it is not done yet.",
    example: "Example: INR 450 for the August campaign launch.",
  },
  {
    key: "record",
    title: "Record",
    badge: "Step 2",
    tone: "amber",
    note: "Use Recorded when the cost is real and still needs follow-up.",
    example: "Example: Courier wallet recharge for order delivery.",
  },
  {
    key: "approve",
    title: "Approve",
    badge: "Step 3",
    tone: "ink",
    note: "Add who approved it and when.",
    example: "Example: Approved by Fulfillment Lead on 2026-07-26.",
  },
  {
    key: "pay",
    title: "Pay + Add Proof",
    badge: "Step 4",
    tone: "sage",
    note: "After payment, add who paid, when they paid, and the proof.",
    example: "Example: Paid by Finance Desk with proof PAY-2407-18.",
  },
];

const examNotes = [
  {
    title: "Status Rule",
    body:
      "Planned = coming later, Recorded = logged but not finished, Paid = done and proof should be added.",
  },
  {
    title: "Link Rule",
    body:
      "Each expense should show which part of the business it belongs to and what it is for.",
  },
  {
    title: "Approval Rule",
    body:
      "If Approved By is missing, the record is not complete yet.",
  },
  {
    title: "Proof Rule",
    body:
      "If an expense is marked Paid but proof is missing, the record is still not complete.",
  },
];

const tutorialExamples = [
  {
    title: "Marketing Example",
    summary: "A future cost you already know about.",
    fields: [
      "Title: August social media teaser",
      "Status: Planned",
      "Module: Marketing",
      "Reference: August campaign launch",
      "Result: Approval Soon when the date is close",
    ],
  },
  {
    title: "Delivery Example",
    summary: "A real cost that still needs follow-up.",
    fields: [
      "Title: Courier wallet recharge",
      "Status: Recorded",
      "Module: Orders",
      "Reference: Order fulfillment run",
      "Result: Waiting for Payment or Overdue",
    ],
  },
  {
    title: "Paid Example",
    summary: "A cost that is fully finished.",
    fields: [
      "Title: Dispatch tape restock",
      "Status: Paid",
      "Paid By: Finance Desk",
      "Proof: PAY-2407-18",
      "Result: Paid and Proof Added",
    ],
  },
];

const formatDate = (value) => (value ? dayjs(value).format("DD MMM YYYY") : "No date");

const getOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || "Unknown";

const getExpenseOperationalState = (expense) => {
  if (expense.status === "paid") {
    return {
      label: "Paid",
      color: "green",
      priority: 0,
      note: "No action needed.",
    };
  }

  if (expense.status === "recorded" && dayjs(expense.expenseDate).isBefore(TODAY, "day")) {
    return {
      label: "Overdue",
      color: "red",
      priority: 100,
      note: "This cost is past its date and still not paid.",
    };
  }

  if (expense.status === "recorded") {
    return {
      label: "Waiting for Payment",
      color: "orange",
      priority: 80,
      note: "This cost is logged and still waiting to be paid.",
    };
  }

  if (expense.status === "planned" && dayjs(expense.expenseDate).diff(TODAY, "day") <= 2) {
    return {
      label: "Approval Soon",
      color: "gold",
      priority: 60,
      note: "This planned cost is coming up soon.",
    };
  }

  return {
    label: "Planned",
    color: "default",
    priority: 40,
    note: "This is planned for later.",
  };
};

const getLinkageHealth = (expense) => {
  if (!expense.linkedModule || expense.linkedModule === "general") {
    return {
      label: "Pick a Module",
      color: "orange",
      priority: 90,
    };
  }

  if (!expense.linkedReference?.trim()) {
    return {
      label: "Reference Needed",
      color: "gold",
      priority: 70,
    };
  }

  return {
    label: "Linked",
    color: "blue",
    priority: 20,
  };
};

const getAuditTrailState = (expense) => {
  if (expense.status === "paid") {
    if (expense.paidBy?.trim() && expense.paidOn && expense.proofReference?.trim()) {
      return {
        label: "Proof Added",
        color: "green",
        priority: 0,
      };
    }

    return {
      label: "Proof Needed",
      color: "red",
      priority: 95,
    };
  }

  if ((expense.status === "recorded" || expense.status === "planned") && !expense.approvedBy?.trim()) {
    return {
      label: "Approval Needed",
      color: "orange",
      priority: 85,
    };
  }

  if (expense.status === "recorded" && expense.approvedBy?.trim() && !expense.paidBy?.trim()) {
    return {
      label: "Waiting for Proof",
      color: "gold",
      priority: 75,
    };
  }

  return {
    label: "Info Added",
    color: "blue",
    priority: 30,
  };
};

const buildExpenseStats = (expenses, formatMoney) => {
  const overdueCount = expenses.filter(
    (expense) => expense.operationalState.label === "Overdue",
  ).length;
  const linkedCount = expenses.filter(
    (expense) => expense.linkageHealth.label === "Linked",
  ).length;
  const verifiedCount = expenses.filter(
    (expense) => expense.auditTrailState.label === "Proof Added",
  ).length;

  return [
    {
      key: "total",
      label: "All Expenses",
      value: expenses.length,
      icon: <FileTextOutlined />,
      accent: "var(--catalog-accent-strong)",
    },
    {
      key: "recorded",
      label: "Recorded",
      value: expenses.filter((expense) => expense.status === "recorded").length,
      icon: <TagOutlined />,
      accent: "#d97706",
    },
    {
      key: "linked",
      label: "Linked",
      value: `${linkedCount}/${expenses.length}`,
      icon: <ShopOutlined />,
      accent: "#2563eb",
    },
    {
      key: "verified",
      label: "Proof Added",
      value: `${verifiedCount}/${expenses.length}`,
      icon: <FileTextOutlined />,
      accent: "#15803d",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: overdueCount,
      icon: <CarOutlined />,
      accent: overdueCount ? "#dc2626" : "#15803d",
    },
    {
      key: "value",
      label: "Total Value",
      value: formatMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0), "INR"),
      icon: <DollarOutlined />,
      accent: "var(--catalog-accent)",
    },
  ];
};

const buildModuleSummary = (expenses) => {
  const grouped = expenseModuleOptions.map((moduleOption) => {
    const moduleExpenses = expenses.filter((expense) => expense.linkedModule === moduleOption.value);
    const totalValue = moduleExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const pendingCount = moduleExpenses.filter(
      (expense) => expense.status !== "paid" || expense.auditTrailState.label !== "Proof Added",
    ).length;
    const overdueCount = moduleExpenses.filter(
      (expense) => expense.operationalState.label === "Overdue",
    ).length;

    return {
      key: moduleOption.value,
      label: moduleOption.label,
      totalValue,
      expenseCount: moduleExpenses.length,
      pendingCount,
      overdueCount,
    };
  });

  return grouped
    .filter((module) => module.expenseCount > 0)
    .sort((left, right) => right.totalValue - left.totalValue);
};

const getExpenseRecommendation = (expense) => {
  if (expense.operationalState.label === "Overdue") {
    return "Follow up on this payment as soon as possible.";
  }

  if (expense.auditTrailState.label === "Proof Needed") {
    return "Add who paid, the payment date, and the proof reference.";
  }

  if (expense.auditTrailState.label === "Approval Needed") {
    return "Add the approver before moving this forward.";
  }

  if (expense.auditTrailState.label === "Waiting for Proof") {
    return "Payment is the next step. Add proof once it is done.";
  }

  if (expense.linkageHealth.label === "Pick a Module") {
    return "Choose which part of the business this expense belongs to.";
  }

  if (expense.linkageHealth.label === "Reference Needed") {
    return "Add the exact order, batch, campaign, or task this cost is for.";
  }

  if (expense.linkedModule === "packaging") {
    return "Keep this linked to packaging so packing costs stay clear.";
  }

  if (expense.linkedModule === "orders") {
    return "Keep this linked to orders so delivery costs are easy to review.";
  }

  if (expense.linkedModule === "purchases") {
    return "Keep this linked to purchases so supplier costs stay clear.";
  }

  if (expense.linkedModule === "inventory") {
    return "Keep this linked to inventory so stock costs stay clear.";
  }

  if (expense.linkedModule === "marketing") {
    return "Keep this linked to marketing so campaign costs are easy to review.";
  }

  return expense.operationalState.note;
};

export default function AdminExpensesPage() {
  const [expenseForm] = Form.useForm();
  const { formatMoney } = useCurrency();
  const [expenses, setExpenses] = useState(seedExpenses);
  const [filters, setFilters] = useState(defaultFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const enrichedExpenses = useMemo(
    () =>
      expenses.map((expense) => {
        const operationalState = getExpenseOperationalState(expense);
        const linkageHealth = getLinkageHealth(expense);

        return {
          ...expense,
          operationalState,
          linkageHealth,
          auditTrailState: getAuditTrailState(expense),
          recommendation: getExpenseRecommendation({
            ...expense,
            operationalState,
            linkageHealth,
            auditTrailState: getAuditTrailState(expense),
          }),
        };
      }),
    [expenses],
  );

  const filteredExpenses = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return enrichedExpenses.filter((expense) => {
      const matchesSearch =
        !searchTerm ||
        expense.title.toLowerCase().includes(searchTerm) ||
        expense.notes.toLowerCase().includes(searchTerm) ||
        expense.linkedReference.toLowerCase().includes(searchTerm) ||
        getOptionLabel(expenseModuleOptions, expense.linkedModule).toLowerCase().includes(searchTerm);

      const matchesCategory = filters.category === "all" || expense.category === filters.category;
      const matchesStatus = filters.status === "all" || expense.status === filters.status;
      const matchesModule = filters.module === "all" || expense.linkedModule === filters.module;

      return matchesSearch && matchesCategory && matchesStatus && matchesModule;
    });
  }, [enrichedExpenses, filters]);

  const stats = useMemo(
    () => buildExpenseStats(enrichedExpenses, formatMoney),
    [enrichedExpenses, formatMoney],
  );
  const moduleSummary = useMemo(() => buildModuleSummary(enrichedExpenses), [enrichedExpenses]);

  const actionQueue = useMemo(
    () =>
      [...enrichedExpenses]
        .sort((left, right) => {
          const priorityGap =
            right.operationalState.priority +
            right.linkageHealth.priority +
            right.auditTrailState.priority -
            (left.operationalState.priority +
              left.linkageHealth.priority +
              left.auditTrailState.priority);

          if (priorityGap !== 0) {
            return priorityGap;
          }

          return dayjs(left.expenseDate).valueOf() - dayjs(right.expenseDate).valueOf();
        })
        .slice(0, 6),
    [enrichedExpenses],
  );

  const openCreateModal = () => {
    setEditingExpense(null);
    expenseForm.resetFields();
      expenseForm.setFieldsValue({
        status: "planned",
        category: "operations",
        linkedModule: "general",
        expenseDate: TODAY,
        approvedOn: TODAY,
      });
      setModalOpen(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    expenseForm.setFieldsValue({
      ...expense,
      expenseDate: dayjs(expense.expenseDate),
      approvedOn: expense.approvedOn ? dayjs(expense.approvedOn) : null,
      paidOn: expense.paidOn ? dayjs(expense.paidOn) : null,
    });
    setModalOpen(true);
  };

  const handleSaveExpense = async () => {
    try {
      const values = await expenseForm.validateFields();
      const payload = {
        id: editingExpense?.id || `exp-${Date.now()}`,
        title: values.title.trim(),
        category: values.category,
        status: values.status,
        amount: Number(values.amount || 0),
        expenseDate: values.expenseDate.format("YYYY-MM-DD"),
        linkedModule: values.linkedModule,
        linkedReference: values.linkedReference.trim(),
        approvedBy: values.approvedBy?.trim() || "",
        approvedOn: values.approvedOn ? values.approvedOn.format("YYYY-MM-DD") : "",
        paidBy: values.paidBy?.trim() || "",
        paidOn: values.paidOn ? values.paidOn.format("YYYY-MM-DD") : "",
        proofReference: values.proofReference?.trim() || "",
        notes: values.notes.trim(),
      };

      setExpenses((currentExpenses) => {
        if (editingExpense) {
          return currentExpenses.map((expense) =>
            expense.id === editingExpense.id ? payload : expense,
          );
        }

        return [payload, ...currentExpenses];
      });

      setModalOpen(false);
      expenseForm.resetFields();
      setEditingExpense(null);
      message.success(editingExpense ? "Expense updated." : "Expense added.");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error("Unable to save the expense right now.");
    }
  };

  const columns = [
    {
      title: "Expense",
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <div className="inventory-link-cell">
          <strong>{record.title}</strong>
          <span>{record.notes}</span>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (value) => getOptionLabel(expenseCategoryOptions, value),
    },
    {
      title: "Link",
      key: "linkage",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={record.linkageHealth.color}>
            {getOptionLabel(expenseModuleOptions, record.linkedModule)}
          </Tag>
          <Typography.Text type="secondary">{record.linkedReference}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => getOptionLabel(expenseStatusOptions, value),
    },
    {
      title: "Current State",
      key: "operationalState",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={record.operationalState.color}>{record.operationalState.label}</Tag>
          <Typography.Text type="secondary">
            {record.linkageHealth.label} / {record.auditTrailState.label}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Approval / Proof",
      key: "trail",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={record.auditTrailState.color}>{record.auditTrailState.label}</Tag>
          <Typography.Text type="secondary">
            {record.approvedBy ? `Approved by ${record.approvedBy}` : "No approver captured"}
          </Typography.Text>
          <Typography.Text type="secondary">
            {record.paidBy
              ? `Paid by ${record.paidBy}${record.proofReference ? ` / ${record.proofReference}` : ""}`
              : "No payment proof captured"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Date",
      dataIndex: "expenseDate",
      key: "expenseDate",
      render: (value) => formatDate(value),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (value) => formatMoney(value, "INR"),
    },
    {
      title: "Next Step",
      dataIndex: "recommendation",
      key: "recommendation",
      width: 280,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button type="link" onClick={() => openEditModal(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="catalog-admin-page expense-layout-shell">
      <Card
        className="catalog-admin-hero expense-hero-card"
        bordered={false}
        extra={
          <Space wrap className="expense-hero-actions">
            <Button type="primary" onClick={openCreateModal}>
              Add Expense
            </Button>
            <Button icon={<ReadOutlined />} onClick={() => setTutorialOpen(true)}>
              Tutorial
            </Button>
          </Space>
        }
      >
        <div className="expense-hero-copy">
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Expenses Workspace
            </Typography.Title>
          </div>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Track planned, recorded, and paid expenses. Link each cost to the right part of the
            business, and keep approval and payment proof in one place.
          </Typography.Paragraph>
          <div className="expense-hero-notes">
            <span>Queue = urgent items</span>
            <span>Filters = focused view</span>
            <span>Register = full list</span>
          </div>
        </div>
      </Card>

      <section className="expense-stat-grid">
        {stats.map((stat) => (
          <article key={stat.key} className="expense-stat-card">
            <div className="expense-stat-topline">
              <span>{stat.label}</span>
              <div className="catalog-stat-icon" style={{ color: stat.accent }}>
                {stat.icon}
              </div>
            </div>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <Card
        bordered={false}
        className="expense-panel-card"
        title="Expense Filters"
        extra={<Typography.Text type="secondary">{filteredExpenses.length} visible expenses</Typography.Text>}
      >
        <div className="expense-filter-shell">
          <div className="inventory-filter-grid expense-filter-grid">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search expenses, notes, or references"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
            />
            <Select
              value={filters.category}
              onChange={(value) => setFilters((current) => ({ ...current, category: value }))}
              options={[{ label: "All Categories", value: "all" }, ...expenseCategoryOptions]}
            />
            <Select
              value={filters.status}
              onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
              options={[{ label: "All Statuses", value: "all" }, ...expenseStatusOptions]}
            />
            <Select
              value={filters.module}
              onChange={(value) => setFilters((current) => ({ ...current, module: value }))}
              options={[{ label: "All Modules", value: "all" }, ...expenseModuleOptions]}
            />
          </div>

          <div className="expense-filter-actions">
            <Typography.Text type="secondary">
              Search the list, check one team, or focus on open items.
            </Typography.Text>
            <Button onClick={() => setFilters(defaultFilters)}>Reset Filters</Button>
          </div>
        </div>
      </Card>

      <section className="expense-overview-grid">
      <Card
        bordered={false}
        className="expense-panel-card expense-module-panel"
        title="Spend by Module"
        extra="Simple view by team"
      >
        <section className="catalog-stats-grid expense-module-grid">
          {moduleSummary.map((module) => (
            <Card key={module.key} className="catalog-stat-card admin-insight-card" bordered={false}>
              <div className="catalog-stat-copy admin-insight-copy">
                <span>{module.label}</span>
                <strong>{formatMoney(module.totalValue, "INR")}</strong>
                <Typography.Text type="secondary">
                  {module.expenseCount} tracked / {module.pendingCount} pending / {module.overdueCount} overdue
                </Typography.Text>
              </div>
            </Card>
          ))}
        </section>
      </Card>

      <Card
        bordered={false}
        className="expense-panel-card expense-queue-panel"
        title="Follow-Up Queue"
        extra="Start with these items first"
      >
        <div className="inventory-queue-list expense-queue-list">
          {actionQueue.map((expense) => (
            <div key={expense.id} className="inventory-queue-item">
              <div className="inventory-queue-copy">
                <div className="inventory-queue-topline">
                  <strong>{expense.title}</strong>
                  <Space wrap>
                    <Tag color={expense.operationalState.color}>{expense.operationalState.label}</Tag>
                    <Tag color={expense.linkageHealth.color}>{expense.linkageHealth.label}</Tag>
                    <Tag color={expense.auditTrailState.color}>{expense.auditTrailState.label}</Tag>
                  </Space>
                </div>
                <span>
                  {getOptionLabel(expenseModuleOptions, expense.linkedModule)} /{" "}
                  {expense.linkedReference} / {formatMoney(expense.amount, "INR")} due{" "}
                  {formatDate(expense.expenseDate)}
                </span>
              </div>
              <div className="inventory-queue-actions">
                <Typography.Text>{expense.recommendation}</Typography.Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </section>

      <Card
        bordered={false}
        className="expense-panel-card expense-register-card"
        title="Expense Register"
        extra="Update records and fill in missing details"
      >
        <Table
          className="catalog-table expense-register-table"
          columns={columns}
          dataSource={filteredExpenses}
          rowKey="id"
          pagination={{ pageSize: 6 }}
        />
      </Card>

      <Modal
        destroyOnClose
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingExpense(null);
          expenseForm.resetFields();
        }}
        onOk={handleSaveExpense}
        okText={editingExpense ? "Update Expense" : "Save Expense"}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
      >
        <Form form={expenseForm} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please add an expense title." }]}
          >
            <Input placeholder="Example: Courier recharge" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: "Please select a category." }]}
          >
            <Select options={expenseCategoryOptions} />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: "Please select a status." }]}
          >
            <Select options={expenseStatusOptions} />
          </Form.Item>

          <Form.Item
            label="Amount"
            name="amount"
            rules={[{ required: true, message: "Please enter the amount." }]}
          >
            <InputNumber
              min={0}
              precision={0}
              prefix="INR"
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            label="Expense Date"
            name="expenseDate"
            rules={[{ required: true, message: "Please choose the expense date." }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Linked Module"
            name="linkedModule"
            rules={[{ required: true, message: "Please choose the linked module." }]}
          >
            <Select options={expenseModuleOptions} />
          </Form.Item>

          <Form.Item
            label="Linked Reference"
            name="linkedReference"
            rules={[{ required: true, message: "Please add the operational reference." }]}
          >
            <Input placeholder="Order batch, shipment, campaign, or process name" />
          </Form.Item>

          <Form.Item label="Approved By" name="approvedBy">
            <Input placeholder="Who approved this expense?" />
          </Form.Item>

          <Form.Item label="Approved On" name="approvedOn">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Paid By" name="paidBy">
            <Input placeholder="Who completed or confirmed payment?" />
          </Form.Item>

          <Form.Item label="Paid On" name="paidOn">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Proof Reference" name="proofReference">
            <Input placeholder="Receipt, voucher, transaction, or invoice reference" />
          </Form.Item>

          <Form.Item
            label="Notes"
            name="notes"
            rules={[{ required: true, message: "Please add a short note." }]}
          >
            <Input.TextArea rows={4} placeholder="Why this expense exists and who needs it" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Expenses Tutorial"
        width={720}
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        className="expense-tutorial-drawer"
      >
        <div className="expense-tutorial-shell">
          <section className="expense-tutorial-hero">
            <div>
              <span className="expense-tutorial-kicker">Quick Admin Guide</span>
              <h3>Understand this page quickly</h3>
              <p>
                This page helps the team track costs. Each expense should show what it is for,
                which team it belongs to, who approved it, and whether payment proof was added.
              </p>
            </div>
            <div className="expense-tutorial-mini-card">
              <strong>Main idea</strong>
              <span>Each expense needs a status, a team link, and proof details.</span>
            </div>
          </section>

          <section className="expense-tutorial-section">
            <div className="expense-tutorial-section-head">
              <FundProjectionScreenOutlined />
              <div>
                <strong>Doodled Flowchart</strong>
                <span>Follow these steps when you add or update an expense.</span>
              </div>
            </div>
            <div className="expense-flowchart">
              {expenseTutorialFlow.map((step, index) => (
                <React.Fragment key={step.key}>
                  <article className={`expense-flow-node tone-${step.tone}`}>
                    <span>{step.badge}</span>
                    <strong>{step.title}</strong>
                    <p>{step.note}</p>
                    <small>{step.example}</small>
                  </article>
                  {index < expenseTutorialFlow.length - 1 ? (
                    <div className="expense-flow-arrow" aria-hidden="true">
                      <span>--&gt;</span>
                    </div>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </section>

          <section className="expense-tutorial-section">
            <div className="expense-tutorial-section-head">
              <AuditOutlined />
              <div>
                <strong>What each part does</strong>
                <span>Simple explanations for each area on the page.</span>
              </div>
            </div>
            <div className="expense-tutorial-grid">
              <article className="expense-note-card">
                <strong>Stats Cards</strong>
                <p>
                  Show the total number of expenses, recorded items, linked items, proof added,
                  overdue items, and total value.
                </p>
                <small>Quick note: start by checking Overdue.</small>
              </article>
              <article className="expense-note-card">
                <strong>Filters</strong>
                <p>
                  Search by title, notes, reference, or module. Then filter by category, status,
                  or module.
                </p>
                <small>Quick note: choose Recorded to find open cost items fast.</small>
              </article>
              <article className="expense-note-card">
                <strong>Spend by Module</strong>
                <p>
                  Groups costs by team and shows how many are tracked, pending, and overdue.
                </p>
                <small>Quick note: useful for weekly team review.</small>
              </article>
              <article className="expense-note-card">
                <strong>Follow-Up Queue</strong>
                <p>
                  Shows the items that need attention first, like overdue costs or missing details.
                </p>
                <small>Quick note: treat this like your to-do list.</small>
              </article>
              <article className="expense-note-card">
                <strong>Expense Register</strong>
                <p>
                  This is the main table. It shows the expense, status, current state, amount, next
                  step, and edit button.
                </p>
                <small>Quick note: if stuck, read the Next Step column first.</small>
              </article>
              <article className="expense-note-card">
                <strong>Add / Edit Form</strong>
                <p>
                  Use this form to add the title, amount, date, module, reference, approval,
                  payment details, proof, and notes.
                </p>
                <small>Quick note: more complete details make the record easier to trust.</small>
              </article>
            </div>
          </section>

          <section className="expense-tutorial-section">
            <div className="expense-tutorial-section-head">
              <BulbOutlined />
              <div>
                <strong>Examples</strong>
                <span>These examples match how the page works now.</span>
              </div>
            </div>
            <div className="expense-example-list">
              {tutorialExamples.map((example) => (
                <article key={example.title} className="expense-example-card">
                  <strong>{example.title}</strong>
                  <p>{example.summary}</p>
                  <div className="expense-example-fields">
                    {example.fields.map((field) => (
                      <span key={field}>{field}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="expense-tutorial-section">
            <div className="expense-tutorial-section-head">
              <CheckCircleOutlined />
              <div>
                <strong>Quick Notes</strong>
                <span>Short points to help the team remember the basics.</span>
              </div>
            </div>
            <div className="expense-exam-grid">
              {examNotes.map((item) => (
                <article key={item.title} className="expense-exam-card">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="expense-tutorial-section">
            <div className="expense-tutorial-section-head">
              <FileTextOutlined />
              <div>
                <strong>Tutorial Steps</strong>
                <span>How the team should use this page step by step.</span>
              </div>
            </div>
            <div className="expense-tutorial-steps">
              <article className="expense-tutorial-step">
                <span>1</span>
                <div>
                  <strong>Add the basic expense details</strong>
                  <p>
                    Start with the title, category, amount, date, module, reference, and a clear
                    note.
                  </p>
                </div>
              </article>
              <article className="expense-tutorial-step">
                <span>2</span>
                <div>
                  <strong>Choose the correct status</strong>
                  <p>
                    Use Planned for future costs, Recorded for open costs, and Paid for finished
                    costs.
                  </p>
                </div>
              </article>
              <article className="expense-tutorial-step">
                <span>3</span>
                <div>
                  <strong>Capture approval</strong>
                  <p>
                    Fill in Approved By and Approved On early so the record does not stay
                    incomplete.
                  </p>
                </div>
              </article>
              <article className="expense-tutorial-step">
                <span>4</span>
                <div>
                  <strong>Close payment with proof</strong>
                  <p>
                    After payment, fill in Paid By, Paid On, and Proof Reference so the record is
                    complete.
                  </p>
                </div>
              </article>
              <article className="expense-tutorial-step">
                <span>5</span>
                <div>
                  <strong>Review the queue and filters</strong>
                  <p>
                    Check the queue for urgent items first, then use filters to review the rest more
                    easily.
                  </p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </Drawer>
    </div>
  );
}
