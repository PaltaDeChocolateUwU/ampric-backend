import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "@/constants/theme";

interface Opcion<T extends string> {
  valor: T;
  label: string;
}

interface Props<T extends string> {
  opciones: Opcion<T>[];
  valor: T;
  onChange: (v: T) => void;
}

export default function Segmented<T extends string>({ opciones, valor, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable key={o.valor} onPress={() => onChange(o.valor)} style={[styles.item, activo && styles.itemActive]}>
            <Text style={[styles.text, activo && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  item: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: "center" },
  itemActive: { backgroundColor: colors.primaryGreen },
  text: { ...typography.small, color: colors.textSecondary, fontWeight: "600" },
  textActive: { color: colors.white },
});