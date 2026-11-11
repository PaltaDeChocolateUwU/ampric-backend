import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import Button from "@/components/Button";
import Campo from "@/components/Campo";
import MedidorClave from "@/components/MedidorClave";
import PantallaAuth, { Aviso, Enlace } from "@/components/PantallaAuth";
import { useAuth } from "@/context/AuthContext";
import { errorContrasena, esCorreoValido } from "@/utils/validacion";

export default function RecuperarScreen() {
  const { pedirRecuperacion, restablecerContrasena } = useAuth();
  const [etapa, setEtapa] = useState<"correo" | "codigo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  async function handleEnviar() {
    setError(null);
    if (!esCorreoValido(correo)) return setError("Ingresa un correo válido.");
    setCargando(true);
    const err = await pedirRecuperacion(correo);
    setCargando(false);
    if (err) return setError(err);
    // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados
    setInfo("Si el correo está registrado, te enviamos un código de verificación.");
    setEtapa("codigo");
    setEspera(60);
  }

  async function handleReenviar() {
    if (espera > 0) return;
    setError(null);
    const err = await pedirRecuperacion(correo);
    if (err) return setError(err);
    setInfo("Si el correo está registrado, te enviamos un código nuevo.");
    setEspera(60);
  }

  async function handleCambiar() {
    setError(null);
    if (!/^\d{6,10}$/.test(codigo.trim())) return setError("Ingresa el código numérico que te enviamos.");
    const errClave = errorContrasena(password);
    if (errClave) return setError(errClave);
    if (password !== repetir) return setError("Las contraseñas no coinciden.");

    setCargando(true);
    const err = await restablecerContrasena(correo, codigo, password);
    setCargando(false);
    if (err) return setError(err);
    router.replace("/(tabs)"); // el código ya abrió sesión y la contraseña quedó cambiada
  }

  if (etapa === "correo") {
    return (
      <PantallaAuth titulo="Recuperar contraseña" subtitulo="Te enviaremos un código para crear una nueva." atras>
        <Campo label="Correo electrónico" value={correo} onChangeText={setCorreo} keyboardType="email-address" />
        <Aviso texto={error} />
        <Button label="Enviar código" onPress={handleEnviar} loading={cargando} />
      </PantallaAuth>
    );
  }

  return (
    <PantallaAuth titulo="Crea tu nueva contraseña" subtitulo="Escribe el código que te enviamos y tu nueva contraseña.">
      <Campo label="Código" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" maxLength={10} />
      <Campo label="Nueva contraseña" secreto value={password} onChangeText={setPassword} />
      <MedidorClave password={password} />
      <Campo label="Repite la contraseña" secreto value={repetir} onChangeText={setRepetir} />
      <Aviso texto={error} />
      <Aviso texto={info} tipo="info" />
      <Button label="Cambiar contraseña" onPress={handleCambiar} loading={cargando} />
      <Enlace
        texto={espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
        onPress={handleReenviar}
        deshabilitado={espera > 0}
      />
      <Enlace texto="Volver" onPress={() => setEtapa("correo")} />
    </PantallaAuth>
  );
}