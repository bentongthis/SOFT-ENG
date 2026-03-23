import api from "./api";

export async function getUsers(role = null) {
  const params = role ? { role } : {};
  const response = await api.get("/users", { params });
  return response.data;
}

export async function createUser(payload) {
  const response = await api.post("/users", payload);
  return response.data;
}
