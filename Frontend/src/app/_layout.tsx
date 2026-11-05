import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export default function RootLayout() {
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    if (expiresAt === null) return;
    const expiration = expiresAt;
    function expireSession() {
      if (Date.now() >= expiration && useAuthStore.getState().expiresAt === expiresAt) signOut();
    }
    const timer = setTimeout(expireSession, Math.max(0, expiresAt - Date.now()));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') expireSession();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [expiresAt, signOut]);

  return (
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="scan-qr" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
