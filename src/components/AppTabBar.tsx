import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, glass, radii, shadows, spacing } from '../theme';
import { primaryTabLabels, primaryTabs } from '../navigation';
import { GlassSurface } from './ui';

const icons: Record<(typeof primaryTabs)[number], keyof typeof Ionicons.glyphMap> = {
  dashboard: 'grid-outline', sale: 'cart-outline', products: 'cube-outline', more: 'ellipsis-horizontal-circle-outline',
};

type TabRoute = { key: string; name: string };
type AppTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  role: 'admin' | 'client';
};

export function AppTabBar({ state, navigation, role }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => primaryTabs.includes(route.name as (typeof primaryTabs)[number]));
  return <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
    <GlassSurface intensity={glass.intensityStrong} style={styles.bar}>
      {visibleRoutes.map((route) => {
        const index = state.routes.indexOf(route);
        const active = state.index === index;
        const tab = route.name as (typeof primaryTabs)[number];
        const label = primaryTabLabels[role][tab];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) { void Haptics.selectionAsync(); navigation.navigate(route.name); }
        };
        return <Pressable key={route.key} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress}
          style={({ pressed }) => [styles.item, active && styles.activeItem, pressed && styles.pressed]}>
          <View style={[styles.icon, active && styles.activeIcon]}><Ionicons name={icons[tab]} size={21} color={active ? colors.white : colors.muted} /></View>
          <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
        </Pressable>;
      })}
    </GlassSurface>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: 0 },
  bar: { minHeight: 70, borderRadius: radii.xl, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, borderWidth: 1, borderColor: glass.borderStrong, overflow: 'hidden', ...shadows.floating },
  item: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radii.md },
  activeItem: { backgroundColor: 'rgba(18,107,99,0.10)' }, icon: { width: 30, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm }, activeIcon: { backgroundColor: colors.primary },
  label: { fontSize: 11, color: colors.muted, fontWeight: '700' }, activeLabel: { color: colors.primaryDark, fontWeight: '900' }, pressed: { opacity: 0.74, transform: [{ scale: 0.97 }] },
});
