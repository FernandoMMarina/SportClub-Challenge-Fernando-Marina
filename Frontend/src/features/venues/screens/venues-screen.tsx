import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import venues from '@/data/venues.json';
import { theme } from '@/theme';

export default function VenuesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      {venues.map((venue) => (
        <View key={venue.id} style={styles.card}>
          <Text style={styles.title}>{venue.name}</Text>
          <Text style={styles.text}>{venue.address}</Text>
          <Link style={styles.link} href={{ pathname: '/venues/[id]', params: { id: venue.id } }}>Ver sede</Link>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, gap: 24 },
  card: { gap: 12 },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '600' },
  text: { color: theme.colors.text, fontSize: 16 },
  link: { color: '#ff5555', fontSize: 17, paddingVertical: 8 },
});
