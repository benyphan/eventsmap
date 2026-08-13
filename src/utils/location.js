import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Platform } from "react-native";

// Запасная точка по умолчанию — только для самого первого запуска,
// когда о пользователе ещё ничего не известно.
export const MOSCOW = { lat: 55.751244, lng: 37.618423 };

const LAST_LOC_KEY = "@last_known_location";

// Последняя успешно определённая позиция пользователя.
// Позволяет не «перепрыгивать» карту на Москву, когда GPS недоступен.
export async function loadLastLocation() {
  try {
    const raw = await AsyncStorage.getItem(LAST_LOC_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.lat === "number" && typeof p.lng === "number") {
        return { lat: p.lat, lng: p.lng };
      }
    }
  } catch (e) {}
  return null;
}

export async function saveLastLocation(pos) {
  if (!pos || typeof pos.lat !== "number" || typeof pos.lng !== "number") return;
  try {
    await AsyncStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lat: pos.lat, lng: pos.lng }));
  } catch (e) {}
}

// Текущие координаты устройства. Возвращает null при отказе/таймауте —
// без «молчаливого» фолбэка на Москву.
export async function getCurrentPosition() {
  // На вебе expo-location требует navigator.permissions.query, который
  // недоступен во многих мобильных браузерах. Используем нативный API —
  // он сам запросит разрешение и корректно работает на всех платформах.
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 15000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  }
  try {
    const { status } = await Promise.race([
      Location.requestForegroundPermissionsAsync(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Таймаут разрешения")), 6000)),
    ]);
    if (status !== "granted") return null;
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({}),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Таймаут геолокации")), 8000)),
    ]);
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch (e) {
    return null;
  }
}

// Точка по умолчанию для форм/карты: последняя известная, иначе Москва.
export async function getDefaultLocation() {
  return (await loadLastLocation()) || MOSCOW;
}
