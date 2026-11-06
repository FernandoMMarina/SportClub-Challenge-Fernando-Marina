import { router, useRootNavigationState } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { usePendingVenueStore } from '@/stores/pending-venue-store';
import { navigationTheme } from '@/theme/navigation';

// Expo Router oculta el splash nativo apenas monta el árbol de navegación.
// Solo configuramos el fundido para que la transición no sea un corte seco.
SplashScreen.setOptions({ duration: 400, fade: true });

export default function RootLayout() {
  const navigationState = useRootNavigationState();
  const pendingVenueId = usePendingVenueStore((state) => state.venueId);

  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    if (!navigationState?.key || !isAuthenticated || !pendingVenueId) return;
    usePendingVenueStore.getState().setVenue(null);
    router.replace({ pathname: '/venues/[id]', params: { id: pendingVenueId } });
  }, [navigationState?.key, isAuthenticated, pendingVenueId]);

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
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="my-reservations" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="scan-qr" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
