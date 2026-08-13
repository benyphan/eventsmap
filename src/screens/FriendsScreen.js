import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getFriends, getMe, createChat, BASE_URL } from "../api/client";
import { Ionicons } from "@expo/vector-icons";

function fullUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function FriendsScreen() {
  const navigation = useNavigation();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([getMe(), getFriends()]);
      const items = list
        .map((r) => {
          const isFrom = r.from_user_id === me.id;
          return {
            id: r.id,
            userId: isFrom ? r.to_user_id : r.from_user_id,
            name: isFrom ? r.to_user_name : r.from_user_name,
            avatar: isFrom ? r.to_user_avatar : r.from_user_avatar,
          };
        })
        .filter((f) => f.userId);
      setFriends(items);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось загрузить друзей");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleWrite = async (item) => {
    setBusyId(item.userId);
    try {
      const chat = await createChat(item.userId);
      navigation.navigate("Chat", {
        chatId: chat.id,
        otherUser: { id: item.userId, name: item.name, avatar_url: item.avatar },
      });
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось открыть чат");
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
      data={friends}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>Друзей пока нет</Text>}
      renderItem={({ item }) => {
        const avatarUri = fullUrl(item.avatar);
        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
                </View>
              )}
              <Text style={styles.name}>{item.name || "Пользователь"}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.writeBtn, busyId === item.userId && styles.disabled]}
                onPress={() => handleWrite(item)}
                disabled={busyId === item.userId}
              >
                <Text style={styles.writeText}>Написать</Text>
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
  actions: { flexDirection: "row", marginTop: 12 },
  writeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  writeText: { color: "#FF4458", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
