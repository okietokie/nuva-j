import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Spin fullscreen />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
