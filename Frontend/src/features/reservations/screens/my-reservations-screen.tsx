import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import venues from '@/data/venues.json';
import { canCancelReservation, type Reservation } from '@/services/reservations-service';
import { useMyReservations } from '@/features/reservations/hooks/use-my-reservations';
import { theme } from '@/theme';

const dateFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function ReservationCard({ item, busy, onCancel, now, isDemo }: { item: Reservation; busy: boolean; onCancel: () => void; now: number; isDemo: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const venue = venues.find(venue => venue.id === item.session.branchId);
  const activity = venue?.classes.find(activity => activity.id === item.session.activityId);
  const cancelled = item.status === 'CANCELLED';
  const ended = item.session.endsAt <= now;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.className}>{activity?.name ?? item.session.activityId}</Text>
        <Text style={[styles.badge, cancelled && styles.cancelled]}>{cancelled ? 'Cancelada' : ended ? 'Finalizada' : 'Confirmada'}</Text>
      </View>
      <Text style={styles.secondary}>{venue?.name ?? item.session.branchId}</Text>
      <Text style={styles.date}>{dateFormat.format(item.session.startsAt)}</Text>
      <Text style={styles.time}>{timeFormat.format(item.session.startsAt)} – {timeFormat.format(item.session.endsAt)} h</Text>
      <Text style={styles.timezone}>Horario de Buenos Aires</Text>
      {!isDemo && canCancelReservation(item, now) ? (
        <View style={styles.cancelArea}>
          {confirming ? <Text style={styles.secondary}>¿Querés cancelar esta reserva? Se liberará tu cupo.</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }}
              accessibilityLabel={`${confirming ? 'Confirmar cancelación de' : 'Cancelar reserva de'} ${activity?.name ?? 'clase'}`}
              style={({ pressed }) => [styles.cancelButton, (pressed || busy) && styles.dimmed]}
              onPress={() => { if (confirming) onCancel(); else setConfirming(true); }}>
              <Text style={styles.cancelText}>{confirming ? 'Confirmar cancelación' : 'Cancelar reserva'}</Text>
            </Pressable>
            {confirming ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirming(false)} style={styles.backButton}>
              <Text style={styles.secondary}>Volver</Text>
            </Pressable> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function MyReservationsScreen() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const { items, loading, error, cancelling, available, isDemo, refresh, cancel } = useMyReservations();
  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={available ? items ?? [] : []} keyExtractor={item => item.id}
        contentContainerStyle={styles.content} refreshing={loading && items !== null}
        onRefresh={available && !isDemo && !cancelling ? () => { void refresh(); } : undefined}
        ListHeaderComponent={<View style={styles.heading}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al perfil" style={styles.backButton}
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile'); }}>
            <Text style={styles.backText}>‹  Volver al perfil</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>Mis reservas</Text>
          <Text style={styles.secondary}>Tus clases reservadas y el historial de cancelaciones.</Text>
          {isDemo ? <View style={styles.demoNotice}>
            <Text style={styles.demoTitle}>Reservas de ejemplo</Text>
            <Text style={styles.secondary}>Así se verán tus reservas. Estos datos son de demostración y no se pueden cancelar.</Text>
          </View> : null}
          {error ? <View style={styles.error}>
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.secondary}>{error}</Text>
            <Pressable accessibilityRole="button" disabled={loading || !!cancelling} onPress={() => { void refresh(); }} style={styles.backButton}>
              <Text style={styles.backText}>Reintentar</Text>
            </Pressable>
          </View> : null}
          {cancelling ? <ActivityIndicator accessibilityLabel="Cancelando reserva" color={theme.colors.buttonBackground} /> : null}
        </View>}
        ListEmptyComponent={!available ? <View style={styles.card}>
          <Text style={styles.className}>Cuenta de demostración</Text>
          <Text style={styles.secondary}>Para consultar tus reservas, ingresá con una cuenta conectada al servidor.</Text>
        </View> : loading ? <ActivityIndicator accessibilityLabel="Cargando reservas" color={theme.colors.buttonBackground} /> : !error && items !== null ? <View style={styles.card}>
          <Text style={styles.className}>Todavía no tenés reservas</Text>
          <Text style={styles.secondary}>Tus reservas aparecerán acá cuando reserves una clase.</Text>
        </View> : undefined}
        renderItem={({ item }) => <ReservationCard item={item} isDemo={isDemo} now={now} busy={!!cancelling} onCancel={() => { void cancel(item); }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.large, gap: theme.spacing.medium, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  heading: { gap: theme.spacing.medium, marginBottom: 8 },
  backButton: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 },
  backText: { color: theme.colors.text, fontSize: 16 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '700' },
  secondary: { color: '#b9bbc1', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#202020', borderWidth: 1, borderColor: '#383838', borderRadius: 16, padding: theme.spacing.medium, gap: 10 },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  className: { color: theme.colors.text, fontSize: 18, fontWeight: '600', flexShrink: 1 },
  badge: { color: theme.colors.text, backgroundColor: '#383838', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 12 },
  cancelled: { color: '#b9bbc1', backgroundColor: '#292929' },
  date: { color: theme.colors.text, fontSize: 16, marginTop: 4, textTransform: 'capitalize' },
  time: { color: theme.colors.text, fontSize: 20, fontWeight: '600' },
  timezone: { color: '#b9bbc1', fontSize: 12 },
  cancelArea: { gap: 8, borderTopWidth: 1, borderTopColor: '#383838', paddingTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  cancelButton: { borderWidth: 1, borderColor: theme.colors.buttonBackground, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, minHeight: 48, justifyContent: 'center' },
  cancelText: { color: '#ff6464', fontSize: 14, fontWeight: '600' },
  dimmed: { opacity: 0.5 },
  demoNotice: { padding: 16, gap: 8, borderLeftWidth: 3, borderLeftColor: theme.colors.buttonBackground, backgroundColor: '#202020', borderRadius: 12 },
  demoTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  error: { padding: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.buttonBackground, backgroundColor: '#202020', borderRadius: 8 },
});
