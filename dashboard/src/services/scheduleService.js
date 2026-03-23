import api from "./api";

export async function getSchedules() {
  const response = await api.get("/schedules");
  return response.data;
}

export async function createSchedule(payload) {
  const response = await api.post("/schedules", payload);
  return response.data;
}

export async function updateSchedule(id, payload) {
  const response = await api.put(`/schedules/${id}`, payload);
  return response.data;
}

export async function deleteSchedule(id, adminId) {
  const response = await api.delete(`/schedules/${id}`, {
    params: { admin_id: adminId },
  });

  return response.data;
}
