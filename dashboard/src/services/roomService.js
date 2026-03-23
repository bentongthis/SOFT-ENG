import api from "./api";

export async function getRooms() {
  const response = await api.get("/rooms");
  return response.data;
}

export async function createRoom(payload) {
  const response = await api.post("/rooms", payload);
  return response.data;
}
