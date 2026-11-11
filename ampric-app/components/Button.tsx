import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, typography } from "@/constants/theme";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export default function Button({ label, onPress, variant = "primary", loading }: Props) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.white : colors.primaryGreen} />
      ) : (
        <Text style={[styles.label, { color: primary ? colors.white : colors.primaryGreen }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, paddingVertical: 14, alignItems: "center" },
  primary: { backgroundColor: colors.primaryGreen },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primaryGreen },
  label: { ...typography.h3 },
});