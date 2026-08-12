import React, { useCallback, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { getEventsNearby } from "../api/client";
import { API_URL } from "../config";

const MOSCOW = { lat: 55.751244, lng: 37.618423 };

// Провайдер тайлов: Яндекс (публичные тайлы без ключа).
// Эмулятор не имеет прямого доступа к tile-серверам Яндекса,
// поэтому тайлы проксируются через наш backend на хосте.
const YANDEX_URL = API_URL + "/api/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU";

function buildMapHtml(lat, lng) {
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
  var queue = [];
  var ready = false;

  var map = L.map('map', { attributionControl: false, crs: L.CRS.EPSG3395 }).setView([${lat}, ${lng}], 13);
  var markerUser = L.marker([${lat}, ${lng}]).addTo(map).bindPopup('Ты здесь');
  L.tileLayer('${YANDEX_URL}', {}).addTo(map);

  var eventLayer = L.layerGroup().addTo(map);
  var draftMarker = null;
  map.on('moveend', function() {
    var c = map.getCenter();
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'move', lat: c.lat, lng: c.lng })
    );
  });
  map.on('click', function(e) {
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;
    if (draftMarker) {
      draftMarker.setLatLng(e.latlng);
    } else {
      draftMarker = L.marker(e.latlng, { draggable: false }).addTo(map);
    }
    draftMarker.bindPopup(
      '<div id="create-here" style="color:#FF4458;font-weight:600;font-size:15px;padding:10px 16px;cursor:pointer;text-align:center;user-select:none;">Создать мероприятие здесь</div>'
    ).openPopup();
    var link = document.getElementById('create-here');
    if (link) {
      link.addEventListener('click', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'create', lat: lat, lng: lng })
        );
      });
    }
  });
  function addEvents(events) {
    eventLayer.clearLayers();
    (events || []).forEach(function(ev) {
      if (ev.lat && ev.lng) {
        var icon = L.divIcon({
          className: 'ev-pin',
          html: '<div style="width:26px;height:26px;border-radius:50%;background:#FF4458;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
          iconSize: [26, 26], iconAnchor: [13, 13]
        });
        var m = L.marker([ev.lat, ev.lng], { icon: icon })
          .addTo(eventLayer)
          .bindPopup(
            '<b>' + ev.title + '</b><br/>' + (ev.category || '') +
            '<br/><div id="event-details" style="color:#FF4458;font-weight:600;font-size:14px;padding:6px 0;cursor:pointer;">Подробнее</div>'
          );
        m.on('popupopen', function() {
          var link = document.getElementById('event-details');
          if (link) {
            link.onclick = function(ev2) {
              ev2.preventDefault();
              ev2.stopPropagation();
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'open', eventId: ev.id })
              );
            };
          }
        });
      }
    });
  }
  function panTo(lat, lng) {
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
    markerUser.setLatLng([lat, lng]);
  }

  function handleMessage(data) {
    if (data.type === 'events') addEvents(data.events);
    if (data.type === 'center') panTo(data.lat, data.lng);
  }
  function flush() { while (queue.length) handleMessage(queue.shift()); }

  document.addEventListener('message', function(e) {
    try { var d = JSON.parse(e.data); ready ? handleMessage(d) : queue.push(d); } catch (err) {}
  });
  window.addEventListener('message', function(e) {
    try { var d = JSON.parse(e.data); ready ? handleMessage(d) : queue.push(d); } catch (err) {}
  });

  window.addEventListener('load', function() {
    ready = true;
    flush();
    setInterval(function(){ if (map) map.invalidateSize(); }, 800);
  });
  if (document.readyState === 'complete') { ready = true; flush(); }
</script>
</body>
</html>`;
}

export default function MapScreen({ navigation }) {
  const webviewRef = useRef(null);
  const [html] = useState(() => buildMapHtml(MOSCOW.lat, MOSCOW.lng));
  const [locating, setLocating] = useState(false);
  const suppressMove = useRef(false);
  const moveTimer = useRef(null);

  const send = (data) => {
    webviewRef.current?.postMessage(JSON.stringify(data));
  };

  const getPosition = async () => {
    try {
      const { status } = await Promise.race([
        Location.requestForegroundPermissionsAsync(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Таймаут разрешения")), 3000)
        ),
      ]);
      if (status !== "granted") return null;
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({}),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Таймаут геолокации")), 4000)
        ),
      ]);
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch (e) {
      return null;
    }
  };

  const loadEvents = async (lat, lng) => {
    try {
      const events = await getEventsNearby(lat, lng, 100000);
      send({ type: "events", events });
    } catch (e) {
      console.log("Не удалось загрузить события", e.message);
    }
  };

  const locateMe = async (showLoader = true) => {
    if (showLoader) setLocating(true);
    const pos = await getPosition();
    const target = pos || MOSCOW;
    suppressMove.current = true;
    send({ type: "center", lat: target.lat, lng: target.lng });
    await loadEvents(target.lat, target.lng);
    setTimeout(() => {
      suppressMove.current = false;
    }, 1200);
    if (showLoader) setLocating(false);
  };

  useFocusEffect(
    useCallback(() => {
      let attempts = 0;
      const readyCheck = setInterval(() => {
        attempts += 1;
        if (webviewRef.current && attempts >= 1) {
          locateMe(false);
          clearInterval(readyCheck);
        }
      }, 1200);
      return () => clearInterval(readyCheck);
    }, [])
  );

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "create") {
        navigation.navigate("CreateEvent", {
          pickedLat: data.lat,
          pickedLng: data.lng,
        });
      }
      if (data.type === "open" && data.eventId) {
        navigation.navigate("EventDetail", { eventId: data.eventId });
      }
      if (data.type === "move") {
        if (suppressMove.current) return;
        if (moveTimer.current) clearTimeout(moveTimer.current);
        moveTimer.current = setTimeout(() => {
          loadEvents(data.lat, data.lng);
        }, 400);
      }
    } catch (err) {}
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={onMessage}
        style={{ flex: 1 }}
      />

      <TouchableOpacity style={styles.locateButton} onPress={() => locateMe()} disabled={locating}>
        <Ionicons name="locate" size={22} color={locating ? "#aaa" : "#FF4458"} />
      </TouchableOpacity>

      <Text style={styles.hint}>Нажми на карту, чтобы создать мероприятие здесь</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  locateButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  hint: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    color: "#444",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
