import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { API_URL } from "../config";
import { loadLastLocation } from "../utils/location";

const YANDEX_URL =
  API_URL + "/api/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU";

function buildPickerHtml(lat, lng) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:#f2f2f2;}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { attributionControl: false, crs: L.CRS.EPSG3395 }).setView([${lat}, ${lng}], 15);
  var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
  L.tileLayer('${YANDEX_URL}', {}).addTo(map);

  function report(lat, lng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'picked', lat: lat, lng: lng }));
  }

  map.on('click', function(e) {
    marker.setLatLng(e.latlng);
    report(e.latlng.lat, e.latlng.lng);
  });
  marker.on('dragend', function(e) {
    var ll = marker.getLatLng();
    report(ll.lat, ll.lng);
  });

  window.addEventListener('load', function() {
    marker.openPopup();
    map.invalidateSize();
    setInterval(function(){ if (map) map.invalidateSize(); }, 800);
  });
</script>
</body>
</html>`;
}

export default function LocationPickerScreen({ navigation, route }) {
  const params = route.params || {};
  const [center, setCenter] = useState(null);
  const [picked, setPicked] = useState(null);

  // Старт карты — переданная точка, иначе последняя известная позиция,
  // иначе Москва (только самый первый запуск).
  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadLastLocation();
      const lat = params.lat ?? saved?.lat ?? 55.751244;
      const lng = params.lng ?? saved?.lng ?? 37.618423;
      if (mounted) setCenter({ lat, lng });
    })();
    return () => {
      mounted = false;
    };
  }, [params.lat, params.lng]);

  const html = useMemo(() => (center ? buildPickerHtml(center.lat, center.lng) : null), [center]);

  const onMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === "picked") setPicked({ lat: data.lat, lng: data.lng });
    } catch (err) {}
  };

  const confirm = () => {
    if (!picked) return;
    navigation.navigate("CreateEvent", {
      pickedLat: picked.lat,
      pickedLng: picked.lng,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.hint}>Нажми на карту или перетащи метку</Text>
      {html ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={onMessage}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF4458" />
        </View>
      )}
      <TouchableOpacity
        style={[styles.confirm, !picked && styles.confirmDisabled]}
        onPress={confirm}
        disabled={!picked}
      >
        <Text style={styles.confirmText}>
          {picked ? "Выбрать это место" : "Отметь точку на карте"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hint: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    textAlign: "center",
    color: "#666",
    fontSize: 13,
  },
  confirm: {
    backgroundColor: "#FF4458",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    margin: 16,
  },
  confirmDisabled: { backgroundColor: "#f3b4bd" },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
