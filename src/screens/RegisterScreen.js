import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { register } from "../api/client";

const GENDERS = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
  { value: "other", label: "Другое" },
];

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState(null);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Заполни все поля");
      return;
    }
    setLoading(true);
    try {
      const data = await register({
        name,
        email,
        password,
        gender: gender || null,
        referral_code: referralCode.trim() || undefined,
      });
      navigation.navigate("VerifyCode", { email, devCode: data.dev_code || null });
    } catch (e) {
      Alert.alert("Ошибка регистрации", e?.response?.data?.detail || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Регистрация</Text>
      <TextInput style={styles.input} placeholder="Имя" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Код приглашения (если есть)"
        autoCapitalize="characters"
        value={referralCode}
        onChangeText={setReferralCode}
      />
      <Text style={styles.label}>Пол</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => {
          const active = gender === g.value;
          return (
            <TouchableOpacity
              key={g.value}
              style={[styles.genderChip, active && styles.genderChipActive]}
              onPress={() => setGender(g.value)}
            >
              <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Создаём..." : "Зарегистрироваться"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  label: { fontSize: 14, color: "#666", marginBottom: 8 },
  genderRow: { flexDirection: "row", marginBottom: 16 },
  genderChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  genderChipActive: { borderColor: "#FF4458", backgroundColor: "#FF4458" },
  genderChipText: { color: "#444", fontWeight: "500" },
  genderChipTextActive: { color: "#fff", fontWeight: "600" },
  button: {
    backgroundColor: "#FF4458",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", marginTop: 16, color: "#FF4458" },
});
