import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

const BASE_URL = API_URL;
export { BASE_URL };

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Автоматически подставляем токен авторизации, если он есть
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function register(data) {
  const res = await api.post("/auth/register", data);
  return res.data;
}

export async function verifyRegistration(email, code) {
  const res = await api.post("/auth/verify-registration", { email, code });
  await AsyncStorage.setItem("access_token", res.data.access_token);
  return res.data;
}

export async function resendCode(email, purpose) {
  const res = await api.post("/auth/resend-code", { email, purpose });
  return res.data;
}

export async function requestPasswordReset(email) {
  const res = await api.post("/auth/request-password-reset", { email });
  return res.data;
}

export async function resetPassword(email, code, newPassword) {
  const res = await api.post("/auth/reset-password", {
    email,
    code,
    new_password: newPassword,
  });
  return res.data;
}

export async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  await AsyncStorage.setItem("access_token", res.data.access_token);
  return res.data;
}

export async function logout() {
  await AsyncStorage.removeItem("access_token");
}

export async function getMe() {
  const res = await api.get("/users/me");
  return res.data;
}

export async function updateMe(data) {
  const res = await api.patch("/users/me", null, { params: data });
  return res.data;
}

export async function getUserProfile(userId) {
  const res = await api.get(`/users/${userId}`);
  return res.data;
}

export async function searchUsers(q) {
  const res = await api.get("/users/search", { params: { q } });
  return res.data;
}

export async function getUserPosts(userId) {
  const res = await api.get(`/posts/user/${userId}`);
  return res.data;
}

export async function createPost(text) {
  const res = await api.post("/posts/", { text });
  return res.data;
}

export async function createPostWithImage(text, imageUris) {
  const form = new FormData();
  form.append("text", text);
  (imageUris || []).forEach((asset, i) => {
    form.append("files", {
      uri: asset.uri,
      name: asset.fileName || `photo_${i}.jpg`,
      type: asset.mimeType || "image/jpeg",
    });
  });
  const res = await api.post("/posts/with_image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deletePost(postId) {
  const res = await api.delete(`/posts/${postId}`);
  return res.data;
}

export async function sendFriendRequest(userId) {
  const res = await api.post(`/friends/${userId}`);
  return res.data;
}

export async function decideFriendRequest(requestId, status) {
  const res = await api.patch(`/friends/${requestId}`, null, { params: { status } });
  return res.data;
}

export async function getFriends() {
  const res = await api.get("/friends/");
  return res.data;
}

export async function getFriendRequests() {
  const res = await api.get("/friends/requests");
  return res.data;
}

export async function getChats() {
  const res = await api.get("/chats/");
  return res.data;
}

export async function createChat(userId) {
  const res = await api.post("/chats/", { user_id: userId });
  return res.data;
}

export async function getMessages(chatId) {
  const res = await api.get(`/chats/${chatId}/messages`);
  return res.data;
}

export async function getEventChat(eventId) {
  const res = await api.get(`/chats/event/${eventId}`);
  return res.data;
}

export async function sendMessageEnc(chatId, contentEnc) {
  const res = await api.post(`/chats/${chatId}/messages`, { content_enc: contentEnc });
  return res.data;
}

export async function searchEventsNearby(q, lat, lng, radiusM = 100000) {
  const res = await api.get("/events/", {
    params: { lat, lng, radius_m: radiusM, q },
  });
  return res.data;
}

export async function uploadAvatar(uri, fileName, mimeType) {
  const form = new FormData();
  form.append("file", { uri, name: fileName || "avatar.jpg", type: mimeType || "image/jpeg" });
  const res = await api.post("/users/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getEventsNearby(lat, lng, radiusM = 20000) {
  const res = await api.get("/events/", {
    params: { lat, lng, radius_m: radiusM },
  });
  return res.data;
}

export async function getMyEvents() {
  const res = await api.get("/events/mine");
  return res.data;
}

export async function getEvent(eventId) {
  const res = await api.get(`/events/${eventId}`);
  return res.data;
}

export async function getEventParticipants(eventId) {
  const res = await api.get(`/events/${eventId}/participants`);
  return res.data;
}

export async function createEvent(payload) {
  const res = await api.post("/events/", payload);
  return res.data;
}

export async function geocodeAddress(q) {
  const res = await api.get("/api/geocode", { params: { q } });
  return res.data;
}

export async function joinEvent(eventId) {
  const res = await api.post(`/events/${eventId}/join`);
  return res.data;
}

export async function decideParticipant(eventId, userId, status) {
  const res = await api.patch(`/events/${eventId}/participants/${userId}`, { status });
  return res.data;
}

export async function getNotifications() {
  const res = await api.get("/notifications/");
  return res.data;
}

export async function markNotificationRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function getMyReferral() {
  const res = await api.get("/referrals/me");
  return res.data;
}

export async function getShop() {
  const res = await api.get("/shop");
  return res.data;
}

export async function buyShopItem(itemId) {
  const res = await api.post(`/shop/buy/${itemId}`);
  return res.data;
}

export async function giftShopItem(itemId, toUserId, message) {
  const res = await api.post(`/shop/gift/${itemId}`, {
    to_user_id: toUserId,
    message: message || null,
  });
  return res.data;
}

export async function equipShopItem(itemId) {
  const res = await api.post(`/shop/equip/${itemId}`);
  return res.data;
}

export default api;
