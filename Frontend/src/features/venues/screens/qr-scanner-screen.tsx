import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { isDevice } from 'expo-device';
import { router } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveVenueQr } from '@/features/venues/utils/resolve-venue-qr';

export default function QrScannerScreen() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const scanLocked = useRef(false);
  const isFocused = useIsFocused();
  const simulator = Platform.OS !== 'web' && !isDevice;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (appActive && isFocused) {
      void getPermission().catch(() => setError('No se pudieron consultar los permisos de cámara.'));
    }
  }, [appActive, isFocused, getPermission]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function enableCamera() {
    setError(null);
    setRequesting(true);
    try {
      if (permission?.canAskAgain === false) await Linking.openSettings();
      else await requestPermission();
    } catch {
      setError('No se pudo habilitar la cámara. Revisá los permisos del dispositivo.');
    } finally {
      setRequesting(false);
    }
  }

  function onScan({ data }: BarcodeScanningResult) {
    if (scanLocked.current) return;
    scanLocked.current = true;
    const id = resolveVenueQr(data);
    if (!id) {
      setError('Este QR no corresponde a una sede de SportClub.');
      return;
    }
    router.dismissTo({ pathname: '/venues/[id]', params: { id } });
  }

  const showCamera = !simulator && permission?.granted && isFocused && appActive && !error;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Escanear QR</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar escáner" onPress={close} hitSlop={12}>
          <Text style={styles.link}>Cerrar</Text>
        </Pressable>
      </View>
      <View style={styles.preview}>
        {showCamera ? (
          <>
            <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onScan} onMountError={() => setError('No se pudo iniciar la cámara. Intentá nuevamente.')} />
            <View pointerEvents="none" style={styles.frame} />
          </>
        ) : (
          <View style={styles.message}>
            {!permission && !simulator ? <ActivityIndicator color="#ffffff" /> : null}
            <Text selectable style={styles.messageText} accessibilityLiveRegion="polite">
              {error ?? (simulator ? 'El simulador no dispone de cámara. Probá el escaneo en un teléfono o consultá las sedes.'
                : !permission ? 'Consultando permisos de cámara…'
                  : !permission.granted ? 'Permití el acceso a la cámara para leer el QR de una sede.'
                    : 'Cámara en pausa.')}
            </Text>
            {error ? (
              <Pressable accessibilityRole="button" style={styles.button} onPress={() => { scanLocked.current = false; setError(null); }}>
                <Text style={styles.buttonText}>Intentar nuevamente</Text>
              </Pressable>
            ) : !simulator && permission && !permission.granted ? (
              <Pressable accessibilityRole="button" disabled={requesting} style={styles.button} onPress={enableCamera}>
                <Text style={styles.buttonText}>{requesting ? 'Abriendo…' : permission.canAskAgain ? 'Permitir cámara' : 'Abrir ajustes'}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Text style={styles.messageText}>Apuntá al código QR de la sede para ver sus clases y horarios.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/venues')}>
          <Text style={styles.link}>Ver sedes sin escanear</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#151515' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '600', color: '#ffffff', flexShrink: 1 },
  link: { color: '#ffffff', fontSize: 16, textDecorationLine: 'underline', paddingVertical: 8 },
  preview: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  frame: { width: '70%', maxWidth: 300, aspectRatio: 1, borderWidth: 3, borderColor: '#ffffff', borderRadius: 20 },
  message: { padding: 24, gap: 24, alignItems: 'center' },
  messageText: { color: '#ffffff', textAlign: 'center', fontSize: 16, lineHeight: 24 },
  footer: { padding: 24, gap: 12, alignItems: 'center' },
  button: { backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 10 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
