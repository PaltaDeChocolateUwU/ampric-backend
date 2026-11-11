import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';

type Props = {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoRequerido?: string;   // si se pasa, hay que escribirlo para confirmar
  etiquetaConfirmar?: string;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export default function ModalConfirmar({
  visible, titulo, mensaje, textoRequerido, etiquetaConfirmar = 'Eliminar', onCancelar, onConfirmar,
}: Props) {
  const [escrito, setEscrito] = useState('');
  const habilitado = !textoRequerido || escrito.trim() === textoRequerido;

  const cerrar = () => { setEscrito(''); onCancelar(); };
  const confirmar = () => { if (!habilitado) return; setEscrito(''); onConfirmar(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={s.fondo}>
        <View style={s.caja}>
          <Text style={s.titulo}>{titulo}</Text>
          <Text style={s.mensaje}>{mensaje}</Text>
          {textoRequerido ? (
            <>
              <Text style={s.ayuda}>Escribe «{textoRequerido}» para confirmar:</Text>
              <TextInput style={s.input} value={escrito} onChangeText={setEscrito} autoCapitalize="none" />
            </>
          ) : null}
          <View style={s.fila}>
            <Pressable style={[s.btn, s.btnGris]} onPress={cerrar}>
              <Text style={s.txtGris}>Cancelar</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnRojo, !habilitado && { opacity: 0.4 }]} onPress={confirmar} disabled={!habilitado}>
              <Text style={s.txtBlanco}>{etiquetaConfirmar}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  caja: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxWidth: 480, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  mensaje: { fontSize: 14, color: '#444', marginBottom: 12 },
  ayuda: { fontSize: 13, color: '#666', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  fila: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnGris: { backgroundColor: '#eee' },
  btnRojo: { backgroundColor: '#c62828' },
  txtGris: { color: '#333', fontWeight: '600' },
  txtBlanco: { color: '#fff', fontWeight: '600' },
});