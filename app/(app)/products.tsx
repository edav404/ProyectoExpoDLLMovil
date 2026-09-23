import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Card, Chip, EmptyState, Field, Header, IconButton, Notice, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { Product, Tag } from '@/types';
import { filterProducts, formatMoney } from '@/utils';

export default function ProductsScreen() {
  const { data, user, saveProduct, deleteProduct } = useApp();
  const [search, setSearch] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  if (!data || !user) return null;
  const admin = user.role === 'admin';
  const filtered = filterProducts(data.products, search, tagIds);
  const filtersActive = search.trim().length > 0 || tagIds.length > 0;
  const remove = (product: Product) => Alert.alert('Eliminar producto', `¿Quieres eliminar ${product.name}? Las etiquetas del catálogo se conservan.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void deleteProduct(product.id).catch((error) => Alert.alert('No se puede eliminar', error.message)) },
  ]);
  return (
    <Screen>
      <Header eyebrow={admin ? 'Inventario' : 'Tienda'} title={admin ? 'Productos' : 'Catálogo'} subtitle={admin ? `${data.products.length} producto(s) en el inventario.` : 'Productos disponibles para comprar sin conexión.'} />
      {admin ? <Button title="Nuevo producto" icon="add-circle-outline" onPress={() => setEditing(null)} /> : null}
      <Field label="Buscar productos" icon="search-outline" value={search} onChangeText={setSearch} placeholder="Nombre o descripción" returnKeyType="search" />
      {data.tags.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
          {data.tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} selected={tagIds.includes(tag.id)} onPress={() => setTagIds((current) => current.includes(tag.id) ? current.filter((item) => item !== tag.id) : [...current, tag.id])} />
          ))}
        </ScrollView>
      ) : null}
      {filtered.length ? <Text style={styles.results}>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</Text> : null}
      {!filtered.length ? <EmptyState icon="cube-outline" title={filtersActive ? 'Sin resultados' : 'No hay productos'} message={filtersActive ? 'Ningún producto coincide con la búsqueda o las etiquetas.' : admin ? 'Agrega el primer producto al inventario.' : 'El catálogo estará disponible cuando se agreguen productos.'} /> : filtered.map((product) => {
        const tags = data.tags.filter((tag) => product.tagIds?.includes(tag.id));
        return (
          <Card key={product.id} style={product.stock === 0 ? styles.outOfStock : undefined}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}><Text style={styles.name}>{product.name}</Text><Text style={styles.price}>{formatMoney(product.unitPrice)}</Text></View>
              <Chip label={product.stock === 0 ? 'Agotado' : `${product.stock} disponibles`} tone={product.stock === 0 ? 'danger' : product.stock <= 5 ? 'warning' : 'success'} />
            </View>
            <Text style={styles.description}>{product.description}</Text>
            {tags.length ? <View style={styles.tagWrap}>{tags.map((tag) => <Chip key={tag.id} label={tag.name} />)}</View> : null}
            {admin ? <View style={styles.actions}>
              <IconButton icon="create-outline" label={`Editar ${product.name}`} onPress={() => setEditing(product)} />
              <IconButton icon="trash-outline" label={`Eliminar ${product.name}`} danger onPress={() => remove(product)} />
            </View> : null}
          </Card>
        );
      })}
      {admin && editing !== undefined ? <ProductModal product={editing} tags={data.tags} onClose={() => setEditing(undefined)} onSave={saveProduct} /> : null}
    </Screen>
  );
}

function ProductModal({ product, tags, onClose, onSave }: {
  product: Product | null;
  tags: Tag[];
  onClose: () => void;
  onSave: (input: { name: string; description: string; stock: number; unitPrice: number; tagIds: string[] }, id?: string) => Promise<Product>;
}) {
  const { saveTag, deleteTag } = useApp();
  const initial = useMemo(() => ({ name: product?.name ?? '', description: product?.description ?? '', stock: product ? String(product.stock) : '', price: product ? String(product.unitPrice) : '', tagIds: product?.tagIds ?? [] }), [product]);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [stock, setStock] = useState(initial.stock);
  const [price, setPrice] = useState(initial.price);
  const [selected, setSelected] = useState<string[]>(initial.tagIds);
  const [tagName, setTagName] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    try { await onSave({ name, description, stock: Number(stock), unitPrice: Number(price), tagIds: selected }, product?.id); onClose(); }
    catch (error) { Alert.alert('Revisa los datos', error instanceof Error ? error.message : 'No pudimos guardar el producto.'); }
    finally { setLoading(false); }
  };

  const createTag = async () => {
    setTagError(null);
    try {
      const created = await saveTag(tagName);
      setSelected((current) => current.includes(created.id) ? current : [...current, created.id]);
      setTagName('');
    } catch (error) {
      setTagError(error instanceof Error ? error.message : 'No pudimos crear la etiqueta.');
    }
  };

  const renameTag = async (tag: Tag) => {
    setTagError(null);
    try {
      await saveTag(editingName, tag.id);
      setEditingTag(null);
    } catch (error) {
      setTagError(error instanceof Error ? error.message : 'No pudimos renombrar la etiqueta.');
    }
  };

  const removeTag = (tag: Tag) => Alert.alert('Eliminar etiqueta', `Se quitará "${tag.name}" de todos los productos. El stock, los precios y las ventas no cambian.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void deleteTag(tag.id).then(() => setSelected((current) => current.filter((id) => id !== tag.id))).catch((error) => setTagError(error instanceof Error ? error.message : 'No pudimos eliminar la etiqueta.')) },
  ]);

  return (
    <BottomSheet visible title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <Text style={styles.sheetCopy}>El precio se registra en pesos colombianos. Las etiquetas se reutilizan en el catálogo.</Text>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Nombre del producto" />
      <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Describe el producto" multiline numberOfLines={4} />
      <Field label="Stock" value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" />
      <Field label="Precio por unidad (COP)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="number-pad" />
      <Text style={styles.section}>Etiquetas</Text>
      {tags.length ? <View style={styles.tagWrap}>{tags.map((tag) => <Chip key={tag.id} label={tag.name} selected={selected.includes(tag.id)} onPress={() => setSelected((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])} />)}</View> : <Text style={styles.sheetCopy}>Todavía no hay etiquetas. Crea la primera para este producto.</Text>}
      {tags.map((tag) => (
        <View key={tag.id} style={styles.tagEditor}>
          {editingTag === tag.id ? (
            <>
              <View style={styles.flex}><Field label={`Editar ${tag.name}`} value={editingName} onChangeText={setEditingName} /></View>
              <IconButton icon="checkmark" label={`Guardar ${tag.name}`} onPress={() => void renameTag(tag)} />
            </>
          ) : (
            <>
              <Text style={styles.tagName}>{tag.name}</Text>
              <IconButton icon="create-outline" label={`Renombrar ${tag.name}`} onPress={() => { setEditingTag(tag.id); setEditingName(tag.name); }} />
              <IconButton icon="trash-outline" label={`Eliminar etiqueta ${tag.name}`} danger onPress={() => removeTag(tag)} />
            </>
          )}
        </View>
      ))}
      <Field label="Nueva etiqueta" value={tagName} onChangeText={setTagName} placeholder="Ejemplo: Bebidas" />
      {tagError ? <Notice tone="error" message={tagError} /> : null}
      <Button title="Crear etiqueta" variant="secondary" onPress={() => void createTag()} disabled={tagName.trim().length < 2} />
      <Button title="Guardar producto" onPress={submit} loading={loading} />
      <Button title="Cancelar" onPress={onClose} variant="ghost" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' }, price: { color: colors.primary, fontSize: 16, fontWeight: '800', marginTop: 4 },
  description: { color: colors.muted, lineHeight: 20 }, actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', paddingTop: spacing.xs },
  results: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: -spacing.sm }, outOfStock: { opacity: 0.76 }, sheetCopy: { color: colors.muted, lineHeight: 20 },
  tagRow: { gap: spacing.sm }, tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { color: colors.text, fontWeight: '800' }, tagEditor: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, tagName: { flex: 1, color: colors.text, fontWeight: '700' },
});
