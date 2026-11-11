import React from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { CultivoProvider } from "@/context/CultivoContext";

const isWeb = Platform.OS === "web";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CultivoProvider>
          <StatusBar style="dark" />
          {/* En web limitamos el ancho a "tamaño celular" y lo centramos */}
          <View style={{ flex: 1, alignItems: "center", backgroundColor: isWeb ? "#E4EAE5" : undefined }}>
            <View style={{ flex: 1, width: "100%", maxWidth: isWeb ? 480 : undefined }}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </View>
        </CultivoProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}