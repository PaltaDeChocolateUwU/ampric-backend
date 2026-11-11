import { EstadoNivel } from "@/types";

export const colors = {
  darkGreen: "#0F2A1C",
  primaryGreen: "#16A34A",
  primaryGreenDark: "#0E7A38",
  lightGreenBg: "#EAF7EC",
  background: "#F5F7F5",
  surface: "#FFFFFF",
  border: "#E3EAE4",
  textPrimary: "#1A241D",
  textSecondary: "#5B6B5E",
  textMuted: "#8B9B8E",
  riskBg: "#FDECEC",
  riskText: "#DC2626",
  warningBg: "#FEF3C7",
  warningText: "#D97706",
  okBg: "#DCFCE7",
  okText: "#16A34A",
  infoBlue: "#2563EB",
  white: "#FFFFFF",
};

export const estadoColors: Record<EstadoNivel, { bg: string; text: string }> = {
  ok: { bg: colors.okBg, text: colors.okText },
  warning: { bg: colors.warningBg, text: colors.warningText },
  risk: { bg: colors.riskBg, text: colors.riskText },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const typography = {
  h1: { fontSize: 26, fontWeight: "700" as const },
  h2: { fontSize: 20, fontWeight: "700" as const },
  h3: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  small: { fontSize: 12, fontWeight: "400" as const },
};