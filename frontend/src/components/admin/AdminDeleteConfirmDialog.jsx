import { Modal } from "antd";

export default function AdminDeleteConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <Modal
      open={open}
      title={title}
      okText={confirmLabel}
      cancelText="Cancel"
      onOk={onConfirm}
      onCancel={onCancel}
      okButtonProps={{ danger: true, loading }}
      cancelButtonProps={{ disabled: loading }}
      destroyOnClose
    >
      <p>{message}</p>
    </Modal>
  );
}
