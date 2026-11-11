import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Button from "@/components/Button";
import Card from "@/components/Card";
import StatCard from "../../components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { useCultivo } from "@/context/CultivoContext";
import { colors, estadoColors, radius, spacing, typography } from "@/constants/theme";
import { ETAPA_LABEL, formatearFecha } from "@/utils/cultivo";

export default function DashboardScreen() {
  const { usuario } = useAuth();
  const {
    cultivo, cultivos, lectura, prediccion, estadoGeneral, alertas, loading, error, refrescar, seleccionarCultivo,
  } = useCultivo();

  if (loading && !cultivo) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primaryGreen} size="large" />
      </SafeAreaView>
    );
  }

  const paleta = estadoColors[estadoGeneral];
  const alertaTop = alertas.find((a) => a.estado === "pendiente");
  const horas = prediccion?.horasRestantes;
  const primerNombre = usuario?.nombre.split(" ")[0] ?? "Cultivador";
  const saludo = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refrescar()} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {saludo}</Text>
            <Text style={styles.sub}>Así está tu cultivo hoy</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/ajustes")}>
            <Ionicons name="person-circle-outline" size={34} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Selector de planta */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {cultivos.map((c) => {
            const activa = c.id === cultivo?.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => !activa && seleccionarCultivo(c.id)}
                style={[styles.chip, activa && styles.chipActivo]}
              >
                <Ionicons name="leaf" size={14} color={activa ? "#fff" : colors.primaryGreen} />
                <Text style={[styles.chipTxt, activa && { color: "#fff" }]}>{c.nombre}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push("/plantas")} style={[styles.chip, styles.chipGestionar]}>
            <Ionicons name="settings-outline" size={14} color={colors.primaryGreen} />
            <Text style={styles.chipTxt}>Gestionar</Text>
          </Pressable>
        </ScrollView>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={() => router.push("/(tabs)/ajustes")}>
          <Card style={styles.etapaCard}>
            <Text style={styles.etapaLabel}>Etapa actual</Text>
            <Text style={styles.etapaValue}>{cultivo ? ETAPA_LABEL[cultivo.etapa] : "—"}</Text>
          </Card>
        </Pressable>

        <View style={styles.grid}>
          <StatCard
            icon="water"
            iconColor={colors.infoBlue}
            label="Humedad del suelo"
            value={`${lectura?.humedadSuelo ?? "--"}%`}
            progress={lectura?.humedadSuelo}
            progressColor={estadoColors[prediccion?.estado ?? "ok"].text}
          />
          <StatCard
            icon="thermometer"
            iconColor={colors.warningText}
            label="Temperatura"
            value={`${lectura?.temperatura ?? "--"}°C`}
            progress={lectura ? (lectura.temperatura / 40) * 100 : undefined}
            progressColor={colors.warningText}
          />
        </View>

        <View style={styles.grid}>
          <StatCard
            icon="cloud"
            iconColor={colors.infoBlue}
            label="Humedad ambiental"
            value={`${lectura?.humedadAmbiente ?? "--"}%`}
            progress={lectura?.humedadAmbiente}
            progressColor={colors.infoBlue}
          />
          <StatCard
            icon="time"
            iconColor={colors.textSecondary}
            label="Riego estimado en"
            value={horas === undefined ? "--" : horas === null ? "Estable" : `${horas.toFixed(1)} h`}
          />
        </View>

        <Card style={[styles.statusCard, { backgroundColor: paleta.bg }]}>
          <Ionicons name={estadoGeneral === "ok" ? "checkmark-circle" : "warning"} size={22} color={paleta.text} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: paleta.text }]}>
              {estadoGeneral === "ok" ? "Todo en rango normal" : "Revisa tu cultivo"}
            </Text>
            <Text style={styles.statusDetail}>
              {estadoGeneral === "ok"
                ? "Tu cultivo se encuentra en condiciones adecuadas."
                : alertaTop?.mensaje ?? "Hay una condición que necesita tu atención."}
            </Text>
          </View>
        </Card>

        {lectura && <Text style={styles.updated}>Última lectura: {formatearFecha(lectura.fechaHora)}</Text>}

        <Button label="Preguntar al asistente" onPress={() => router.push("/(tabs)/asistente")} />
        <Button label="Ver recomendaciones" variant="secondary" onPress={() => router.push("/recomendaciones")} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  greeting: { ...typography.h2, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
    backgroundColor: "transparent",
  },
  chipActivo: { backgroundColor: colors.primaryGreen },
  chipGestionar: { borderStyle: "dashed" },
  chipTxt: { ...typography.small, fontWeight: "600", color: colors.primaryGreen },
  error: { color: colors.riskText, textAlign: "center" },
  etapaCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  etapaLabel: { ...typography.body, color: colors.textSecondary },
  etapaValue: { ...typography.h3, color: colors.primaryGreen },
  grid: { flexDirection: "row", gap: spacing.md },
  statusCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 0 },
  statusTitle: { ...typography.h3 },
  statusDetail: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  updated: { ...typography.small, color: colors.textMuted, textAlign: "center" },
});