export type EtapaCultivo = "germinacion" | "vegetativo" | "floracion";
export type EstadoNivel = "ok" | "warning" | "risk";
export type TipoCuenta = "independiente" | "empresa";
export type EstadoAlerta = "pendiente" | "atendida" | "descartada";
export type TipoAlerta = "riego" | "hongos" | "temperatura" | "suelo_humedo";

export type AlertasConfig = {
  riego: boolean;
  hongos: boolean;
  temperatura: boolean;
  suelo_humedo: boolean;
};

export type Dispositivo = { id: string; nombre: string; creado_en?: string };

export interface Cultivo {
  id: string;
  nombre: string;
  etapa: EtapaCultivo;
  alertas_config?: AlertasConfig;
}

export interface Lectura {
  id: string;
  cultivoId: string;
  humedadSuelo: number;    // %
  temperatura: number;     // °C
  humedadAmbiente: number; // %
  fechaHora: string;       // ISO
}

export interface PrediccionRiego {
  cultivoId: string;
  horasRestantes: number | null; // null = el suelo no se está secando
  estado: EstadoNivel;
}

export interface Alerta {
  id: string;
  cultivoId: string;
  tipo: TipoAlerta;
  mensaje: string;
  fechaHora: string; // ISO
  estado: EstadoAlerta;
  severidad: EstadoNivel;
}

export interface Recomendacion {
  id: string;
  titulo: string;
  detalle: string;
  icono: "riego" | "ventilacion" | "etapa";
}

export interface MensajeChat {
  id: string;
  rol: "user" | "assistant";
  texto: string;
}

// Lo que la app le manda al chatbot para que responda con datos reales del cultivo
export interface ContextoChat {
  nombre: string;
  alertas: string[];
  etapa: EtapaCultivo;
  humedadSuelo?: number;
  temperatura?: number;
  humedadAmbiente?: number;
  horasParaRiego: number | null;
  alertasPendientes: number;
}