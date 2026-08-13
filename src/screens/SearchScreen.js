import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { searchUsers, searchEventsNearby, BASE_URL } from "../api/client";

function fullUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function SearchScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("events");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    try {
      if (tab === "users") {
        const users = await searchUsers(query.trim());
        setResults(users);
      } else {
        const events = await searchEventsNearby(
          query.trim(),
          55.751244,
          37.618423,
          100000
        );
        setResults(events);
      }
      setSearched(true);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось выполнить поиск");
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setResults([]);
    setSearched(false);
  };

  const renderItem = ({ item }) => {
    if (tab === "users") {
      const avatarUri = fullUrl(item.avatar_url);
      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            {item.username ? (
              <Text style={[styles.rowSub, styles.tag]}>@{item.username}</Text>
            ) : null}
            {item.bio ? <Text style={styles.rowSub} numberOfLines={1}>{item.bio}</Text> : null}
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
      >
        <View style={[styles.avatar, styles.eventAvatar]}>
          <Text style={styles.avatarText}>📌</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowSub}>
            {item.address || `${item.lat?.toFixed(4)}, ${item.lng?.toFixed(4)}`}
          </Text>
        </View>
        {typeof item.distance_m === "number" ? (
          <Text style={styles.dist}>
            {item.distance_m >= 1000
              ? `${(item.distance_m / 1000).toFixed(1)} км`
              : `${item.distance_m} м`}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.input}
          placeholder="Поиск людей или мероприятий"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "events" && styles.tabActive]}
          onPress={() => switchTab("events")}
        >
          <Text style={[styles.tabText, tab === "events" && styles.tabTextActive]}>
            Мероприятия
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "users" && styles.tabActive]}
          onPress={() => switchTab("users")}
        >
          <Text style={[styles.tabText, tab === "users" && styles.tabTextActive]}>Люди</Text>
        </TouchableOpacity>
      </View>
      {searched && results.length === 0 ? (
        <Text style={styles.empty}>Ничего не найдено</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15 },
  tabs: { flexDirection: "row", gap: 8, marginHorizontal: 12, marginBottom: 6 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  tabActive: { backgroundColor: "#FF4458" },
  tabText: { color: "#666", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: {
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },
  eventAvatar: {
    backgroundColor: "#FFF5F6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#888", marginTop: 2 },
  tag: { color: "#FF4458", fontWeight: "600" },
  dist: { color: "#FF4458", fontSize: 13, fontWeight: "600" },
});
