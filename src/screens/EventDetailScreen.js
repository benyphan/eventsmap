import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getEvent, getEventParticipants, joinEvent, decideParticipant } from "../api/client";
import { fmtDateTime } from "../utils/datetime";

const STATUS_TEXT = {
  approved: "Одобрен",
  requested: "Ожидает решения",
  rejected: "Отклонён",
  cancelled: "Отменён",
};

export default function EventDetailScreen({ route }) {
  const { eventId } = route.params;
  const navigation = useNavigation();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myStatus, setMyStatus] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ev, parts] = await Promise.all([getEvent(eventId), getEventParticipants(eventId)]);
      setEvent(ev);
      setParticipants(parts);
      const me = parts.find((p) => p.is_me);
      setMyStatus(me ? me.status : null);
      setIsOwner(ev.is_owner || false);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось загрузить мероприятие");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleJoin = async () => {
    setBusy(true);
    try {
      await joinEvent(eventId);
      setMyStatus("requested");
      Alert.alert("Заявка отправлена", "Организатор рассмотрит и подтвердит участие.");
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  };

  const handleDecide = async (userId, status) => {
    setBusy(true);
    try {
      await decideParticipant(eventId, userId, status);
      await load();
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось обновить заявку");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  const criteriaText = () => {
    const c = event?.criteria;
    if (!c) return "";
    const parts = [];
    if (c.gender) parts.push({ male: "Мужчины", female: "Женщины", any: "Любой пол" }[c.gender] || c.gender);
    if (c.min_age || c.max_age) parts.push(`${c.min_age || "0"}-${c.max_age || "∞"} лет`);
    if (c.nationality) parts.push(c.nationality);
    if (c.subculture) parts.push(c.subculture);
    if (c.interests?.length) parts.push(`интересы: ${c.interests.slice(0, 3).join(", ")}`);
    return parts.join(" • ");
  };

  const pending = participants.filter((p) => p.status === "requested");
  const approved = participants.filter((p) => p.status === "approved");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      {event.category ? <Text style={styles.category}>{event.category}</Text> : null}
      <Text style={styles.date}>{fmtDateTime(event.start_at)}</Text>
      {event.address ? <Text style={styles.address}>📍 {event.address}</Text> : null}
      <Text style={styles.coords}>
        {event.lat?.toFixed(5)}, {event.lng?.toFixed(5)}
      </Text>

      {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

      {event.tags?.length ? (
        <View style={styles.tagsRow}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {event.owner_id ? (
        <TouchableOpacity
          style={styles.ownerRow}
          onPress={() => navigation.navigate("UserProfile", { userId: event.owner_id })}
        >
          <Text style={styles.ownerLabel}>Организатор:</Text>
          <Text style={styles.ownerName}>{event.owner_name || "Пользователь"}</Text>
        </TouchableOpacity>
      ) : null}

      {criteriaText() ? <Text style={styles.criteria}>Критерии: {criteriaText()}</Text> : null}
      <Text style={styles.meta}>
        Участников: {approved.length} / {event.max_participants || "без лимита"}
      </Text>
      {event.moderation_note ? (
        <Text style={styles.note}>⚠ {event.moderation_note}</Text>
      ) : null}

      {!isOwner ? (
        myStatus === null ? (
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.disabled]}
            onPress={handleJoin}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>Хочу пойти</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              Твоя заявка: {STATUS_TEXT[myStatus] || myStatus}
            </Text>
          </View>
        )
      ) : null}

      {isOwner && pending.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Заявки ({pending.length})</Text>
          {pending.map((p) => (
            <View key={p.id} style={styles.requestCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestName}>{p.user_name || "Пользователь"}</Text>
                <Text style={styles.requestDate}>
                  {fmtDateTime(p.requested_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.smallBtn, styles.approveBtn, busy && styles.disabled]}
                onPress={() => handleDecide(p.user_id, "approved")}
                disabled={busy}
              >
                <Text style={styles.smallBtnText}>Одобрить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, styles.rejectBtn, busy && styles.disabled]}
                onPress={() => handleDecide(p.user_id, "rejected")}
                disabled={busy}
              >
                <Text style={styles.smallBtnText}>Отклонить</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {isOwner && participants.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Участники</Text>
          {participants.map((p) => (
            <View key={p.id} style={styles.participantRow}>
              <Text style={{ flex: 1 }}>{p.user_name || "Пользователь"}</Text>
              <Text style={styles.statusPill}>{STATUS_TEXT[p.status] || p.status}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "800" },
  category: { color: "#FF4458", marginTop: 4, fontSize: 14 },
  date: { marginTop: 8, color: "#666", fontSize: 14 },
  address: { marginTop: 6, color: "#555", fontSize: 14 },
  coords: { marginTop: 2, color: "#aaa", fontSize: 12 },
  description: { marginTop: 14, color: "#333", fontSize: 15, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  tagChip: {
    backgroundColor: "#fff5f6",
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "#FF4458", fontSize: 13, fontWeight: "600" },
  ownerRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  ownerLabel: { color: "#888", fontSize: 13 },
  ownerName: { color: "#FF4458", fontSize: 14, fontWeight: "700" },
  criteria: { marginTop: 10, color: "#FF4458", fontSize: 13 },
  meta: { marginTop: 8, color: "#666", fontSize: 13 },
  note: { marginTop: 10, backgroundColor: "#fff7ed", color: "#b45309", padding: 10, borderRadius: 10, fontSize: 13 },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#FF4458",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  statusBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff5f6",
  },
  statusText: { color: "#FF4458", fontWeight: "600" },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  requestName: { fontSize: 15, fontWeight: "600" },
  requestDate: { fontSize: 12, color: "#999", marginTop: 2 },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  approveBtn: { backgroundColor: "#16a34a" },
  rejectBtn: { backgroundColor: "#dc2626" },
  smallBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statusPill: { color: "#888", fontSize: 13 },
});
