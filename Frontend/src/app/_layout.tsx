import { Stack } from 'expo-router/stack';

import { useAuthStore } from '@/stores/auth-store';

export default function RootLayout() {
  const isAuthenticated = useAuthStore((state) => state.user !== null);

  return (
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan-qr" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
