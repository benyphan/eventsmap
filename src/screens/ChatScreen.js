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
import { utf8ToBytes, bytesToUtf8 } from "../crypto/e2e";
import { bytesToBase64, base64ToBytes } from "../crypto/e2e";
import EmojiPicker from "../components/EmojiPicker";
import { fmtTime } from "../utils/datetime";

export default function ChatScreen({ route }) {
  const { chatId, otherUser, isGroup, title } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [myId, setMyId] = useState(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const navigation = useNavigation();

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
          setReady(true);
        } catch (e) {}
      })();
      load();
      timer = setInterval(load, 3000);
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [load])
  );

  const renderText = (m) => {
    if (!m.content_enc) return "";
    try {
      return bytesToUtf8(base64ToBytes(m.content_enc));
    } catch (e) {
      return "🔒 Не удалось прочитать";
    }
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
    setSending(true);
    try {
      const contentEnc = bytesToBase64(utf8ToBytes(text));
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
                {fmtTime(item.created_at)}
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
