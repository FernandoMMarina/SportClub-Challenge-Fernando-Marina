import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import venues from '@/data/venues.json';
import { canCancelReservation, type Reservation } from '@/services/reservations-service';
import { useMyReservations } from '@/features/reservations/hooks/use-my-reservations';
import { useAuthStore } from '@/stores/auth-store';
import { theme } from '@/theme';

const dateFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function ReservationCard({ item, busy, onCancel, now }: { item: Reservation; busy: boolean; onCancel: () => void; now: number }) {
  const venue = venues.find(venue => venue.id === item.session.branchId);
  const activity = venue?.classes.find(activity => activity.id === item.session.activityId);
  const cancelled = item.status === 'CANCELLED';
  const ended = item.session.endsAt <= now;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.className}>{activity?.name ?? item.session.activityId}</Text>
        <Text style={[styles.badge, cancelled && styles.cancelled, !cancelled && !ended && styles.confirmed]}>{cancelled ? 'Cancelada' : ended ? 'Finalizada' : 'Confirmada ✓'}</Text>
      </View>
      <Text style={styles.secondary}>{venue?.name ?? item.session.branchId}</Text>
      <Text style={styles.date}>{dateFormat.format(item.session.startsAt)}</Text>
      <Text style={styles.time}>{timeFormat.format(item.session.startsAt)} – {timeFormat.format(item.session.endsAt)} h</Text>
      <Text style={styles.timezone}>Horario de Buenos Aires</Text>
      {canCancelReservation(item, now) ? (
        <View style={styles.cancelArea}>
          <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }}
            accessibilityLabel={`Cancelar reserva de ${activity?.name ?? 'clase'}`}
            style={({ pressed }) => [styles.solidCancelButton, (pressed || busy) && styles.dimmed]}
            onPress={() => Alert.alert(
              'Cancelar reserva',
              '¿Estás seguro de que querés cancelar esta reserva? Se liberará tu cupo.',
              [
                { text: 'Volver', style: 'cancel' },
                { text: 'Sí, cancelar', style: 'destructive', onPress: onCancel },
              ],
              { cancelable: true },
            )}>
            <Text style={styles.solidCancelText}>Cancelar reserva</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function MyReservationsScreen({ home = false }: { home?: boolean }) {
  const user = useAuthStore(state => state.user);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const { items, loading, error, cancelling, available, isDemo, refresh, cancel } = useMyReservations();
  const visibleItems = available ? (items ?? []).filter(item => !home || (item.status === 'CONFIRMED' && item.session.endsAt > now)).sort((a, b) => a.session.startsAt - b.session.startsAt) : [];
  const nextReservation = home ? visibleItems[0] : undefined;
  return (
    <SafeAreaView edges={home ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']} style={styles.container}>
      <FlatList data={home ? visibleItems.slice(1) : visibleItems} keyExtractor={item => item.id}
        contentContainerStyle={styles.content} refreshing={loading && items !== null}
        onRefresh={available && !isDemo && !cancelling ? () => { void refresh(); } : undefined}
        ListHeaderComponent={<View style={styles.heading}>
          {!home ? <Pressable accessibilityRole="button" accessibilityLabel="Volver al perfil" style={styles.backButton}
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile'); }}>
            <Text style={styles.backText}>‹  Volver al perfil</Text>
          </Pressable> : null}

          <Text accessibilityRole="header" style={styles.title}>{home ? `Hola, ${user?.firstName ?? ''}` : 'Mis reservas'}</Text>
          {!home ? <Text style={styles.secondary}>Tus clases reservadas y el historial de cancelaciones.</Text> : null}


          {isDemo ? home ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Modo demostración. Ver información"
              style={({ pressed }) => [styles.demoBadge, pressed && styles.dimmed]}
              onPress={() => Alert.alert('Modo demostración', 'Datos locales de demostración. Podés reservar y cancelar clases sin conexión.', [{ text: 'Entendido' }])}>
              <Text style={styles.demoBadgeText}>Modo demostración · Ver información</Text>
            </Pressable>
          ) : <View style={styles.demoNotice}>
            <Text style={styles.demoTitle}>Modo demostración</Text>
            <Text style={styles.secondary}>Datos locales de demostración. Podés reservar y cancelar clases sin conexión.</Text>
          </View> : null}

          {error ?
          <View style={styles.error}>
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.secondary}>{error}</Text>
            <Pressable accessibilityRole="button" disabled={loading || !!cancelling} onPress={() => { void refresh(); }} style={styles.backButton}>
              <Text style={styles.backText}>Reintentar</Text>
            </Pressable>
          </View> : null}

          {cancelling ? <ActivityIndicator accessibilityLabel="Cancelando reserva" color={theme.colors.buttonBackground} /> : null}
          {nextReservation ? <View style={styles.nextClass}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Tu próxima clase</Text>
            <ReservationCard item={nextReservation} now={now} busy={!!cancelling} onCancel={() => { void cancel(nextReservation); }} />
          </View> : null}

          {home ? <Pressable accessibilityRole="link" accessibilityLabel="Ver sedes y reservar"
            style={({ pressed }) => [styles.venuesCard, pressed && styles.venuesCardPressed]}
            onPress={() => router.push('/venues')}>
            <View style={styles.venuesDetails}>
              <Text style={styles.venuesTitle}>Ver sedes y reservar</Text>
              <Text style={styles.secondary}>Elegí tu sede y encontrá tu próxima clase.</Text>
            </View>
            <View style={styles.venuesArrow} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={theme.colors.buttonBackground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="m9 5 7 7-7 7" />
              </Svg>
            </View>
          </Pressable> : null}
          {home && visibleItems.length > 1 ? <Text accessibilityRole="header" style={styles.sectionTitle}>Otras próximas clases</Text> : null}
        </View>}
        ListEmptyComponent={nextReservation ? undefined : !available ? <View style={styles.card}>
          <Text style={styles.className}>Cuenta de demostración</Text>
          <Text style={styles.secondary}>Para consultar tus reservas, ingresá con una cuenta conectada al servidor.</Text>
        </View> : loading ? <ActivityIndicator accessibilityLabel="Cargando reservas" color={theme.colors.buttonBackground} /> : !error && items !== null ? <View style={styles.card}>
          <Text style={styles.className}>{home ? 'Todavía no tenés próximas clases' : 'Todavía no tenés reservas'}</Text>
          <Text style={styles.secondary}>Tus reservas aparecerán acá cuando reserves una clase.</Text>
        </View> : undefined}
        renderItem={({ item }) => <ReservationCard item={item} now={now} busy={!!cancelling} onCancel={() => { void cancel(item); }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.large, gap: theme.spacing.medium, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  nextClass: { gap: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '600' },
  demoBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, minHeight: 48, justifyContent: 'center' },
  demoBadgeText: { color: '#b9bbc1', fontSize: 12 },
  heading: { gap: theme.spacing.medium, marginBottom: 8 },
  backButton: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 },
  backText: { color: theme.colors.text, fontSize: 16 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '700' },
  secondary: { color: '#b9bbc1', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#202020', borderWidth: 1, borderColor: '#383838', borderRadius: 16, padding: theme.spacing.medium, gap: 10 },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  className: { color: theme.colors.text, fontSize: 18, fontWeight: '600', flexShrink: 1 },
  badge: { color: theme.colors.text, backgroundColor: '#383838', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 12 },
  confirmed: { color: '#4ade80', borderWidth: 1, borderColor: '#4ade80', backgroundColor: 'transparent' },
  cancelled: { color: '#b9bbc1', backgroundColor: '#292929' },
  date: { color: theme.colors.text, fontSize: 16, marginTop: 4, textTransform: 'capitalize' },
  time: { color: theme.colors.text, fontSize: 20, fontWeight: '600' },
  timezone: { color: '#b9bbc1', fontSize: 12 },
  cancelArea: { gap: 8, borderTopWidth: 1, borderTopColor: '#383838', paddingTop: 12 },
  solidCancelButton: { minHeight: 48, paddingHorizontal: theme.spacing.large, paddingVertical: theme.spacing.medium, borderRadius: 28, backgroundColor: theme.colors.buttonBackground, alignItems: 'center', justifyContent: 'center' },
  solidCancelText: { color: theme.colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  venuesCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, minHeight: 104, backgroundColor: '#202020', borderWidth: 1, borderColor: '#383838', borderRadius: 16 },
  venuesCardPressed: { backgroundColor: '#292929', borderColor: '#ff5555' },
  venuesDetails: { flex: 1, gap: 8 },
  venuesTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '600' },
  venuesArrow: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.5 },
  demoNotice: { padding: 16, gap: 8,backgroundColor: '#202020', borderRadius: 12 },
  demoTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  error: { padding: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.buttonBackground, backgroundColor: '#202020', borderRadius: 8 },
});
