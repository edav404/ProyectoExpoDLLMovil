import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Card, Chip, EmptyState, Field, Header, IconButton, Notice, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { CartLine } from '@/types';
import { calculateCartTotal, clientLabel, filterProducts, formatDate, formatMoney, validateClient } from '@/utils';

type SaleStep = 'products' | 'client' | 'summary' | 'done';
type ClientMode = 'existing' | 'new' | 'guest';

interface ReceiptLine { name: string; quantity: number; subtotal: number }
interface Receipt { id: string; clientName: string; date: string; lines: ReceiptLine[]; total: number }

export default function SaleScreen() {
  const { data, user, createSale, saveClient, saveProduct } = useApp();
  const isAdmin = user?.role === 'admin';
  const [step, setStep] = useState<SaleStep>('products');
  const [clientId, setClientId] = useState(user?.clientId ?? '');
  const [clientMode, setClientMode] = useState<ClientMode>('existing');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [draft, setDraft] = useState({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [productDraft, setProductDraft] = useState({ name: '', description: '', stock: '', price: '' });
  const [productError, setProductError] = useState<string | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  if (!data || !user) return null;

  if (!isAdmin) {
    const clientRecord = data.clients.find((client) => client.id === user.clientId);
    const profileIncomplete = !clientRecord?.firstName || !clientRecord?.lastName || !clientRecord?.birthDate;
    if (profileIncomplete) {
      return (
        <Screen>
          <Header compact eyebrow="Compra" title="Completa tu perfil" subtitle="Hace falta tu nombre y apellido para poder comprar." />
          <Notice tone="warning" message="No puedes confirmar una compra hasta registrar tu nombre, apellido y fecha de nacimiento." />
          <Button title="Ir a mi perfil" icon="person-outline" onPress={() => router.push('/(app)/profile')} />
        </Screen>
      );
    }
  }

  const today = new Date().toISOString();
  const lines: CartLine[] = (Object.entries(quantities) as [string, number][])
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  const total = calculateCartTotal(data.products, lines);
  const selectedClient = data.clients.find((client) => client.id === clientId) ?? null;
  const registeredClients = data.clients.filter((client) => !client.isGuest);
  const guest = data.clients.find((client) => client.isGuest);
  const visibleProducts = filterProducts(data.products, search, tagIds);
  const overStock = lines.some((line) => {
    const product = data.products.find((item) => item.id === line.productId);
    return !product || line.quantity > product.stock;
  });
  const steps: SaleStep[] = isAdmin ? ['products', 'client', 'summary'] : ['products', 'summary'];

  const changeQuantity = (productId: string, delta: number, max: number) => {
    setError(null);
    setQuantities((current) => ({ ...current, [productId]: Math.max(0, Math.min(max, (current[productId] ?? 0) + delta)) }));
  };

  const goTo = (next: SaleStep) => { setError(null); setStep(next); };

  const continueFromProducts = () => {
    if (!lines.length) return setError('Agrega al menos un producto para continuar.');
    if (overStock) return setError('Hay una cantidad mayor al stock disponible.');
    goTo(isAdmin ? 'client' : 'summary');
  };

  const continueFromClient = async () => {
    if (clientMode === 'guest') {
      if (!guest) return setError('El cliente invitado no está disponible.');
      setClientId(guest.id);
      goTo('summary');
      return;
    }
    if (clientMode === 'existing') {
      if (!clientId || selectedClient?.isGuest) return setError('Selecciona un cliente, crea uno nuevo o continúa como invitado.');
      goTo('summary');
      return;
    }
    try { validateClient({ ...draft, birthDate: '' }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Revisa los datos del cliente.'); return; }
    setLoading(true);
    try {
      const created = await saveClient({ ...draft, birthDate: '' });
      setClientId(created.id);
      setDraft({ firstName: '', lastName: '', email: '' });
      setClientMode('existing');
      goTo('summary');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos crear el cliente.');
    } finally { setLoading(false); }
  };

  const confirm = async () => {
    if (!lines.length) return setError('Agrega al menos un producto para continuar.');
    if (overStock) return setError('Hay una cantidad mayor al stock disponible.');
    if (!selectedClient) return setError('Selecciona un cliente antes de confirmar.');
    setLoading(true);
    setError(null);
    const snapshot: ReceiptLine[] = lines.map((line) => {
      const product = data.products.find((item) => item.id === line.productId);
      return { name: product?.name ?? 'Producto', quantity: line.quantity, subtotal: (product?.unitPrice ?? 0) * line.quantity };
    });
    try {
      const saleId = await createSale(clientId, lines);
      setReceipt({ id: saleId, clientName: clientLabel(selectedClient), date: new Date().toISOString(), lines: snapshot, total });
      setQuantities({});
      setStep('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos registrar la venta.');
    } finally { setLoading(false); }
  };

  const createProduct = async () => {
    setProductLoading(true);
    setProductError(null);
    try {
      const created = await saveProduct({
        name: productDraft.name,
        description: productDraft.description,
        stock: Number(productDraft.stock),
        unitPrice: Number(productDraft.price),
        tagIds: [],
      });
      if (created.stock > 0) setQuantities((current) => ({ ...current, [created.id]: 1 }));
      setProductDraft({ name: '', description: '', stock: '', price: '' });
      setProductOpen(false);
    } catch (caught) {
      setProductError(caught instanceof Error ? caught.message : 'No pudimos crear el producto.');
    } finally { setProductLoading(false); }
  };

  const startAgain = () => {
    setReceipt(null);
    setError(null);
    setQuantities({});
    setSearch('');
    setTagIds([]);
    if (isAdmin) setClientId('');
    setClientMode('existing');
    setStep('products');
  };

  const primary = step === 'products'
    ? { title: isAdmin ? 'Elegir cliente' : 'Revisar resumen', onPress: continueFromProducts, disabled: !lines.length || overStock }
    : step === 'client'
      ? { title: clientMode === 'new' ? 'Guardar cliente y continuar' : 'Revisar resumen', onPress: () => void continueFromClient(), disabled: (clientMode === 'existing' && (!clientId || !!selectedClient?.isGuest)) || (clientMode === 'new' && (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim())) }
      : { title: isAdmin ? 'Confirmar venta' : 'Confirmar compra', onPress: () => void confirm(), disabled: !lines.length || overStock || !selectedClient };

  if (step === 'done' && receipt) {
    return (
      <Screen>
        <Header compact eyebrow="Listo" title="Venta registrada" subtitle="El inventario ya se actualizó." />
        <Notice tone="success" message="La venta quedó confirmada. Este comprobante no se puede editar." />
        <Card>
          <Text style={styles.metaLabel}>Cliente</Text>
          <Text style={styles.name}>{receipt.clientName}</Text>
          <Text style={styles.muted}>{formatDate(receipt.date)}</Text>
          <View style={styles.divider} />
          {receipt.lines.map((line) => (
            <View key={`${line.name}-${line.quantity}`} style={styles.summaryLine}>
              <Text style={styles.flex}>{line.name} × {line.quantity}</Text>
              <Text style={styles.summaryPrice}>{formatMoney(line.subtotal)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryLine}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>{formatMoney(receipt.total)}</Text>
          </View>
        </Card>
        <Button title={isAdmin ? 'Nueva venta' : 'Nueva compra'} icon="add-circle-outline" onPress={startAgain} />
        <Button title="Ver historial" variant="ghost" onPress={() => router.push('/(app)/history')} />
      </Screen>
    );
  }

  return (
    <Screen footer={(
      <View style={styles.footerInner}>
        <View>
          <Text style={styles.footerMeta}>{clientLabel(step === 'client' && clientMode === 'guest' ? guest : selectedClient)} · {formatDate(today)}</Text>
          <Text style={styles.footerTotal}>{formatMoney(total)}</Text>
        </View>
        {error ? <Notice tone="error" message={error} /> : null}
        <Button title={primary.title} onPress={primary.onPress} disabled={primary.disabled} loading={loading} icon={step === 'summary' ? 'checkmark-circle-outline' : 'arrow-forward'} />
      </View>
    )}>
      <Header compact eyebrow={isAdmin ? 'Punto de venta' : 'Compra'} title={step === 'products' ? 'Productos' : step === 'client' ? 'Cliente' : 'Resumen'} subtitle="Puedes volver atrás sin perder lo que ya elegiste." />
      <View style={styles.steps}>
        {steps.map((item, index) => {
          const current = steps.indexOf(step);
          return <Step key={item} number={index + 1} label={item === 'products' ? 'Productos' : item === 'client' ? 'Cliente' : 'Resumen'} active={step === item} done={current > index} />;
        })}
      </View>

      {step === 'products' ? (
        <>
          {isAdmin ? <Button title="Crear producto" variant="secondary" icon="add-circle-outline" onPress={() => { setProductError(null); setProductOpen(true); }} /> : null}
          {!data.products.length ? <EmptyState icon="cube-outline" title="No hay productos" message={isAdmin ? 'Créalo aquí y quedará incluido en esta venta.' : 'El catálogo todavía está vacío.'} /> : (
            <>
              <Field label="Buscar" icon="search-outline" value={search} onChangeText={setSearch} placeholder="Nombre o descripción" />
              {data.tags.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
                  {data.tags.map((tag) => (
                    <Chip key={tag.id} label={tag.name} selected={tagIds.includes(tag.id)} onPress={() => setTagIds((current) => current.includes(tag.id) ? current.filter((item) => item !== tag.id) : [...current, tag.id])} />
                  ))}
                </ScrollView>
              ) : null}
              {!visibleProducts.length ? <EmptyState icon="search-outline" title="Sin resultados" message="Prueba con otro nombre o quita alguna etiqueta." /> : visibleProducts.map((product) => {
                const quantity = quantities[product.id] ?? 0;
                const tags = data.tags.filter((tag) => product.tagIds?.includes(tag.id));
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
                    {tags.length ? <View style={styles.tagWrap}>{tags.map((tag) => <Chip key={tag.id} label={tag.name} />)}</View> : null}
                    <View style={styles.quantityRow}>
                      <IconButton icon="remove" label={`Quitar una unidad de ${product.name}`} disabled={quantity === 0} onPress={() => changeQuantity(product.id, -1, product.stock)} />
                      <Text accessibilityLabel={`${quantity} unidades`} style={styles.quantity}>{quantity}</Text>
                      <IconButton icon="add" label={`Agregar una unidad de ${product.name}`} disabled={product.stock === 0 || quantity >= product.stock} onPress={() => changeQuantity(product.id, 1, product.stock)} />
                      <Text style={styles.subtotal}>{formatMoney(quantity * product.unitPrice)}</Text>
                    </View>
                  </Card>
                );
              })}
            </>
          )}
          {isAdmin ? (
            <BottomSheet visible={productOpen} title="Nuevo producto" onClose={() => setProductOpen(false)}>
              <Text style={styles.muted}>Se guarda en el inventario y, si tiene stock, entra en esta venta.</Text>
              <Field label="Nombre" value={productDraft.name} onChangeText={(name) => setProductDraft((current) => ({ ...current, name }))} placeholder="Nombre del producto" />
              <Field label="Descripción" value={productDraft.description} onChangeText={(description) => setProductDraft((current) => ({ ...current, description }))} placeholder="Describe el producto" />
              <Field label="Stock" value={productDraft.stock} onChangeText={(stock) => setProductDraft((current) => ({ ...current, stock }))} placeholder="0" keyboardType="number-pad" />
              <Field label="Precio por unidad (COP)" value={productDraft.price} onChangeText={(price) => setProductDraft((current) => ({ ...current, price }))} placeholder="0" keyboardType="number-pad" />
              {productError ? <Notice tone="error" message={productError} /> : null}
              <Button title="Guardar y agregar" onPress={() => void createProduct()} loading={productLoading} disabled={!productDraft.name.trim() || !productDraft.description.trim() || productDraft.stock === '' || productDraft.price === ''} />
            </BottomSheet>
          ) : null}
        </>
      ) : null}

      {step === 'client' ? (
        <>
          <SelectionSummary lines={lines} products={data.products} />
          <View style={styles.choiceRow}>
            {(['existing', 'new', 'guest'] as ClientMode[]).map((mode) => (
              <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: clientMode === mode }} onPress={() => { setError(null); setClientMode(mode); if (mode !== 'existing') setClientId(''); }} style={[styles.choice, clientMode === mode && styles.choiceActive]}>
                <Text style={[styles.choiceText, clientMode === mode && styles.choiceTextActive]}>{mode === 'existing' ? 'Existente' : mode === 'new' ? 'Nuevo' : 'Invitado'}</Text>
              </Pressable>
            ))}
          </View>
          {clientMode === 'existing' ? (
            !registeredClients.length
              ? <EmptyState icon="people-outline" title="No hay clientes registrados" message="Crea uno nuevo o continúa como cliente invitado." />
              : registeredClients.map((client) => (
                <Pressable key={client.id} accessibilityRole="radio" accessibilityState={{ checked: clientId === client.id }} onPress={() => { setError(null); setClientId(client.id); }}>
                  <Card style={clientId === client.id ? styles.selected : undefined}>
                    <View style={styles.rowBetween}>
                      <View style={styles.flex}>
                        <Text style={styles.name}>{clientLabel(client)}</Text>
                        <Text style={styles.muted}>{client.email}</Text>
                      </View>
                      {clientId === client.id ? <Chip label="Seleccionado" tone="success" /> : null}
                    </View>
                  </Card>
                </Pressable>
              ))
          ) : null}
          {clientMode === 'new' ? (
            <Card>
              <Field label="Nombre" value={draft.firstName} onChangeText={(firstName) => setDraft((current) => ({ ...current, firstName }))} placeholder="Nombre" autoCapitalize="words" />
              <Field label="Apellido" value={draft.lastName} onChangeText={(lastName) => setDraft((current) => ({ ...current, lastName }))} placeholder="Apellido" autoCapitalize="words" />
              <Field label="Correo" value={draft.email} onChangeText={(email) => setDraft((current) => ({ ...current, email }))} placeholder="cliente@correo.com" keyboardType="email-address" autoCapitalize="none" />
            </Card>
          ) : null}
          {clientMode === 'guest' ? <Notice tone="info" message="La venta quedará a nombre de Cliente invitado. Podrás cambiarlo antes de confirmar." /> : null}
          <Button title="Volver a productos" variant="ghost" onPress={() => goTo('products')} />
        </>
      ) : null}

      {step === 'summary' ? (
        <>
          {error ? null : overStock ? <Notice tone="error" message="Hay una cantidad mayor al stock disponible." /> : null}
          <Card>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.metaLabel}>Cliente</Text>
                <Text style={styles.name}>{clientLabel(selectedClient)}</Text>
                <Text style={styles.muted}>{formatDate(today)}</Text>
              </View>
              {isAdmin ? <Button title="Cambiar" variant="ghost" onPress={() => goTo('client')} /> : null}
            </View>
          </Card>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Productos</Text>
              <Button title="Editar" variant="ghost" onPress={() => goTo('products')} />
            </View>
            {lines.map((line) => {
              const product = data.products.find((item) => item.id === line.productId);
              return (
                <View key={line.productId} style={styles.summaryLine}>
                  <Text style={styles.flex}>{product?.name ?? 'Producto'} × {line.quantity}</Text>
                  <Text style={styles.summaryPrice}>{formatMoney((product?.unitPrice ?? 0) * line.quantity)}</Text>
                </View>
              );
            })}
            <View style={styles.divider} />
            <View style={styles.summaryLine}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.total}>{formatMoney(total)}</Text>
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function SelectionSummary({ lines, products }: { lines: CartLine[]; products: { id: string; name: string; unitPrice: number }[] }) {
  if (!lines.length) return null;
  return (
    <Card>
      <Text style={styles.sectionTitle}>Selección</Text>
      {lines.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        return (
          <View key={line.productId} style={styles.summaryLine}>
            <Text style={styles.flex}>{product?.name ?? 'Producto'} × {line.quantity}</Text>
            <Text style={styles.summaryPrice}>{formatMoney((product?.unitPrice ?? 0) * line.quantity)}</Text>
          </View>
        );
      })}
    </Card>
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
  steps: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  step: { alignItems: 'center', gap: 4, minWidth: 72 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: colors.primary },
  stepNumber: { color: colors.muted, fontWeight: '800' },
  stepNumberActive: { color: colors.white },
  stepLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  stepLabelActive: { color: colors.primary },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  muted: { color: colors.muted, marginTop: 3 },
  price: { color: colors.primary, fontWeight: '800', marginTop: 3 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quantity: { minWidth: 30, textAlign: 'center', color: colors.text, fontWeight: '900', fontSize: 18 },
  subtotal: { flex: 1, textAlign: 'right', color: colors.text, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 5 },
  summaryPrice: { color: colors.text, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalLabel: { color: colors.text, fontSize: 18, fontWeight: '900' },
  total: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  metaLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  tagRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  choiceActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  choiceText: { color: colors.muted, fontWeight: '800' },
  choiceTextActive: { color: colors.primaryDark },
  footerInner: { gap: spacing.sm },
  footerMeta: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  footerTotal: { color: colors.text, fontSize: 20, fontWeight: '900' },
});
