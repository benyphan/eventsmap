import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getMe, updateMe } from "../api/client";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = React.useState(true);
  const [showOnMap, setShowOnMap] = React.useState(true);
  const [policy, setPolicy] = useState("all");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      setPolicy(me.messages_policy || "all");
    } catch (e) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changePolicy = async (value) => {
    if (value === policy) return;
    setSaving(true);
    try {
      await updateMe({ messages_policy: value });
      setPolicy(value);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось сохранить настройку");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Настройки</Text>

      <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate("Shop")}>
        <Ionicons name="gift" size={20} color="#FF4458" />
        <Text style={styles.navLabel}>Магазин украшений и подарков</Text>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Кто может мне писать</Text>
      <Text style={styles.sectionHint}>
        Ограничение действует на новые личные чаты и сообщения.
      </Text>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.option, policy === "all" && styles.optionActive]}
          onPress={() => changePolicy("all")}
          disabled={saving}
        >
          <Text style={[styles.optionText, policy === "all" && styles.optionTextActive]}>
            Все пользователи
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, policy === "friends" && styles.optionActive]}
          onPress={() => changePolicy("friends")}
          disabled={saving}
        >
          <Text style={[styles.optionText, policy === "friends" && styles.optionTextActive]}>
            Только друзья
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Уведомления</Text>
        <Switch value={notifications} onValueChange={setNotifications} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Показывать меня на карте</Text>
        <Switch value={showOnMap} onValueChange={setShowOnMap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "700", marginBottom: 24 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 24,
  },
  navLabel: { fontSize: 15, flex: 1, color: "#333", fontWeight: "500" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 4 },
  sectionHint: { fontSize: 12, color: "#999", marginBottom: 12 },
  segment: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: "center",
  },
  optionActive: { backgroundColor: "#FF4458" },
  optionText: { fontSize: 14, color: "#666", fontWeight: "600" },
  optionTextActive: { color: "#fff" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: { fontSize: 16 },
});
