import { Host, TextInput, type TextInputRef } from '@expo/ui';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasProfileChanges, ProfileError, validateProfile, type ProfileFieldErrors, type ProfileInput } from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';
import { theme } from '@/theme';

const labels = { firstName: 'Nombre', lastName: 'Apellido', email: 'Correo electrónico' } as const;
const fields = ['firstName', 'lastName', 'email'] as const;

export default function EditProfileScreen() {
  const user = useAuthStore(state => state.user);
  const source = useAuthStore(state => state.source);
  const updateUser = useAuthStore(state => state.updateUser);
  const [input, setInput] = useState<ProfileInput>(() => ({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', email: user?.email ?? '' }));
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<keyof ProfileInput | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const refs = useRef<Partial<Record<keyof ProfileInput, TextInputRef | null>>>({});
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function goBack() {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }

  async function save() {
    if (lock.current || !user || !hasProfileChanges(input, user)) return;
    const invalid = validateProfile(input);
    setErrors(invalid);
    setFailure(null);
    if (Object.keys(invalid).length) {
      const first = fields.find(key => invalid[key]);
      if (first) refs.current[first]?.focus();
      AccessibilityInfo.announceForAccessibility(Object.values(invalid).join(' '));
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      const updated = await updateUser(input);
      if (mounted.current && updated) goBack();
    } catch (cause: unknown) {
      if (mounted.current) {
        const error = cause instanceof ProfileError ? cause : new ProfileError('No pudimos guardar los cambios. Volvé a intentarlo.');
        setFailure(error.message);
        setErrors(error.fields);
      }
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  if (!user) return null;
  const disabled = saving || !hasProfileChanges(input, user);
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al perfil" onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backLabel}>‹  Volver al perfil</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>Editar información personal</Text>
          <Image accessibilityLabel="Avatar de tu perfil" style={styles.avatar}
            source={{ uri: `https://api.dicebear.com/10.x/avataaars/png?seed=${encodeURIComponent(user.id)}` }} />
          <Text style={styles.subtitle}>Mantené tus datos personales actualizados.</Text>
          {source === 'local' ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Cuenta de demostración</Text>
              <Text style={styles.noticeText}>Los cambios se guardan en esta sesión, sin conexión. Al cerrar sesión o reiniciar la app se restablece el perfil demo.</Text>
            </View>
          ) : null}
          {fields.map((key, index) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{labels[key]}</Text>
              <Host style={styles.inputHost} colorScheme="dark">
                <TextInput ref={ref => { refs.current[key] = ref; }} defaultValue={input[key]}
                  onFocus={() => setFocusedField(key)} onBlur={() => setFocusedField(null)}
                  editable={!saving} accessibilityLabel={`${labels[key]}${errors[key] ? `. ${errors[key]}` : ''}`}
                  autoCapitalize={key === 'email' ? 'none' : 'words'} autoCorrect={false}
                  keyboardType={key === 'email' ? 'email-address' : 'default'}
                  autoComplete={key === 'email' ? 'email' : key === 'firstName' ? 'given-name' : 'family-name'}
                  maxLength={key === 'email' ? 254 : 80} returnKeyType={key === 'email' ? 'done' : 'next'}
                  onSubmitEditing={() => { if (key === 'email') void save(); else refs.current[fields[index + 1]]?.focus(); }}
                  onChangeText={value => {
                    setInput(current => ({ ...current, [key]: value }));
                    setErrors(current => ({ ...current, [key]: undefined }));
                    setFailure(null);
                  }} style={{ ...styles.input, borderColor: errors[key] ? theme.colors.buttonBackground : focusedField === key ? theme.colors.buttonBackground : styles.input.borderColor }}
                  cursorColor={theme.colors.buttonBackground} textStyle={{ color: theme.colors.text, fontSize: 16 }} />
              </Host>
              {errors[key] ? <Text accessibilityLiveRegion="polite" style={styles.message}>{errors[key]}</Text> : null}
            </View>
          ))}
          {failure ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>{failure}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Guardar cambios"
              accessibilityState={{ disabled, busy: saving }} disabled={disabled}
              onPress={() => { void save(); }}
              style={({ pressed }) => [styles.saveButton, disabled && styles.disabledButton, pressed && styles.pressed]}>
              {saving ? <ActivityIndicator color={theme.colors.text} accessibilityLabel="Guardando cambios" /> : null}
              <Text style={styles.saveLabel}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar sin guardar" onPress={goBack}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
          </View>
          {saving && source === 'api' ? <Text style={styles.message}>El guardado ya está en curso. Volver al perfil no cancela la solicitud enviada.</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.large, paddingTop: theme.spacing.small, paddingBottom: 40, gap: theme.spacing.medium, width: '100%', maxWidth: 500, alignSelf: 'center' },
  backButton: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { color: theme.colors.text, fontSize: 16 },
  title: { color: theme.colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  subtitle: { color: '#b9bbc1', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, alignSelf: 'center' },
  notice: { padding: theme.spacing.medium, gap: 4, backgroundColor: '#202020', borderRadius: 12 },
  noticeTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  noticeText: { color: '#b9bbc1', fontSize: 14, lineHeight: 21 },
  field: { gap: theme.spacing.small, marginTop: 4 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  inputHost: { width: '100%', height: 54 },
  input: { width: '100%' as const, height: 54, padding: 14, backgroundColor: '#202020', borderWidth: 1, borderColor: '#383838', borderRadius: 12 },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginTop: theme.spacing.small },
  saveButton: { flex: 1, flexDirection: 'row', gap: 8, minHeight: 50, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 25, backgroundColor: theme.colors.buttonBackground, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.4 },
  saveLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  cancelButton: { minHeight: 50, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 25, borderWidth: 1, borderColor: '#686868', alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  pressed: { opacity: 0.75 },
  message: { color: theme.colors.text, fontSize: 14, lineHeight: 21 },
});
