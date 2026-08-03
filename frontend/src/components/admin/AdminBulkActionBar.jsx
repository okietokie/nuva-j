import { Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

export default function AdminBulkActionBar({
  selectedCount,
  pageCount,
  totalCount,
  onSelectAllResults,
  onDeleteSelected,
  onClearSelection,
  deleting = false,
  noun = "records",
}) {
  if (!selectedCount) {
    return null;
  }

  const countLabel = `${selectedCount} ${noun}${selectedCount === 1 ? "" : "s"} selected`;
  const canSelectAllResults = Boolean(
    onSelectAllResults && pageCount > 0 && totalCount > pageCount && selectedCount < totalCount,
  );

  return (
    <div className="admin-bulk-bar" role="status" aria-live="polite">
      <div className="admin-bulk-bar__summary">{countLabel}</div>
      <div className="admin-bulk-bar__actions">
        {canSelectAllResults ? (
          <Button type="text" onClick={onSelectAllResults}>
            Select all {totalCount} matching {noun}
          </Button>
        ) : null}
        <Button
          danger
          type="default"
          icon={<DeleteOutlined />}
          onClick={onDeleteSelected}
          loading={deleting}
        >
          Delete selected
        </Button>
        <Button onClick={onClearSelection} disabled={deleting}>
          Clear selection
        </Button>
      </div>
    </div>
  );
}
