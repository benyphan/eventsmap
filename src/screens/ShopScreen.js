import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getShop, buyShopItem, equipShopItem, giftShopItem } from "../api/client";
import { fmtDateTime } from "../utils/datetime";

function fmtPrice(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(".0", "")} млн`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)} тыс`;
  return String(n);
}

export default function ShopScreen({ route }) {
  const giftTo = route.params?.giftTo;
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getShop();
      setShop(data);
    } catch (e) {
      Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось загрузить магазин");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmBuy = (item) => {
    Alert.alert(
      `Купить «${item.name}» ${item.emoji || ""}`,
      `Стоимость: ${fmtPrice(item.price)} кредитов.\nНадень украшение на свой профиль?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Купить",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await buyShopItem(item.id);
              setShop({ ...shop, ...res });
              Alert.alert("Готово", "Украшение куплено и надето на профиль!");
            } catch (e) {
              Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось купить");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const confirmGift = (item) => {
    Alert.alert(
      `Подарить «${item.name}» ${item.emoji || ""}`,
      `Стоимость: ${fmtPrice(item.price)} кредитов.\nОтправить подарок пользователю?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Отправить",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await giftShopItem(item.id, giftTo.id, null);
              setShop({ ...shop, ...res });
              Alert.alert("Готово", `Подарок «${item.name}» отправлен!`);
            } catch (e) {
              Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось отправить подарок");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const onPressItem = (item) => {
    setSelected(item.id);
    if (giftTo) {
      if (item.item_type === "gift") confirmGift(item);
      else Alert.alert("Совет", "Когда подарок — выбери подарок из второго раздела.");
      return;
    }
    if (item.item_type === "decoration") {
      if (shop.owned_decorations.includes(item.id)) {
        if (shop.active_decoration === item.id) {
          Alert.alert("Уже надето", "Это украшение сейчас на твоём профиле.");
        } else {
          Alert.alert("Надеть?", `Надеть «${item.name}» ${item.emoji || ""} на профиль?`, [
            { text: "Отмена", style: "cancel" },
            {
              text: "Надеть",
              onPress: async () => {
                setBusy(true);
                try {
                  const res = await equipShopItem(item.id);
                  setShop({ ...shop, ...res });
                  Alert.alert("Готово", "Украшение надето на профиль!");
                } catch (e) {
                  Alert.alert("Ошибка", e?.response?.data?.detail || "Не удалось надеть");
                } finally {
                  setBusy(false);
                }
              },
            },
          ]);
        }
      } else {
        confirmBuy(item);
      }
    } else {
      Alert.alert("Только для подарков", "Открой профиль пользователя и нажми «Подарить».");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  const decorations = shop?.items?.filter((i) => i.item_type === "decoration") || [];
  const gifts = shop?.items?.filter((i) => i.item_type === "gift") || [];

  return (
    <FlatList
      style={styles.container}
      data={[1]}
      keyExtractor={() => "x"}
      ListHeaderComponent={
        <View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Твой баланс</Text>
            <Text style={styles.balanceValue}>
              {fmtPrice(shop?.credits || 0)} кредитов
            </Text>
            {giftTo ? (
              <Text style={styles.giftHint}>
                Выбери подарок для {giftTo.name}
              </Text>
            ) : (
              <Text style={styles.giftHint}>
                Зарабатывай кредиты: пригласи друга по своему коду
              </Text>
            )}
          </View>

          {!giftTo ? (
            <View>
              <Text style={styles.sectionTitle}>Украшения профиля</Text>
              {decorations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => onPressItem(item)}
                >
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.cardDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    {shop.owned_decorations.includes(item.id) ? (
                      <Text style={styles.ownedBadge}>
                        {shop.active_decoration === item.id ? "Надето ✓" : "Куплено"}
                      </Text>
                    ) : (
                      <Text style={styles.price}>{fmtPrice(item.price)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Подарки</Text>
          {gifts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => onPressItem(item)}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc}>{item.description}</Text>
                ) : null}
              </View>
              <Text style={styles.price}>{fmtPrice(item.price)}</Text>
            </TouchableOpacity>
          ))}

          {!giftTo && shop?.gifts_received?.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Полученные подарки ({shop.gifts_received.length})</Text>
              {shop.gifts_received.map((g) => (
                <View key={g.id} style={styles.giftRow}>
                  <Text style={styles.giftEmoji}>{g.item_emoji || "🎁"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.giftTitle}>
                      {g.item_name} от {g.from_user_name || "пользователя"}
                    </Text>
                    {g.message ? <Text style={styles.giftMsg}>{g.message}</Text> : null}
                    <Text style={styles.giftDate}>{fmtDateTime(g.created_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {selected ? null : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  balanceCard: {
    backgroundColor: "#FF4458",
    borderRadius: 16,
    padding: 18,
    margin: 14,
    alignItems: "center",
  },
  balanceLabel: { color: "#fff", opacity: 0.9, fontSize: 13 },
  balanceValue: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 },
  giftHint: { color: "#fff", opacity: 0.85, fontSize: 12, marginTop: 8, textAlign: "center" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 14,
    marginVertical: 5,
  },
  cardEmoji: { fontSize: 30, marginRight: 12 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "700" },
  cardDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  cardRight: { marginLeft: 8 },
  price: { color: "#FF4458", fontWeight: "800", fontSize: 14 },
  ownedBadge: { color: "#16a34a", fontWeight: "700", fontSize: 13 },
  giftRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 14,
    marginVertical: 4,
  },
  giftEmoji: { fontSize: 26, marginRight: 12 },
  giftTitle: { fontSize: 14, fontWeight: "600" },
  giftMsg: { fontSize: 12, color: "#666", marginTop: 2 },
  giftDate: { fontSize: 11, color: "#aaa", marginTop: 4 },
});
