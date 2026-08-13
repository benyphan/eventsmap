import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getMe, getMessages, sendMessageEnc } from "../api/client";
import { ensureKeys, encryptFor, decryptFrom, utf8ToBytes, bytesToUtf8 } from "../crypto/e2e";
import { bytesToBase64, base64ToBytes } from "../crypto/e2e";
import EmojiPicker from "../components/EmojiPicker";

export default function ChatScreen({ route }) {
  const { chatId, otherUser, isGroup, title } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [myId, setMyId] = useState(null);
  const [myPriv, setMyPriv] = useState(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const navigation = useNavigation();

  const otherPub = otherUser?.e2e_public_key;

  useEffect(() => {
    if (isGroup && title) {
      navigation.setOptions({ title });
    }
  }, [isGroup, title, navigation]);

  const load = useCallback(async () => {
    if (!chatId) return;
    try {
      const data = await getMessages(chatId);
      setMessages(data);
    } catch (e) {
      console.log("Не удалось загрузить сообщения", e.message);
    }
  }, [chatId]);

  useFocusEffect(
    useCallback(() => {
      let timer = null;
      (async () => {
        try {
          const me = await getMe();
          setMyId(me.id);
          if (!isGroup) {
            const keys = await ensureKeys();
            setMyPriv(keys.privateKey);
          }
          setReady(true);
        } catch (e) {
          Alert.alert("Ошибка", "Не удалось подготовить ключи шифрования");
        }
      })();
      load();
      timer = setInterval(load, 3000);
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [load, isGroup])
  );

  const renderText = (m) => {
    if (isGroup) {
      if (!m.content_enc) return "";
      try {
        return bytesToUtf8(base64ToBytes(m.content_enc));
      } catch (e) {
        return "🔒 Не удалось прочитать";
      }
    }
    if (!myPriv || !otherPub) {
      return m.sender_id === myId ? "Отправлено" : "Собеседник ещё не настроил шифрование";
    }
    const plain = decryptFrom(myPriv, otherPub, m.content_enc);
    return plain !== null ? plain : "🔒 Не удалось расшифровать";
  };

  const insertEmoji = (emoji) => {
    const pos = selection.start ?? input.length;
    const next = input.slice(0, pos) + emoji + input.slice(selection.end ?? pos);
    setInput(next);
    const cursor = pos + emoji.length;
    setSelection({ start: cursor, end: cursor });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!isGroup && (!myPriv || !otherPub)) {
      if (!otherPub) {
        Alert.alert("Внимание", "Собеседник ещё не настроил шифрование. Сообщение отправить нельзя.");
      }
      return;
    }
    setSending(true);
    try {
      let contentEnc;
      if (isGroup) {
        contentEnc = bytesToBase64(utf8ToBytes(text));
      } else {
        contentEnc = await encryptFor(myPriv, otherPub, text);
      }
      await sendMessageEnc(chatId, contentEnc);
      setInput("");
      await load();
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {!otherPub && ready ? (
        <Text style={styles.warning}>
          ⚠ Собеседник ещё не настроил сквозное шифрование
        </Text>
      ) : null}
      <FlatList
        ref={listRef}
        style={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const mine = item.sender_id === myId;
          const profileUserId = mine ? null : isGroup ? item.sender_id : otherUser?.id;
          const bubble = (
            <View style={[styles.bubbleWrap, mine ? styles.bubbleMine : styles.bubbleOther]}>
              {isGroup && !mine && item.sender_name ? (
                <Text style={styles.bubbleSender}>👤 {item.sender_name}</Text>
              ) : null}
              <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                {renderText(item)}
              </Text>
              <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                {item.created_at
                  ? new Date(item.created_at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Text>
            </View>
          );
          return profileUserId ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("UserProfile", { userId: profileUserId })}
            >
              {bubble}
            </TouchableOpacity>
          ) : (
            bubble
          );
        }}
      />
      {showEmoji ? (
        <EmojiPicker onSelect={insertEmoji} />
      ) : null}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.emojiBtn, showEmoji && styles.emojiBtnActive]}
          onPress={() => setShowEmoji((v) => !v)}
        >
          <Text style={styles.emojiBtnText}>😊</Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Сообщение..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, sending && styles.disabled]} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  warning: {
    backgroundColor: "#fff7ed",
    color: "#b45309",
    padding: 8,
    textAlign: "center",
    fontSize: 13,
  },
  list: { flex: 1 },
  listContent: { padding: 12 },
  bubbleWrap: {
    maxWidth: "80%",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#FF4458" },
  bubbleOther: { alignSelf: "flex-start", backgroundColor: "#fff" },
  bubbleText: { fontSize: 15, color: "#333" },
  bubbleTextMine: { color: "#fff" },
  bubbleSender: { fontSize: 11, fontWeight: "700", color: "#FF4458", marginBottom: 3 },
  bubbleTime: { fontSize: 11, color: "#999", marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f2f2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiBtnActive: { backgroundColor: "#fff5f6" },
  emojiBtnText: { fontSize: 22 },
  input: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: { color: "#fff", fontSize: 18 },
  disabled: { opacity: 0.5 },
});
