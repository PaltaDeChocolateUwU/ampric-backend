
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import * as XLSX from "xlsx";

import Button from "@/components/Button";
import Card from "@/components/Card";
import Segmented from "@/components/Segmented";
import { useCultivo } from "@/context/CultivoContext";
import { api, Rango } from "@/services/api";
import { Lectura } from "@/types";
import { colors, spacing, typography } from "@/constants/theme";
import HistorialGraficaWeb from "@/components/HistorialGraficaWeb";

type Variable =
  | "humedadSuelo"
  | "temperatura"
  | "humedadAmbiente";

const VARIABLES: Record<
  Variable,
  { titulo: string; unidad: string; color: string; max: number }
> = {
  humedadSuelo: {
    titulo: "Humedad del suelo",
    unidad: "%",
    color: colors.primaryGreen,
    max: 100,
  },
  temperatura: {
    titulo: "Temperatura",
    unidad: "°C",
    color: colors.warningText,
    max: 40,
  },
  humedadAmbiente: {
    titulo: "Humedad ambiental",
    unidad: "%",
    color: colors.infoBlue,
    max: 100,
  },
};

function valorValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

function fechaLocal(fecha: string): string {
  return new Date(fecha).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function etiqueta(fecha: string, rango: Rango): string {
  const d = new Date(fecha);

  if (rango === "dia") {
    return d.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// Reduce puntos visuales, manteniendo inicio, final
// y extremos de los intervalos.
// Las estadísticas no usan este muestreo.
function reducirPuntos(
  registros: Lectura[],
  variable: Variable,
  maxGrupos = 12
): Lectura[] {
  if (registros.length <= maxGrupos * 3) return registros;

  const seleccion = new Set<number>([
    0,
    registros.length - 1,
  ]);

  const paso = Math.ceil(registros.length / maxGrupos);

  for (let inicio = 0; inicio < registros.length; inicio += paso) {
    const fin = Math.min(inicio + paso, registros.length);
    let indiceMin = -1;
    let indiceMax = -1;

    for (let i = inicio; i < fin; i++) {
      const valor = registros[i][variable];
      if (!valorValido(valor)) continue;

      if (
        indiceMin === -1 ||
        valor < registros[indiceMin][variable]
      ) {
        indiceMin = i;
      }

      if (
        indiceMax === -1 ||
        valor > registros[indiceMax][variable]
      ) {
        indiceMax = i;
      }
    }

    seleccion.add(inicio);
    if (indiceMin >= 0) seleccion.add(indiceMin);
    if (indiceMax >= 0) seleccion.add(indiceMax);
  }

  return [...seleccion]
    .sort((a, b) => a - b)
    .map((i) => registros[i]);
}

async function exportarExcel(
  lecturas: Lectura[],
  nombreCultivo: string,
  rango: Rango
) {
  if (!lecturas.length) {
    throw new Error("No hay mediciones para exportar.");
  }

  const registros = lecturas.map((l) => ({
    "Fecha y hora": fechaLocal(l.fechaHora),
    "Humedad del suelo (%)": l.humedadSuelo ?? "",
    "Temperatura (°C)": l.temperatura ?? "",
    "Humedad ambiental (%)": l.humedadAmbiente ?? "",
  }));

  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.json_to_sheet(registros);

  hoja["!cols"] = [
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 27 },
  ];

  XLSX.utils.book_append_sheet(libro, hoja, "Mediciones");

  const resumen = XLSX.utils.aoa_to_sheet([
    ["AMPRIC - Historial de cultivo"],
    ["Planta", nombreCultivo],
    ["Rango", rango],
    ["Total de lecturas", lecturas.length],
    ["Generado", fechaLocal(new Date().toISOString())],
  ]);

  resumen["!cols"] = [
    { wch: 24 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(libro, resumen, "Resumen");

  const nombreSeguro = nombreCultivo
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 35);

  const nombreArchivo =
    `AMPRIC_${nombreSeguro}_${rango}_${Date.now()}.xlsx`;

  const buffer = XLSX.write(libro, {
    bookType: "xlsx",
    type: "array",
  });

  if (Platform.OS === "web") {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const { File, Paths } = await import("expo-file-system");
    const Sharing = await import("expo-sharing");

    const archivo = new File(Paths.cache, nombreArchivo);
    const bytes = new Uint8Array(buffer);

    await archivo.write(bytes);

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error(
        "No hay una aplicación disponible para compartir el Excel."
      );
    }

    await Sharing.shareAsync(archivo.uri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Exportar historial AMPRIC",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
  }
}

export default function HistorialScreen() {
  const { cultivo } = useCultivo();
  const cultivoId = cultivo?.id;
  const { width } = useWindowDimensions();

  const [rango, setRango] = useState<Rango>("dia");
  const [variable, setVariable] =
    useState<Variable>("humedadSuelo");
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionadaId, setSeleccionadaId] =
    useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    setLecturas([]);
    setSeleccionadaId(null);
    setError(null);

    if (!cultivoId) {
      setCargando(false);
      return;
    }

    setCargando(true);

    api
      .getHistorialDetallado(cultivoId, rango)
      .then((datos) => {
        if (!activo) return;

        const ordenados = [...datos].sort(
          (a, b) =>
            new Date(a.fechaHora).getTime() -
            new Date(b.fechaHora).getTime()
        );

        setLecturas(ordenados);
      })
      .catch((e) => {
        if (!activo) return;
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo cargar el historial."
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [cultivoId, rango]);

  useEffect(() => {
    setSeleccionadaId(null);
  }, [variable]);

  const cfg = VARIABLES[variable];

  const lecturasValidas = useMemo(
    () =>
      lecturas.filter((l) => valorValido(l[variable])),
    [lecturas, variable]
  );

  const valores = useMemo(
    () => lecturasValidas.map((l) => l[variable] as number),
    [lecturasValidas, variable]
  );

  const estadisticas = useMemo(() => {
    if (valores.length === 0) {
      return { min: null, max: null, prom: null };
    }

    let minimo = Infinity;
    let maximo = -Infinity;
    let suma = 0;

    for (const valor of valores) {
      minimo = Math.min(minimo, valor);
      maximo = Math.max(maximo, valor);
      suma += valor;
    }

    return {
      min: minimo,
      max: maximo,
      prom: suma / valores.length,
    };
  }, [valores]);

  const puntos = useMemo(
    () => reducirPuntos(lecturasValidas, variable),
    [lecturasValidas, variable]
  );

  const ultima = lecturasValidas.length
    ? lecturasValidas[lecturasValidas.length - 1]
    : null;

  const seleccionada =
    lecturasValidas.find((l) => l.id === seleccionadaId) ??
    ultima;

  const datosGrafica = useMemo(() => {
    const saltoEtiquetas = Math.max(
      1,
      Math.ceil(puntos.length / 5)
    );

    return puntos.map((l, i) => {
      const esUltimo = i === puntos.length - 1;

      return {
  value: l[variable] as number,
  label:
    i % saltoEtiquetas === 0 || esUltimo
      ? etiqueta(l.fechaHora, rango)
      : "",
  dataPointsColor: esUltimo
    ? colors.primaryGreenDark
    : cfg.color,
  dataPointsRadius: esUltimo ? 6 : 3,
};
    });
  }, [puntos, variable, rango, cfg.color]);

  const anchoGrafica = Math.max(
    180,
    Math.min(width, 480) - spacing.lg * 4 - 36
  );

  const espacio =
    datosGrafica.length > 1
      ? Math.max(
          5,
          (anchoGrafica - 30) / (datosGrafica.length - 1)
        )
      : 24;

  const maxEscala =
    variable === "temperatura"
      ? Math.max(
          cfg.max,
          Math.ceil((estadisticas.max ?? 0) / 10) * 10
        )
      : cfg.max;

  function mostrarValor(valor: number | null): string {
    return valor === null
      ? "—"
      : `${valor.toFixed(1)}${cfg.unidad}`;
  }

  async function handleExportar() {
    if (exportando || !lecturas.length) return;

    setExportando(true);

    try {
      await exportarExcel(
        lecturas,
        cultivo?.nombre ?? "Cultivo",
        rango
      );
    } catch (e) {
      const mensaje =
        e instanceof Error
          ? e.message
          : "No se pudo generar el archivo Excel.";

      if (Platform.OS === "web") {
        setError(mensaje);
      } else {
        Alert.alert("Error al exportar", mensaje);
      }
    } finally {
      setExportando(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>
          Historial del cultivo
        </Text>

        <Text style={styles.subtitulo}>
          {cultivo?.nombre ?? "Sin planta seleccionada"}
        </Text>

        <Segmented
          opciones={[
            { valor: "dia", label: "Día" },
            { valor: "semana", label: "Semana" },
            { valor: "mes", label: "Mes" },
          ]}
          valor={rango}
          onChange={setRango}
        />

        <Segmented
          opciones={[
            { valor: "humedadSuelo", label: "Suelo" },
            { valor: "temperatura", label: "Temperatura" },
            { valor: "humedadAmbiente", label: "Ambiente" },
          ]}
          valor={variable}
          onChange={setVariable}
        />

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <Card>
          <Text style={styles.chartTitle}>
            {cfg.titulo} ({cfg.unidad})
          </Text>

          <Text style={styles.rangoTexto}>
            {rango === "dia"
              ? "Últimas 24 horas"
              : rango === "semana"
                ? "Últimos 7 días"
                : "Últimos 30 días"}
          </Text>

          {cargando ? (
            <ActivityIndicator
              color={colors.primaryGreen}
              style={{ marginVertical: 65 }}
            />
          ) : lecturasValidas.length === 0 ? (
            <View style={styles.vacioContenedor}>
              <Ionicons
                name="analytics-outline"
                size={35}
                color={colors.textMuted}
              />
              <Text style={styles.vacio}>
                Todavía no hay mediciones de esta variable
                en el rango seleccionado.
              </Text>
            </View>
          ) : lecturasValidas.length === 1 ? (
            <View style={styles.unicoContenedor}>
              <Ionicons
                name="ellipse"
                size={18}
                color={cfg.color}
              />
              <Text style={styles.valorUnico}>
                {mostrarValor(valores[0])}
              </Text>
              <Text style={styles.vacio}>
                Solo hay una medición registrada.
                Cuando lleguen más datos aparecerá
                la evolución en la gráfica.
              </Text>
            </View>
          ) : (
            <View style={styles.chartArea}>
            {Platform.OS === "web" ? (
            <HistorialGraficaWeb
            puntos={puntos}
            variable={variable}
            rango={rango}
            color={cfg.color}
           maximo={maxEscala}
    ancho={anchoGrafica}
    seleccionadaId={seleccionadaId}
    onSeleccionar={setSeleccionadaId}
  />
) : (
  <LineChart
    data={datosGrafica}
    width={anchoGrafica}
    height={200}
    spacing={espacio}
    initialSpacing={10}
    endSpacing={10}
    maxValue={maxEscala}
    noOfSections={4}
    color={cfg.color}
    thickness={2.5}
    dataPointsRadius={3}
    dataPointsColor={cfg.color}
    areaChart
    startFillColor={cfg.color}
    startOpacity={0.20}
    endOpacity={0}
    hideRules
    yAxisThickness={0}
    xAxisColor={colors.border}
    yAxisTextStyle={{
      color: colors.textMuted,
      fontSize: 10,
    }}
    xAxisLabelTextStyle={{
      color: colors.textMuted,
      fontSize: 10,
      width: 48,
      textAlign: "center",
    }}
    disableScroll
    focusEnabled
    onFocus={(_item: any, index: number) => {
      const lectura = puntos[index];
      if (lectura) setSeleccionadaId(lectura.id);
    }}
    focusedDataPointColor={colors.primaryGreenDark}
    focusedDataPointRadius={7}
  />
)}


              <Text style={styles.ayudaGrafica}>
                Toca un punto para consultar su medición.
                El punto más grande es el último registro.
              </Text>
            </View>
          )}

          {seleccionada && !cargando && (
            <View style={styles.lecturaActual}>
              <View style={styles.lecturaIcono}>
                <Ionicons
                  name="location"
                  size={18}
                  color={colors.primaryGreen}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.lecturaTitulo}>
                  {seleccionada.id === ultima?.id
                    ? "Última medición"
                    : "Medición seleccionada"}
                </Text>
                <Text style={styles.lecturaFecha}>
                  {fechaLocal(seleccionada.fechaHora)}
                </Text>
              </View>

              <Text style={styles.lecturaValor}>
                {mostrarValor(
                  seleccionada[variable] as number
                )}
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.statsRow}>
          {[
            ["Mínimo", estadisticas.min],
            ["Promedio", estadisticas.prom],
            ["Máximo", estadisticas.max],
          ].map(([label, valor]) => (
            <Card
              key={label as string}
              style={styles.statCard}
            >
              <Text style={styles.statLabel}>
                {label}
              </Text>

              <Text style={styles.statValue}>
                {mostrarValor(valor as number | null)}
              </Text>
            </Card>
          ))}
        </View>

        <Text style={styles.infoLecturas}>
          {lecturas.length} medición(es) registradas
          en este rango.
        </Text>

        <Button
          label={
            exportando
              ? "Generando Excel..."
              : "Exportar historial (Excel)"
          }
          variant="secondary"
          onPress={handleExportar}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitulo: {
    ...typography.small,
    color: colors.primaryGreenDark,
    fontWeight: "600",
  },
  chartTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  rangoTexto: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 3,
    marginBottom: spacing.md,
  },
  chartArea: {
    overflow: "hidden",
  },
  ayudaGrafica: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "center",
  },
  vacioContenedor: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  vacio: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  unicoContenedor: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  valorUnico: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  lecturaActual: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightGreenBg,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  lecturaIcono: {
    alignItems: "center",
    justifyContent: "center",
  },
  lecturaTitulo: {
    ...typography.small,
    color: colors.primaryGreenDark,
    fontWeight: "700",
  },
  lecturaFecha: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lecturaValor: {
    ...typography.h3,
    color: colors.primaryGreenDark,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: 2,
  },
  infoLecturas: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },
  error: {
    ...typography.small,
    color: colors.riskText,
    marginVertical: spacing.sm,
  },
});
