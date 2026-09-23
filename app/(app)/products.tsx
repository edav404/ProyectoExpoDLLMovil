import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Card, Chip, EmptyState, Field, Header, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { Product } from '@/types';
import { formatMoney } from '@/utils';

export default function ProductsScreen() {
  const { data, user, saveProduct, deleteProduct } = useApp();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  if (!data || !user) return null;
  const admin = user.role === 'admin';
  const filtered = data.products.filter((product) => `${product.name} ${product.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  const remove = (product: Product) => Alert.alert('Eliminar producto', `¿Quieres eliminar ${product.name}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void deleteProduct(product.id).catch((error) => Alert.alert('No se puede eliminar', error.message)) },
  ]);
  return (
    <Screen>
      <Header eyebrow={admin ? 'Inventario' : 'Tienda'} title={admin ? 'Productos' : 'Catálogo'} subtitle={admin ? `${data.products.length} producto(s) en el inventario.` : 'Productos disponibles para comprar sin conexión.'} />
      {admin ? <Button title="Nuevo producto" icon="add-circle-outline" onPress={() => setEditing(null)} /> : null}
      <Field label="Buscar productos" icon="search-outline" value={search} onChangeText={setSearch} placeholder="Nombre o descripción" returnKeyType="search" />
      {filtered.length ? <Text style={styles.results}>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</Text> : null}
      {!filtered.length ? <EmptyState icon="cube-outline" title={search ? 'Sin resultados' : 'No hay productos'} message={search ? 'Prueba con otro término de búsqueda.' : admin ? 'Agrega el primer producto al inventario.' : 'El catálogo estará disponible cuando se agreguen productos.'} /> : filtered.map((product) => (
        <Card key={product.id} style={product.stock === 0 ? styles.outOfStock : undefined}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}><Text style={styles.name}>{product.name}</Text><Text style={styles.price}>{formatMoney(product.unitPrice)}</Text></View>
            <Chip label={product.stock === 0 ? 'Agotado' : `${product.stock} disponibles`} tone={product.stock === 0 ? 'danger' : product.stock <= 5 ? 'warning' : 'success'} />
          </View>
          <Text style={styles.description}>{product.description}</Text>
          {admin ? <View style={styles.actions}>
            <IconButton icon="create-outline" label={`Editar ${product.name}`} onPress={() => setEditing(product)} />
            <IconButton icon="trash-outline" label={`Eliminar ${product.name}`} danger onPress={() => remove(product)} />
          </View> : null}
        </Card>
      ))}
      {admin && editing !== undefined ? <ProductModal product={editing} onClose={() => setEditing(undefined)} onSave={saveProduct} /> : null}
    </Screen>
  );
}

function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (input: { name: string; description: string; stock: number; unitPrice: number }, id?: string) => Promise<void> }) {
  const initial = useMemo(() => ({ name: product?.name ?? '', description: product?.description ?? '', stock: product ? String(product.stock) : '', price: product ? String(product.unitPrice) : '' }), [product]);
  const [name, setName] = useState(initial.name); const [description, setDescription] = useState(initial.description);
  const [stock, setStock] = useState(initial.stock); const [price, setPrice] = useState(initial.price); const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try { await onSave({ name, description, stock: Number(stock), unitPrice: Number(price) }, product?.id); onClose(); }
    catch (error) { Alert.alert('Revisa los datos', error instanceof Error ? error.message : 'No pudimos guardar el producto.'); }
    finally { setLoading(false); }
  };
  return (
    <BottomSheet visible title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
        <Text style={styles.sheetCopy}>El precio se registra en pesos colombianos.</Text>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Nombre del producto" />
        <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Describe el producto" multiline numberOfLines={4} />
        <Field label="Stock" value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" />
        <Field label="Precio por unidad (COP)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="number-pad" />
        <Button title="Guardar producto" onPress={submit} loading={loading} />
        <Button title="Cancelar" onPress={onClose} variant="ghost" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' }, price: { color: colors.primary, fontSize: 16, fontWeight: '800', marginTop: 4 },
  description: { color: colors.muted, lineHeight: 20 }, actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', paddingTop: spacing.xs },
  results: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: -spacing.sm }, outOfStock: { opacity: 0.76 }, sheetCopy: { color: colors.muted, lineHeight: 20, marginTop: -spacing.sm },
});
