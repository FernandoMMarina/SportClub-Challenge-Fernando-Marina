import { Tabs } from 'expo-router';

import { CurvedTabBar } from '@/components/navigation/curved-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CurvedTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="venues" options={{ title: 'Sedes', headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
