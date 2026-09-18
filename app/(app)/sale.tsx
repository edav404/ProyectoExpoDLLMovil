import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Header, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import { calculateCartTotal, formatMoney } from '@/utils';

export default function SaleScreen() {
  const { data, user, createSale } = useApp();
  const isAdmin = user?.role === 'admin';
  const [step, setStep] = useState(isAdmin ? 1 : 2);
  const [clientId, setClientId] = useState(user?.clientId ?? '');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  if (!data || !user) return null;

  // Verificar si el cliente tiene perfil completo antes de permitir compras
  if (!isAdmin) {
    const clientRecord = data.clients.find((c) => c.id === user.clientId);
    const profileIncomplete = !clientRecord?.firstName || !clientRecord?.lastName || !clientRecord?.birthDate;
    if (profileIncomplete) {
      return (
        <Screen>
          <Header
            eyebrow="Compra local"
            title="Completa tu perfil"
            subtitle="Antes de realizar compras, debes registrar tus datos personales."
          />
          <Card style={styles.blockedCard}>
            <Text style={styles.blockedTitle}>⚠️ Perfil incompleto</Text>
            <Text style={styles.blockedText}>
              Para poder comprar necesitas completar tu nombre, apellido y fecha de nacimiento en tu perfil.
            </Text>
          </Card>
          <Button title="Ir a mi perfil" icon="person-outline" onPress={() => router.replace('/(app)/profile')} />
        </Screen>
      );
    }
  }

  const lines = (Object.entries(quantities) as [string, number][])
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  const total = calculateCartTotal(data.products, lines);

  const changeQuantity = (productId: string, delta: number, max: number) =>
    setQuantities((current) => {
      const next = Math.max(0, Math.min(max, (current[productId] ?? 0) + delta));
      return { ...current, [productId]: next };
    });

  const finalize = async () => {
    setLoading(true);
    try {
      await createSale(clientId, lines);
      setQuantities({});
      setStep(isAdmin ? 1 : 2);
      Alert.alert(
        isAdmin ? 'Venta registrada' : 'Compra realizada',
        'El inventario se actualizó correctamente.',
        [{ text: 'Ver historial', onPress: () => router.replace('/(app)/history') }],
      );
    } catch (error) {
      Alert.alert('No pudimos registrar la operación', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setLoading(false); }
  };

  const confirm = () => Alert.alert(
    isAdmin ? 'Confirmar venta' : 'Confirmar compra',
    `Se registrará una ${isAdmin ? 'venta' : 'compra'} por ${formatMoney(total)}. Esta acción no se puede editar ni eliminar.`,
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => void finalize() }],
  );

  return (
    <Screen>
      <Header
        eyebrow={isAdmin ? 'Punto de venta' : 'Compra local'}
        title={isAdmin ? 'Nueva venta' : 'Nueva compra'}
        subtitle="Selecciona los productos y confirma el resumen."
      />
      <View style={styles.steps}>
        {isAdmin ? <Step number={1} label="Cliente" active={step === 1} done={step > 1} /> : null}
        <Step number={isAdmin ? 2 : 1} label="Productos" active={step === 2} done={step > 2} />
        <Step number={isAdmin ? 3 : 2} label="Confirmar" active={step === 3} done={false} />
      </View>

      {step === 1 ? <>
        {!data.clients.length
          ? <EmptyState icon="people-outline" title="Falta un cliente" message="Crea al menos un cliente antes de registrar una venta." />
          : data.clients.map((client) => {
            const fullName = client.firstName ? `${client.firstName} ${client.lastName}`.trim() : null;
            return (
              <Pressable key={client.id} accessibilityRole="radio" accessibilityState={{ checked: clientId === client.id }} onPress={() => setClientId(client.id)}>
                <Card style={clientId === client.id ? styles.selected : undefined}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.name}>{fullName ?? client.email}</Text>
                      {fullName ? <Text style={styles.muted}>{client.email}</Text> : null}
                    </View>
                    {clientId === client.id ? <Chip label="Seleccionado" tone="success" /> : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        <Button title="Continuar con productos" onPress={() => setStep(2)} disabled={!clientId} />
      </> : null}

      {step === 2 ? <>
        {!data.products.length
          ? <EmptyState icon="cube-outline" title="No hay productos" message={isAdmin ? 'Agrega productos al inventario antes de vender.' : 'El catálogo todavía está vacío.'} />
          : data.products.map((product) => {
            const quantity = quantities[product.id] ?? 0;
            return (
              <Card key={product.id} style={quantity > 0 ? styles.selected : undefined}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <Text style={styles.name}>{product.name}</Text>
                    {product.description ? <Text style={styles.muted}>{product.description}</Text> : null}
                    <Text style={styles.price}>{formatMoney(product.unitPrice)}</Text>
                  </View>
                  <Chip label={product.stock ? `Stock ${product.stock}` : 'Agotado'} tone={product.stock ? (product.stock <= 5 ? 'warning' : 'success') : 'danger'} />
                </View>
                <View style={styles.quantityRow}>
                  <IconButton icon="remove" label={`Quitar una unidad de ${product.name}`} disabled={quantity === 0} onPress={() => changeQuantity(product.id, -1, product.stock)} />
                  <Text accessibilityLabel={`${quantity} unidades`} style={styles.quantity}>{quantity}</Text>
                  <IconButton icon="add" label={`Agregar una unidad de ${product.name}`} disabled={product.stock === 0 || quantity >= product.stock} onPress={() => changeQuantity(product.id, 1, product.stock)} />
                  <Text style={styles.subtotal}>{formatMoney(quantity * product.unitPrice)}</Text>
                </View>
              </Card>
            );
          })}
        <View style={styles.footerActions}>
          {isAdmin ? <Button title="Volver" onPress={() => setStep(1)} variant="ghost" /> : null}
          <Button title={`Revisar · ${formatMoney(total)}`} onPress={() => setStep(3)} disabled={!lines.length} />
        </View>
      </> : null}

      {step === 3 ? <>
        <Card>
          <Text style={styles.sectionTitle}>Resumen</Text>
          {isAdmin ? <Text style={styles.muted}>
            Cliente: {(() => {
              const c = data.clients.find((client) => client.id === clientId);
              return c?.firstName ? `${c.firstName} ${c.lastName}`.trim() : c?.email;
            })()}
          </Text> : null}
          {lines.map((line) => {
            const product = data.products.find((item) => item.id === line.productId)!;
            return (
              <View key={line.productId} style={styles.summaryLine}>
                <Text style={styles.flex}>{product.name} × {line.quantity}</Text>
                <Text style={styles.summaryPrice}>{formatMoney(product.unitPrice * line.quantity)}</Text>
              </View>
            );
          })}
          <View style={styles.divider} />
          <View style={styles.summaryLine}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>{formatMoney(total)}</Text>
          </View>
        </Card>
        <Button title={isAdmin ? 'Confirmar venta' : 'Confirmar compra'} onPress={confirm} loading={loading} icon="checkmark-circle-outline" />
        <Button title="Editar productos" onPress={() => setStep(2)} variant="ghost" />
      </> : null}
    </Screen>
  );
}

function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepCircle, (active || done) && styles.stepCircleActive]}>
        <Text style={[styles.stepNumber, (active || done) && styles.stepNumberActive]}>{done ? '✓' : number}</Text>
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.sm },
  step: { alignItems: 'center', gap: 4 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: colors.primary },
  stepNumber: { color: colors.muted, fontWeight: '800' },
  stepNumberActive: { color: colors.white },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  stepLabelActive: { color: colors.primary },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  muted: { color: colors.muted, marginTop: 3 },
  price: { color: colors.primary, fontWeight: '800', marginTop: 3 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quantity: { minWidth: 30, textAlign: 'center', color: colors.text, fontWeight: '900', fontSize: 18 },
  subtotal: { flex: 1, textAlign: 'right', color: colors.text, fontWeight: '800' },
  footerActions: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 5 },
  summaryPrice: { color: colors.text, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalLabel: { color: colors.text, fontSize: 18, fontWeight: '900' },
  total: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  blockedCard: { backgroundColor: colors.warningSoft, borderColor: colors.warning, borderWidth: 1 },
  blockedTitle: { color: colors.warning, fontWeight: '800', fontSize: 16, marginBottom: spacing.xs },
  blockedText: { color: colors.warning, lineHeight: 22 },
});
