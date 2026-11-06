import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookingPanel } from '@/features/reservations/components/booking-panel';
import { useMyReservations } from '@/features/reservations/hooks/use-my-reservations';
import venues from '@/data/venues.json';
import { theme } from '@/theme';

const days: Record<string, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useMyReservations();
  const venue = venues.find(item => item.id === id);
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
    {!venue ? <Text style={styles.title}>Sede no encontrada</Text> : <>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>TU PRÓXIMO ENTRENAMIENTO</Text>
        <Text style={styles.title}>{venue.name}</Text>
        <Text selectable style={styles.text}>{venue.address}</Text>
        <Text style={styles.muted}>{venue.description}</Text>
      </View>
      <View style={styles.hours}>
        <Text style={styles.hoursTitle}>Horarios de la sede</Text>
        {venue.openingHours.map(schedule => <Text key={schedule.days.join('-')} style={styles.muted}>
          {schedule.days.map(day => days[day]).join(', ')} · {schedule.opens}–{schedule.closes}
        </Text>)}
      </View>
      <BookingPanel key={venue.id} venue={venue} />
    </>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.large, paddingBottom: 40, gap: 24, maxWidth: 600, width: '100%', alignSelf: 'center' },
  intro: { gap: 12 },
  eyebrow: { color: '#b9bbc1', fontSize: 11, letterSpacing: 1.3, fontWeight: '600' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '700' },
  text: { color: theme.colors.text, fontSize: 15, lineHeight: 23 },
  muted: { color: '#b9bbc1', fontSize: 14, lineHeight: 21 },
  hours: { gap: 8, padding: 16, backgroundColor: '#202020', borderRadius: 12 },
  hoursTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
});
