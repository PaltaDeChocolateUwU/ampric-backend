import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ChatBubble from "@/components/ChatBubble";
import { useCultivo } from "@/context/CultivoContext";
import { api } from "@/services/api";
import { ContextoChat, MensajeChat } from "@/types";
import { colors, radius, spacing, typography } from "@/constants/theme";

const SUGERENCIAS = ["¿Debo regar hoy?", "¿Hay riesgo de hongos?", "Explícame mis alertas"];

const BIENVENIDA: MensajeChat = {
  id: "bienvenida",
  rol: "assistant",
  texto: "Hola, soy el asistente de AMPRIC. Puedo ayudarte a interpretar las lecturas de tu cultivo, decidir cuándo regar y explicarte las alertas.",
};

export default function AsistenteScreen() {
  const { cultivo, lectura, prediccion, alertas } = useCultivo();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([BIENVENIDA]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<FlatList<MensajeChat>>(null);
  useEffect(() => {
  setMensajes([BIENVENIDA]);
  setTexto("");
}, [cultivo?.id]);


const alertasDePlanta = alertas.filter(
  (a) =>
    String(a.cultivoId) === String(cultivo?.id) &&
    a.estado === "pendiente"
);

const contexto: ContextoChat & {
  nombre: string;
  alertas: string[];
} = {
  nombre: cultivo?.nombre ?? "Planta seleccionada",
  etapa: cultivo?.etapa ?? "vegetativo",

  humedadSuelo: lectura?.humedadSuelo ?? undefined,
  temperatura: lectura?.temperatura ?? undefined,
  humedadAmbiente: lectura?.humedadAmbiente ?? undefined,

  horasParaRiego: prediccion?.horasRestantes ?? null,

  alertasPendientes: alertasDePlanta.length,

  alertas: alertasDePlanta
    .slice(0, 10)
    .map((a) => a.mensaje),
};


  async function enviar(pregunta: string) {
    const limpio = pregunta.trim();
    if (!limpio || enviando) return;

    const nuevo: MensajeChat = { id: `u-${Date.now()}`, rol: "user", texto: limpio };
    const conversacion = [...mensajes, nuevo];
    setMensajes(conversacion);
    setTexto("");
    setEnviando(true);

    try {
      // La bienvenida es solo de la interfaz: no se envía al modelo
      const respuesta = await api.enviarMensajeChat(
  conversacion.filter((m) => m.id !== "bienvenida"),
  contexto
);

// Eliminar el aviso técnico de las respuestas automáticas
const respuestaLimpia = respuesta
  .replace(
    /\s*\(Respuesta automática:\s*el asistente avanzado no está disponible en este momento\.\)/gi,
    ""
  )
  .trim();

setMensajes((prev) => [
  ...prev,
  {
    id: `a-${Date.now()}`,
    rol: "assistant",
    texto: respuestaLimpia || "No pude generar una respuesta en este momento.",
  },
]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, rol: "assistant", texto: "No pude conectarme con el asistente. Revisa tu conexión e inténtalo de nuevo." },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Asistente AMPRIC</Text>
        <Text style={styles.aviso}>Las respuestas son orientativas y no reemplazan asesoría agronómica ni médica.</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => <ChatBubble mensaje={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
          enviando ? (
          <ActivityIndicator
          color={colors.primaryGreen}
          style={{
          alignSelf: "flex-start",
          margin: spacing.sm,
      }}
    />
  ) : undefined
}
        />

        <View style={styles.sugerencias}>
          {SUGERENCIAS.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => enviar(s)}>
              <Text style={styles.chipTexto}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={colors.textMuted}
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={() => enviar(texto)}
            returnKeyType="send"
            multiline={false}
          />
          <Pressable style={[styles.enviar, (!texto.trim() || enviando) && { opacity: 0.5 }]} onPress={() => enviar(texto)}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.textPrimary },
  aviso: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  lista: { padding: spacing.lg, paddingTop: spacing.sm },
  sugerencias: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: {
    backgroundColor: colors.lightGreenBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipTexto: { ...typography.small, color: colors.primaryGreenDark, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    color: colors.textPrimary,
  },
  enviar: { backgroundColor: colors.primaryGreen, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});