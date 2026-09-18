import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radii, spacing } from '@/theme';
import { formatMoney } from '@/utils';

export default function DashboardScreen() {
  const { data, user } = useApp();
  if (!data || !user) return null;
  const isAdmin = user.role === 'admin';
  const visibleSales = isAdmin ? data.saleHeaders : data.saleHeaders.filter((sale) => sale.clientId === user.clientId);
  const revenue = visibleSales.reduce((sum, sale) => sum + sale.total, 0);
  const lowStock = data.products.filter((product) => product.stock <= 5).length;
  const clientRec = user.clientId ? data.clients.find((client) => client.id === user.clientId) : null;
  const name = clientRec?.firstName ?? (user.role === 'admin' ? 'Administrador' : undefined);
  return (
    <Screen>
      <Header eyebrow="VentaLocal" title={`Hola, ${name?.split(' ')[0] ?? 'de nuevo'}`} subtitle={isAdmin ? 'Este es el estado de tu negocio local.' : 'Consulta el catálogo y tus compras recientes.'} />
      <View style={styles.grid}>
        <Metric icon="receipt" label={isAdmin ? 'Ventas' : 'Mis compras'} value={`${visibleSales.length}`} />
        <Metric icon="cash" label="Total" value={formatMoney(revenue)} />
        {isAdmin ? <>
          <Metric icon="people" label="Clientes" value={`${data.clients.length}`} />
          <Metric icon="alert-circle" label="Stock bajo" value={`${lowStock}`} warning={lowStock > 0} />
        </> : null}
      </View>
      <Card>
        <Text style={styles.cardTitle}>{isAdmin ? 'Acción rápida' : '¿Qué quieres comprar?'}</Text>
        <Text style={styles.cardCopy}>{isAdmin ? 'Registra una venta y el inventario se actualizará automáticamente.' : 'Explora los productos disponibles y crea una compra sin conexión.'}</Text>
        <Button title={isAdmin ? 'Nueva venta' : 'Ir al catálogo'} onPress={() => router.push(isAdmin ? '/(app)/sale' : '/(app)/products')} icon={isAdmin ? 'add-circle-outline' : 'storefront-outline'} />
      </Card>
      {isAdmin && lowStock > 0 ? (
        <Card style={styles.warningCard}>
          <View style={styles.row}><Ionicons name="warning-outline" size={24} color={colors.warning} /><Text style={styles.warningTitle}>Revisa el inventario</Text></View>
          <Text style={styles.cardCopy}>{lowStock} producto(s) tienen 5 unidades o menos.</Text>
          <Button title="Ver productos" variant="ghost" onPress={() => router.push('/(app)/products')} />
        </Card>
      ) : null}
    </Screen>
  );
}

function Metric({ icon, label, value, warning }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; warning?: boolean }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, warning && styles.metricWarning]}><Ionicons name={icon} size={22} color={warning ? colors.warning : colors.primary} /></View>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', minHeight: 142, backgroundColor: colors.surface, borderRadius: radii.md, borderColor: colors.border, borderWidth: 1, padding: spacing.md, gap: 7 },
  metricIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  metricWarning: { backgroundColor: colors.warningSoft },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  metricLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardCopy: { color: colors.muted, lineHeight: 20 },
  warningCard: { borderColor: '#F2CF78' },
  warningTitle: { color: colors.warning, fontWeight: '800', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
