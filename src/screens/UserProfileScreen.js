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
import { Ionicons } from "@expo/vector-icons";
import {
  getUserProfile,
  getUserPosts,
  sendFriendRequest,
  createChat,
  BASE_URL,
} from "../api/client";
import { fmtDateTime } from "../utils/datetime";
import ImageViewer from "../components/ImageViewer";

function fullUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function UserProfileScreen({ route }) {
  const { userId } = route.params;
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  const openViewer = (images, index) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const load = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([getUserProfile(userId), getUserPosts(userId)]);
      setUser(u);
      setPosts(p);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAddFriend = async () => {
    setBusy(true);
    try {
      await sendFriendRequest(userId);
      Alert.alert("Отправлено", "Запрос в друзья отправлен.");
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось отправить запрос");
    } finally {
      setBusy(false);
    }
  };

  const handleWrite = async () => {
    setBusy(true);
    try {
      const chat = await createChat(userId);
      navigation.navigate("Chat", { chatId: chat.id, otherUser: user });
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось открыть чат");
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

  const avatarUri = fullUrl(user?.avatar_url);

  return (
    <>
      <FlatList
        style={styles.container}
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerBand} />
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || "?"}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          {user?.username ? <Text style={styles.username}>@{user.username}</Text> : null}
          {user?.active_decoration_emoji || user?.active_decoration_name ? (
            <View style={styles.decorBadge}>
              <Text style={styles.decorBadgeText}>
                {user?.active_decoration_emoji || "✨"}{" "}
                {user?.active_decoration_name || "Украшение"}
              </Text>
            </View>
          ) : null}
          <Text style={styles.email}>{user?.email}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, busy && styles.disabled]}
              onPress={handleAddFriend}
              disabled={busy}
            >
              <Ionicons name="person-add" size={18} color="#FF4458" />
              <Text style={styles.btnText}>В друзья</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, busy && styles.disabled]}
              onPress={handleWrite}
              disabled={busy}
            >
              <Ionicons name="chatbubble" size={18} color="#FF4458" />
              <Text style={styles.btnText}>Написать</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, busy && styles.disabled]}
              onPress={() => navigation.navigate("Shop", { giftTo: user })}
              disabled={busy}
            >
              <Ionicons name="gift" size={18} color="#FF4458" />
              <Text style={styles.btnText}>Подарить</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Посты ({posts.length})</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Постов пока нет</Text>}
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <Text style={styles.postText}>{item.text}</Text>
          {item.image_urls?.length > 0 ? (
            <View style={styles.postImagesGrid}>
              {item.image_urls.map((url, i) => (
                <TouchableOpacity
                  key={`${url}-${i}`}
                  onPress={() => openViewer(item.image_urls, i)}
                >
                  <Image source={{ uri: fullUrl(url) }} style={styles.postImageGrid} />
                </TouchableOpacity>
              ))}
            </View>
          ) : item.image_url ? (
            <TouchableOpacity onPress={() => openViewer([item.image_url], 0)}>
              <Image source={{ uri: fullUrl(item.image_url) }} style={styles.postImage} />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.postDate}>
            {fmtDateTime(item.created_at)}
          </Text>
        </View>
      )}
    />
    <ImageViewer
      visible={viewerVisible}
      images={viewerImages}
      index={viewerIndex}
      onClose={() => setViewerVisible(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#f2f3f7" },
  header: { alignItems: "center", paddingBottom: 20, backgroundColor: "#fff" },
  headerBand: {
    alignSelf: "stretch",
    height: 130,
    backgroundColor: "#FF4458",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarWrap: { marginTop: -52 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FF4458",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FF4458",
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700", marginTop: 12 },
  username: { color: "#FF4458", fontSize: 14, fontWeight: "600", marginTop: 4 },
  decorBadge: {
    marginTop: 8,
    backgroundColor: "#fff5f6",
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  decorBadgeText: { color: "#FF4458", fontSize: 14, fontWeight: "700" },
  email: { color: "#888", marginTop: 4 },
  bio: { marginTop: 10, textAlign: "center", color: "#444", paddingHorizontal: 24 },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  btnText: { color: "#FF4458", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    alignSelf: "flex-start",
    marginTop: 24,
    marginHorizontal: 16,
  },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  postText: { fontSize: 14, color: "#333", lineHeight: 20 },
  postImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  postImageGrid: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#eee",
    marginTop: 12,
  },
  postDate: { marginTop: 8, color: "#aaa", fontSize: 12 },
});
