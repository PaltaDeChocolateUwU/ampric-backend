import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants/theme";

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  secreto?: boolean;
}

export default function Campo({ label, error, secreto, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.caja, !!error && { borderColor: colors.riskText }]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secreto && !visible}
          autoCapitalize="none"
          {...rest}
        />
        {secreto && (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  caja: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, paddingVertical: 13, color: colors.textPrimary },
  error: { ...typography.small, color: colors.riskText, marginTop: 4 },
});