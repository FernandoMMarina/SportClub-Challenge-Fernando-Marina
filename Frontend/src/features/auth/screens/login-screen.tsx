import { Button, Column, Host, Text as NativeText, TextInput } from '@expo/ui';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { theme } from '@/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [buttonWidth, setButtonWidth] = useState(0);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);

  function handleSubmit() {
    setError(null);
    try {
      signIn(email, password);
      Keyboard.dismiss();
      // Stack.Protected cambia al grupo de pestañas al actualizarse la sesión.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.brand}>SPORTCLUB</Text>
          <Text style={styles.intro}>Ingresá para encontrar tu próxima clase y gestionar tus reservas.</Text>
          <Host matchContents colorScheme="light">
            <Column spacing={16} style={{ width: '100%' }}>
              <TextInput accessibilityLabel="Correo electrónico" placeholder="Correo electrónico"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                autoComplete="email" maxLength={254} onChangeText={(value) => { setEmail(value); setError(null); }}
                style={{ height: 52, padding: 12 }} />
              <TextInput accessibilityLabel="Contraseña" placeholder="Contraseña" secureTextEntry
                autoCapitalize="none" autoCorrect={false} autoComplete="current-password"
                maxLength={128} returnKeyType="go" onSubmitEditing={handleSubmit}
                onChangeText={(value) => { setPassword(value); setError(null); }}
                style={{ height: 52, padding: 12 }} />
            </Column>
          </Host>
          <View style={styles.buttonContainer} onLayout={({ nativeEvent }) => setButtonWidth(nativeEvent.layout.width)}>
            <Host colorScheme="light" seedColor={theme.colors.buttonBackground} style={{ width: buttonWidth, height: 52 }}>
              <Button variant="text" style={{ ...styles.button, width: buttonWidth }} onPress={handleSubmit}>
                <NativeText textStyle={{ color: '#ffffff', fontSize: 17, fontWeight: '600' }}>Ingresar</NativeText>
              </Button>
            </Host>
          </View>
          {error ? <Text selectable accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <View style={styles.demo}>
            <Text style={styles.demoTitle}>Cuenta de prueba</Text>
            <Text selectable style={styles.demoText}>demo@sportclub.com</Text>
            <Text selectable style={styles.demoText}>SportClub123!</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  content: { width: '100%', maxWidth: 550, alignSelf: 'center', gap: 24 },
  brand: { fontSize: 32, fontWeight: '800', color: theme.colors.text },
  intro: { fontSize: 17, lineHeight: 25, color: theme.colors.textSecondary },
  error: { color: '#b42318', fontSize: 15, lineHeight: 22 },
  demo: { gap: 6, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 12 },
  demoTitle: { fontWeight: '600', color: theme.colors.text },
  demoText: { color: theme.colors.textSecondary, fontSize: 14 },
  buttonContainer: { width: '100%', maxWidth: 550, alignSelf: 'center', alignItems: 'center' },
  button: { height: 52, borderRadius: 8, backgroundColor: theme.colors.buttonBackground }, 

});
