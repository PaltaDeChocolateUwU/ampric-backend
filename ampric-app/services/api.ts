import {
  Alerta, AlertasConfig, ContextoChat, Cultivo, Dispositivo, EstadoAlerta, EtapaCultivo, Lectura, MensajeChat,
} from "@/types";
import { generarHistorial, mockAlertas, mockCultivo, respuestaSimulada } from "./mockData";
import { supabase } from "@/lib/supabase";

// true = datos de prueba. Cuando tengas el backend, pon false y define EXPO_PUBLIC_API_URL.
const USE_MOCK = false;

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  "https://ampric-backend.onrender.com"
).replace(/\/+$/, "");

console.log("[AMPRIC] API conectada a:", BASE_URL);


export type Rango = "dia" | "semana" | "mes";
const CONFIG_RANGO: Record<Rango, [number, number]> = { dia: [24, 1], semana: [28, 6], mes: [30, 24] };

async function request<T>(path: string, init?: RequestInit, timeoutMs = 45000): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
    if (res.status === 401) {
      await supabase.auth.signOut(); // la sesión venció o no es válida: vuelve al login
      throw new Error("Sesión vencida");
    }
    
if (!res.ok) {
  const detalle = await res.text();

  console.error("[AMPRIC] Error HTTP:", {
    ruta: path,
    estado: res.status,
    detalle: detalle.slice(0, 500),
  });

  throw new Error(
    `Error ${res.status} en ${path}: ${detalle.slice(0, 200)}`
  );
}

    if (res.status === 204) return undefined as T;
    const texto = await res.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  } finally {
    clearTimeout(timer);
  }
}

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// Estado en memoria para que, en modo simulado, los cambios (etapa, alertas) se conserven
let cultivoMock: Cultivo = { ...mockCultivo };
let alertasMock: Alerta[] = mockAlertas.map((a) => ({ ...a }));

export const api = {
  async getCultivoActivo(): Promise<Cultivo> {
    if (USE_MOCK) return delay({ ...cultivoMock });
    const lista = await request<Cultivo[]>("/cultivos");
    if (lista.length > 0) return lista[0];
    return request<Cultivo>("/cultivos", {
      method: "POST",
      body: JSON.stringify({ nombre: "Mi primera planta", etapa: "vegetativo" }),
    });
  },

  // ---------- Plantas (cultivos) ----------
  listarCultivos(): Promise<Cultivo[]> {
    if (USE_MOCK) return delay([{ ...cultivoMock }]);
    return request<Cultivo[]>("/cultivos");
  },

  crearCultivo(nombre: string, etapa: EtapaCultivo = "vegetativo"): Promise<Cultivo> {
    return request<Cultivo>("/cultivos", { method: "POST", body: JSON.stringify({ nombre, etapa }) });
  },

  actualizarCultivo(
    id: string,
    cambios: { nombre?: string; etapa?: EtapaCultivo; alertas_config?: Partial<AlertasConfig> }
  ): Promise<Cultivo> {
    return request<Cultivo>(`/cultivos/${id}`, { method: "PATCH", body: JSON.stringify(cambios) });
  },

  async eliminarCultivo(id: string): Promise<void> {
    await request(`/cultivos/${id}`, { method: "DELETE" });
  },

  // ---------- Kits (dispositivos) ----------
  listarDispositivos(cultivoId: string): Promise<Dispositivo[]> {
    return request<Dispositivo[]>(`/cultivos/${cultivoId}/dispositivos`);
  },

  crearDispositivo(cultivoId: string, nombre: string): Promise<Dispositivo & { clave: string }> {
    return request(`/cultivos/${cultivoId}/dispositivos`, { method: "POST", body: JSON.stringify({ nombre }) });
  },

  async eliminarDispositivo(id: string): Promise<void> {
    await request(`/dispositivos/${id}`, { method: "DELETE" });
  },

  // ---------- Lecturas, alertas, chat ----------
  getHistorial(cultivoId: string, rango: Rango): Promise<Lectura[]> {
    if (USE_MOCK) {
      const [cantidad, paso] = CONFIG_RANGO[rango];
      return delay(generarHistorial(cantidad, paso));
    }
    return request<Lectura[]>(`/cultivos/${cultivoId}/lecturas?rango=${rango}`);
  },


  async getHistorialDetallado(
    cultivoId: string,
    rango: Rango
  ): Promise<Lectura[]> {
    if (USE_MOCK) {
      return this.getHistorial(cultivoId, rango);
    }

    return request<Lectura[]>(
      `/cultivos/${cultivoId}/lecturas?rango=${rango}&raw=true`
    );
  },


  getAlertas(cultivoId: string): Promise<Alerta[]> {
    if (USE_MOCK) return delay(alertasMock.map((a) => ({ ...a })));
    return request<Alerta[]>(`/cultivos/${cultivoId}/alertas`);
  },

  async responderAlerta(alertaId: string, accion: Exclude<EstadoAlerta, "pendiente">): Promise<void> {
    if (USE_MOCK) {
      alertasMock = alertasMock.map((a) => (a.id === alertaId ? { ...a, estado: accion } : a));
      return delay(undefined, 200);
    }
    await request(`/alertas/${alertaId}/respuesta`, { method: "POST", body: JSON.stringify({ accion }) });
  },

  async actualizarEtapa(cultivoId: string, etapa: EtapaCultivo): Promise<void> {
    if (USE_MOCK) {
      cultivoMock = { ...cultivoMock, etapa };
      return delay(undefined, 200);
    }
    await request(`/cultivos/${cultivoId}`, { method: "PATCH", body: JSON.stringify({ etapa }) });
  },

  async enviarMensajeChat(mensajes: MensajeChat[], contexto: ContextoChat): Promise<string> {
    if (USE_MOCK) {
      const ultima = [...mensajes].reverse().find((m) => m.rol === "user");
      return delay(respuestaSimulada(ultima?.texto ?? "", contexto), 900);
    }
    const data = await request<{ respuesta: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({
        mensajes: mensajes.map(({ rol, texto }) => ({ rol, texto })),
        contexto,
      }),
    });
    return data.respuesta;
  },
};