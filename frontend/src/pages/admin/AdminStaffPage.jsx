import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Descriptions,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AuditOutlined,
  MailOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";
import {
  createStaffRole,
  deleteStaffRole,
  duplicateStaffRole,
  getStaffAudit,
  getStaffCatalog,
  getStaffDirectory,
  getStaffMember,
  getStaffRoles,
  searchRegisteredUsers,
  updateStaffAccess,
  updateStaffRole,
} from "../../services/staffService";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import "../../styles/adminCatalog.css";

const TODAY = dayjs("2026-08-12");

const defaultDirectoryFilters = {
  search: "",
  role: "all",
  status: "all",
  workspace: "all",
  accessIssue: "all",
};

const emptyOverrides = {
  grantPermissions: [],
  revokePermissions: [],
  workspaceAccess: {},
  workspaceScopes: {},
  addResponsibilities: [],
  removeResponsibilities: [],
  grantSensitivePermissions: [],
  revokeSensitivePermissions: [],
};

function formatDate(value) {
  return value ? dayjs(value).format("DD MMM YYYY") : "No activity yet";
}

function buildHumanPermissionSummary({
  workspaceAccess = {},
  permissions = [],
  sensitivePermissions = [],
}) {
  const workspaces = Object.entries(workspaceAccess)
    .filter(([, allowed]) => allowed)
    .map(([workspace]) => workspace)
    .slice(0, 4);

  const actionSummary = [];
  if (permissions.includes("orders.update")) actionSummary.push("update orders");
  if (permissions.includes("packaging.update")) actionSummary.push("update packaging");
  if (permissions.includes("products.update")) actionSummary.push("edit products");
  if (permissions.includes("reports.export")) actionSummary.push("export reports");

  const restricted = [];
  if (!sensitivePermissions.includes("finance.view_sensitive")) restricted.push("finance details");
  if (!sensitivePermissions.includes("prices.view_margin")) restricted.push("profit margin");
  if (!sensitivePermissions.includes("customers.view_sensitive")) restricted.push("customer private details");

  const readableWorkspaces = workspaces.length ? workspaces.join(", ") : "no admin workspaces";
  const readableActions = actionSummary.length ? actionSummary.join(", ") : "use assigned actions";
  const readableRestricted = restricted.length ? restricted.slice(0, 3).join(", ") : "sensitive areas";

  return `Can access ${readableWorkspaces}. Can ${readableActions}. Cannot view ${readableRestricted} unless explicitly granted.`;
}

function buildRoleEditorValue(role) {
  return {
    name: role?.name || "",
    description: role?.description || "",
    accountRole: role?.accountRole || "staff",
    profile: role?.profile || {
      permissions: [],
      workspaceAccess: {},
      workspaceScopes: {},
      responsibilities: [],
      sensitivePermissions: [],
    },
  };
}

function PermissionMatrixEditor({
  catalog,
  value,
  onChange,
  mode = "role",
  roleOptions = [],
  onCopyRole,
  showCopyRole = false,
}) {
  if (!catalog) {
    return null;
  }

  const updateRoleProfile = (nextProfile) => {
    onChange({
      ...value,
      profile: {
        ...value.profile,
        ...nextProfile,
      },
    });
  };

  const updateOverrides = (nextOverrides) => {
    onChange({
      ...value,
      permissionOverrides: {
        ...value.permissionOverrides,
        ...nextOverrides,
      },
    });
  };

  const renderRoleWorkspace = (workspace) => {
    const profile = value.profile;
    const accessEnabled = Boolean(profile.workspaceAccess?.[workspace.workspace]);
    const selectedActions = (profile.permissions || []).filter((permission) =>
      workspace.actions.some((action) => action.key === permission),
    );
    const selectedSensitive = (profile.sensitivePermissions || []).filter((permission) =>
      workspace.sensitive.some((action) => action.key === permission),
    );

    return (
      <Collapse.Panel
        key={workspace.workspace}
        header={
          <Space>
            <strong>{workspace.label}</strong>
            <Tag color={accessEnabled ? "green" : "default"}>
              {accessEnabled ? "Allow Access" : "No Access"}
            </Tag>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Checkbox
            checked={accessEnabled}
            onChange={(event) => {
              const checked = event.target.checked;
              updateRoleProfile({
                workspaceAccess: {
                  ...profile.workspaceAccess,
                  [workspace.workspace]: checked,
                },
                workspaceScopes: {
                  ...profile.workspaceScopes,
                  [workspace.workspace]: checked
                    ? profile.workspaceScopes?.[workspace.workspace] || "assigned"
                    : "none",
                },
                permissions: checked
                  ? profile.permissions
                  : (profile.permissions || []).filter(
                      (permission) =>
                        !workspace.actions.some((action) => action.key === permission),
                    ),
                sensitivePermissions: checked
                  ? profile.sensitivePermissions
                  : (profile.sensitivePermissions || []).filter(
                      (permission) =>
                        !workspace.sensitive.some((action) => action.key === permission),
                    ),
              });
            }}
          >
            Allow access to {workspace.label}
          </Checkbox>

          <Checkbox.Group
            disabled={!accessEnabled}
            value={selectedActions}
            onChange={(nextValues) => {
              const remaining = (profile.permissions || []).filter(
                (permission) => !workspace.actions.some((action) => action.key === permission),
              );
              updateRoleProfile({
                permissions: [...remaining, ...nextValues],
              });
            }}
          >
            <Space wrap>
              {workspace.actions.map((action) => (
                <Checkbox key={action.key} value={action.key}>
                  {action.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>

          {workspace.visibilityScopes ? (
            <Select
              disabled={!accessEnabled}
              value={profile.workspaceScopes?.[workspace.workspace] || "assigned"}
              onChange={(nextValue) =>
                updateRoleProfile({
                  workspaceScopes: {
                    ...profile.workspaceScopes,
                    [workspace.workspace]: nextValue,
                  },
                })
              }
              options={(catalog.scopeOptions || []).map((scope) => ({
                label: scope.label,
                value: scope.key,
              }))}
            />
          ) : null}

          {workspace.sensitive.length ? (
            <>
              <Typography.Text type="secondary">Sensitive information controls</Typography.Text>
              <Checkbox.Group
                disabled={!accessEnabled}
                value={selectedSensitive}
                onChange={(nextValues) => {
                  const remaining = (profile.sensitivePermissions || []).filter(
                    (permission) => !workspace.sensitive.some((action) => action.key === permission),
                  );
                  updateRoleProfile({
                    sensitivePermissions: [...remaining, ...nextValues],
                  });
                }}
              >
                <Space direction="vertical">
                  {workspace.sensitive.map((permission) => (
                    <Checkbox key={permission.key} value={permission.key}>
                      {permission.label}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </>
          ) : null}
        </Space>
      </Collapse.Panel>
    );
  };

  const renderOverrideWorkspace = (workspace) => {
    const overrides = value.permissionOverrides;
    const accessValue =
      overrides.workspaceAccess?.[workspace.workspace] === true
        ? "allow"
        : overrides.workspaceAccess?.[workspace.workspace] === false
          ? "deny"
          : "inherit";
    const grantedActions = (overrides.grantPermissions || []).filter((permission) =>
      workspace.actions.some((action) => action.key === permission),
    );
    const revokedActions = (overrides.revokePermissions || []).filter((permission) =>
      workspace.actions.some((action) => action.key === permission),
    );
    const grantedSensitive = (overrides.grantSensitivePermissions || []).filter((permission) =>
      workspace.sensitive.some((action) => action.key === permission),
    );
    const revokedSensitive = (overrides.revokeSensitivePermissions || []).filter((permission) =>
      workspace.sensitive.some((action) => action.key === permission),
    );

    return (
      <Collapse.Panel
        key={workspace.workspace}
        header={
          <Space>
            <strong>{workspace.label}</strong>
            <Tag color={accessValue === "allow" ? "green" : accessValue === "deny" ? "red" : "default"}>
              {accessValue === "allow"
                ? "Access Allowed"
                : accessValue === "deny"
                  ? "Access Removed"
                  : "Inherit Role"}
            </Tag>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Select
            value={accessValue}
            onChange={(nextValue) => {
              const nextAccess = { ...(overrides.workspaceAccess || {}) };
              if (nextValue === "inherit") {
                delete nextAccess[workspace.workspace];
              } else {
                nextAccess[workspace.workspace] = nextValue === "allow";
              }
              updateOverrides({ workspaceAccess: nextAccess });
            }}
            options={[
              { label: "Inherit role access", value: "inherit" },
              { label: "Force allow access", value: "allow" },
              { label: "Force deny access", value: "deny" },
            ]}
          />

          <Typography.Text type="secondary">Grant extra actions</Typography.Text>
          <Checkbox.Group
            value={grantedActions}
            onChange={(nextValues) => {
              const remaining = (overrides.grantPermissions || []).filter(
                (permission) => !workspace.actions.some((action) => action.key === permission),
              );
              updateOverrides({ grantPermissions: [...remaining, ...nextValues] });
            }}
          >
            <Space wrap>
              {workspace.actions.map((action) => (
                <Checkbox key={action.key} value={action.key}>
                  {action.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>

          <Typography.Text type="secondary">Remove inherited actions</Typography.Text>
          <Checkbox.Group
            value={revokedActions}
            onChange={(nextValues) => {
              const remaining = (overrides.revokePermissions || []).filter(
                (permission) => !workspace.actions.some((action) => action.key === permission),
              );
              updateOverrides({ revokePermissions: [...remaining, ...nextValues] });
            }}
          >
            <Space wrap>
              {workspace.actions.map((action) => (
                <Checkbox key={action.key} value={action.key}>
                  {action.label}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>

          {workspace.visibilityScopes ? (
            <Select
              value={overrides.workspaceScopes?.[workspace.workspace] || "inherit"}
              onChange={(nextValue) => {
                const nextScopes = { ...(overrides.workspaceScopes || {}) };
                if (nextValue === "inherit") {
                  delete nextScopes[workspace.workspace];
                } else {
                  nextScopes[workspace.workspace] = nextValue;
                }
                updateOverrides({ workspaceScopes: nextScopes });
              }}
              options={[
                { label: "Inherit role scope", value: "inherit" },
                ...(catalog.scopeOptions || []).map((scope) => ({
                  label: scope.label,
                  value: scope.key,
                })),
              ]}
            />
          ) : null}

          {workspace.sensitive.length ? (
            <>
              <Typography.Text type="secondary">Grant extra sensitive visibility</Typography.Text>
              <Checkbox.Group
                value={grantedSensitive}
                onChange={(nextValues) => {
                  const remaining = (overrides.grantSensitivePermissions || []).filter(
                    (permission) => !workspace.sensitive.some((action) => action.key === permission),
                  );
                  updateOverrides({ grantSensitivePermissions: [...remaining, ...nextValues] });
                }}
              >
                <Space direction="vertical">
                  {workspace.sensitive.map((permission) => (
                    <Checkbox key={permission.key} value={permission.key}>
                      {permission.label}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>

              <Typography.Text type="secondary">Remove inherited sensitive visibility</Typography.Text>
              <Checkbox.Group
                value={revokedSensitive}
                onChange={(nextValues) => {
                  const remaining = (overrides.revokeSensitivePermissions || []).filter(
                    (permission) => !workspace.sensitive.some((action) => action.key === permission),
                  );
                  updateOverrides({ revokeSensitivePermissions: [...remaining, ...nextValues] });
                }}
              >
                <Space direction="vertical">
                  {workspace.sensitive.map((permission) => (
                    <Checkbox key={permission.key} value={permission.key}>
                      {permission.label}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </>
          ) : null}
        </Space>
      </Collapse.Panel>
    );
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      {showCopyRole ? (
        <Select
          allowClear
          placeholder="Copy permissions from another role"
          options={roleOptions}
          onChange={(value) => value && onCopyRole?.(value)}
        />
      ) : null}

      <Collapse>
        {(catalog.workspaces || []).map((workspace) =>
          mode === "role" ? renderRoleWorkspace(workspace) : renderOverrideWorkspace(workspace),
        )}
      </Collapse>
    </Space>
  );
}

export default function AdminStaffPage() {
  const { user, hasPermission } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [summary, setSummary] = useState(null);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultDirectoryFilters);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberAudit, setMemberAudit] = useState([]);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormState, setRoleFormState] = useState(buildRoleEditorValue());
  const [staffSearchModalOpen, setStaffSearchModalOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffSearchResults, setStaffSearchResults] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignFormState, setAssignFormState] = useState({
    roleId: null,
    responsibilities: [],
    permissionOverrides: emptyOverrides,
    confirmValue: "",
  });

  const canManageStaff = hasPermission("staff.manage");
  const canManageRoles = hasPermission("roles.manage");
  const canReadAudit = hasPermission("staff.audit.read");
  const canPromoteSuperAdmin = hasPermission("staff.promote.super_admin");

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: role.name,
        value: role.id,
      })),
    [roles],
  );

  const activeRole = useMemo(
    () => roles.find((role) => role.id === assignFormState.roleId) || null,
    [assignFormState.roleId, roles],
  );

  const loadStaffData = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        search: activeFilters.search || undefined,
        role: activeFilters.role !== "all" ? activeFilters.role : undefined,
        status: activeFilters.status !== "all" ? activeFilters.status : undefined,
        workspace: activeFilters.workspace !== "all" ? activeFilters.workspace : undefined,
        access_issue: activeFilters.accessIssue === "yes" ? true : undefined,
      };

      const [catalogData, directoryData, rolesData, auditData] = await Promise.all([
        getStaffCatalog(),
        getStaffDirectory(params),
        getStaffRoles(),
        canReadAudit ? getStaffAudit(50) : Promise.resolve({ audit: [] }),
      ]);

      setCatalog(catalogData);
      setSummary(directoryData.summary);
      setStaff(directoryData.staff || []);
      setRoles(rolesData.roles || []);
      setAudit(auditData.audit || []);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Unable to load staff access data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!staffSearchModalOpen || !staffSearchQuery.trim()) {
        setStaffSearchResults([]);
        return;
      }

      try {
        const response = await searchRegisteredUsers(staffSearchQuery.trim());
        setStaffSearchResults(response.results || []);
      } catch (error) {
        message.error(getApiErrorMessage(error, "Staff search failed."));
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [staffSearchModalOpen, staffSearchQuery]);

  const reviewQueue = useMemo(() => {
    const queue = [];
    staff.forEach((member) => {
      (member.accessWarnings || []).forEach((warning) => {
        queue.push({
          key: `${member.id}-${warning.code}`,
          memberId: member.id,
          title: `${member.name} - ${warning.label}`,
          severity: warning.severity,
          message: warning.message,
        });
      });
    });

    roles
      .filter((role) => Number(role.usageCount || 0) === 0)
      .forEach((role) => {
        queue.push({
          key: `role-${role.id}`,
          memberId: null,
          title: `${role.name} - No active members`,
          severity: "low",
          message: "This role exists without any currently assigned staff members.",
        });
      });

    return queue.slice(0, 12);
  }, [roles, staff]);

  const openMemberDrawer = async (memberId) => {
    try {
      const response = await getStaffMember(memberId);
      setSelectedMember(response.member);
      setMemberAudit(response.audit || []);
      setMemberDrawerOpen(true);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Unable to load this staff profile."));
    }
  };

  const openRoleModal = (role = null) => {
    setEditingRole(role);
    setRoleFormState(buildRoleEditorValue(role));
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      const payload = {
        name: roleFormState.name.trim(),
        description: roleFormState.description?.trim() || null,
        accountRole: roleFormState.accountRole,
        profile: roleFormState.profile,
        applyToAssignedStaff: true,
      };

      if (editingRole) {
        await updateStaffRole(editingRole.id, payload);
        message.success("Role updated.");
      } else {
        await createStaffRole(payload);
        message.success("Role created.");
      }

      setRoleModalOpen(false);
      await loadStaffData();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Unable to save this role."));
    }
  };

  const handleDuplicateRole = async (roleId) => {
    try {
      await duplicateStaffRole(roleId);
      message.success("Role duplicated.");
      await loadStaffData();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Unable to duplicate this role."));
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await deleteStaffRole(roleId);
      message.success("Role deleted.");
      await loadStaffData();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Unable to delete this role."));
    }
  };

  const openAssignModal = (result) => {
    const defaultRoleId =
      roles.find((role) => role.key === result.staffRoleKey)?.id ||
      roles.find((role) => role.key === "operations")?.id ||
      null;
    const matchedRole = roles.find((role) => role.id === defaultRoleId);

    setAssignTarget(result);
    setAssignFormState({
      roleId: defaultRoleId,
      responsibilities: result.responsibilities || matchedRole?.profile?.responsibilities || [],
      permissionOverrides: result.permissionOverrides || emptyOverrides,
      confirmValue: "",
    });
    setAssignModalOpen(true);
    setStaffSearchModalOpen(false);
  };

  const handleSaveAccess = async (deactivateAccess = false) => {
    if (!assignTarget) {
      return;
    }

    try {
      const role = roles.find((item) => item.id === assignFormState.roleId) || activeRole;
      const payload = {
        roleId: role?.id,
        roleKey: role?.key,
        accountRole: role?.accountRole || "staff",
        canAccessAdmin: !deactivateAccess,
        responsibilities: assignFormState.responsibilities,
        permissionOverrides: assignFormState.permissionOverrides,
        confirmValue: assignFormState.confirmValue,
        deactivateAccess,
      };

      await updateStaffAccess(assignTarget.id, payload);
      message.success(deactivateAccess ? "Staff access revoked." : "Staff access saved.");
      setAssignModalOpen(false);
      setAssignTarget(null);
      await loadStaffData();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Unable to update staff access."));
    }
  };

  const roleSummary = useMemo(
    () =>
      buildHumanPermissionSummary({
        workspaceAccess: roleFormState.profile?.workspaceAccess,
        permissions: roleFormState.profile?.permissions,
        sensitivePermissions: roleFormState.profile?.sensitivePermissions,
      }),
    [roleFormState],
  );

  const accessSummary = useMemo(() => {
    if (!activeRole) {
      return "Choose a role to review inherited access.";
    }

    const mergedResponsibilities = assignFormState.responsibilities;
    return buildHumanPermissionSummary({
      workspaceAccess: {
        ...(activeRole.profile?.workspaceAccess || {}),
        ...(assignFormState.permissionOverrides?.workspaceAccess || {}),
      },
      permissions: [
        ...(activeRole.profile?.permissions || []),
        ...(assignFormState.permissionOverrides?.grantPermissions || []),
      ],
      sensitivePermissions: [
        ...(activeRole.profile?.sensitivePermissions || []),
        ...(assignFormState.permissionOverrides?.grantSensitivePermissions || []),
      ],
    }) + ` Responsibilities: ${mergedResponsibilities.join(", ") || "none assigned yet"}.`;
  }, [activeRole, assignFormState]);

  const roleTableColumns = [
    {
      title: "Role",
      key: "role",
      render: (_, record) => (
        <div className="inventory-link-cell">
          <strong>{record.name}</strong>
          <span>{record.description || "No description yet"}</span>
        </div>
      ),
    },
    {
      title: "Hierarchy",
      dataIndex: "accountRole",
      key: "accountRole",
      width: 140,
      render: (value) => (
        <Tag color={value === "super_admin" ? "red" : value === "admin" ? "blue" : "green"}>
          {value === "super_admin"
            ? "Super Admin"
            : value === "admin"
              ? "Admin"
              : "Staff"}
        </Tag>
      ),
    },
    {
      title: "Workspaces",
      key: "workspaces",
      render: (_, record) =>
        Object.entries(record.profile?.workspaceAccess || {})
          .filter(([, allowed]) => allowed)
          .map(([workspace]) => catalog?.workspaceLabels?.[workspace] || workspace)
          .slice(0, 4)
          .join(", ") || "No workspace access",
    },
    {
      title: "Members",
      dataIndex: "usageCount",
      key: "usageCount",
      width: 100,
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space wrap>
          <Button type="link" onClick={() => openRoleModal(record)}>
            Edit
          </Button>
          <Button type="link" onClick={() => handleDuplicateRole(record.id)}>
            Duplicate
          </Button>
          {!record.isSystem ? (
            <Popconfirm
              title="Delete this role?"
              onConfirm={() => handleDeleteRole(record.id)}
            >
              <Button type="link" danger>
                Delete
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const staffColumns = [
    {
      title: "Staff Member",
      key: "member",
      render: (_, record) => (
        <div className="inventory-link-cell">
          <strong>{record.name}</strong>
          <span>{record.email}</span>
        </div>
      ),
    },
    {
      title: "Role",
      key: "role",
      width: 150,
      render: (_, record) => <Tag color={record.role === "super_admin" ? "red" : record.role === "admin" ? "blue" : "green"}>{record.roleDisplayName}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      width: 150,
      render: (_, record) => (
        <Tag color={record.isActive ? "green" : "red"}>
          {record.isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Responsibilities",
      key: "responsibilities",
      render: (_, record) =>
        (record.responsibilities || [])
          .map((responsibility) => {
            const option = (catalog?.responsibilities || []).find((item) => item.key === responsibility);
            return option?.label || responsibility;
          })
          .join(", ") || "None assigned",
    },
    {
      title: "Permission Summary",
      dataIndex: "permissionSummary",
      key: "permissionSummary",
      width: 260,
    },
    {
      title: "Last Active",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 150,
      render: (value) => formatDate(value),
    },
    {
      title: "Access Risk",
      key: "accessRisk",
      width: 150,
      render: (_, record) =>
        record.accessWarnings?.length ? (
          <Tag color="orange">{record.accessWarnings.length} issue(s)</Tag>
        ) : (
          <Tag color="green">Clear</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space wrap>
          <Button type="link" onClick={() => openMemberDrawer(record.id)}>
            View Access
          </Button>
          {canManageStaff ? (
            <Button type="link" onClick={() => openAssignModal(record)}>
              Manage Access
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div className="catalog-admin-page">
      <Card
        className="catalog-admin-hero"
        bordered={false}
        title="Staff Workspace"
        extra="Complete staff access, roles, responsibilities, and audit control"
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Manage who can enter the admin panel, what workspaces they can access, which actions they
          can perform, what sensitive data they can see, and which responsibilities they own on
          Wednesday, August 12, 2026.
        </Typography.Paragraph>
      </Card>

      <Card bordered={false} title="Team Summary" extra={summary ? `${summary.totalStaff} staff records` : "Loading..."}>
        {summary ? (
          <section className="catalog-stats-grid">
            {[
              { key: "total", label: "Total Staff", value: summary.totalStaff, tone: "total" },
              { key: "active", label: "Active Staff", value: summary.activeStaff, tone: "active" },
              { key: "inactive", label: "Inactive Staff", value: summary.inactiveStaff, tone: "out" },
              { key: "super", label: "Super Admins", value: summary.superAdmins, tone: "draft" },
              { key: "issues", label: "Access Issues", value: summary.withAccessIssues, tone: "low" },
            ].map((stat) => (
              <div className="catalog-stat-tile" key={stat.key}>
                <div className={`catalog-stat-icon ${stat.tone}`}>
                  <TeamOutlined />
                </div>
                <div className="catalog-stat-copy">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </Card>

      <Card bordered={false} title="Access Review Queue" extra={`${reviewQueue.length} review items`}>
        <div className="inventory-queue-list">
          {reviewQueue.map((item) => (
            <div key={item.key} className="inventory-queue-item">
              <div className="inventory-queue-copy">
                <div className="inventory-queue-topline">
                  <strong>{item.title}</strong>
                  <Tag color={item.severity === "high" ? "red" : item.severity === "medium" ? "orange" : "gold"}>
                    {item.severity}
                  </Tag>
                </div>
                <span>{item.message}</span>
              </div>
              {item.memberId ? (
                <div className="inventory-queue-actions">
                  <Button type="link" onClick={() => openMemberDrawer(item.memberId)}>
                    Review Access
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {!reviewQueue.length ? (
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              No access issues are currently waiting for review.
            </Typography.Paragraph>
          ) : null}
        </div>
      </Card>

      <Card
        bordered={false}
        title="Staff Directory"
        extra={
          canManageStaff ? (
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setStaffSearchModalOpen(true)}>
              Add Staff Member
            </Button>
          ) : "View only"
        }
      >
        <div className="inventory-filter-grid" style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by name or email"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <Select
            value={filters.role}
            onChange={(value) => setFilters((current) => ({ ...current, role: value }))}
            options={[
              { label: "All roles", value: "all" },
              ...(roles || []).map((role) => ({ label: role.name, value: role.key })),
              { label: "Super Admin", value: "super_admin" },
              { label: "Admin", value: "admin" },
            ]}
          />
          <Select
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
            options={[
              { label: "All statuses", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
          />
          <Select
            value={filters.workspace}
            onChange={(value) => setFilters((current) => ({ ...current, workspace: value }))}
            options={[
              { label: "All workspaces", value: "all" },
              ...Object.entries(catalog?.workspaceLabels || {}).map(([key, label]) => ({
                label,
                value: key,
              })),
            ]}
          />
        </div>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={filters.accessIssue}
            onChange={(value) => setFilters((current) => ({ ...current, accessIssue: value }))}
            options={[
              { label: "All access states", value: "all" },
              { label: "Only with issues", value: "yes" },
            ]}
            style={{ width: 220 }}
          />
          <Button onClick={() => loadStaffData(filters)} loading={loading}>
            Apply Filters
          </Button>
          <Button
            onClick={() => {
              setFilters(defaultDirectoryFilters);
              loadStaffData(defaultDirectoryFilters);
            }}
          >
            Reset
          </Button>
        </Space>

        <Table
          loading={loading}
          rowKey="id"
          dataSource={staff}
          columns={staffColumns}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Card
        bordered={false}
        title="Roles and Permissions"
        extra={
          canManageRoles ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openRoleModal()}>
              Create Role
            </Button>
          ) : "View only"
        }
      >
        <Table rowKey="id" dataSource={roles} columns={roleTableColumns} pagination={{ pageSize: 6 }} />
      </Card>

      {canReadAudit ? (
        <Card bordered={false} title="Access Audit Log" extra={`${audit.length} recent entries`}>
          <Table
            rowKey="id"
            dataSource={audit}
            pagination={{ pageSize: 6 }}
            columns={[
              {
                title: "Action",
                key: "action",
                render: (_, record) => (
                  <div className="inventory-link-cell">
                    <strong>{record.action}</strong>
                    <span>{record.targetName || record.targetType}</span>
                  </div>
                ),
              },
              { title: "Actor", dataIndex: "actorName", key: "actorName", width: 180 },
              {
                title: "When",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 180,
                render: (value) => formatDate(value),
              },
            ]}
          />
        </Card>
      ) : null}

      <Drawer
        open={memberDrawerOpen}
        title={selectedMember ? `${selectedMember.name} - Access Profile` : "Staff Profile"}
        width={760}
        onClose={() => setMemberDrawerOpen(false)}
      >
        {selectedMember ? (
          <Tabs
            items={[
              {
                key: "overview",
                label: "Overview",
                children: (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Email">{selectedMember.email}</Descriptions.Item>
                    <Descriptions.Item label="Current Role">{selectedMember.roleDisplayName}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={selectedMember.isActive ? "green" : "red"}>
                        {selectedMember.isActive ? "Active" : "Inactive"}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Responsibilities">
                      {(selectedMember.responsibilities || [])
                        .map((responsibility) => {
                          const option = (catalog?.responsibilities || []).find((item) => item.key === responsibility);
                          return option?.label || responsibility;
                        })
                        .join(", ") || "None assigned"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Workspaces">
                      {(selectedMember.assignedWorkspaces || []).join(", ") || "No assigned workspaces"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Permission Summary">
                      {buildHumanPermissionSummary(selectedMember)}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: "permissions",
                label: "Inherited + Effective",
                children: (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Typography.Title level={5}>Role Defaults</Typography.Title>
                    <Typography.Paragraph>
                      {buildHumanPermissionSummary({
                        workspaceAccess: selectedMember.roleDefaults?.workspaceAccess,
                        permissions: selectedMember.roleDefaults?.permissions,
                        sensitivePermissions: selectedMember.roleDefaults?.sensitivePermissions,
                      })}
                    </Typography.Paragraph>
                    <Typography.Title level={5}>Individual Overrides</Typography.Title>
                    <Typography.Paragraph>
                      Grants: {(selectedMember.permissionOverrides?.grantPermissions || []).join(", ") || "None"}
                    </Typography.Paragraph>
                    <Typography.Paragraph>
                      Revokes: {(selectedMember.permissionOverrides?.revokePermissions || []).join(", ") || "None"}
                    </Typography.Paragraph>
                  </Space>
                ),
              },
              {
                key: "warnings",
                label: "Warnings",
                children: (
                  <List
                    dataSource={selectedMember.accessWarnings || []}
                    locale={{ emptyText: "No access warnings for this staff member." }}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<WarningOutlined />}
                          title={item.label}
                          description={item.message}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: "audit",
                label: "Recent Activity",
                children: (
                  <List
                    dataSource={memberAudit}
                    locale={{ emptyText: "No recent access activity for this member." }}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<AuditOutlined />}
                          title={`${item.action} by ${item.actorName}`}
                          description={formatDate(item.createdAt)}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        ) : null}
      </Drawer>

      <Modal
        open={roleModalOpen}
        title={editingRole ? "Edit Role" : "Create Role"}
        width={920}
        onOk={handleSaveRole}
        onCancel={() => setRoleModalOpen(false)}
        okText={editingRole ? "Update Role" : "Create Role"}
      >
        <Form layout="vertical">
          <Form.Item label="Role Name">
            <Input
              value={roleFormState.name}
              onChange={(event) =>
                setRoleFormState((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Form.Item>
          <Form.Item label="Description">
            <Input.TextArea
              rows={2}
              value={roleFormState.description}
              onChange={(event) =>
                setRoleFormState((current) => ({ ...current, description: event.target.value }))
              }
            />
          </Form.Item>
          <Form.Item label="Authorization Hierarchy">
            <Select
              disabled={editingRole?.key === "super_admin"}
              value={roleFormState.accountRole}
              onChange={(value) =>
                setRoleFormState((current) => ({ ...current, accountRole: value }))
              }
              options={[
                { label: "Staff", value: "staff" },
                { label: "Admin", value: "admin" },
                { label: "Super Admin", value: "super_admin" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Role Responsibilities">
            <Select
              mode="multiple"
              value={roleFormState.profile?.responsibilities || []}
              onChange={(nextValues) =>
                setRoleFormState((current) => ({
                  ...current,
                  profile: {
                    ...current.profile,
                    responsibilities: nextValues,
                  },
                }))
              }
              options={(catalog?.responsibilities || []).map((responsibility) => ({
                label: responsibility.label,
                value: responsibility.key,
              }))}
            />
          </Form.Item>
          <div className="catalog-phase-note">
            <strong>Permission Summary:</strong> {roleSummary}
          </div>
          <PermissionMatrixEditor
            catalog={catalog}
            value={roleFormState}
            onChange={setRoleFormState}
            mode="role"
            showCopyRole
            roleOptions={roleOptions}
            onCopyRole={(roleId) => {
              const source = roles.find((role) => role.id === roleId);
              if (!source) {
                return;
              }
              setRoleFormState((current) => ({
                ...current,
                profile: source.profile,
              }));
            }}
          />
        </Form>
      </Modal>

      <Modal
        open={staffSearchModalOpen}
        title="Add Staff Member"
        footer={null}
        onCancel={() => setStaffSearchModalOpen(false)}
      >
        <Input
          allowClear
          autoFocus
          prefix={<MailOutlined />}
          placeholder="Search by full or partial email"
          value={staffSearchQuery}
          onChange={(event) => setStaffSearchQuery(event.target.value)}
        />
        <List
          style={{ marginTop: 16 }}
          dataSource={staffSearchResults}
          locale={{
            emptyText: staffSearchQuery.trim()
              ? "No registered account matched this search."
              : "Start typing an email address to search registered users.",
          }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="assign" type="link" onClick={() => openAssignModal(item)}>
                  {item.canAccessAdmin ? "Manage Access" : "Assign Role"}
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<UserAddOutlined />}
                title={`${item.name} (${item.roleDisplayName})`}
                description={`${item.email} - ${item.isActive ? "Active account" : "Inactive account"}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        open={assignModalOpen}
        title={assignTarget ? `Manage Staff Access - ${assignTarget.name}` : "Manage Staff Access"}
        width={980}
        onCancel={() => setAssignModalOpen(false)}
        onOk={() => handleSaveAccess(false)}
        okText="Save Access"
      >
        <Form layout="vertical">
          <Form.Item label="Role">
            <Select
              value={assignFormState.roleId}
              onChange={(value) => {
                const nextRole = roles.find((role) => role.id === value);
                setAssignFormState((current) => ({
                  ...current,
                  roleId: value,
                  responsibilities: nextRole?.profile?.responsibilities || [],
                  permissionOverrides: emptyOverrides,
                }));
              }}
              options={roleOptions}
            />
          </Form.Item>

          <Form.Item label="Assigned Responsibilities">
            <Select
              mode="multiple"
              value={assignFormState.responsibilities}
              onChange={(nextValues) =>
                setAssignFormState((current) => ({
                  ...current,
                  responsibilities: nextValues,
                }))
              }
              options={(catalog?.responsibilities || []).map((responsibility) => ({
                label: responsibility.label,
                value: responsibility.key,
              }))}
            />
          </Form.Item>

          <div className="catalog-phase-note">
            <strong>Access Summary:</strong> {accessSummary}
          </div>

          <PermissionMatrixEditor
            catalog={catalog}
            value={assignFormState}
            onChange={setAssignFormState}
            mode="override"
          />

          {activeRole?.accountRole === "super_admin" || canPromoteSuperAdmin ? (
            <Form.Item label="Confirmation for Super Admin promotion or sensitive change">
              <Input
                placeholder="Type the target user's email when promoting to Super Admin"
                value={assignFormState.confirmValue}
                onChange={(event) =>
                  setAssignFormState((current) => ({
                    ...current,
                    confirmValue: event.target.value,
                  }))
                }
              />
            </Form.Item>
          ) : null}

          {assignTarget?.canAccessAdmin ? (
            <Space>
              <Button
                onClick={() =>
                  setAssignFormState((current) => ({
                    ...current,
                    responsibilities: activeRole?.profile?.responsibilities || [],
                    permissionOverrides: emptyOverrides,
                  }))
                }
              >
                Reset to Role Defaults
              </Button>
              <Popconfirm
                title="Revoke this staff member's admin access?"
                onConfirm={() => handleSaveAccess(true)}
              >
                <Button danger>Revoke Admin Access</Button>
              </Popconfirm>
            </Space>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
