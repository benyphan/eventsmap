import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Alert, View, Platform } from "react-native";
import { installWebAlert } from "./src/web/webAlert";

if (Platform.OS === "web") {
  installWebAlert(Alert);
}

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import VerifyCodeScreen from "./src/screens/VerifyCodeScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import MapScreen from "./src/screens/MapScreen";
import FeedScreen from "./src/screens/FeedScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import CreateEventScreen from "./src/screens/CreateEventScreen";
import LocationPickerScreen from "./src/screens/LocationPickerScreen";
import EventDetailScreen from "./src/screens/EventDetailScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import FriendRequestsScreen from "./src/screens/FriendRequestsScreen";
import SearchScreen from "./src/screens/SearchScreen";
import ChatsScreen from "./src/screens/ChatsScreen";
import ChatScreen from "./src/screens/ChatScreen";
import ShopScreen from "./src/screens/ShopScreen";

const AuthStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const TAB_ICONS = {
  "Карта": ["map-outline", "map"],
  "Лента": ["list-outline", "list"],
  "Поиск": ["search-outline", "search"],
  "Чаты": ["chatbubbles-outline", "chatbubbles"],
  "Профиль": ["person-circle-outline", "person-circle"],
  "Настройки": ["settings-outline", "settings"],
};

function tabIcon(name, { focused, color, size }) {
  const [outline, filled] = TAB_ICONS[name] || ["ellipse-outline", "ellipse"];
  return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
}

function MainApp({ onLoggedOut }) {
  return (
    <RootStack.Navigator>
      <RootStack.Screen name="Tabs" options={{ headerShown: false }}>
        {() => <MainTabsScreen onLoggedOut={onLoggedOut} />}
      </RootStack.Screen>
      <RootStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: "Новое мероприятие" }}
      />
      <RootStack.Screen
        name="LocationPicker"
        component={LocationPickerScreen}
        options={{ title: "Место встречи" }}
      />
      <RootStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: "Мероприятие" }}
      />
      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Уведомления" }}
      />
      <RootStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: "Профиль" }}
      />
      <RootStack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{ title: "Запросы в друзья" }}
      />
      <RootStack.Screen name="Chat" component={ChatScreen} options={{ title: "Чат" }} />
      <RootStack.Screen
        name="Shop"
        component={ShopScreen}
        options={{ title: "Магазин" }}
      />
    </RootStack.Navigator>
  );
}

function MainTabsScreen({ onLoggedOut }) {
  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: "#FF4458",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarIcon: ({ focused, color, size }) => tabIcon(route.name, { focused, color, size }),
      })}
    >
      <MainTabs.Screen name="Карта" component={MapScreen} />
      <MainTabs.Screen name="Лента" component={FeedScreen} />
      <MainTabs.Screen name="Поиск" component={SearchScreen} />
      <MainTabs.Screen name="Чаты" component={ChatsScreen} />
      <MainTabs.Screen name="Профиль">
        {() => <ProfileScreen onLoggedOut={onLoggedOut} />}
      </MainTabs.Screen>
      <MainTabs.Screen name="Настройки" component={SettingsScreen} />
    </MainTabs.Navigator>
  );
}

function AuthFlow({ onLoggedIn }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoggedIn={onLoggedIn} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyCode">
        {(props) => <VerifyCodeScreen {...props} onLoggedIn={onLoggedIn} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("access_token");
      setIsLoggedIn(!!token);
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      {isLoggedIn ? (
        <MainApp onLoggedOut={() => setIsLoggedIn(false)} />
      ) : (
        <AuthFlow onLoggedIn={() => setIsLoggedIn(true)} />
      )}
    </NavigationContainer>
  );
}
