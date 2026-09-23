import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radii, spacing } from '@/theme';

type MoreItem = { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; route: '/(app)/clients' | '/(app)/users' | '/(app)/history' | '/(app)/profile' | '/(app)/reports' | '/(app)/expenses'; badge?: string };

export default function MoreScreen() {
  const { data, user } = useApp();
  if (!data || !user) return null;
  const pending = data.users.filter((item) => item.status === 'pending').length;
  const adminItems: MoreItem[] = [
    { title: 'Clientes', subtitle: `${data.clients.length} registros`, icon: 'people-outline', route: '/(app)/clients' },
    { title: 'Usuarios', subtitle: 'Solicitudes y permisos', icon: 'shield-checkmark-outline', route: '/(app)/users', badge: pending ? `${pending}` : undefined },
    { title: 'Historial', subtitle: `${data.saleHeaders.length} movimientos`, icon: 'receipt-outline', route: '/(app)/history' },
    { title: 'Reportes', subtitle: 'Ingresos, egresos y utilidad', icon: 'bar-chart-outline', route: '/(app)/reports' },
    { title: 'Egresos', subtitle: `${data.expenses.length} registros`, icon: 'trending-down-outline', route: '/(app)/expenses' },
    { title: 'Perfil', subtitle: 'Cuenta y datos locales', icon: 'person-circle-outline', route: '/(app)/profile' },
  ];
  const clientItems: MoreItem[] = [
    { title: 'Mis compras', subtitle: 'Consulta tus movimientos', icon: 'receipt-outline', route: '/(app)/history' },
    { title: 'Mi perfil', subtitle: 'Datos y sesión', icon: 'person-circle-outline', route: '/(app)/profile' },
  ];
  const items = user.role === 'admin' ? adminItems : clientItems;
  return <Screen>
    <Header eyebrow="Navegación" title="Más opciones" subtitle="Accesos secundarios organizados para mantener tu barra principal despejada." />
    <Card glass style={styles.account}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{user.email.charAt(0).toUpperCase()}</Text></View>
      <View style={styles.flex}><Text style={styles.accountTitle}>{user.role === 'admin' ? 'Administrador' : 'Cliente'}</Text><Text style={styles.accountEmail}>{user.email}</Text></View>
      <Chip label={user.role === 'admin' ? 'Admin' : 'Activo'} tone={user.role === 'admin' ? 'warning' : 'success'} />
    </Card>
    <Text style={styles.sectionTitle}>{user.role === 'admin' ? 'Administración' : 'Cuenta'}</Text>
    <View style={styles.grid}>{items.map((item) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push(item.route)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <View style={styles.itemIcon}><Ionicons name={item.icon} size={23} color={colors.primary} /></View>
      <View style={styles.flex}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemSubtitle}>{item.subtitle}</Text></View>
      {item.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>)}</View>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, account: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, avatar: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, avatarText: { color: colors.white, fontSize: 19, fontWeight: '900' }, accountTitle: { color: colors.text, fontWeight: '900', fontSize: 16 }, accountEmail: { color: colors.muted, marginTop: 2, fontSize: 13 }, sectionTitle: { color: colors.muted, fontWeight: '900', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.sm }, grid: { gap: spacing.sm }, item: { minHeight: 76, padding: spacing.md, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, itemIcon: { width: 42, height: 42, borderRadius: radii.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, itemTitle: { color: colors.text, fontWeight: '900', fontSize: 16 }, itemSubtitle: { color: colors.muted, marginTop: 2, fontSize: 13 }, badge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warning }, badgeText: { color: colors.white, fontWeight: '900', fontSize: 12 }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
