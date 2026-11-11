import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Card from "@/components/Card";
import ModalConfirmar from "@/components/ModalConfirmar";
import { useAuth } from "@/context/AuthContext";
import { useCultivo } from "@/context/CultivoContext";
import { api } from "@/services/api";
import { Dispositivo } from "@/types";
import { colors, radius, spacing, typography } from "@/constants/theme";

export default function PlantasScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const { cultivos, cultivo, seleccionarCultivo, agregarCultivo, renombrarCultivo, borrarCultivo } = useCultivo();
  const cultivoId = cultivo?.id ?? null;

  const [nueva, setNueva] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [aEliminar, setAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [kits, setKits] = useState<Record<string, Dispositivo[]>>({});
  const [claveNueva, setClaveNueva] = useState<{ plantaId: string; clave: string } | null>(null);
  const [copiada, setCopiada] = useState(false);
  const [error, setError] = useState("");

  const cargarKits = useCallback(async (id: string) => {
    try {
      const lista = await api.listarDispositivos(id);
      setKits((k) => ({ ...k, [id]: lista }));
    } catch {
      setKits((k) => ({ ...k, [id]: [] }));
    }
  }, []);

  useEffect(() => {
    cultivos.forEach((c) => cargarKits(c.id));
  }, [cultivos, cargarKits]);

  async function crear() {
    const n = nueva.trim();
    if (n.length < 2) return setError("Escribe un nombre de al menos 2 letras.");
    try {
      setError("");
      await agregarCultivo(n);
      setNueva("");
    } catch (e: any) {
      setError(e.message ?? "No se pudo crear la planta.");
    }
  }

  async function guardarNombre() {
    if (!editandoId) return;
    if (nombreEdit.trim().length < 2) return setError("El nombre debe tener al menos 2 letras.");
    try {
      setError("");
      await renombrarCultivo(editandoId, nombreEdit.trim());
      setEditandoId(null);
    } catch (e: any) {
      setError(e.message ?? "No se pudo renombrar.");
    }
  }

  async function vincularKit(plantaId: string) {
    try {
      setError("");
      const n = (kits[plantaId]?.length ?? 0) + 1;
      const r = await api.crearDispositivo(plantaId, `Kit ${n}`);
      setCopiada(false);
      setClaveNueva({ plantaId, clave: r.clave });
      cargarKits(plantaId);
    } catch (e: any) {
      setError(e.message ?? "No se pudo crear el kit.");
    }
  }

  async function quitarKit(plantaId: string, id: string) {
    try {
      await api.eliminarDispositivo(id);
      cargarKits(plantaId);
    } catch {
      setError("No se pudo quitar el kit.");
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    const id = aEliminar.id;
    setAEliminar(null);
    try {
      await borrarCultivo(id);
    } catch (e: any) {
      setError(e.message ?? "No se pudo eliminar.");
    }
  }

  // Protección de sesión (después de todos los hooks)
  if (!isReady) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Mis plantas</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card style={styles.card}>
          <Text style={styles.h3}>Nueva planta</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Planta del balcón"
            placeholderTextColor={colors.textMuted}
            value={nueva}
            onChangeText={setNueva}
          />
          <Pressable style={styles.btnVerde} onPress={crear}>
            <Text style={styles.btnTxt}>Crear planta</Text>
          </Pressable>
        </Card>

        {cultivos.map((c) => {
          const activa = c.id === cultivoId;
          return (
            <Card key={c.id} style={[styles.card, activa && styles.cardActiva]}>
              {editandoId === c.id ? (
                <>
                  <TextInput style={styles.input} value={nombreEdit} onChangeText={setNombreEdit} autoFocus />
                  <View style={styles.fila}>
                    <Pressable style={styles.btnVerde} onPress={guardarNombre}>
                      <Text style={styles.btnTxt}>Guardar</Text>
                    </Pressable>
                    <Pressable style={styles.btnGris} onPress={() => setEditandoId(null)}>
                      <Text style={styles.btnTxtOscuro}>Cancelar</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.h3}>
                    {c.nombre}
                    {activa ? "  ✓ activa" : ""}
                  </Text>
                  <View style={styles.fila}>
                    {!activa && (
                      <Pressable style={styles.btnGris} onPress={() => seleccionarCultivo(c.id)}>
                        <Text style={styles.btnTxtOscuro}>Ver esta planta</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.btnGris}
                      onPress={() => {
                        setEditandoId(c.id);
                        setNombreEdit(c.nombre);
                      }}
                    >
                      <Text style={styles.btnTxtOscuro}>Renombrar</Text>
                    </Pressable>
                    <Pressable style={styles.btnRojo} onPress={() => setAEliminar({ id: c.id, nombre: c.nombre })}>
                      <Text style={styles.btnTxt}>Eliminar</Text>
                    </Pressable>
                  </View>
                </>
              )}

              <Text style={styles.sub}>Kits vinculados</Text>
              {(kits[c.id] ?? []).length === 0 && <Text style={styles.vacio}>Aún no hay kits en esta planta.</Text>}
              {(kits[c.id] ?? []).map((k) => (
                <View key={k.id} style={styles.kit}>
                  <Ionicons name="hardware-chip-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.kitNombre}>{k.nombre}</Text>
                  <Pressable onPress={() => quitarKit(c.id, k.id)}>
                    <Text style={styles.quitar}>Quitar</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.btnGris} onPress={() => vincularKit(c.id)}>
                <Text style={styles.btnTxtOscuro}>+ Vincular kit nuevo</Text>
              </Pressable>

              {claveNueva?.plantaId === c.id && (
                <View style={styles.claveBox}>
                  <Text style={styles.sub}>Clave del kit (se muestra solo esta vez)</Text>
                  <Text selectable style={styles.clave}>{claveNueva.clave}</Text>
                  <Text style={styles.vacio}>
                    Pégala en DEVICE_KEY del sketch del ESP32. Si la pierdes, quita el kit y crea otro.
                  </Text>
                  <View style={styles.fila}>
                    <Pressable
                      style={styles.btnVerde}
                      onPress={async () => {
                        await Clipboard.setStringAsync(claveNueva.clave);
                        setCopiada(true);
                      }}
                    >
                      <Text style={styles.btnTxt}>{copiada ? "¡Copiada!" : "Copiar"}</Text>
                    </Pressable>
                    <Pressable style={styles.btnGris} onPress={() => setClaveNueva(null)}>
                      <Text style={styles.btnTxtOscuro}>Listo</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      <ModalConfirmar
        visible={!!aEliminar}
        titulo="Eliminar planta"
        mensaje="Se borrarán la planta, sus kits, lecturas y alertas. Esta acción no se puede deshacer."
        textoRequerido={aEliminar?.nombre}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={confirmarEliminar}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h2, color: colors.textPrimary },
  card: { gap: spacing.sm },
  cardActiva: { borderWidth: 2, borderColor: colors.primaryGreen },
  h3: { ...typography.h3, color: colors.textPrimary },
  sub: { ...typography.small, fontWeight: "600", color: colors.textSecondary, marginTop: spacing.sm },
  vacio: { ...typography.small, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.textPrimary,
  },
  fila: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  btnVerde: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignSelf: "flex-start",
  },
  btnGris: {
    backgroundColor: "#EEEEEE",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignSelf: "flex-start",
  },
  btnRojo: {
    backgroundColor: "#C62828",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignSelf: "flex-start",
  },
  btnTxt: { color: "#fff", fontWeight: "600" },
  btnTxtOscuro: { color: "#333", fontWeight: "600" },
  kit: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  kitNombre: { flex: 1, ...typography.body, color: colors.textPrimary },
  quitar: { color: "#C62828", fontWeight: "600" },
  claveBox: { backgroundColor: "#FFF8E1", padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  clave: { fontFamily: "monospace", fontSize: 13, color: "#333" },
  error: { color: "#C62828" },
});