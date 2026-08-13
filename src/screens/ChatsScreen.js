import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getChats, BASE_URL } from "../api/client";
import { bytesToUtf8 } from "../crypto/e2e";
import { base64ToBytes } from "../crypto/e2e";
import { fmtTime } from "../utils/datetime";

function fullUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function ChatsScreen() {
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getChats();
      setChats(data);
    } catch (e) {
      console.log("Не удалось загрузить чаты", e.message);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  const lastText = (m) => {
    if (!m?.content_enc) return "Нет сообщений";
    try {
      return bytesToUtf8(base64ToBytes(m.content_enc));
    } catch (e) {
      return "🔒 Сообщение";
    }
  };

  return (
    <FlatList
      style={styles.list}
      data={chats}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }
      ListEmptyComponent={<Text style={styles.empty}>Чатов пока нет</Text>}
      renderItem={({ item }) => {
        const other = item.other_user;
        const avatarUri = fullUrl(other?.avatar_url);
        const isGroup = !!item.is_group;
        const displayName = isGroup ? item.title || "Групповой чат" : other?.name || "Собеседник";
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("Chat", {
                chatId: item.id,
                otherUser: other,
                isGroup,
                title: item.title,
              })
            }
          >
            {avatarUri && !isGroup ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  isGroup ? styles.groupAvatar : styles.avatarPlaceholder,
                ]}
              >
                <Text style={styles.avatarText}>
                  {isGroup ? "👥" : other?.name?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.last}>
                {isGroup && item.member_count ? `👥 ${item.member_count} участника · ` : ""}
                {lastText(item.last_message)}
              </Text>
            </View>
            {item.last_message?.created_at ? (
              <Text style={styles.time}>
                {fmtTime(item.last_message.created_at)}
              </Text>
            ) : null}
          </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    margin: 10,
    marginBottom: 4,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },
  groupAvatar: {
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "600" },
  last: { fontSize: 13, color: "#888", marginTop: 3 },
  time: { fontSize: 12, color: "#aaa" },
});
