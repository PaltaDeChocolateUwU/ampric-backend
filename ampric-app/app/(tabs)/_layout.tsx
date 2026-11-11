import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useCultivo } from "@/context/CultivoContext";
import { colors } from "@/constants/theme";

const icono =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string | any; size: number }) =>
    <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  const { isAuthenticated, isReady } = useAuth();
  const { alertas } = useCultivo();

  if (!isReady) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  const pendientes = alertas.filter((a) => a.estado === "pendiente").length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryGreen,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio", tabBarIcon: icono("home") }} />
      <Tabs.Screen name="historial" options={{ title: "Historial", tabBarIcon: icono("bar-chart") }} />
      <Tabs.Screen
        name="alertas"
        options={{
          title: "Alertas",
          tabBarIcon: icono("notifications"),
          tabBarBadge: pendientes > 0 ? pendientes : undefined,
        }}
      />
      <Tabs.Screen name="asistente" options={{ title: "Asistente", tabBarIcon: icono("chatbubbles") }} />
      <Tabs.Screen name="ajustes" options={{ title: "Ajustes", tabBarIcon: icono("settings") }} />
    </Tabs>
  );
}