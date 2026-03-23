import api from "./api";

export async function loginUser(email, password) {
  const response = await api.post("/auth/login", { email, password });
  return response.data.user;
}

export async function registerUser(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data;
}
