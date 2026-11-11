import { Alerta, EstadoNivel, EtapaCultivo, Lectura, Recomendacion } from "@/types";

// % de humedad de suelo donde hay que regar. Calíbralo con tu sensor real.
export const UMBRAL_RIEGO = 35;

// [advertencia, riesgo] de humedad ambiental por etapa (ajústalos con literatura o un agrónomo)
const LIMITES_HUMEDAD: Record<EtapaCultivo, [number, number]> = {
  germinacion: [75, 85],
  vegetativo: [70, 80],
  floracion: [55, 65],
};

export const ETAPA_LABEL: Record<EtapaCultivo, string> = {
  germinacion: "Germinación",
  vegetativo: "Vegetativo",
  floracion: "Floración",
};

const CONSEJO_ETAPA: Record<EtapaCultivo, string> = {
  germinacion: "Mantén el sustrato húmedo pero sin encharcar y la humedad ambiental alta y estable.",
  vegetativo: "Mantén la humedad ambiental entre 50% y 70% y riega cuando el sustrato lo pida.",
  floracion: "Baja la humedad ambiental a 40-50% y evita mojar los cogollos para prevenir hongos.",
};

const ORDEN: Record<EstadoNivel, number> = { ok: 0, warning: 1, risk: 2 };

export function peorEstado(...estados: EstadoNivel[]): EstadoNivel {
  return estados.reduce<EstadoNivel>((a, b) => (ORDEN[b] > ORDEN[a] ? b : a), "ok");
}


export function estimarHorasRiego(lecturas: Lectura[]): number | null {
  if (lecturas.length < 2) return null;
  const ultima = lecturas[lecturas.length - 1];
  if (ultima.humedadSuelo <= UMBRAL_RIEGO) return 0;

  const tFin = new Date(ultima.fechaHora).getTime();
  const ventana = lecturas.filter((l) => tFin - new Date(l.fechaHora).getTime() <= 6 * 3600000);
  if (ventana.length < 2) return null;
  if (ultima.humedadSuelo <= UMBRAL_RIEGO) return 0; // ← línea nueva
  const primera = ventana[0];
  const horas = (tFin - new Date(primera.fechaHora).getTime()) / 3600000;
  if (horas <= 0) return null;

  const caidaPorHora = (primera.humedadSuelo - ultima.humedadSuelo) / horas;
  if (caidaPorHora < 0.05) return null;
  return Math.max(0, (ultima.humedadSuelo - UMBRAL_RIEGO) / caidaPorHora);
}

export function estadoRiego(horas: number | null): EstadoNivel {
  if (horas === null) return "ok";
  if (horas <= 2) return "risk";
  if (horas <= 6) return "warning";
  return "ok";
}

export function estadoSuelo(humedadSuelo: number): EstadoNivel {
  return humedadSuelo <= UMBRAL_RIEGO ? "risk" : "ok";
}

export function estadoHongos(humedadAmbiente: number, etapa: EtapaCultivo): EstadoNivel {
  const [advertencia, riesgo] = LIMITES_HUMEDAD[etapa];
  if (humedadAmbiente >= riesgo) return "risk";
  if (humedadAmbiente >= advertencia) return "warning";
  return "ok";
}

export function generarRecomendaciones(
  lectura: Lectura | null,
  horas: number | null,
  etapa: EtapaCultivo
): Recomendacion[] {
  const recs: Recomendacion[] = [];

  if (lectura) {
    const er = estadoRiego(horas);
    if (er === "risk") {
      recs.push({
        id: "riego",
        titulo: "Riega ahora",
        detalle: `La humedad del suelo está en ${lectura.humedadSuelo}% y está por llegar al nivel crítico. Riega lo antes posible.`,
        icono: "riego",
      });


    } else if (er === "warning") {
      recs.push({
        id: "riego",
        titulo: `Riega en ${Math.max(1, Math.round(horas ?? 0))} horas`,
        detalle: `La humedad del suelo está en ${lectura.humedadSuelo}%. Para evitar estrés hídrico, riega cuando sea posible.`,
        icono: "riego",
      });
    }


    if (estadoHongos(lectura.humedadAmbiente, etapa) !== "ok") {
      recs.push({
        id: "ventilacion",
        titulo: "Mejora la ventilación",
        detalle: `La humedad ambiental está alta (${lectura.humedadAmbiente}%) para la etapa de ${ETAPA_LABEL[etapa].toLowerCase()}. Asegura buena circulación de aire para evitar hongos.`,
        icono: "ventilacion",
      });
    }
  }

  recs.push({
    id: "etapa",
    titulo: `Etapa ${ETAPA_LABEL[etapa].toLowerCase()}`,
    detalle: CONSEJO_ETAPA[etapa],
    icono: "etapa",
  });
  return recs;
}

export function tituloAlerta(a: Alerta): string {
  if (a.severidad === "ok") return "Condiciones normales";
  return a.tipo === "riego" ? "Riego recomendado" : "Riesgo de hongos";
}

export function formatearFecha(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const hora = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  return `${d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}, ${hora}`;
}