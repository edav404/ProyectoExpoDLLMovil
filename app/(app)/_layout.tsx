import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { colors } from '@/theme';

export default function AppTabs() {
  const { ready, user } = useApp();
  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!user) return <Redirect href="/" />;
  const admin = user.role === 'admin';
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: colors.surface },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="clients" options={{ title: 'Clientes', href: admin ? undefined : null, tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="products" options={{ title: admin ? 'Productos' : 'Catálogo', tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="sale" options={{ title: admin ? 'Vender' : 'Comprar', tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background } });

