import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppTabBar } from '@/components/AppTabBar';
import { Skeleton } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme';

export default function AppTabs() {
  const { ready, user } = useApp();
  if (!ready) return <View style={styles.loading}><Skeleton width="44%" height={24} /><Skeleton height={148} /><Skeleton height={84} /><Skeleton height={84} /></View>;
  if (!user) return <Redirect href="/" />;
  const admin = user.role === 'admin';
  return <Tabs screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: colors.background } }} tabBar={(props) => <AppTabBar {...props} role={user.role} />}>
    <Tabs.Screen name="dashboard" options={{ title: 'Inicio' }} />
    <Tabs.Screen name="sale" options={{ title: admin ? 'Vender' : 'Comprar' }} />
    <Tabs.Screen name="products" options={{ title: admin ? 'Productos' : 'Catálogo' }} />
    <Tabs.Screen name="more" options={{ title: 'Más' }} />
    <Tabs.Screen name="users" options={{ href: null }} />
    <Tabs.Screen name="clients" options={{ href: null }} />
    <Tabs.Screen name="history" options={{ href: null }} />
    <Tabs.Screen name="profile" options={{ href: null }} />
    <Tabs.Screen name="reports" options={{ href: null }} />
    <Tabs.Screen name="expenses" options={{ href: null }} />
  </Tabs>;
}

const styles = StyleSheet.create({ loading: { flex: 1, gap: 16, padding: 20, justifyContent: 'center', backgroundColor: colors.background } });
