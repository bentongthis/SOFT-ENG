import api from "./api";

export async function getSubjects() {
  const response = await api.get("/subjects");
  return response.data;
}

export async function createSubject(payload) {
  const response = await api.post("/subjects", payload);
  return response.data;
}
