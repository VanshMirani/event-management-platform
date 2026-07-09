import { apiDelete, apiGet, apiPatch, apiPost } from "./http.js";

export async function listAdminUsers() {
  const response = await apiGet("/admin/users");
  return response.data;
}

export async function updateAdminUserStatus(userId, status) {
  const response = await apiPatch(`/admin/users/${userId}/status`, { status });
  return response.data.user;
}

export async function listAdminCategories() {
  const response = await apiGet("/admin/categories");
  return response.data.categories;
}

export async function createAdminCategory(data) {
  const response = await apiPost("/admin/categories", data);
  return response.data.category;
}

export async function updateAdminCategory(categoryId, data) {
  const response = await apiPatch(`/admin/categories/${categoryId}`, data);
  return response.data.category;
}

export async function deleteAdminCategory(categoryId) {
  await apiDelete(`/admin/categories/${categoryId}`);
}
