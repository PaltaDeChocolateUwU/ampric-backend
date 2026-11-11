import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "./Card";
import ProgressBar from "./ProgressBar";
import { colors, spacing, typography } from "@/constants/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  progress?: number;
  progressColor?: string;
}

export default function StatCard({ icon, iconColor, label, value, progress, progressColor }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {progress !== undefined && <ProgressBar value={progress} color={progressColor} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { ...typography.small, color: colors.textSecondary, flexShrink: 1 },
  value: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xs },
});
