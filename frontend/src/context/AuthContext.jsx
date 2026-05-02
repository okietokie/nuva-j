import { createContext, useContext, useEffect, useState } from "react";
import { message } from "antd";
import { getCurrentUser, loginUser, registerUser } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const token = localStorage.getItem("nuva_token");

    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => {
        localStorage.removeItem("nuva_token");
        localStorage.removeItem("nuva_user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (values) => {
    const response = await loginUser(values);
    localStorage.setItem("nuva_token", response.access_token);
    localStorage.setItem("nuva_user", JSON.stringify(response.user));
    setUser(response.user);
    messageApi.success("Welcome back to NUVA.");
    return response.user;
  };

  const register = async (values) => {
    const response = await registerUser(values);
    localStorage.setItem("nuva_token", response.access_token);
    localStorage.setItem("nuva_user", JSON.stringify(response.user));
    setUser(response.user);
    messageApi.success("Your NUVA account is ready.");
    return response.user;
  };

  const logout = () => {
    localStorage.removeItem("nuva_token");
    localStorage.removeItem("nuva_user");
    setUser(null);
    messageApi.info("You have been signed out.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === "admin"
      }}
    >
      {contextHolder}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
