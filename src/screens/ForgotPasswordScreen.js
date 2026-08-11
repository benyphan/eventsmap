import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { requestPasswordReset, resetPassword } from "../api/client";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(1);

  const handleRequest = async () => {
    if (!email) {
      Alert.alert("Укажи email");
      return;
    }
    setLoading(true);
    try {
      const data = await requestPasswordReset(email);
      setDevCode(data.dev_code || null);
      setStage(2);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!code.trim() || !newPassword) {
      Alert.alert("Введи код и новый пароль");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Пароль должен быть не короче 6 символов");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code.trim(), newPassword);
      Alert.alert("Готово", "Пароль изменён. Теперь войди с новым паролем", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Неверный код");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Восстановление пароля</Text>

      {stage === 1 ? (
        <>
          <Text style={styles.subtitle}>
            Укажи email — мы отправим на него код для смены пароля.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={styles.button} onPress={handleRequest} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Отправляем..." : "Отправить код"}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Код отправлен на {email}.</Text>
          {devCode ? <Text style={styles.devHint}>Dev-режим: код {devCode}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Код из письма"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TextInput
            style={styles.input}
            placeholder="Новый пароль"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Сохраняем..." : "Сменить пароль"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStage(1)}>
            <Text style={styles.linkSecondary}>Сменить email</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Назад ко входу</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator size="large" color="#FF4458" style={{ marginTop: 20 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 20 },
  devHint: {
    fontSize: 14,
    color: "#854d0e",
    backgroundColor: "#fef9c3",
    borderRadius: 8,
    padding: 10,
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#FF4458",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", marginTop: 16, color: "#FF4458", fontWeight: "600" },
  linkSecondary: { textAlign: "center", marginTop: 12, color: "#666" },
});
