import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getFriendRequests, decideFriendRequest, BASE_URL } from "../api/client";

function fullUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function FriendRequestsScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getFriendRequests();
      setItems(data);
    } catch (e) {
      console.log("Не удалось загрузить запросы", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDecide = async (id, status) => {
    setBusyId(id);
    try {
      await decideFriendRequest(id, status);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось обновить запрос");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>Входящих запросов нет</Text>}
      renderItem={({ item }) => {
        const avatarUri = fullUrl(item.from_user_avatar);
        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => navigation.navigate("UserProfile", { userId: item.from_user_id })}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {item.from_user_name?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <Text style={styles.name}>{item.from_user_name || "Пользователь"}</Text>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.acceptBtn, busyId === item.id && styles.disabled]}
                onPress={() => handleDecide(item.id, "accepted")}
                disabled={busyId === item.id}
              >
                <Text style={styles.acceptText}>Принять</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, busyId === item.id && styles.disabled]}
                onPress={() => handleDecide(item.id, "rejected")}
                disabled={busyId === item.id}
              >
                <Text style={styles.rejectText}>Отклонить</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { flex: 1, backgroundColor: "#f7f7f7" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    margin: 10,
    marginBottom: 4,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "600", flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  acceptText: { color: "#fff", fontWeight: "600" },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  rejectText: { color: "#dc2626", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
