import type { AppData, Expense, SaleHeader } from '../types';
import { clientLabel } from '../utils';

export interface ReportFilters { from: string; to: string; clientId?: string }
export interface ProductReportRow { productId: string; name: string; quantity: number; revenue: number }
export interface ClientReportRow { clientId: string; name: string; sales: number; revenue: number }
export interface ReportModel {
  from: string; to: string; sales: SaleHeader[]; expenses: Expense[]; revenue: number; expensesTotal: number; net: number;
  saleCount: number; units: number; averageTicket: number; products: ProductReportRow[]; clients: ClientReportRow[];
}

const dayOf = (value: string) => value.slice(0, 10);
export const isDateInRange = (value: string, from: string, to: string) => dayOf(value) >= from && dayOf(value) <= to;

export const isValidReportDate = (value: string, allowFuture = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  if (!allowFuture) {
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (date.getTime() > today) return false;
  }
  return true;
};

export function buildReport(data: AppData, filters: ReportFilters): ReportModel {
  const sales = data.saleHeaders.filter((sale) => (!filters.clientId || sale.clientId === filters.clientId) && isDateInRange(sale.date, filters.from, filters.to));
  const saleIds = new Set(sales.map((sale) => sale.id));
  const expenses = filters.clientId ? [] : data.expenses.filter((expense) => isDateInRange(expense.date, filters.from, filters.to));
  const details = data.saleDetails.filter((detail) => saleIds.has(detail.headerId));
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const units = details.reduce((sum, detail) => sum + detail.quantity, 0);
  const products = new Map<string, ProductReportRow>();
  details.forEach((detail) => {
    const product = data.products.find((item) => item.id === detail.productId);
    const row = products.get(detail.productId) ?? { productId: detail.productId, name: product?.name ?? 'Producto', quantity: 0, revenue: 0 };
    row.quantity += detail.quantity; row.revenue += detail.subtotal; products.set(detail.productId, row);
  });
  const clients = new Map<string, ClientReportRow>();
  sales.forEach((sale) => {
    const client = data.clients.find((item) => item.id === sale.clientId);
    const row = clients.get(sale.clientId) ?? { clientId: sale.clientId, name: client ? clientLabel(client) : 'Cliente', sales: 0, revenue: 0 };
    row.sales += 1; row.revenue += sale.total; clients.set(sale.clientId, row);
  });
  const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return { from: filters.from, to: filters.to, sales, expenses, revenue, expensesTotal, net: revenue - expensesTotal, saleCount: sales.length, units, averageTicket: sales.length ? Math.round(revenue / sales.length) : 0, products: [...products.values()].sort((a, b) => b.revenue - a.revenue), clients: [...clients.values()].sort((a, b) => b.revenue - a.revenue) };
}
