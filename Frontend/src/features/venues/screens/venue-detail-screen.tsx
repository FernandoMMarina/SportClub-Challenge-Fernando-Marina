import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import venues from '@/data/venues.json';
import { theme } from '@/theme';

const days: Record<string, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
        {venue.classes.map((activity) => <View key={activity.id} style={styles.classItem}>
          <Text style={styles.heading}>{activity.name}</Text>
          <Text style={styles.text}>{activity.description}</Text>
          <Text style={styles.text}>{activity.days.map((day) => days[day]).join(', ')}</Text>
          <Text style={styles.text}>{activity.times.join(' · ')}</Text>
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
  classItem: { gap: 8, paddingVertical: 12 },
});
