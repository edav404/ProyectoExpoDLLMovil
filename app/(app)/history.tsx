import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { SaleHeader } from '@/types';
import { clientLabel, formatDate, formatMoney } from '@/utils';
import { exportSalePdf } from '@/services/pdf';
import { router } from 'expo-router';

export default function HistoryScreen() {
  const { data, user } = useApp();
  const [selected, setSelected] = useState<SaleHeader | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  if (!data || !user) return null;
  const sales = data.saleHeaders
    .filter((sale) => user.role === 'admin' || sale.clientId === user.clientId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Screen>
      <Header eyebrow="Movimientos" title={user.role === 'admin' ? 'Historial de ventas' : 'Mis compras'} subtitle="Las ventas confirmadas son inmutables." action={<Button title="Reporte" icon="bar-chart-outline" onPress={() => router.push('/(app)/reports')} />} />
      {!sales.length ? <EmptyState icon="receipt-outline" title="Sin movimientos" message={user.role === 'admin' ? 'Todavía no hay ventas. Puedes registrar la primera desde aquí.' : 'Todavía no tienes compras. Puedes hacer la primera desde aquí.'} action={<Button title={user.role === 'admin' ? 'Registrar venta' : 'Hacer una compra'} icon="add-circle-outline" onPress={() => router.push('/(app)/sale')} />} /> : sales.map((sale) => {
        const client = data.clients.find((item) => item.id === sale.clientId);
        const count = data.saleDetails.filter((detail) => detail.headerId === sale.id).reduce((sum, detail) => sum + detail.quantity, 0);
        return (
          <Card key={sale.id}>
              <View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.name}>{client ? clientLabel(client) : 'Cliente'}</Text><Text style={styles.muted}>{formatDate(sale.date)} · {count} artículo(s)</Text></View><Text style={styles.total}>{formatMoney(sale.total)}</Text></View>
              <View style={styles.cardActions}><Button title="Ver detalle" variant="ghost" onPress={() => setSelected(sale)} /><Button title="PDF" icon="document-text-outline" variant="ghost" loading={exporting === sale.id} onPress={() => { setExporting(sale.id); void exportSalePdf(data, sale).then(() => Alert.alert('Comprobante listo', 'El PDF está disponible para guardar o compartir.')).catch((error) => Alert.alert('No se pudo exportar', error instanceof Error ? error.message : 'Intenta nuevamente.')).finally(() => setExporting(null)); }} /></View>
            </Card>
        );
      })}
      <SaleDetailModal sale={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

function SaleDetailModal({ sale, onClose }: { sale: SaleHeader | null; onClose: () => void }) {
  const { data } = useApp();
  if (!sale || !data) return null;
  const client = data.clients.find((item) => item.id === sale.clientId);
  const details = data.saleDetails.filter((item) => item.headerId === sale.id);
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen crumb={false}>
        <Header eyebrow="Comprobante local" title="Detalle de venta" subtitle={`Registrada el ${formatDate(sale.date)}`} />
        <Card><Text style={styles.label}>Cliente</Text><Text style={styles.name}>{client ? clientLabel(client) : 'No disponible'}</Text>{client && !client.isGuest ? <Text style={styles.muted}>{client.email}</Text> : null}</Card>
        <Card>
          <Text style={styles.label}>Productos</Text>
          {details.map((detail) => {
            const product = data.products.find((item) => item.id === detail.productId);
            return <View key={detail.id} style={styles.detailLine}><View style={styles.flex}><Text style={styles.name}>{product?.name ?? 'Producto'}</Text><Text style={styles.muted}>{detail.quantity} × {formatMoney(detail.subtotal / detail.quantity)}</Text></View><Text style={styles.price}>{formatMoney(detail.subtotal)}</Text></View>;
          })}
          <View style={styles.divider} /><View style={styles.rowBetween}><Text style={styles.totalLabel}>Total</Text><Text style={styles.bigTotal}>{formatMoney(sale.total)}</Text></View>
        </Card>
        <Text style={styles.id}>ID: {sale.id}</Text>
        <Button title="Cerrar" onPress={onClose} />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }, cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, name: { color: colors.text, fontWeight: '800', fontSize: 16 },
  muted: { color: colors.muted, marginTop: 3 }, total: { color: colors.primary, fontWeight: '900', fontSize: 17 }, link: { color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
  label: { color: colors.muted, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }, detailLine: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  price: { color: colors.text, fontWeight: '800' }, divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }, totalLabel: { color: colors.text, fontWeight: '900', fontSize: 18 }, bigTotal: { color: colors.primary, fontWeight: '900', fontSize: 22 }, id: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
