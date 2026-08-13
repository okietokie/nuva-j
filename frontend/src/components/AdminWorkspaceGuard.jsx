import { useAuth } from "../context/AuthContext";
import AdminForbiddenPage from "../pages/admin/AdminForbiddenPage";

export default function AdminWorkspaceGuard({ workspace, children }) {
  const { hasWorkspaceAccess } = useAuth();

  if (!hasWorkspaceAccess(workspace)) {
    return (
      <AdminForbiddenPage description="Your current staff role does not include this admin workspace." />
    );
  }

  return children;
}
