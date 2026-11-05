import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { theme } from '@/theme';

import { CurvedBarBackground } from './curved-bar-background';

const BAR_HEIGHT = 72;
const CIRCLE_SIZE = 60;
const FLOAT_OFFSET = 28;
const tabs: Record<string, { label: string; icon: SymbolViewProps['name'] }> = {
  index: { label: 'Inicio', icon: { ios: 'house', android: 'home', web: 'home' } },
  venues: { label: 'Escanear QR', icon: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' } },
  profile: { label: 'Perfil', icon: { ios: 'person', android: 'person', web: 'person' } },
};

export function CurvedTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const width = measuredWidth ?? windowWidth;
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      style={[styles.container, { height: FLOAT_OFFSET + BAR_HEIGHT + bottomInset }]}>
      <View pointerEvents="none" style={styles.background}>
        <CurvedBarBackground width={width} height={BAR_HEIGHT} circleWidth={CIRCLE_SIZE} color={theme.colors.background} />
        <View style={{ height: bottomInset, backgroundColor: theme.colors.background }} />
      </View>
      <View style={[styles.row, { paddingLeft: insets.left, paddingRight: insets.right }]}>
        {state.routes.map((route, index) => {
          const tab = tabs[route.name];
          if (!tab) return null;
          const selected = route.name !== 'venues' && state.index === index;
          const central = route.name === 'venues';
          const color = central ? '#ffffff' : selected ? '#f60202' : theme.colors.textSecondary;
          const options = descriptors[route.key].options;

          function onPress() {
            if (central) {
              router.push('/scan-qr');
              return;
            }
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigateToTab(route.key);
          }

          return (
            <Pressable key={route.key} accessibilityRole={central ? 'button' : 'tab'} accessibilityLabel={options.tabBarAccessibilityLabel ?? tab.label}
              accessibilityState={central ? undefined : { selected }} aria-selected={central ? undefined : selected} onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [styles.tab, central && styles.centralTab, pressed && styles.pressed]}>
              <View style={central ? [styles.circle, selected && styles.selectedCircle] : styles.icon}>
                <SymbolView name={tab.icon} size={26} tintColor={color} />
              </View>
              {!central && <Text style={[styles.label, { color: selected ? '#ff0000' : theme.colors.textSecondary }]}>{tab.label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.background },
  background: { position: 'absolute', top: FLOAT_OFFSET, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: FLOAT_OFFSET },
  tab: { flex: 1, minHeight: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 4 },
  centralTab: { marginTop: -FLOAT_OFFSET, minHeight: BAR_HEIGHT + FLOAT_OFFSET, justifyContent: 'flex-start', gap: 8 },
  icon: { height: 28, justifyContent: 'center' },
  circle: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#ff0404', alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  selectedCircle: { backgroundColor: '#fa0606' },
  label: { fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
