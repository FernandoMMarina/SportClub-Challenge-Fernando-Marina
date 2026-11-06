import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import venues from '@/data/venues.json';
import { theme } from '@/theme';

export default function VenuesScreen() {
  return (
    <FlatList
      data={venues}
      keyExtractor={(venue) => venue.id}
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item: venue }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/venues/[id]', params: { id: venue.id } })}
            accessibilityRole="link"
            accessibilityLabel={`Ver sede ${venue.name}, ${venue.address}`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.details}>
              <Text style={styles.title}>{venue.name}</Text>
              <Text style={styles.address}>{venue.address}</Text>
            </View>
            <View style={styles.arrow} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={theme.colors.buttonBackground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="m9 5 7 7-7 7" />
              </Svg>
            </View>
          </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.address}>No hay sedes disponibles.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.large, gap: theme.spacing.medium, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, minHeight: 104, backgroundColor: '#202020', borderWidth: 1, borderColor: '#383838', borderRadius: 16 },
  cardPressed: { backgroundColor: '#292929', borderColor: '#ff5555' },
  details: { flex: 1, gap: 8 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '600' },
  address: { color: '#b9bbc1', fontSize: 14, lineHeight: 21 },
  arrow: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
});
