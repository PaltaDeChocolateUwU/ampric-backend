
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Alerta } from "@/types";
import {
  colors,
  estadoColors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { formatearFecha, tituloAlerta } from "@/utils/cultivo";

const ICONOS: Record<
  Alerta["severidad"],
  keyof typeof Ionicons.glyphMap
> = {
  risk: "warning",
  warning: "water",
  ok: "checkmark-circle",
};

interface Props {
  alerta: Alerta;
  nombrePlanta?: string;
  onPress?: () => void;
}

export default function AlertItem({
  alerta,
  nombrePlanta,
  onPress,
}: Props) {
  const paleta = estadoColors[alerta.severidad];
  const resuelta = alerta.estado !== "pendiente";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: paleta.bg,
          opacity: resuelta ? 0.65 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons
        name={ICONOS[alerta.severidad]}
        size={20}
        color={paleta.text}
      />

      <View style={styles.texto}>
        <View style={styles.fila}>
          <Text style={[styles.titulo, { color: paleta.text }]}>
            {tituloAlerta(alerta)}
          </Text>

          <Text style={styles.hora}>
            {formatearFecha(alerta.fechaHora)}
          </Text>
        </View>

        <View style={styles.plantaFila}>
          <Ionicons
            name="leaf-outline"
            size={15}
            color={colors.primaryGreen}
          />
          <Text style={styles.plantaNombre}>
            {nombrePlanta ?? "Planta no disponible"}
          </Text>
        </View>

        <Text style={styles.mensaje}>
          {alerta.mensaje}
        </Text>

        {resuelta && (
          <Text style={styles.estado}>
            {alerta.estado === "atendida"
              ? "Atendida"
              : "Descartada"}
          </Text>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  texto: {
    flex: 1,
  },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titulo: {
    ...typography.h3,
    flexShrink: 1,
  },
  hora: {
    ...typography.small,
    color: colors.textMuted,
  },
  plantaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.xs,
  },
  plantaNombre: {
    ...typography.small,
    color: colors.primaryGreenDark,
    fontWeight: "600",
  },
  mensaje: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  estado: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: "600",
  },
});
