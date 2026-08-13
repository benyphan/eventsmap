import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMe, updateMe } from "../api/client";

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [showOnMap, setShowOnMap] = React.useState(true);
  const [policy, setPolicy] = useState("all");
  const [giftsVisibility, setGiftsVisibility] = useState("all");
  const [giftsPolicy, setGiftsPolicy] = useState("all");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      setPolicy(me.messages_policy || "all");
      setGiftsVisibility(me.gifts_visibility || "all");
      setGiftsPolicy(me.gifts_policy || "all");
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

  const changeGiftsVisibility = async (value) => {
    if (value === giftsVisibility) return;
    setSaving(true);
    try {
      await updateMe({ gifts_visibility: value });
      setGiftsVisibility(value);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось сохранить настройку");
    } finally {
      setSaving(false);
    }
  };

  const changeGiftsPolicy = async (value) => {
    if (value === giftsPolicy) return;
    setSaving(true);
    try {
      await updateMe({ gifts_policy: value });
      setGiftsPolicy(value);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось сохранить настройку");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Настройки</Text>

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

      <Text style={styles.sectionTitle}>Подарки</Text>
      <Text style={styles.sectionHint}>
        Кто может видеть полученные тобой подарки.
      </Text>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.option, giftsVisibility === "all" && styles.optionActive]}
          onPress={() => changeGiftsVisibility("all")}
          disabled={saving}
        >
          <Text style={[styles.optionText, giftsVisibility === "all" && styles.optionTextActive]}>
            Все
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, giftsVisibility === "friends" && styles.optionActive]}
          onPress={() => changeGiftsVisibility("friends")}
          disabled={saving}
        >
          <Text style={[styles.optionText, giftsVisibility === "friends" && styles.optionTextActive]}>
            Только друзья
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, giftsVisibility === "nobody" && styles.optionActive]}
          onPress={() => changeGiftsVisibility("nobody")}
          disabled={saving}
        >
          <Text style={[styles.optionText, giftsVisibility === "nobody" && styles.optionTextActive]}>
            Никто
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Кто может дарить подарки</Text>
      <Text style={styles.sectionHint}>
        Ограничение действует при отправке подарков тебе.
      </Text>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.option, giftsPolicy === "all" && styles.optionActive]}
          onPress={() => changeGiftsPolicy("all")}
          disabled={saving}
        >
          <Text style={[styles.optionText, giftsPolicy === "all" && styles.optionTextActive]}>
            Все
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, giftsPolicy === "friends" && styles.optionActive]}
          onPress={() => changeGiftsPolicy("friends")}
          disabled={saving}
        >
          <Text style={[styles.optionText, giftsPolicy === "friends" && styles.optionTextActive]}>
            Только друзья
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, giftsPolicy === "none" && styles.optionActive]}
          onPress={() => changeGiftsPolicy("none")}
          disabled={saving}
        >
          <Text style={[styles.optionText, giftsPolicy === "none" && styles.optionTextActive]}>
            Никто
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
