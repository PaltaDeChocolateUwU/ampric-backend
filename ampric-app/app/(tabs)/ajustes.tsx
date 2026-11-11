import React from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Segmented from "@/components/Segmented";
import { useAuth } from "@/context/AuthContext";
import { useCultivo } from "@/context/CultivoContext";
import { AlertasConfig } from "@/types";
import { colors, spacing, typography } from "@/constants/theme";

const OPCIONES_ALERTA: { clave: keyof AlertasConfig; etiqueta: string }[] = [
  { clave: "riego", etiqueta: "Alertas de riego" },
  { clave: "hongos", etiqueta: "Riesgo de hongos" },
  { clave: "temperatura", etiqueta: "Temperatura fuera de rango" },
  { clave: "suelo_humedo", etiqueta: "Suelo muy húmedo" },
];

export default function AjustesScreen() {
  const { usuario, logout, logoutGlobal } = useAuth();
  const { cultivo, cultivos, cambiarEtapa, alertasConfig, guardarAlertasConfig } = useCultivo();
  const [confirmando, setConfirmando] = React.useState(false);
  const [msgSeguridad, setMsgSeguridad] = React.useState<string | null>(null);

  async function handleLogoutGlobal() {
    const err = await logoutGlobal();
    if (err) {
      setMsgSeguridad(err);
      setConfirmando(false);
      return;
    }
    router.replace("/login");
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Ajustes</Text>

        <Card style={styles.perfil}>
          <Ionicons name="person-circle" size={52} color={colors.primaryGreen} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>{usuario?.nombre ?? "Cultivador"}</Text>
            <Text style={styles.correo}>{usuario?.correo}</Text>
            <Text style={styles.tipo}>
              {usuario?.tipoCuenta === "empresa" ? "Cuenta de pequeña empresa" : "Cuenta personal"}
            </Text>
          </View>
        </Card>

        <Pressable onPress={() => router.push("/plantas")}>
          <Card style={styles.plantasCard}>
            <Ionicons name="leaf-outline" size={22} color={colors.primaryGreen} />
            <View style={{ flex: 1 }}>
              <Text style={styles.seccion}>Mis plantas</Text>
              <Text style={styles.ayudaSinMargen}>
                {cultivos.length === 1 ? "1 planta" : `${cultivos.length} plantas`} · Activa: {cultivo?.nombre ?? "—"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>

        <Card>
          <Text style={styles.seccion}>Etapa del cultivo</Text>
          <Text style={styles.ayuda}>Define los rangos de humedad con los que se generan alertas y recomendaciones.</Text>
          {cultivo && (
            <Segmented
              opciones={[
                { valor: "germinacion", label: "Germinación" },
                { valor: "vegetativo", label: "Vegetativo" },
                { valor: "floracion", label: "Floración" },
              ]}
              valor={cultivo.etapa}
              onChange={cambiarEtapa}
            />
          )}
        </Card>

        <Card>
          <Text style={styles.seccion}>Alertas</Text>
          <Text style={styles.ayuda}>
            Elige qué alertas se generan para {cultivo ? `«${cultivo.nombre}»` : "esta planta"}.
          </Text>
          {OPCIONES_ALERTA.map(({ clave, etiqueta }) => (
            <View key={clave} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{etiqueta}</Text>
              <Switch
                value={alertasConfig[clave]}
                onValueChange={(v) => guardarAlertasConfig({ [clave]: v })}
                trackColor={{ true: colors.primaryGreen, false: colors.border }}
                disabled={!cultivo}
              />
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.seccion}>Seguridad</Text>
          <Text style={styles.ayuda}>
            Cierra tu sesión en este y en todos los demás dispositivos donde la hayas iniciado.
          </Text>
          {confirmando ? (
            <View style={{ gap: spacing.sm }}>
              <Button label="Sí, cerrar en todos los dispositivos" onPress={handleLogoutGlobal} />
              <Button label="Cancelar" variant="secondary" onPress={() => setConfirmando(false)} />
            </View>
          ) : (
            <Button
              label="Cerrar sesión en todos los dispositivos"
              variant="secondary"
              onPress={() => setConfirmando(true)}
            />
          )}
          {msgSeguridad && <Text style={{ color: colors.riskText, marginTop: spacing.sm }}>{msgSeguridad}</Text>}
        </Card>

        <Button label="Cerrar sesión" variant="secondary" onPress={handleLogout} />
        <Text style={styles.version}>AMPRIC v0.1</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.textPrimary },
  perfil: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  plantasCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  nombre: { ...typography.h3, color: colors.textPrimary },
  correo: { ...typography.small, color: colors.textMuted },
  tipo: { ...typography.small, color: colors.primaryGreen, marginTop: 2, fontWeight: "600" },
  seccion: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  ayuda: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.md },
  ayudaSinMargen: { ...typography.small, color: colors.textSecondary },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm },
  switchLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  version: { ...typography.small, color: colors.textMuted, textAlign: "center" },
});