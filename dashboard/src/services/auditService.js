import api from "./api";

export async function getAuditLogs() {
  const response = await api.get("/audit");
  return response.data;
}
