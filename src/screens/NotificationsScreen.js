import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getNotifications, markNotificationRead } from "../api/client";
import { fmtDateTime } from "../utils/datetime";

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setItems(data);
    } catch (e) {
      console.log("Не удалось загрузить уведомления", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePress = async (item) => {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
      } catch (e) {}
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={<Text style={styles.empty}>Уведомлений пока нет</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, !item.is_read && styles.cardUnread]}
          onPress={() => handlePress(item)}
        >
          <Text style={styles.title}>{item.title}</Text>
          {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
          <Text style={styles.date}>
            {fmtDateTime(item.created_at)}
          </Text>
        </TouchableOpacity>
      )}
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
  cardUnread: { borderLeftWidth: 3, borderLeftColor: "#FF4458" },
  title: { fontSize: 15, fontWeight: "700" },
  body: { marginTop: 4, color: "#444", fontSize: 14 },
  date: { marginTop: 8, color: "#aaa", fontSize: 12 },
});
