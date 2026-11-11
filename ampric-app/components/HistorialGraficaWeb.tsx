
import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
} from "react-native-svg";

import { Lectura } from "@/types";
import { colors } from "@/constants/theme";

type Variable =
  | "humedadSuelo"
  | "temperatura"
  | "humedadAmbiente";

type Rango = "dia" | "semana" | "mes";

interface Props {
  puntos: Lectura[];
  variable: Variable;
  rango: Rango;
  color: string;
  maximo: number;
  ancho: number;
  seleccionadaId: string | null;
  onSeleccionar: (id: string) => void;
}

const ALTO = 235;
const IZQUIERDA = 43;
const DERECHA = 12;
const ARRIBA = 12;
const ABAJO = 37;

export default function HistorialGraficaWeb({
  puntos,
  variable,
  rango,
  color,
  maximo,
  ancho,
  seleccionadaId,
  onSeleccionar,
}: Props) {
  const anchoSeguro = Math.max(180, ancho);
  const anchoArea = anchoSeguro - IZQUIERDA - DERECHA;
  const altoArea = ALTO - ARRIBA - ABAJO;
  const escalaMax = Math.max(1, maximo);

  const datos = useMemo(() => {
    const tiempos = puntos.map((p) =>
      new Date(p.fechaHora).getTime()
    );

    const inicio = tiempos[0] ?? 0;
    const fin = tiempos[tiempos.length - 1] ?? inicio;
    const duracion = Math.max(1, fin - inicio);

    return puntos.map((p, i) => {
      const valor = Number(p[variable] ?? 0);
      const x =
        IZQUIERDA +
        ((tiempos[i] - inicio) / duracion) * anchoArea;

      const y =
        ARRIBA +
        (1 - Math.min(1, Math.max(0, valor / escalaMax))) *
          altoArea;

      return { id: p.id, x, y, valor };
    });
  }, [puntos, variable, escalaMax, anchoArea]);

  if (datos.length === 0) return null;

  const trayectoria = datos
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
    )
    .join(" ");

  const baseY = ARRIBA + altoArea;

  const area = [
    trayectoria,
    `L ${datos[datos.length - 1].x} ${baseY}`,
    `L ${datos[0].x} ${baseY}`,
    "Z",
  ].join(" ");

  const ultima = datos[datos.length - 1];

  const primerFecha = new Date(puntos[0].fechaHora);
  const ultimaFecha = new Date(
    puntos[puntos.length - 1].fechaHora
  );

  function fechaCorta(fecha: Date) {
    if (rango === "dia") {
      return fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
  }

  return (
    <View
      style={{
        width: anchoSeguro,
        height: ALTO,
        position: "relative",
      }}
    >
      <Svg
        width={anchoSeguro}
        height={ALTO}
        viewBox={`0 0 ${anchoSeguro} ${ALTO}`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const y = ARRIBA + (i / 4) * altoArea;

          return (
            <Line
              key={i}
              x1={IZQUIERDA}
              y1={y}
              x2={anchoSeguro - DERECHA}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3,4"
            />
          );
        })}

        <Path
          d={area}
          fill={color}
          fillOpacity={0.10}
        />

        <Path
          d={trayectoria}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {datos.map((p, i) => {
          const destacado =
            p.id === seleccionadaId ||
            (!seleccionadaId && i === datos.length - 1);

          return (
            <Circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={destacado ? 5.5 : 3.5}
              fill={destacado ? colors.primaryGreenDark : color}
              stroke={colors.white}
              strokeWidth={destacado ? 2 : 1}
            />
          );
        })}

        <Circle
          cx={ultima.x}
          cy={ultima.y}
          r={10}
          stroke={colors.primaryGreenDark}
          strokeOpacity={0.3}
          strokeWidth={2}
          fill="none"
        />
      </Svg>

      {[0, 1, 2, 3, 4].map((i) => (
        <Text
          key={`y-${i}`}
          style={[
            styles.ejeY,
            {
              top: ARRIBA + (i / 4) * altoArea - 7,
            },
          ]}
        >
          {(escalaMax * (1 - i / 4)).toFixed(0)}
        </Text>
      ))}

      <Text
        style={[
          styles.ejeX,
          { left: IZQUIERDA, textAlign: "left" },
        ]}
      >
        {fechaCorta(primerFecha)}
      </Text>

      <Text
        style={[
          styles.ejeX,
          { right: DERECHA, textAlign: "right" },
        ]}
      >
        {fechaCorta(ultimaFecha)}
      </Text>

      {datos.map((p) => (
        <Pressable
          key={`boton-${p.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Seleccionar medición ${p.valor}`}
          onPress={() => onSeleccionar(p.id)}
          style={{
            position: "absolute",
            left: p.x - 13,
            top: p.y - 13,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: "transparent",
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ejeY: {
    position: "absolute",
    left: 0,
    width: 36,
    textAlign: "right",
    fontSize: 10,
    color: colors.textMuted,
  },
  ejeX: {
    position: "absolute",
    bottom: 5,
    fontSize: 10,
    color: colors.textMuted,
    minWidth: 45,
  },
});
