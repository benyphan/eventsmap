import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getEventsNearby } from "../api/client";
import { fmtDateTime } from "../utils/datetime";
import { loadLastLocation, saveLastLocation, getCurrentPosition } from "../utils/location";

export default function FeedScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    setRefreshing(true);
    try {
      // Сразу показываем события у последней известной позиции,
      // затем обновляем по свежему GPS. Без «молчаливого» фолбэка на Москву.
      const saved = await loadLastLocation();
      let lat = saved ? saved.lat : 55.751244;
      let lng = saved ? saved.lng : 37.618423;
      try {
        const data = await getEventsNearby(lat, lng, 100000);
        setEvents(data);
      } catch (e) {
        console.log("Ошибка загрузки событий", e.message);
      }
      const pos = await getCurrentPosition();
      if (pos) {
        saveLastLocation(pos);
        try {
          const data = await getEventsNearby(pos.lat, pos.lng, 100000);
          setEvents(data);
        } catch (e) {
          console.log("Ошибка загрузки событий", e.message);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const openDetail = (item) => {
    navigation.navigate("EventDetail", { eventId: item.id });
  };

  const distanceText = (item) => {
    if (item.distance_m === null || item.distance_m === undefined) return "";
    const km = item.distance_m / 1000;
    if (km >= 1) return `📍 ${km.toFixed(1)} км от тебя`;
    return `📍 ${Math.round(item.distance_m)} м от тебя`;
  };

  const criteriaText = (item) => {
    const c = item.criteria;
    if (!c) return "";
    const parts = [];
    if (c.gender) parts.push({ male: "Мужчины", female: "Женщины", any: "Любой пол" }[c.gender] || c.gender);
    if (c.min_age || c.max_age) parts.push(`${c.min_age || "0"}-${c.max_age || "∞"} лет`);
    if (c.nationality) parts.push(c.nationality);
    if (c.subculture) parts.push(c.subculture);
    if (c.interests?.length) parts.push(`интересы: ${c.interests.slice(0, 3).join(", ")}`);
    return parts.join(" • ");
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={styles.list}
        data={events}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadEvents} />}
        ListEmptyComponent={<Text style={styles.empty}>Рядом пока нет мероприятий</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.category ? <Text style={styles.cardCategory}>{item.category}</Text> : null}
            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={3}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.cardDate}>
              {fmtDateTime(item.start_at)}
            </Text>
            {item.address ? <Text style={styles.cardAddress}>📍 {item.address}</Text> : null}
            {distanceText(item) ? (
              <Text style={styles.cardDistance}>{distanceText(item)}</Text>
            ) : null}
            {criteriaText(item) ? (
              <Text style={styles.cardCriteria}>{criteriaText(item)}</Text>
            ) : null}
            <Text style={styles.cardMeta}>
              👥 {item.participant_count || 0} / {item.max_participants || "∞"}
            </Text>
            <TouchableOpacity style={styles.joinButton} onPress={() => openDetail(item)}>
              <Text style={styles.joinButtonText}>Хочу пойти</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateEvent")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f7f7f7" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    margin: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardCategory: { color: "#FF4458", marginTop: 4, fontSize: 13 },
  cardDescription: { marginTop: 8, color: "#444" },
  cardDate: { marginTop: 8, color: "#888", fontSize: 12 },
  cardDistance: { marginTop: 4, color: "#FF4458", fontSize: 13, fontWeight: "600" },
  cardAddress: { marginTop: 4, color: "#555", fontSize: 13 },
  cardCriteria: { marginTop: 4, color: "#FF4458", fontSize: 12 },
  cardMeta: { marginTop: 6, color: "#888", fontSize: 12 },
  joinButton: {
    marginTop: 12,
    backgroundColor: "#FF4458",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  joinButtonText: { color: "#fff", fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF4458",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
