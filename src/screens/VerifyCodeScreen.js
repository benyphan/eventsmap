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
import { verifyRegistration, resendCode } from "../api/client";

export default function VerifyCodeScreen({ navigation, route, onLoggedIn }) {
  const { email, devCode } = route.params || {};
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert("Введи код из письма");
      return;
    }
    setLoading(true);
    try {
      await verifyRegistration(email, code.trim());
      onLoggedIn();
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Неверный код");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const data = await resendCode(email, "register");
      if (data.dev_code) {
        Alert.alert("Код отправлен", `Dev-режим: код ${data.dev_code}`);
      } else {
        Alert.alert("Код отправлен", "Проверь почту");
      }
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Что-то пошло не так");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Код подтверждения</Text>
      <Text style={styles.subtitle}>
        Мы отправили код на {email}. Введи его, чтобы активировать аккаунт.
      </Text>
      {devCode ? <Text style={styles.devHint}>Dev-режим: код {devCode}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="6-значный код"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? "Проверяем..." : "Подтвердить"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResend} disabled={resending}>
        <Text style={styles.link}>
          {resending ? "Отправляем..." : "Отправить код ещё раз"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.linkSecondary}>Назад ко входу</Text>
      </TouchableOpacity>
      {loading || resending ? (
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
    fontSize: 18,
    letterSpacing: 6,
    textAlign: "center",
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
  linkSecondary: { textAlign: "center", marginTop: 8, color: "#666" },
});
