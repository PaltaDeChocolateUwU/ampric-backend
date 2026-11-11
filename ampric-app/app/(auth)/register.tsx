import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Button from "@/components/Button";
import Campo from "@/components/Campo";
import MedidorClave from "@/components/MedidorClave";
import PantallaAuth, { Aviso, Enlace } from "@/components/PantallaAuth";
import Segmented from "@/components/Segmented";
import { useAuth } from "@/context/AuthContext";
import { TipoCuenta } from "@/types";
import { errorContrasena, esCorreoValido } from "@/utils/validacion";
import { colors, spacing, typography } from "@/constants/theme";

const POLITICA =
  "Guardamos tu nombre, tu correo y los datos de tus cultivos (lecturas, alertas y configuración). " +
  "Los usamos solo para mostrarte tu cultivo, generar alertas y responder en el asistente. " +
  "Las preguntas que escribes en el asistente, junto con los datos actuales de tu cultivo (sin tu nombre ni tu correo), " +
  "se envían a un proveedor externo de inteligencia artificial para generar la respuesta. " +
  "Puedes pedir que eliminemos tus datos escribiendo a [CORREO DE CONTACTO].";

export default function RegisterScreen() {
  const { registrar, confirmarCodigo, reenviarCodigo, isAuthenticated } = useAuth();
  const [etapa, setEtapa] = useState<"formulario" | "codigo">("formulario");
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>("independiente");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [verPolitica, setVerPolitica] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  async function handleRegistro() {
    setError(null);
    if (nombre.trim().length < 2) return setError("Ingresa tu nombre.");
    if (!esCorreoValido(correo)) return setError("Ingresa un correo válido.");
    const errClave = errorContrasena(password);
    if (errClave) return setError(errClave);
    if (password !== repetir) return setError("Las contraseñas no coinciden.");
    if (!acepto) return setError("Debes autorizar el tratamiento de tus datos para crear la cuenta.");

    setCargando(true);
    const r = await registrar(nombre, correo, password, tipoCuenta);
    setCargando(false);
    if (r.error) return setError(r.error);
    if (r.requiereCodigo) {
      setEtapa("codigo");
      setEspera(60);
    }
    // Si no requiere código, la sesión ya quedó abierta y el efecto de arriba entra a la app
  }

  async function handleCodigo() {
    setError(null);
    setInfo(null);
    if (!/^\d{6,10}$/.test(codigo.trim())) return setError("Ingresa el código numérico que te enviamos.");
    setCargando(true);
    const err = await confirmarCodigo(correo, codigo);
    setCargando(false);
    if (err) setError(err);
  }

  async function handleReenviar() {
    if (espera > 0) return;
    setError(null);
    const err = await reenviarCodigo(correo);
    if (err) return setError(err);
    setInfo("Te enviamos un código nuevo.");
    setEspera(60);
  }

  if (etapa === "codigo") {
    return (
      <PantallaAuth
        titulo="Confirma tu correo"
        subtitulo={`Te enviamos un código a ${correo.trim().toLowerCase()}. Escríbelo aquí para activar tu cuenta.`}
      >
        <Campo label="Código" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" maxLength={10} />
        <Aviso texto={error} />
        <Aviso texto={info} tipo="info" />
        <Button label="Confirmar" onPress={handleCodigo} loading={cargando} />
        <Enlace
          texto={espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
          onPress={handleReenviar}
          deshabilitado={espera > 0}
        />
        <Enlace
          texto="Cambiar correo"
          onPress={() => {
            setEtapa("formulario");
            setCodigo("");
            setError(null);
            setInfo(null);
          }}
        />
      </PantallaAuth>
    );
  }

  return (
    <PantallaAuth titulo="Crear cuenta" subtitulo="Tu cuenta protege los datos de tu cultivo." atras>
      <Text style={styles.label}>Tipo de cuenta</Text>
      <Segmented
        opciones={[
          { valor: "independiente", label: "Cuenta personal" },
          { valor: "empresa", label: "Pequeña empresa" },
        ]}
        valor={tipoCuenta}
        onChange={setTipoCuenta}
      />
      <Campo label="Nombre completo" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
      <Campo
        label="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo
        label="Contraseña"
        secreto
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres, con letras y números"
      />
      <MedidorClave password={password} />
      <Campo label="Repite la contraseña" secreto value={repetir} onChangeText={setRepetir} />

      <Pressable style={styles.filaCheck} onPress={() => setAcepto(!acepto)}>
        <Ionicons name={acepto ? "checkbox" : "square-outline"} size={22} color={colors.primaryGreen} />
        <Text style={styles.textoCheck}>
          Autorizo el tratamiento de mis datos personales (Ley 1581 de 2012) y acepto el aviso de privacidad.
        </Text>
      </Pressable>
      <Enlace
        texto={verPolitica ? "Ocultar aviso de privacidad" : "Ver aviso de privacidad"}
        onPress={() => setVerPolitica(!verPolitica)}
      />
      {verPolitica && <Text style={styles.politica}>{POLITICA}</Text>}

      <Aviso texto={error} />
      <Button label="Crear cuenta" onPress={handleRegistro} loading={cargando} />
      <Enlace texto="¿Ya tienes cuenta? Inicia sesión" onPress={() => router.replace("/login")} />
    </PantallaAuth>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.small, color: colors.textSecondary },
  filaCheck: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  textoCheck: { flex: 1, ...typography.small, color: colors.textSecondary },
  politica: { ...typography.small, color: colors.textSecondary, lineHeight: 18 },
});