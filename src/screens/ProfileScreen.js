import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Share } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getMe,
  logout,
  uploadAvatar,
  getUserPosts,
  createPost,
  createPostWithImage,
  deletePost,
  getFriendRequests,
  getMyReferral,
  BASE_URL,
} from "../api/client";
import { fmtDateTime } from "../utils/datetime";
import ImageViewer from "../components/ImageViewer";

function fullUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function ProfileScreen({ onLoggedOut }) {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [requestsCount, setRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [referral, setReferral] = useState(null);
  const [copied, setCopied] = useState(false);

  const openViewer = (images, index) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      const ps = await getUserPosts(me.id);
      setPosts(ps);
    } catch (e) {
      console.log("Не удалось загрузить профиль", e.message);
    }
    try {
      const reqs = await getFriendRequests();
      setRequestsCount(reqs.length);
    } catch (e) {}
    try {
      const fr = await getFriends();
      setFriendsCount(fr.length);
    } catch (e) {}
    try {
      const ref = await getMyReferral();
      setReferral(ref);
    } catch (e) {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Нет доступа", "Разреши доступ к галерее в настройках телефона");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploading(true);
      const updated = await uploadAvatar(
        asset.uri,
        asset.fileName || "avatar.jpg",
        asset.mimeType || "image/jpeg"
      );
      setUser(updated);
      Alert.alert("Готово", "Фотография обновлена");
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  };

  const handleShareReferral = async () => {
    if (!referral?.code) return;
    try {
      await Share.share({
        message: `Присоединяйся ко мне в EventsMap! Введи код ${referral.code} при регистрации и получи бонусные баллы.`,
      });
    } catch (e) {}
  };

  const handleCopyReferral = async () => {
    if (!referral?.code) return;
    setCopied(true);
    try {
      await Share.share({ message: referral.code });
    } catch (e) {}
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLogout = async () => {
    await logout();
    onLoggedOut();
  };

  const handlePickPostImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Нет доступа", "Разреши доступ к галерее в настройках телефона");
        return;
      }
      const remaining = 8 - postImages.length;
      if (remaining <= 0) {
        Alert.alert("Максимум 8 фото", "В одном посте можно прикрепить не больше 8 фотографий.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      setPostImages((prev) => [...prev, ...result.assets].slice(0, 8));
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось выбрать фото");
    }
  };

  const removePostImage = (index) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPost = async () => {
    const text = postText.trim();
    if (!text) return;
    setPosting(true);
    try {
      let post;
      if (postImages.length > 0) {
        post = await createPostWithImage(text, postImages);
      } else {
        post = await createPost(text);
      }
      setPosts((prev) => [post, ...prev]);
      setPostText("");
      setPostImages([]);
      if (post.moderation_status === "pending") {
        Alert.alert("Отправлено на модерацию", "Пост появится после проверки модератором.");
      }
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось опубликовать пост");
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = (postId) => {
    Alert.alert("Удалить пост?", "Действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch (e) {
            Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось удалить пост");
          }
        },
      },
    ]);
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
            <TouchableOpacity style={styles.avatarWrap} onPress={handleChangePhoto} disabled={uploading}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || "?"}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>
            {user?.active_decoration ? "✨ " : ""}{user?.name}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>Посты</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{friendsCount}</Text>
              <Text style={styles.statLabel}>Друзья</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate("FriendRequests")}>
              <Text style={styles.statValue}>
                {requestsCount > 0 ? `${requestsCount} ·` : "—"}
              </Text>
              <Text style={styles.statLabel}>Запросы</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.notifButton} onPress={() => navigation.navigate("Notifications")}>
              <Ionicons name="notifications" size={16} color="#fff" />
              <Text style={styles.notifButtonText}>Уведомления</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatsBtn} onPress={() => navigation.navigate("Чаты")}>
              <Ionicons name="chatbubbles" size={16} color="#FF4458" />
              <Text style={styles.friendBtnText}>Чаты</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => navigation.navigate("Shop")}
            >
              <Ionicons name="gift" size={16} color="#fff" />
              <Text style={styles.shopBtnText}>Магазин</Text>
            </TouchableOpacity>
          </View>

          {referral?.code ? (
            <View style={styles.referralBox}>
              <View style={styles.referralTop}>
                <Text style={styles.referralTitle}>Пригласи друга</Text>
                <Text style={styles.referralCount}>
                  {referral.referral_count} приглашено · {referral.credits} баллов
                </Text>
              </View>
              <Text style={styles.referralHint}>
                Друг введёт твой код при регистрации — оба получите баллы
              </Text>
              <View style={styles.referralCodeRow}>
                <Text style={styles.referralCode}>{referral.code}</Text>
                <TouchableOpacity style={styles.referralShareBtn} onPress={handleShareReferral}>
                  <Text style={styles.referralShareText}>
                    {copied ? "Готово!" : "Поделиться"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.postComposer}>
            <TextInput
              style={styles.postInput}
              placeholder="Что у вас нового?"
              placeholderTextColor="#aaa"
              value={postText}
              onChangeText={setPostText}
              multiline
            />
            {postImages.length > 0 ? (
              <View style={styles.postImagesGrid}>
                {postImages.map((img, i) => (
                  <View key={`${img.uri}-${i}`} style={styles.postImageItem}>
                    <Image source={{ uri: img.uri }} style={styles.postImagePreview} />
                    <TouchableOpacity
                      style={styles.postImageRemove}
                      onPress={() => removePostImage(i)}
                    >
                      <Text style={styles.postImageRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.postPhotoBtn} onPress={handlePickPostImage}>
                <Text style={styles.postPhotoText}>📷 Фото ({postImages.length}/8)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postButton, posting && styles.disabled]}
                onPress={handleAddPost}
                disabled={posting}
              >
                <Text style={styles.postButtonText}>{posting ? "..." : "Опубликовать"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Мои посты ({posts.length})</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Постов пока нет</Text>}
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.postAuthor}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.postAvatar} />
              ) : (
                <View style={styles.postAvatar}>
                  <Text style={styles.postAvatarText}>{user?.name?.[0]?.toUpperCase() || "?"}</Text>
                </View>
              )}
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthorName}>{user?.name}</Text>
                <Text style={styles.postDate}>{fmtDateTime(item.created_at)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePost(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#FF4458" />
            </TouchableOpacity>
          </View>
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
          {item.moderation_status === "pending" ? (
            <View style={styles.moderationBadge}>
              <Text style={styles.moderationBadgeText}>⏳ На модерации</Text>
            </View>
          ) : null}
          {item.moderation_status === "rejected" ? (
            <View style={[styles.moderationBadge, styles.rejectedBadge]}>
              <Text style={styles.moderationBadgeText}>✕ Отклонено модератором</Text>
            </View>
          ) : null}
        </View>
      )}
      ListFooterComponent={
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      }
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
    height: 140,
    backgroundColor: "#FF4458",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarWrap: { marginTop: -56 },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#FF4458",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#FF4458",
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 42, fontWeight: "700" },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraText: { fontSize: 16 },
  name: { fontSize: 22, fontWeight: "700", marginTop: 10 },
  email: { color: "#888", marginTop: 4 },
  bio: { marginTop: 10, textAlign: "center", color: "#444", paddingHorizontal: 24 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    alignSelf: "stretch",
    marginTop: 16,
    paddingHorizontal: 32,
  },
  statItem: { alignItems: "center", paddingHorizontal: 12 },
  statDivider: { width: 1, height: 28, backgroundColor: "#e5e7eb" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 12, color: "#8a8a93", marginTop: 2 },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  },
  notifButton: {
    backgroundColor: "#FF4458",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notifButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  friendBtnText: { color: "#FF4458", fontWeight: "600", fontSize: 13 },
  chatsBtn: {
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shopBtn: {
    backgroundColor: "#FF4458",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shopBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  referralBox: {
    alignSelf: "stretch",
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#fff5f6",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FF4458",
  },
  referralTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  referralTitle: { fontSize: 15, fontWeight: "700", color: "#FF4458" },
  referralCount: { fontSize: 12, color: "#888" },
  referralHint: { marginTop: 6, fontSize: 12, color: "#666" },
  referralCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  referralCode: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 3,
    color: "#111",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  referralShareBtn: {
    backgroundColor: "#FF4458",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  referralShareText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  postComposer: {
    alignSelf: "stretch",
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: "#f7f7f7",
    borderRadius: 16,
    padding: 12,
  },
  postInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
  },
  postImageWrap: { marginTop: 8, alignSelf: "flex-start" },
  postImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  postImageItem: { position: "relative" },
  postImagePreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  postImageGrid: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  postImageRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  postImageRemoveText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  postActions: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  postPhotoBtn: {
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  postPhotoText: { color: "#FF4458", fontWeight: "600", fontSize: 13 },
  postButton: {
    flex: 1,
    backgroundColor: "#FF4458",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  postButtonText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    alignSelf: "flex-start",
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  empty: { textAlign: "center", marginTop: 24, color: "#999" },
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
  postHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  postAuthor: { flexDirection: "row", alignItems: "center", flex: 1 },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  postAvatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  postAuthorInfo: { flex: 1 },
  postAuthorName: { fontSize: 14, fontWeight: "700", color: "#222" },
  deleteBtn: { padding: 2, marginLeft: 10 },
  postText: { fontSize: 14, color: "#333", lineHeight: 20, marginTop: 10 },
  postImage: {
    marginTop: 12,
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  moderationBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  rejectedBadge: { backgroundColor: "#fef2f2" },
  moderationBadgeText: { color: "#b45309", fontSize: 12, fontWeight: "600" },
  postDate: { marginTop: 2, color: "#aaa", fontSize: 12 },
  logoutButton: {
    marginTop: 20,
    marginBottom: 32,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logoutText: { color: "#FF4458", fontWeight: "600" },
});
