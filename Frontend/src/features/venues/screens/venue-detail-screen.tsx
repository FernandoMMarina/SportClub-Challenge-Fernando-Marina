import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMyReservations } from '@/features/reservations/hooks/use-my-reservations';
import { useReservationsStore } from '@/stores/reservations-store';
import { Pressable, ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import venues from '@/data/venues.json';
import { theme } from '@/theme';

const sessionDateFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const days: Record<string, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, error } = useMyReservations();
  const sessions = useReservationsStore(state => state.sessions);
  const items = useReservationsStore(state => state.items);
  const pending = useReservationsStore(state => state.pending);
  const book = useReservationsStore(state => state.book);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const venue = venues.find((item) => item.id === id);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      {!venue ? <Text style={styles.title}>Sede no encontrada</Text> : <>
        <Text style={styles.title}>{venue.name}</Text>
        <Text selectable style={styles.text}>{venue.address}</Text>
        <Text style={styles.text}>{venue.description}</Text>
        <Text style={styles.heading}>Horarios de la sede</Text>
        {venue.openingHours.map((schedule, index) => <Text key={index} style={styles.text}>
          {schedule.days.map((day) => days[day]).join(', ')}: {schedule.opens}–{schedule.closes}
        </Text>)}
        <Text style={styles.heading}>Clases</Text>
        {loading ? <ActivityIndicator color={theme.colors.buttonBackground} accessibilityLabel="Cargando horarios" /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : null}
        {confirmation ? <Text accessibilityLiveRegion="polite" style={styles.text}>{confirmation}</Text> : null}
        {venue.classes.map((activity) => <View key={activity.id} style={styles.classItem}>
          <Text style={styles.heading}>{activity.name}</Text>
          <Text style={styles.text}>{activity.description}</Text>
          <Text style={styles.text}>{activity.days.map((day) => days[day]).join(', ')}</Text>
          <Text style={styles.text}>{activity.times.join(' · ')}</Text>
          {sessions.filter(session => session.branchId === id && session.activityId === activity.id).map(session => {
            const reserved = items?.some(item => item.sessionId === session.id && item.status === 'CONFIRMED');
            const label = sessionDateFormat.format(session.startsAt);
            return <Pressable key={session.id} accessibilityRole="button" accessibilityLabel={`${reserved ? 'Reservada' : 'Reservar'} ${activity.name}, ${label}`}
              disabled={!!pending || loading || reserved} style={[styles.reserveButton, (reserved || !!pending) && { opacity: 0.5 }]}
              onPress={async () => { setConfirmation(null); if (await book(session.id)) setConfirmation(`Reserva confirmada: ${activity.name}, ${label}. Ya podés verla en Inicio.`); }}>
              <Text style={styles.reserveLabel}>{reserved ? 'Reservada' : pending === `book:${session.id}` ? 'Reservando…' : `Reservar · ${label}`}</Text>
            </Pressable>;
          })}
          {!loading && !sessions.some(session => session.branchId === id && session.activityId === activity.id) ? <Text style={styles.text}>No hay próximos horarios disponibles.</Text> : null}
        </View>)}
      </>}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, gap: 16 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '600' },
  heading: { color: theme.colors.text, fontSize: 20, fontWeight: '600' },
  text: { color: theme.colors.text, fontSize: 16, lineHeight: 24 },
  reserveButton: { minHeight: 48, borderRadius: 24, padding: 14, backgroundColor: theme.colors.buttonBackground, justifyContent: 'center' },
  reserveLabel: { color: theme.colors.text, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  classItem: { gap: 8, paddingVertical: 12 },
});
