import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radii, spacing } from '@/theme';
import { formatMoney } from '@/utils';

export default function DashboardScreen() {
  const { data, user } = useApp();
  if (!data || !user) return null;
  const isAdmin = user.role === 'admin';
  const sales = isAdmin ? data.saleHeaders : data.saleHeaders.filter((item) => item.clientId === user.clientId);
  const total = sales.reduce((sum, item) => sum + item.total, 0);
  const lowStock = data.products.filter((item) => item.stock <= 5).length;
  const client = data.clients.find((item) => item.id === user.clientId);
  const name = client?.firstName || (isAdmin ? 'Administrador' : 'de nuevo');
  return <Screen>
    <Header eyebrow="VentaLocal" title={`Hola, ${name}`} subtitle={isAdmin ? 'Controla lo esencial de tu negocio desde un solo lugar.' : 'Explora productos y lleva el control de tus compras.'} />
    <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroTop}><View><Text style={styles.heroEyebrow}>{isAdmin ? 'RESUMEN DE VENTAS' : 'MIS COMPRAS'}</Text><Text style={styles.heroTotal}>{formatMoney(total)}</Text></View><View style={styles.heroIcon}><Ionicons name="trending-up-outline" size={25} color={colors.white} /></View></View>
      <View style={styles.heroFooter}><Text style={styles.heroCopy}>{sales.length} {sales.length === 1 ? 'movimiento registrado' : 'movimientos registrados'}</Text><Chip label="Sin conexión" tone="success" /></View>
    </LinearGradient>
    <View style={styles.metrics}>
      <Metric icon="receipt-outline" label={isAdmin ? 'Ventas' : 'Compras'} value={`${sales.length}`} />
      {isAdmin ? <Metric icon="people-outline" label="Clientes" value={`${data.clients.length}`} /> : <Metric icon="cube-outline" label="Disponibles" value={`${data.products.filter((item) => item.stock > 0).length}`} />}
      {isAdmin ? <Metric icon="alert-circle-outline" label="Stock bajo" value={`${lowStock}`} warning={lowStock > 0} /> : null}
    </View>
    <Card glass style={styles.actionCard}>
      <View style={styles.actionIcon}><Ionicons name={isAdmin ? 'add-circle-outline' : 'cart-outline'} size={25} color={colors.primary} /></View>
      <View style={styles.flex}><Text style={styles.actionTitle}>{isAdmin ? 'Registra una venta' : 'Haz una compra'}</Text><Text style={styles.actionCopy}>{isAdmin ? 'El stock se actualizará al confirmar.' : 'Selecciona productos disponibles y cantidades.'}</Text></View>
      <Button title={isAdmin ? 'Vender' : 'Comprar'} icon="arrow-forward" onPress={() => router.push('/(app)/sale')} />
    </Card>
    {isAdmin && lowStock > 0 ? <Card style={styles.alert}>
      <View style={styles.alertRow}><Ionicons name="warning-outline" size={21} color={colors.warning} /><View style={styles.flex}><Text style={styles.alertTitle}>Inventario por revisar</Text><Text style={styles.alertCopy}>{lowStock} producto(s) tienen cinco unidades o menos.</Text></View></View>
      <Button title="Ver inventario" variant="ghost" onPress={() => router.push('/(app)/products')} />
    </Card> : null}
  </Screen>;
}

function Metric({ icon, label, value, warning }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; warning?: boolean }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, warning && styles.metricWarning]}><Ionicons name={icon} size={20} color={warning ? colors.warning : colors.primary} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { borderRadius: radii.xl, padding: spacing.lg, gap: spacing.lg }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, heroEyebrow: { color: 'rgba(255,255,255,0.76)', fontWeight: '900', fontSize: 11, letterSpacing: 1 }, heroTotal: { color: colors.white, fontWeight: '900', fontSize: 30, marginTop: spacing.xs }, heroIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }, heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroCopy: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, metric: { minWidth: '30%', flexGrow: 1, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.xs }, metricIcon: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, metricWarning: { backgroundColor: colors.warningSoft }, metricValue: { color: colors.text, fontWeight: '900', fontSize: 20 }, metricLabel: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, actionIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, actionTitle: { color: colors.text, fontWeight: '900', fontSize: 16 }, actionCopy: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 }, alert: { backgroundColor: colors.warningSoft, borderColor: '#F3D69B' }, alertRow: { flexDirection: 'row', gap: spacing.sm }, alertTitle: { color: colors.warning, fontWeight: '900' }, alertCopy: { color: colors.warning, marginTop: 2, fontSize: 13 },
});
