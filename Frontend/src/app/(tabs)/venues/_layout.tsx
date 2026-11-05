import { Stack } from 'expo-router/stack';

export default function VenuesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Sedes' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle de sede' }} />
    </Stack>
  );
}
