import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import Button from "@/components/Button";
import Campo from "@/components/Campo";
import PantallaAuth, { Aviso, Enlace } from "@/components/PantallaAuth";
import { useAuth } from "@/context/AuthContext";
import { esCorreoValido } from "@/utils/validacion";

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 30000;

export default function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(0);
  const [ahora, setAhora] = useState(Date.now());

  // En cuanto hay sesión, entra a la app (así no hay carreras con el estado)
  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  useEffect(() => {
    if (bloqueadoHasta <= Date.now()) return;
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, [bloqueadoHasta]);

  const segundos = Math.max(0, Math.ceil((bloqueadoHasta - ahora) / 1000));
  const bloqueado = segundos > 0;

  async function handleLogin() {
    if (bloqueado) return;
    setError(null);
    if (!esCorreoValido(correo)) return setError("Ingresa un correo válido.");
    if (!password) return setError("Ingresa tu contraseña.");

    setCargando(true);
    const err = await login(correo, password);
    setCargando(false);

    if (err) {
      const n = fallos + 1;
      setError(err);
      if (n >= MAX_INTENTOS) {
        setFallos(0);
        setAhora(Date.now());
        setBloqueadoHasta(Date.now() + BLOQUEO_MS);
      } else {
        setFallos(n);
      }
    }
  }

  return (
    <PantallaAuth titulo="Inicia sesión" subtitulo="Accede a los datos de tu cultivo.">
      <Campo
        label="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo label="Contraseña" secreto value={password} onChangeText={setPassword} autoComplete="password" />
      <Aviso texto={bloqueado ? `Demasiados intentos. Espera ${segundos} s.` : error} />
      <Button
        label={bloqueado ? `Espera ${segundos} s` : "Iniciar sesión"}
        onPress={handleLogin}
        loading={cargando}
      />
      <Enlace texto="¿Olvidaste tu contraseña?" onPress={() => router.push("/recuperar")} />
      <Enlace texto="¿No tienes cuenta? Crear cuenta" onPress={() => router.push("/register")} />
    </PantallaAuth>
  );
}