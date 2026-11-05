import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme';

type ScreenProps = PropsWithChildren<{ title: string; description: string }>;

export function Screen({ title, description, children }: ScreenProps) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.large, gap: theme.spacing.medium },
  title: { fontSize: 28, fontWeight: '600', color: theme.colors.text },
  description: { fontSize: 16, lineHeight: 24, color: theme.colors.textSecondary },
});
