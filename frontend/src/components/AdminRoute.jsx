import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return <Spin fullscreen />;
  }

  return isAuthenticated && isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
