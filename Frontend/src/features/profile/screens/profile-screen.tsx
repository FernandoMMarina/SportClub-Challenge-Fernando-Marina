import { Button, Host } from '@expo/ui';

import { Screen } from '@/components/screen';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  return (
    <Screen title={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} description={user?.email ?? ''}>
      <Host matchContents>
        <Button label="Cerrar sesión" onPress={signOut} />
      </Host>
    </Screen>
  );
}
