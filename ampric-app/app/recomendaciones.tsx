import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ScreenHeader from "@/components/ScreenHeader";
import { useCultivo } from "@/context/CultivoContext";
import { colors, spacing, typography } from "@/constants/theme";
import { generarRecomendaciones } from "@/utils/cultivo";

const ICONOS = { riego: "water", ventilacion: "sync", etapa: "leaf" } as const;

export default function RecomendacionesScreen() {
  const { cultivo, lectura, prediccion } = useCultivo();
  const recs = generarRecomendaciones(lectura, prediccion?.horasRestantes ?? null, cultivo?.etapa ?? "vegetativo");

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Recomendaciones" showBack />
      <FlatList
        data={recs}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <Card style={styles.intro}>
            <Ionicons name="bulb-outline" size={20} color={colors.primaryGreenDark} />
            <Text style={styles.introTexto}>Recomendaciones para tu cultivo</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.item}>
            <Ionicons name={ICONOS[item.icono]} size={22} color={colors.primaryGreen} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitulo}>{item.titulo}</Text>
              <Text style={styles.itemDetalle}>{item.detalle}</Text>
            </View>
          </Card>
        )}
        ListFooterComponent={
          <View style={{ marginTop: spacing.lg }}>
            <Button label="Ver historial completo" onPress={() => router.push("/(tabs)/historial")} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  intro: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.lightGreenBg, borderWidth: 0, marginBottom: spacing.md },
  introTexto: { ...typography.h3, color: colors.primaryGreenDark },
  item: { flexDirection: "row", gap: spacing.md },
  itemTitulo: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
  itemDetalle: { ...typography.body, color: colors.textSecondary, lineHeight: 20 },
});