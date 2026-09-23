import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Card, EmptyState, Field, Header, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { Expense, ExpenseCategory } from '@/types';
import { formatDate, formatMoney } from '@/utils';

const categories: ExpenseCategory[] = ['Operativo', 'Inventario', 'Transporte', 'Servicios', 'Otro'];
const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesScreen() {
  const { data, user, saveExpense, deleteExpense } = useApp();
  const [category, setCategory] = useState<ExpenseCategory | 'Todas'>('Todas');
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined);
  if (!data || !user || user.role !== 'admin') return null;
  const expenses = data.expenses.filter((expense) => category === 'Todas' || expense.category === category).sort((a, b) => b.date.localeCompare(a.date));
  const remove = (expense: Expense) => Alert.alert('Eliminar egreso', '¿Quieres eliminar "' + expense.concept + '"?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void deleteExpense(expense.id).catch((error) => Alert.alert('No se pudo eliminar', error instanceof Error ? error.message : 'Intenta nuevamente.')) },
  ]);
  return <Screen>
    <Header eyebrow="Finanzas" title="Egresos" subtitle="Registra los gastos para conocer la utilidad neta." />
    <Button title="Nuevo egreso" icon="add-circle-outline" onPress={() => setEditing(null)} />
    <View style={styles.filterButtons}>{['Todas', ...categories].map((item) => <Button key={item} title={item} variant={category === item ? 'secondary' : 'ghost'} onPress={() => setCategory(item as ExpenseCategory | 'Todas')} />)}</View>
    {!expenses.length ? <EmptyState icon="trending-down-outline" title="Sin egresos" message="Registra gastos operativos, de inventario o servicios para incluirlos en tus reportes." /> : expenses.map((expense) => <Card key={expense.id}>
      <View style={styles.row}><View style={styles.flex}><Text style={styles.concept}>{expense.concept}</Text><Text style={styles.meta}>{expense.category} · {formatDate(expense.date)}</Text></View><Text style={styles.amount}>{formatMoney(expense.amount)}</Text></View>
      <View style={styles.actions}><IconButton icon="create-outline" label={'Editar ' + expense.concept} onPress={() => setEditing(expense)} /><IconButton icon="trash-outline" label={'Eliminar ' + expense.concept} danger onPress={() => remove(expense)} /></View>
    </Card>)}
    <ExpenseSheet expense={editing} onClose={() => setEditing(undefined)} onSave={saveExpense} />
  </Screen>;
}

function ExpenseSheet({ expense, onClose, onSave }: { expense: Expense | null | undefined; onClose: () => void; onSave: ReturnType<typeof useApp>['saveExpense'] }) {
  const initial = useMemo(() => ({ concept: expense?.concept ?? '', amount: expense ? String(expense.amount) : '', date: expense?.date ?? today(), category: expense?.category ?? 'Operativo' as ExpenseCategory }), [expense]);
  const [concept, setConcept] = useState(initial.concept); const [amount, setAmount] = useState(initial.amount); const [date, setDate] = useState(initial.date); const [category, setCategory] = useState<ExpenseCategory>(initial.category); const [loading, setLoading] = useState(false);
  if (expense === undefined) return null;
  const submit = async () => { setLoading(true); try { await onSave({ concept, amount: Number(amount), date, category }, expense?.id); onClose(); Alert.alert('Egreso guardado', 'El movimiento quedó disponible en tus reportes.'); } catch (error) { Alert.alert('Revisa los datos', error instanceof Error ? error.message : 'No pudimos guardar el egreso.'); } finally { setLoading(false); } };
  return <BottomSheet visible title={expense ? 'Editar egreso' : 'Nuevo egreso'} onClose={onClose}>
    <Field label="Concepto" value={concept} onChangeText={setConcept} placeholder="Ej. Transporte" />
    <Field label="Monto (COP)" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="0" />
    <Field label="Fecha" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" maxLength={10} />
    <Text style={styles.categoryLabel}>Categoría</Text><View style={styles.categoryGrid}>{categories.map((item) => <Button key={item} title={item} variant={category === item ? 'secondary' : 'ghost'} onPress={() => setCategory(item)} />)}</View>
    <Button title="Guardar egreso" icon="checkmark-circle-outline" onPress={submit} loading={loading} /><Button title="Cancelar" onPress={onClose} variant="ghost" />
  </BottomSheet>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, concept: { color: colors.text, fontSize: 16, fontWeight: '900' }, meta: { color: colors.muted, marginTop: 4, fontSize: 13 }, amount: { color: colors.danger, fontWeight: '900', fontSize: 16 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs }, filterButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, categoryLabel: { color: colors.text, fontWeight: '800' }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
