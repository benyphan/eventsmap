import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../api/client";

const { width, height } = Dimensions.get("window");

function fullUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function ImageViewer({ visible, images = [], index = 0, onClose }) {
  const list = (images || []).filter(Boolean);
  const [page, setPage] = useState(index);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setPage(index);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ x: width * index, animated: false });
      }
    }
  }, [visible, index]);

  if (!list.length) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        {list.length > 1 ? (
          <Text style={styles.counter}>
            {page + 1} / {list.length}
          </Text>
        ) : null}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        >
          {list.map((u, i) => (
            <TouchableOpacity
              key={`${u}-${i}`}
              activeOpacity={1}
              onPress={onClose}
              style={{ width, height }}
            >
              <Image
                source={{ uri: fullUrl(u) }}
                style={styles.image}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  image: { width, height },
  closeBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    zIndex: 10,
  },
});
