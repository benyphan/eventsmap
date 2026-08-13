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
import { getEventsNearby, getMyEvents } from "../api/client";
import { fmtDateTime } from "../utils/datetime";
import { loadLastLocation, saveLastLocation, getCurrentPosition } from "../utils/location";

const MINE_BADGE = {
  owner: { text: "Организатор", style: "owner" },
  approved: { text: "Участвую", style: "approved" },
  requested: { text: "Заявка на рассмотрении", style: "pending" },
  rejected: { text: "Отклонена", style: "rejected" },
};

export default function FeedScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("nearby");

  const loadEvents = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "mine") {
        const data = await getMyEvents();
        setEvents(data);
        return;
      }
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
  }, [tab]);

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

  const mineBadge = (item) => {
    if (item.is_owner) return MINE_BADGE.owner;
    return MINE_BADGE[item.my_participant_status] || null;
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "nearby" && styles.tabActive]}
          onPress={() => setTab("nearby")}
        >
          <Text style={[styles.tabText, tab === "nearby" && styles.tabTextActive]}>
            Рядом
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "mine" && styles.tabActive]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.tabText, tab === "mine" && styles.tabTextActive]}>
            Мои мероприятия
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        style={styles.list}
        data={events}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadEvents} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === "mine" ? "У тебя пока нет мероприятий" : "Рядом пока нет мероприятий"}
          </Text>
        }
        renderItem={({ item }) => {
          const badge = tab === "mine" ? mineBadge(item) : null;
          return (
            <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {badge ? (
                  <View style={[styles.badge, styles[`badge_${badge.style}`]]}>
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                ) : null}
              </View>
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
                <Text style={styles.joinButtonText}>
                  {tab === "mine" ? "Открыть" : "Хочу пойти"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
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
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF4458",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8a8a93",
  },
  tabTextActive: {
    color: "#FF4458",
  },
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
  cardCategory: { color: "#FF4458", marginTop: 4, fontSize: 13 },
  cardDescription: { marginTop: 8, color: "#444" },
  cardDate: { marginTop: 8, color: "#888", fontSize: 12 },
  cardDistance: { marginTop: 4, color: "#FF4458", fontSize: 13, fontWeight: "600" },
  cardAddress: { marginTop: 4, color: "#555", fontSize: 13 },
  cardCriteria: { marginTop: 4, color: "#FF4458", fontSize: 12 },
  cardMeta: { marginTop: 6, color: "#888", fontSize: 12 },
  badge: {
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badge_owner: { backgroundColor: "#fff5f6", borderWidth: 1, borderColor: "#FF4458" },
  badge_approved: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#16a34a" },
  badge_pending: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#f59e0b" },
  badge_rejected: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#dc2626" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#333" },
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
