import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius } from "@/constants/theme";

interface Props {
  value: number; // 0-100
  color?: string;
}

export default function ProgressBar({ value, color = colors.primaryGreen }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden", marginTop: 8 },
  fill: { height: "100%", borderRadius: radius.pill },
});