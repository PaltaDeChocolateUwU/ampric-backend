import { Alerta, ContextoChat, Cultivo, Lectura } from "@/types";

export const mockCultivo: Cultivo = {
  id: "cult-1",
  nombre: "Cultivo principal",
  etapa: "vegetativo",
};

/** Serie sintética: el suelo se seca ~0.75%/h y se "riega" cada 48 h. */
export function generarHistorial(cantidad: number, pasoHoras: number): Lectura[] {
  const ahora = Date.now();
  return Array.from({ length: cantidad }, (_, i) => {
    const haceHoras = (cantidad - 1 - i) * pasoHoras;
    const fecha = new Date(ahora - haceHoras * 3600000);
    const fase = (((40 - haceHoras) % 48) + 48) % 48;
    const ciclo = Math.sin(((fecha.getHours() - 9) / 24) * 2 * Math.PI);
    return {
      id: `lec-${i}`,
      cultivoId: "cult-1",
      humedadSuelo: Math.round((72 - fase * 0.75 + Math.sin(haceHoras * 1.7) * 0.6) * 10) / 10,
      temperatura: Math.round((25 + 3 * ciclo) * 10) / 10,
      humedadAmbiente: Math.round(62 - 5 * ciclo),
      fechaHora: fecha.toISOString(),
    };
  });
}

const hace = (horas: number) => new Date(Date.now() - horas * 3600000).toISOString();

export const mockAlertas: Alerta[] = [
  {
    id: "al-1", cultivoId: "cult-1", tipo: "hongos", severidad: "risk", estado: "pendiente",
    fechaHora: hace(3),
    mensaje: "La humedad ambiental se encuentra en un nivel alto. Se recomienda mejorar la ventilación.",
  },
  {
    id: "al-2", cultivoId: "cult-1", tipo: "riego", severidad: "warning", estado: "pendiente",
    fechaHora: hace(7),
    mensaje: "La humedad del suelo ha disminuido. Se recomienda regar en las próximas 4 horas.",
  },
  {
    id: "al-3", cultivoId: "cult-1", tipo: "riego", severidad: "ok", estado: "atendida",
    fechaHora: hace(26),
    mensaje: "Riego registrado. El cultivo volvió a condiciones óptimas.",
  },
];

/** Respuestas del chatbot en modo simulado (cuando aún no hay backend). */
export function respuestaSimulada(pregunta: string, ctx: ContextoChat): string {
  const q = pregunta.toLowerCase();
  const suelo = ctx.humedadSuelo !== undefined ? `${ctx.humedadSuelo}%` : "sin dato";
  const amb = ctx.humedadAmbiente !== undefined ? `${ctx.humedadAmbiente}%` : "sin dato";

  if (q.includes("regar") || q.includes("riego")) {
    if (ctx.horasParaRiego === null) {
      return `El suelo está en ${suelo} y no se está secando de forma apreciable, así que por ahora no hace falta regar.`;
    }
    if (ctx.horasParaRiego <= 2) {
      return `Sí, conviene regar ahora. El suelo está en ${suelo} y llegaría al nivel crítico en unas ${ctx.horasParaRiego.toFixed(1)} horas.`;
    }
    return `Todavía no es urgente. El suelo está en ${suelo} y, al ritmo actual, llegaría al nivel crítico en unas ${ctx.horasParaRiego.toFixed(1)} horas.`;
  }
  if (q.includes("hongo") || q.includes("plaga") || q.includes("humedad")) {
    return `La humedad ambiental está en ${amb} en etapa ${ctx.etapa}. Si ves que sube de forma sostenida, mejora la ventilación: la humedad alta favorece hongos como el moho gris.`;
  }
  if (q.includes("alerta")) {
    return ctx.alertasPendientes > 0
      ? `Tienes ${ctx.alertasPendientes} alerta(s) pendiente(s). Ábrelas en la pestaña Alertas para ver el detalle y marcarlas como atendidas.`
      : "No tienes alertas pendientes. Todo está en orden por ahora.";
  }
  return "Puedo ayudarte a decidir cuándo regar, interpretar tus lecturas y explicarte las alertas. (Respuesta simulada: aún sin conexión al backend.)";
}