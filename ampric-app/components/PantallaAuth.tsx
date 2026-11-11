import React, { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/components/ScreenHeader";
import { colors, spacing, typography } from "@/constants/theme";

interface Props {
  titulo: string;
  subtitulo?: string;
  atras?: boolean;
  children: ReactNode;
}

export default function PantallaAuth({ titulo, subtitulo, atras, children }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {atras && <ScreenHeader title="" showBack />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.cuerpo} keyboardShouldPersistTaps="handled">
          <Text style={styles.marca}>🌿 AMPRIC</Text>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Aviso({ texto, tipo = "error" }: { texto?: string | null; tipo?: "error" | "info" }) {
  if (!texto) return null;
  return (
    <Text style={[styles.aviso, { color: tipo === "error" ? colors.riskText : colors.primaryGreenDark }]}>{texto}</Text>
  );
}

export function Enlace({ texto, onPress, deshabilitado }: { texto: string; onPress: () => void; deshabilitado?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={deshabilitado} hitSlop={8} style={styles.enlace}>
      <Text style={[styles.enlaceTexto, { color: deshabilitado ? colors.textMuted : colors.primaryGreen }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cuerpo: { padding: spacing.xl, gap: spacing.md },
  marca: { ...typography.small, color: colors.primaryGreenDark, fontWeight: "700" },
  titulo: { ...typography.h1, color: colors.textPrimary },
  subtitulo: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  aviso: { ...typography.small, textAlign: "center" },
  enlace: { alignItems: "center", paddingVertical: spacing.xs },
  enlaceTexto: { ...typography.small, fontWeight: "600" },
});