import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MensajeChat } from "@/types";
import { colors, radius, spacing, typography } from "@/constants/theme";

export default function ChatBubble({ mensaje }: { mensaje: MensajeChat }) {
  const esUsuario = mensaje.rol === "user";
  return (
    <View style={[styles.fila, esUsuario ? styles.derecha : styles.izquierda]}>
      <View style={[styles.burbuja, esUsuario ? styles.burbujaUsuario : styles.burbujaBot]}>
        <Text style={[styles.texto, esUsuario && { color: colors.white }]}>{mensaje.texto}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", marginBottom: spacing.sm },
  derecha: { justifyContent: "flex-end" },
  izquierda: { justifyContent: "flex-start" },
  burbuja: { maxWidth: "82%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10 },
  burbujaUsuario: { backgroundColor: colors.primaryGreen, borderBottomRightRadius: 4 },
  burbujaBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  texto: { ...typography.body, color: colors.textPrimary, lineHeight: 20 },
});