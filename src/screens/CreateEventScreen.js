import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { createEvent } from "../api/client";

const MOSCOW = { lat: 55.751244, lng: 37.618423 };

const GENDERS = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
];

const INTEREST_OPTIONS = [
  "Рок", "Метал", "Хип-хоп", "Электроника", "Техно", "Инди",
  "Поп", "Джаз", "Классика", "Спорт", "Игры", "Кино", "Аниме",
  "Искусство", "Литература", "IT и стартапы", "Путешествия", "Фотография",
];

const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 9..23
const MINUTES = [0, 15, 30, 45];

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function dateChips() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    let label;
    if (i === 0) label = "Сегодня";
    else if (i === 1) label = "Завтра";
    else label = `${WEEKDAYS[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ date: d, label });
  }
  return out;
}

export default function CreateEventScreen({ navigation }) {
  const route = useRoute();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [location, setLocation] = useState(null);

  const [dateIndex, setDateIndex] = useState(0);
  const [hour, setHour] = useState(19);
  const [minute, setMinute] = useState(0);

  const [gender, setGender] = useState(null);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [nationality, setNationality] = useState("");
  const [subcultureOnly, setSubcultureOnly] = useState(false);
  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dates = useMemo(dateChips, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocation(MOSCOW);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch (e) {
        setLocation(MOSCOW);
      }
    })();
  }, []);

  useEffect(() => {
    if (!route.params?.pickedLat || !route.params?.pickedLng) return;
    setLocation({ lat: route.params.pickedLat, lng: route.params.pickedLng });
    navigation.setParams({ pickedLat: undefined, pickedLng: undefined });
  }, [route.params?.pickedLat, route.params?.pickedLng]);

  const toggleInterest = (value) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };

  const addCustomInterest = () => {
    const v = customInterest.trim();
    if (!v) return;
    setInterests((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCustomInterest("");
  };

  const buildPayload = () => {
    const criteria = {};
    if (gender) criteria.gender = gender;
    if (minAge) criteria.min_age = parseInt(minAge, 10);
    if (maxAge) criteria.max_age = parseInt(maxAge, 10);
    if (nationality.trim()) criteria.nationality = nationality.trim();
    if (subcultureOnly) criteria.subculture = "неформалы";
    if (interests.length) criteria.interests = interests;

    const sel = dates[dateIndex].date;
    const start = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), hour, minute);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
    const payload = {
      title,
      description: description || null,
      lat: location.lat,
      lng: location.lng,
      address: address || null,
      start_at: start.toISOString(),
      max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      criteria: Object.keys(criteria).length ? criteria : null,
      tags: tags.length ? tags : null,
    };
    return payload;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Укажи название");
      return;
    }
    if (!location) {
      Alert.alert("Определяем местоположение", "Подожди пару секунд и попробуй снова");
      return;
    }
    if (maxParticipants && parseInt(maxParticipants, 10) > 20) {
      Alert.alert("Слишком много участников", "Максимум 20 человек на мероприятие");
      return;
    }
    setSubmitting(true);
    try {
      const ev = await createEvent(buildPayload());
      if (ev.status === "published") {
        Alert.alert("Готово", "Мероприятие опубликовано", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Готово", "Мероприятие отправлено на модерацию", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось создать мероприятие");
    } finally {
      setSubmitting(false);
    }
  };

  const openPicker = () => {
    const base = location || MOSCOW;
    navigation.navigate("LocationPicker", { lat: base.lat, lng: base.lng });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>Основное</Text>
      <TextInput style={styles.input} placeholder="Название мероприятия *" value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Описание"
        multiline
        value={description}
        onChangeText={setDescription}
      />
      <Text style={styles.subLabel}>Теги (через запятую, до 10)</Text>
      <TextInput
        style={styles.input}
        placeholder="например: настолки, игры, уно"
        value={tagsText}
        onChangeText={setTagsText}
        autoCapitalize="none"
      />

      <Text style={styles.section}>Место встречи</Text>
      <TextInput
        style={styles.input}
        placeholder="Адрес или место встречи"
        value={address}
        onChangeText={setAddress}
      />
      <TouchableOpacity style={styles.mapButton} onPress={openPicker}>
        <Ionicons name="location" size={18} color="#FF4458" />
        <Text style={styles.mapButtonText}>
          {location
            ? `Выбрано: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
            : "Определить местоположение (нажмите сюда)"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.section}>Дата и время</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {dates.map((d, i) => {
          const active = i === dateIndex;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setDateIndex(i)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={styles.subLabel}>Время</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {HOURS.map((h) => {
          const active = h === hour;
          return (
            <TouchableOpacity
              key={h}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setHour(h)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{h}:00</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.section}>Критерии людей (по желанию)</Text>
      <Text style={styles.subLabel}>Пол</Text>
      <View style={styles.optionRow}>
        {GENDERS.map((g) => {
          const active = gender === g.value;
          return (
            <TouchableOpacity
              key={g.value}
              style={[styles.optionChip, active && styles.chipActive]}
              onPress={() => setGender(active ? null : g.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.optionChip, gender === "any" && styles.chipActive]}
          onPress={() => setGender(gender === "any" ? null : "any")}
        >
          <Text style={[styles.chipText, gender === "any" && styles.chipTextActive]}>Любой</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subLabel}>Возраст</Text>
      <View style={styles.ageRow}>
        <TextInput
          style={[styles.input, styles.ageInput]}
          placeholder="От"
          keyboardType="number-pad"
          value={minAge}
          onChangeText={setMinAge}
        />
        <TextInput
          style={[styles.input, styles.ageInput]}
          placeholder="До"
          keyboardType="number-pad"
          value={maxAge}
          onChangeText={setMaxAge}
        />
      </View>

      <Text style={styles.subLabel}>Национальность</Text>
      <TextInput
        style={styles.input}
        placeholder="например: русский, татарин, любая"
        value={nationality}
        onChangeText={setNationality}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Только неформалы</Text>
        <Switch value={subcultureOnly} onValueChange={setSubcultureOnly} trackColor={{ true: "#FF4458" }} />
      </View>

      <Text style={styles.section}>Интересы / музыкальные вкусы</Text>
      <View style={styles.interestWrap}>
        {INTEREST_OPTIONS.map((opt) => {
          const active = interests.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleInterest(opt)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.input, styles.customInput]}
          placeholder="Другой интерес"
          value={customInterest}
          onChangeText={setCustomInterest}
          onSubmitEditing={addCustomInterest}
        />
        <TouchableOpacity style={styles.addButton} onPress={addCustomInterest}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Участники</Text>
      <TextInput
        style={styles.input}
        placeholder="Макс. участников (до 20)"
        keyboardType="number-pad"
        value={maxParticipants}
        onChangeText={setMaxParticipants}
      />

      <TouchableOpacity
        style={[styles.submit, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitting ? "Отправляем..." : "Создать мероприятие"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  section: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FF4458",
    marginTop: 20,
    marginBottom: 10,
  },
  subLabel: { fontSize: 13, color: "#888", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF4458",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    backgroundColor: "#fff5f6",
  },
  mapButtonText: { marginLeft: 8, color: "#FF4458", fontWeight: "600", flex: 1 },
  chipsRow: { flexGrow: 0, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  chipActive: { borderColor: "#FF4458", backgroundColor: "#FF4458" },
  chipText: { color: "#444", fontSize: 14 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  optionRow: { flexDirection: "row", flexWrap: "wrap" },
  optionChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  ageRow: { flexDirection: "row" },
  ageInput: { flex: 1, marginRight: 8 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 6,
  },
  switchLabel: { fontSize: 15, color: "#333" },
  interestWrap: { flexDirection: "row", flexWrap: "wrap" },
  customRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  customInput: { flex: 1, marginBottom: 0 },
  addButton: {
    backgroundColor: "#FF4458",
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  addButtonText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  submit: {
    backgroundColor: "#FF4458",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  submitDisabled: { backgroundColor: "#f3b4bd" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
