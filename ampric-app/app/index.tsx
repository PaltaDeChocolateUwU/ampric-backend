import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing, typography } from "@/constants/theme";

export default function WelcomeScreen() {
  const { isAuthenticated, isReady } = useAuth();
  if (isReady && isAuthenticated) return <Redirect href="/(tabs)" />;
  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.safe}>
        <View>
          <Text style={styles.logo}>🌿</Text>
          <Text style={styles.brand}>AMPRIC</Text>
          <Text style={styles.tagline}>Monitoreo y predicción{"\n"}de riego en cannabis</Text>
        </View>
        <Button label="Comenzar" onPress={() => router.push("/login")} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.darkGreen },
  safe: { flex: 1, justifyContent: "space-between", padding: spacing.xl, paddingTop: 80 },
  logo: { fontSize: 48, marginBottom: spacing.md },
  brand: { ...typography.h1, fontSize: 34, color: colors.white, marginBottom: spacing.sm },
  tagline: { ...typography.h3, color: "#CFE8D6", fontWeight: "400" },
});