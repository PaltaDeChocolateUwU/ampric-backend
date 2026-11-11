
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AlertItem from "@/components/AlertItem";
import Button from "@/components/Button";
import Segmented from "@/components/Segmented";
import { useCultivo } from "@/context/CultivoContext";
import {
  colors,
  estadoColors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { formatearFecha, tituloAlerta } from "@/utils/cultivo";

type Filtro = "todas" | "pendiente" | "resuelta";

export default function AlertasScreen() {
  const { alertas, cultivos, responderAlerta } = useCultivo();

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [seleccionId, setSeleccionId] = useState<string | null>(null);

  const nombresPlantas = useMemo(() => {
    return new Map(
      cultivos.map((c) => [String(c.id), c.nombre])
    );
  }, [cultivos]);

  function obtenerNombrePlanta(cultivoId: string): string {
    return (
      nombresPlantas.get(String(cultivoId)) ??
      "Planta no disponible"
    );
  }

  const visibles = useMemo(
    () =>
      alertas
        .filter((a) =>
          filtro === "todas"
            ? true
            : filtro === "pendiente"
              ? a.estado === "pendiente"
              : a.estado !== "pendiente"
        )
        .sort((a, b) =>
          b.fechaHora.localeCompare(a.fechaHora)
        ),
    [alertas, filtro]
  );

  const actual =
    alertas.find((a) => a.id === seleccionId) ?? null;

  async function responder(
    accion: "atendida" | "descartada"
  ) {
    if (!actual) return;

    await responderAlerta(actual.id, accion);
    setSeleccionId(null);
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Alertas</Text>

        <Text style={styles.subtitulo}>
          Notificaciones de todas tus plantas
        </Text>

        <Segmented
          opciones={[
            { valor: "todas", label: "Todas" },
            { valor: "pendiente", label: "Pendientes" },
            { valor: "resuelta", label: "Resueltas" },
          ]}
          valor={filtro}
          onChange={setFiltro}
        />
      </View>

      <FlatList
        data={visibles}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => (
          <View style={{ height: spacing.sm }} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No hay alertas en esta categoría.
          </Text>
        }
        renderItem={({ item }) => (
          <AlertItem
            alerta={item}
            nombrePlanta={obtenerNombrePlanta(item.cultivoId)}
            onPress={() => setSeleccionId(item.id)}
          />
        )}
      />

      <Modal
        visible={actual !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSeleccionId(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setSeleccionId(null)}
        >
          <Pressable
            style={styles.sheet}
            onPress={() => {}}
          >
            {actual && (
              <>
                <Text
                  style={[
                    styles.sheetTitle,
                    {
                      color:
                        estadoColors[actual.severidad].text,
                    },
                  ]}
                >
                  {tituloAlerta(actual)}
                </Text>

                <Text style={styles.sheetFecha}>
                  {formatearFecha(actual.fechaHora)}
                </Text>

                <View style={styles.plantaInfo}>
                  <Ionicons
                    name="leaf-outline"
                    size={18}
                    color={colors.primaryGreen}
                  />

                  <Text style={styles.plantaTexto}>
                    Planta:{" "}
                    {obtenerNombrePlanta(actual.cultivoId)}
                  </Text>
                </View>

                <Text style={styles.sheetMensaje}>
                  {actual.mensaje}
                </Text>

                {actual.estado === "pendiente" ? (
                  <View
                    style={{
                      gap: spacing.sm,
                      marginTop: spacing.lg,
                    }}
                  >
                    <Button
                      label="Marcar como atendida"
                      onPress={() => responder("atendida")}
                    />

                    <Button
                      label="Descartar"
                      variant="secondary"
                      onPress={() => responder("descartada")}
                    />
                  </View>
                ) : (
                  <Text style={styles.sheetEstado}>
                    Esta alerta ya fue{" "}
                    {actual.estado === "atendida"
                      ? "atendida"
                      : "descartada"}
                    .
                  </Text>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: 0,
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitulo: {
    ...typography.small,
    color: colors.textSecondary,
  },
  list: {
    padding: spacing.lg,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    ...typography.h2,
  },
  sheetFecha: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  plantaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.lightGreenBg,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  plantaTexto: {
    ...typography.small,
    color: colors.primaryGreenDark,
    fontWeight: "600",
  },
  sheetMensaje: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.md,
    lineHeight: 21,
  },
  sheetEstado: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
