import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Field, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { exportReportPdf } from '@/services/pdf';
import { buildReport, isValidReportDate } from '@/services/reports';
import { colors, spacing } from '@/theme';
import { formatMoney } from '@/utils';

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const monthStart = () => { const date = new Date(); date.setDate(1); return dateValue(date); };
const daysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return dateValue(date); };

export default function ReportsScreen() {
  const { data, user } = useApp();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(dateValue(new Date()));
  const [preset, setPreset] = useState<'month' | '30' | 'custom'>('month');
  const [loading, setLoading] = useState(false);
  const clientId = user?.role === 'client' ? user.clientId : undefined;
  const validRange = isValidReportDate(from) && isValidReportDate(to) && from <= to;
  const report = useMemo(() => data && validRange ? buildReport(data, { from, to, clientId }) : null, [clientId, data, from, to, validRange]);
  if (!data || !user) return null;
  const applyPreset = (nextPreset: 'month' | '30') => { setPreset(nextPreset); if (nextPreset === 'month') { setFrom(monthStart()); setTo(dateValue(new Date())); } else { setFrom(daysAgo(30)); setTo(dateValue(new Date())); } };
  const exportPdf = async () => { if (!report) return; setLoading(true); try { await exportReportPdf(data, { from, to, clientId }, user.email); Alert.alert('Reporte listo', 'El PDF está disponible para guardar o compartir.'); } catch (error) { Alert.alert('No se pudo exportar', error instanceof Error ? error.message : 'Intenta nuevamente.'); } finally { setLoading(false); } };
  return <Screen>
    <Header eyebrow="Finanzas" title={user.role === 'admin' ? 'Reportes' : 'Mis reportes'} subtitle="Analiza tus movimientos por un intervalo de fechas." />
    <Card><Text style={styles.sectionTitle}>Intervalo</Text><View style={styles.presets}><Button title="Este mes" variant={preset === 'month' ? 'secondary' : 'ghost'} onPress={() => applyPreset('month')} /><Button title="Últimos 30 días" variant={preset === '30' ? 'secondary' : 'ghost'} onPress={() => applyPreset('30')} /><Button title="Personalizado" variant={preset === 'custom' ? 'secondary' : 'ghost'} onPress={() => setPreset('custom')} /></View><Field label="Desde" value={from} onChangeText={(value) => { setPreset('custom'); setFrom(value); }} placeholder="AAAA-MM-DD" maxLength={10} /><Field label="Hasta" value={to} onChangeText={(value) => { setPreset('custom'); setTo(value); }} placeholder="AAAA-MM-DD" maxLength={10} />{!validRange ? <Text style={styles.error}>Usa fechas válidas y asegúrate de que Desde no sea posterior a Hasta.</Text> : null}</Card>
    {report ? <><View style={styles.metrics}><Metric label="Ingresos" value={formatMoney(report.revenue)} /><Metric label="Egresos" value={formatMoney(report.expensesTotal)} danger /><Metric label="Utilidad neta" value={formatMoney(report.net)} danger={report.net < 0} /><Metric label="Ventas" value={String(report.saleCount)} /><Metric label="Unidades" value={String(report.units)} /><Metric label="Ticket promedio" value={formatMoney(report.averageTicket)} /></View><Button title="Exportar reporte PDF" icon="document-text-outline" onPress={exportPdf} loading={loading} /></> : null}
    {report && !report.sales.length && !report.expenses.length ? <EmptyState icon="bar-chart-outline" title="Sin movimientos" message="No existen ventas ni egresos en este intervalo." /> : null}
    {report?.sales.length ? <Card><Text style={styles.sectionTitle}>Ventas incluidas</Text>{report.sales.slice(0, 8).map((sale) => <View key={sale.id} style={styles.line}><Text style={styles.lineLabel}>{sale.date.slice(0, 10)}</Text><Text style={styles.lineValue}>{formatMoney(sale.total)}</Text></View>)}{report.sales.length > 8 ? <Text style={styles.muted}>Mostrando 8 ventas; el PDF incluye todas.</Text> : null}</Card> : null}
    {user.role === 'admin' && report?.expenses.length ? <Card><Text style={styles.sectionTitle}>Egresos incluidos</Text>{report.expenses.slice(0, 8).map((expense) => <View key={expense.id} style={styles.line}><Text style={styles.lineLabel}>{expense.date} · {expense.concept}</Text><Text style={styles.lineValue}>{formatMoney(expense.amount)}</Text></View>)}</Card> : null}
  </Screen>;
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, danger && styles.metricDanger]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 17 }, presets: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }, error: { color: colors.danger, lineHeight: 19 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, metric: { flexGrow: 1, minWidth: '30%', padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, gap: 4 }, metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' }, metricValue: { color: colors.primary, fontSize: 16, fontWeight: '900' }, metricDanger: { color: colors.danger }, line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, lineLabel: { color: colors.text, flex: 1 }, lineValue: { color: colors.primary, fontWeight: '900' }, muted: { color: colors.muted, fontSize: 13 },
});
