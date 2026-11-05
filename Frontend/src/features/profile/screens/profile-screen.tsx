import { router } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { theme } from '@/theme';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const avatarUrl = `https://api.dicebear.com/10.x/avataaars/png?seed=${encodeURIComponent(
    String(user?.id ?? 'default')
  )}`;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: avatarUrl }}
        style={styles.avatar}
      />

      <Text style={styles.name}>
        {user?.firstName} {user?.lastName}
      </Text>

      <Text style={styles.email}>
        {user?.email}
      </Text>

      <View style={styles.buttonContainer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Editar información personal"
          onPress={() => router.push('/edit-profile')}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonLabel}>Editar información personal</Text>
        </Pressable>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión"
          onPress={signOut}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonLabel}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 20,
  },

  name: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },

  email: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 32,
  },

  button: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.medium,
    borderRadius: 28,
    backgroundColor: theme.colors.buttonBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.75 },
  buttonLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  buttonContainer: {
    width: '100%',
    maxWidth: 350,
    marginBottom: theme.spacing.medium,
  },
});
