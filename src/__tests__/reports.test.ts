import { buildReport, isDateInRange, isValidReportDate } from '../services/reports';
import { reportHtml, saleHtml } from '../services/pdf';
import type { AppData } from '../types';

const data: AppData = {
  version: 4,
  users: [],
  clients: [
    { id: 'c1', firstName: 'Ana', lastName: 'Torres', birthDate: '1990-01-01', email: 'ana@test.com' },
    { id: 'c2', firstName: 'Luis', lastName: 'Ríos', birthDate: '1990-01-01', email: 'luis@test.com' },
  ],
  products: [{ id: 'p1', name: 'Café', description: 'Café', stock: 3, unitPrice: 5000, tagIds: [] }],
  tags: [],
  saleHeaders: [
    { id: 's1', clientId: 'c1', date: '2026-01-01T10:00:00.000Z', total: 10000 },
    { id: 's2', clientId: 'c2', date: '2026-01-31T10:00:00.000Z', total: 5000 },
    { id: 's3', clientId: 'c1', date: '2026-02-01T10:00:00.000Z', total: 9000 },
  ],
  saleDetails: [
    { id: 'd1', headerId: 's1', productId: 'p1', quantity: 2, subtotal: 10000 },
    { id: 'd2', headerId: 's2', productId: 'p1', quantity: 1, subtotal: 5000 },
    { id: 'd3', headerId: 's3', productId: 'p1', quantity: 1, subtotal: 9000 },
  ],
  expenses: [{ id: 'e1', concept: 'Transporte', category: 'Transporte', amount: 3000, date: '2026-01-31', createdAt: '2026-01-31T10:00:00.000Z' }],
};

describe('reportes', () => {
  it('valida fechas reales, no futuras y acepta límites inclusivos', () => {
    expect(isValidReportDate('2026-02-29')).toBe(false);
    expect(isValidReportDate('2026-01-01')).toBe(true);
    expect(isValidReportDate('2999-01-01')).toBe(false);
    expect(isDateInRange('2026-01-31T23:59:00.000Z', '2026-01-01', '2026-01-31')).toBe(true);
  });

  it('incluye los límites de fecha y calcula métricas', () => {
    const report = buildReport(data, { from: '2026-01-01', to: '2026-01-31' });
    expect(report.saleCount).toBe(2);
    expect(report.units).toBe(3);
    expect(report.revenue).toBe(15000);
    expect(report.expensesTotal).toBe(3000);
    expect(report.net).toBe(12000);
    expect(report.averageTicket).toBe(7500);
  });

  it('filtra ventas por cliente y nunca incluye egresos para clientes', () => {
    const report = buildReport(data, { from: '2026-01-01', to: '2026-12-31', clientId: 'c1' });
    expect(report.sales.map((sale) => sale.id)).toEqual(['s1', 's3']);
    expect(report.expenses).toEqual([]);
    expect(report.revenue).toBe(19000);
  });

  it('genera HTML con métricas, detalles y texto escapado', () => {
    const report = buildReport(data, { from: '2026-01-01', to: '2026-01-31' });
    const html = reportHtml(data, report, 'admin@test.com');
    expect(html).toContain('Utilidad neta');
    expect(html).toContain('Café');
    expect(html).not.toContain('<script>');
    expect(saleHtml(data, data.saleHeaders[0])).toContain('Esta venta es inmutable');
  });
});
