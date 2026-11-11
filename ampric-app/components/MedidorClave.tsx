import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
import { nivelContrasena } from "@/utils/validacion";

const CONFIG = {
  debil: { barras: 1, color: colors.riskText, texto: "Débil" },
  media: { barras: 2, color: colors.warningText, texto: "Media" },
  fuerte: { barras: 3, color: colors.okText, texto: "Fuerte" },
} as const;

export default function MedidorClave({ password }: { password: string }) {
  if (!password) return null;
  const c = CONFIG[nivelContrasena(password)];
  return (
    <View style={styles.fila}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.barra, { backgroundColor: i <= c.barras ? c.color : colors.border }]} />
      ))}
      <Text style={[styles.texto, { color: c.color }]}>{c.texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  barra: { flex: 1, height: 5, borderRadius: 3 },
  texto: { ...typography.small, fontWeight: "600", marginLeft: spacing.sm, width: 50 },
});