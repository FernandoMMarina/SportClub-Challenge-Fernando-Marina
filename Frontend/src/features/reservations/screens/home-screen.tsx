import { Link } from 'expo-router';
import { Screen } from '@/components/screen';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  return <Screen title={`Hola, ${user?.firstName ?? ''}`} description="Todavía no tenés clases reservadas.">
    <Link href="/venues" style={{ color: '#ff5555', fontSize: 17, paddingVertical: 12 }}>Ver sedes y clases</Link>
  </Screen>;
}
