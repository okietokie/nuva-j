import api from "./api";
import { mockOrders } from "../data/mockProducts";

export const createOrder = async (payload) => {
  const response = await api.post("/orders", payload);
  return response.data;
};

export const getMyOrders = async () => {
  try {
    const response = await api.get("/orders/me");
    return response.data;
  } catch (error) {
    return mockOrders;
  }
};

export const getAllOrders = async () => {
  try {
    const response = await api.get("/orders");
    return response.data;
  } catch (error) {
    return mockOrders;
  }
};

export const updateOrderStatus = async (orderId, payload) => {
  const response = await api.patch(`/orders/${orderId}/status`, payload);
  return response.data;
};
