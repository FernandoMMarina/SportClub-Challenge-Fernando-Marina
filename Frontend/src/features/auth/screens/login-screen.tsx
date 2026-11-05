import Feather from '@expo/vector-icons/Feather';
import { Button, Column, Host, Text as NativeText, TextInput, type TextInputRef } from '@expo/ui';
import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { theme } from '@/theme';
import { AuthError, DEMO_CREDENTIALS, describeLoginError, type LoginFieldErrors } from '@/services/auth-service';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [buttonWidth, setButtonWidth] = useState(0);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<ReturnType<typeof describeLoginError> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLocked = useRef(false);
  const copyLocked = useRef(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [copyTarget, setCopyTarget] = useState<'email' | 'password' | null>(null);
  const emailRef = useRef<TextInputRef>(null);
  const passwordRef = useRef<TextInputRef>(null);
  const signIn = useAuthStore((state) => state.signIn);

  function clearFieldError(field: 'email' | 'password') {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleCopyDemo(field: 'email' | 'password') {
    if (copyLocked.current || submitLocked.current) return;
    copyLocked.current = true;
    setCopyTarget(field);
    setCopyStatus('copying');
    try {
      const copied = await Clipboard.setStringAsync(DEMO_CREDENTIALS[field]);
      setCopyStatus(copied ? 'copied' : 'error');
    } catch {
      setCopyStatus('error');
    }
    copyLocked.current = false;
  }

  function togglePasswordVisibility() {
    const wasFocused = passwordRef.current?.isFocused();
    setShowPassword((visible) => !visible);
    if (wasFocused) requestAnimationFrame(() => passwordRef.current?.focus());
  }

  async function handleSubmit() {
    if (submitLocked.current) return;
    submitLocked.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await signIn(email, password);
      Keyboard.dismiss();
      // El éxito mantiene el bloqueo hasta que Stack.Protected desmonta Login.
    } catch (cause: unknown) {
      submitLocked.current = false;
      setIsSubmitting(false);
      if (cause instanceof AuthError && cause.code === 'VALIDATION_ERROR') {
        setFieldErrors(cause.fields);
        const firstInvalid = cause.fields.email ? emailRef : passwordRef;
        firstInvalid.current?.focus();
        //Permitir que los lectores escuchen los errores de validación de los campos.
        AccessibilityInfo.announceForAccessibility(Object.values(cause.fields).join(' '));
        return;
      }
      const failure = describeLoginError(cause);
      Keyboard.dismiss();
      if (Platform.OS === 'web') {
        setFormError(failure);
      } else {
        Alert.alert(failure.title, failure.message, [{
          text: cause instanceof AuthError && cause.code === 'INVALID_CREDENTIALS' ? 'Revisar datos' : 'Entendido',
          onPress: () => passwordRef.current?.focus(),
        }], { cancelable: false });
      }
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
              <TextInput ref={emailRef} editable={!isSubmitting} textStyle={{ color: theme.colors.text }} placeholderTextColor="#a1a1aa"
                accessibilityLabel={fieldErrors.email ? `Correo electrónico. ${fieldErrors.email}` : 'Correo electrónico'} placeholder="Correo electrónico"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                autoComplete="email" maxLength={254} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
                onChangeText={(value) => { setEmail(value); clearFieldError('email'); }}
                style={{ height: 52, padding: 12, backgroundColor: '#242424', borderRadius: 8 }} />
              {fieldErrors.email ? <NativeText textStyle={styles.fieldError}>{fieldErrors.email}</NativeText> : null}
            </Column>
          </Host>
          <View style={styles.passwordContainer}>
            <Host colorScheme="light" style={{ width: '100%', height: 52 }}>
              <TextInput ref={passwordRef} editable={!isSubmitting} textStyle={{ color: theme.colors.text }} placeholderTextColor="#a1a1aa"
                accessibilityLabel={fieldErrors.password ? `Contraseña. ${fieldErrors.password}` : 'Contraseña'} placeholder="Contraseña" secureTextEntry={!showPassword}
                autoCapitalize="none" autoCorrect={false} autoComplete="current-password"
                maxLength={128} returnKeyType="go" onSubmitEditing={handleSubmit}
                onChangeText={(value) => { setPassword(value); clearFieldError('password'); }}
                style={{ width: buttonWidth, height: 52, padding: 12, paddingRight: 56, backgroundColor: '#242424', borderRadius: 8 }} />
            </Host>
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              disabled={isSubmitting} onPress={togglePasswordVisibility}
              style={({ pressed }) => [styles.passwordToggle, pressed && styles.copyPressed]}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={22} color="#a1a1aa" />
            </Pressable>
          </View>
          {fieldErrors.password ? <Text selectable accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.fieldError}>{fieldErrors.password}</Text> : null}
          <View style={styles.buttonContainer} onLayout={({ nativeEvent }) => setButtonWidth(nativeEvent.layout.width)}>
            <Host colorScheme="light" seedColor={theme.colors.buttonBackground} style={{ width: buttonWidth, height: 52 }}>
              <Button disabled={isSubmitting} variant="text" style={{ ...styles.button, width: buttonWidth }} onPress={handleSubmit}>
                <NativeText textStyle={{ color: '#ffffff', fontSize: 17, fontWeight: '600' }}>{isSubmitting ? 'Ingresando…' : 'Ingresar'}</NativeText>
              </Button>
            </Host>
          </View>
          {formError ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.formError}>
              <Text selectable style={styles.formErrorTitle}>{formError.title}</Text>
              <Text selectable style={styles.fieldError}>{formError.message}</Text>
            </View>
          ) : null}
          <View style={styles.demo}>
            <Text style={styles.demoTitle}>Cuenta de prueba</Text>
            <View style={styles.demoRow}>
              <Text selectable style={styles.demoText}>{DEMO_CREDENTIALS.email}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Copiar correo electrónico"
                disabled={isSubmitting || copyStatus === 'copying'} onPress={() => handleCopyDemo('email')}
                style={({ pressed }) => [styles.copyButton, pressed && styles.copyPressed]}>
                <Feather name="copy" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.demoRow}>
              <Text selectable style={styles.demoText}>{DEMO_CREDENTIALS.password}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Copiar contraseña"
                disabled={isSubmitting || copyStatus === 'copying'} onPress={() => handleCopyDemo('password')}
                style={({ pressed }) => [styles.copyButton, pressed && styles.copyPressed]}>
                <Feather name="copy" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            {copyStatus === 'copied' ? <Text accessibilityLiveRegion="polite" style={styles.demoSuccess}>
              {copyTarget === 'email' ? 'Email copiado.' : 'Contraseña copiada.'}
            </Text> : null}
            {copyStatus === 'error' ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.demoError}>No se pudo copiar. Podés seleccionar el dato e intentar nuevamente.</Text> : null}
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
  passwordContainer: { position: 'relative' },
  passwordToggle: { position: 'absolute', right: 0, top: 4, width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  intro: { fontSize: 17, lineHeight: 25, color: theme.colors.textSecondary },
  fieldError: { color: '#ff8a80', fontSize: 15, lineHeight: 22 },
  formError: { gap: 8, padding: 16, borderRadius: 8, backgroundColor: '#351b1b' },
  formErrorTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  demo: { gap: 6, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 12 },
  demoTitle: { fontWeight: '600', color: '#151515', fontSize: 15 },
  demoSuccess: { color: '#176b46', fontSize: 14, lineHeight: 20 },
  demoError: { color: '#b42318', fontSize: 14, lineHeight: 20 },
  demoText: { color: theme.colors.textSecondary, fontSize: 14, flex: 1 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copyButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  copyPressed: { opacity: 0.5 },
  buttonContainer: { width: '100%', maxWidth: 550, alignSelf: 'center', alignItems: 'center' },
  button: { height: 52, borderRadius: 8, backgroundColor: theme.colors.buttonBackground }, 

});
