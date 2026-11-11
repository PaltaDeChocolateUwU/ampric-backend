import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { TipoCuenta } from "@/types";
import { traducirError } from "@/utils/validacion";

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  tipoCuenta: TipoCuenta;
}

interface AuthValue {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (correo: string, password: string) => Promise<string | null>;
  registrar: (
    nombre: string, correo: string, password: string, tipoCuenta: TipoCuenta
  ) => Promise<{ error: string | null; requiereCodigo: boolean }>;
  confirmarCodigo: (correo: string, codigo: string) => Promise<string | null>;
  reenviarCodigo: (correo: string) => Promise<string | null>;
  pedirRecuperacion: (correo: string) => Promise<string | null>;
  restablecerContrasena: (correo: string, codigo: string, nueva: string) => Promise<string | null>;
  logout: () => Promise<void>;
  logoutGlobal: () => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);
const limpio = (c: string) => c.trim().toLowerCase();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setIsReady(true));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSession(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  const u = session?.user;
  const usuario = useMemo<Usuario | null>(
    () =>
      u
        ? {
            id: u.id,
            nombre: (u.user_metadata?.nombre as string) || (u.email ?? "").split("@")[0],
            correo: u.email ?? "",
            tipoCuenta: u.user_metadata?.tipo_cuenta === "empresa" ? "empresa" : "independiente",
          }
        : null,
    [u?.id, u?.email, u?.user_metadata?.nombre, u?.user_metadata?.tipo_cuenta] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const login = useCallback(async (correo: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: limpio(correo), password });
    return error ? traducirError(error) : null;
  }, []);

  const registrar = useCallback(
    async (nombre: string, correo: string, password: string, tipoCuenta: TipoCuenta) => {
      const { data, error } = await supabase.auth.signUp({
        email: limpio(correo),
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            tipo_cuenta: tipoCuenta,
            acepto_datos_fecha: new Date().toISOString(), // constancia de la autorización
          },
        },
      });
      if (error) return { error: traducirError(error), requiereCodigo: false };
      // Con confirmación por correo, un correo ya registrado no da error: llega sin identidades
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return {
          error: "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.",
          requiereCodigo: false,
        };
      }
      return { error: null, requiereCodigo: !data.session };
    },
    []
  );

  const confirmarCodigo = useCallback(async (correo: string, codigo: string) => {
    const { error } = await supabase.auth.verifyOtp({ email: limpio(correo), token: codigo.trim(), type: "signup" });
    return error ? traducirError(error) : null;
  }, []);

  const reenviarCodigo = useCallback(async (correo: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email: limpio(correo) });
    return error ? traducirError(error) : null;
  }, []);

  const pedirRecuperacion = useCallback(async (correo: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(limpio(correo));
    return error ? traducirError(error) : null;
  }, []);

  const restablecerContrasena = useCallback(async (correo: string, codigo: string, nueva: string) => {
    const v = await supabase.auth.verifyOtp({ email: limpio(correo), token: codigo.trim(), type: "recovery" });
    if (v.error) return traducirError(v.error);
    const c = await supabase.auth.updateUser({ password: nueva });
    return c.error ? traducirError(c.error) : null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const logoutGlobal = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    return error ? traducirError(error) : null;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario, isAuthenticated: session !== null, isReady,
        login, registrar, confirmarCodigo, reenviarCodigo,
        pedirRecuperacion, restablecerContrasena, logout, logoutGlobal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}