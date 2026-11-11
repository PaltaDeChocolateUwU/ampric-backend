import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alerta, AlertasConfig, Cultivo, EstadoAlerta, EstadoNivel, EtapaCultivo, Lectura, PrediccionRiego,
} from "@/types";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { estadoHongos, estadoRiego, estadoSuelo, estimarHorasRiego, peorEstado } from "@/utils/cultivo";

const ACTIVO_KEY = "ampric_cultivo_activo";
const CONFIG_DEFECTO: AlertasConfig = { riego: true, hongos: true, temperatura: true, suelo_humedo: true };

interface CultivoValue {
  cultivo: Cultivo | null;
  cultivos: Cultivo[];
  lectura: Lectura | null;
  prediccion: PrediccionRiego | null;
  estadoGeneral: EstadoNivel;
  alertas: Alerta[];
  alertasConfig: AlertasConfig;
  loading: boolean;
  error: string | null;
  refrescar: (silencioso?: boolean) => Promise<void>;
  responderAlerta: (id: string, accion: Exclude<EstadoAlerta, "pendiente">) => Promise<void>;
  cambiarEtapa: (etapa: EtapaCultivo) => Promise<void>;
  seleccionarCultivo: (id: string) => Promise<void>;
  agregarCultivo: (nombre: string) => Promise<void>;
  renombrarCultivo: (id: string, nombre: string) => Promise<void>;
  borrarCultivo: (id: string) => Promise<void>;
  guardarAlertasConfig: (cfg: Partial<AlertasConfig>) => Promise<void>;
}

const CultivoContext = createContext<CultivoValue | undefined>(undefined);

export function CultivoProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [cultivo, setCultivo] = useState<Cultivo | null>(null);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [historial, setHistorial] = useState<Lectura[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La planta activa vive en una ref para que el polling no se reinicie al cambiarla
  const activoRef = useRef<string | null>(null);
  // Contador para descartar respuestas viejas (p. ej. si cambias de planta mientras carga otra)
  const peticionRef = useRef(0);

  const cargarTodo = useCallback(async (silencioso = false, forzarId?: string) => {
    const n = ++peticionRef.current;
    if (!silencioso) setLoading(true);
    try {
      let lista = await api.listarCultivos();
      if (lista.length === 0) {
        // usuario nuevo: se crea "Mi primera planta"
        lista = [await api.getCultivoActivo()];
      }

      if (forzarId === undefined && activoRef.current === null) {
        activoRef.current = await AsyncStorage.getItem(ACTIVO_KEY);
      }
      const buscado = String(forzarId ?? activoRef.current ?? "");
      const elegido = lista.find((c) => String(c.id) === buscado) ?? lista[0];

      const [h, alertasPorCultivo] = await Promise.all([
  api.getHistorial(elegido.id, "dia"),

  Promise.all(
    lista.map((c) => api.getAlertas(c.id))
  ),
]);

const todasLasAlertas = alertasPorCultivo
  .flat()
  .sort((a, b) =>
    b.fechaHora.localeCompare(a.fechaHora)
  );
      if (n !== peticionRef.current) return; // llegó una petición más nueva, esta se descarta

      activoRef.current = String(elegido.id);
      AsyncStorage.setItem(ACTIVO_KEY, String(elegido.id)).catch(() => {});
      setCultivos(lista);
      setCultivo(elegido);
      setHistorial(h);
      setAlertas(todasLasAlertas);
      setError(null);
    } catch {
      if (n === peticionRef.current) setError("No pudimos cargar los datos del cultivo. Revisa tu conexión.");
    } finally {
      if (n === peticionRef.current) setLoading(false);
    }
  }, []);

  const refrescar = useCallback((silencioso = false) => cargarTodo(silencioso), [cargarTodo]);

  useEffect(() => {
    if (!usuario) {
      peticionRef.current++;
      activoRef.current = null;
      AsyncStorage.removeItem(ACTIVO_KEY).catch(() => {});
      setCultivo(null);
      setCultivos([]);
      setHistorial([]);
      setAlertas([]);
      return;
    }
    cargarTodo();
    const id = setInterval(() => cargarTodo(true), 60000);
    return () => clearInterval(id);
  }, [usuario, cargarTodo]);

  // ---------- Datos derivados ----------
  const lectura = historial.length > 0 ? historial[historial.length - 1] : null;
  const horas = useMemo(() => estimarHorasRiego(historial), [historial]);
  const alertasConfig: AlertasConfig = { ...CONFIG_DEFECTO, ...(cultivo?.alertas_config ?? {}) };

  const estadoNivel: EstadoNivel = lectura ? estadoSuelo(lectura.humedadSuelo) : "ok";

  const prediccion: PrediccionRiego | null = cultivo
    ? {
        cultivoId: cultivo.id,
        horasRestantes: horas,
        estado: peorEstado(estadoRiego(horas), estadoNivel),
      }
    : null;

  const eHongos: EstadoNivel = lectura && cultivo ? estadoHongos(lectura.humedadAmbiente, cultivo.etapa) : "ok";

  // Estado de las alertas nuevas (temperatura / suelo muy húmedo): las que están pendientes
  const eExtras: EstadoNivel = alertas
  .filter(
    (a) =>
      a.cultivoId === cultivo?.id &&
      a.estado === "pendiente" &&
      (
        (a.tipo === "temperatura" && alertasConfig.temperatura) ||
        (a.tipo === "suelo_humedo" && alertasConfig.suelo_humedo)
      )
  )
  .reduce<EstadoNivel>(
    (acc, a) => peorEstado(acc, a.severidad),
    "ok"
  );

  // Si el usuario apagó un tipo de alerta, ese tipo deja de afectar el estado general
  const estadoGeneral = peorEstado(
    peorEstado(alertasConfig.riego ? prediccion?.estado ?? "ok" : "ok", alertasConfig.hongos ? eHongos : "ok"),
    eExtras
  );

  // ---------- Acciones ----------
  async function responderAlerta(id: string, accion: Exclude<EstadoAlerta, "pendiente">) {
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, estado: accion } : a)));
    try {
      await api.responderAlerta(id, accion);
    } catch {
      refrescar(true);
    }
  }

  async function cambiarEtapa(etapa: EtapaCultivo) {
    if (!cultivo) return;
    setCultivo({ ...cultivo, etapa });
    setCultivos((prev) => prev.map((c) => (c.id === cultivo.id ? { ...c, etapa } : c)));
    try {
      await api.actualizarEtapa(cultivo.id, etapa);
    } catch {
      refrescar(true);
    }
  }

  async function seleccionarCultivo(id: string) {
    const elegido = cultivos.find((c) => c.id === id);
    if (elegido) {
      // cambio inmediato en pantalla; los datos de la planta nueva llegan enseguida
      setCultivo(elegido);
      setHistorial([]);
      setAlertas([]);
    }
    await cargarTodo(false, id);
  }

  async function agregarCultivo(nombre: string) {
    const nuevo = await api.crearCultivo(nombre);
    await cargarTodo(true, String(nuevo.id));
  }

  async function renombrarCultivo(id: string, nombre: string) {
    const actualizado = await api.actualizarCultivo(id, { nombre });
    setCultivos((prev) => prev.map((c) => (c.id === id ? { ...c, ...actualizado } : c)));
    setCultivo((prev) => (prev && prev.id === id ? { ...prev, ...actualizado } : prev));
  }

  async function borrarCultivo(id: string) {
    await api.eliminarCultivo(id);
    if (String(id) === activoRef.current) activoRef.current = null;
    // si era la última planta, cargarTodo crea "Mi primera planta" automáticamente
    await cargarTodo(true);
  }

  async function guardarAlertasConfig(cfg: Partial<AlertasConfig>) {
    if (!cultivo) return;
    const nueva = { ...alertasConfig, ...cfg };
    setCultivo({ ...cultivo, alertas_config: nueva });
    setCultivos((prev) => prev.map((c) => (c.id === cultivo.id ? { ...c, alertas_config: nueva } : c)));
    try {
      await api.actualizarCultivo(cultivo.id, { alertas_config: cfg });
    } catch {
      refrescar(true);
    }
  }

  return (
    <CultivoContext.Provider
      value={{
        cultivo, cultivos, lectura, prediccion, estadoGeneral, alertas, alertasConfig, loading, error,
        refrescar, responderAlerta, cambiarEtapa,
        seleccionarCultivo, agregarCultivo, renombrarCultivo, borrarCultivo, guardarAlertasConfig,
      }}
    >
      {children}
    </CultivoContext.Provider>
  );
}

export function useCultivo() {
  const ctx = useContext(CultivoContext);
  if (!ctx) throw new Error("useCultivo debe usarse dentro de <CultivoProvider>");
  return ctx;
}