import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { AppData, SaleHeader } from '../types';
import { formatMoney } from '../utils';
import { buildReport, type ReportModel } from './reports';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
const dateLabel = (value: string) => escapeHtml(value);
const money = (value: number) => escapeHtml(formatMoney(value));

const base = (title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;color:#163432;margin:30px;font-size:12px}h1{font-size:25px;color:#084B45;margin:0 0 4px}h2{font-size:15px;color:#126B63;margin:22px 0 8px;border-bottom:1px solid #D5E5E2;padding-bottom:6px}.muted{color:#5C7471}.meta{font-size:11px}.summary{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.metric{border:1px solid #D5E5E2;border-radius:8px;padding:10px;min-width:115px}.metric strong{display:block;font-size:15px;color:#126B63;margin-top:4px}.metric.net strong{color:#067647}.metric.loss strong{color:#B42318}table{width:100%;border-collapse:collapse;margin-top:6px}th{text-align:left;background:#EAF5F3;color:#084B45}th,td{padding:7px;border-bottom:1px solid #E4EEEC}td.amount,th.amount{text-align:right}.empty{background:#F3F8F8;border-radius:8px;padding:14px;color:#5C7471}.footer{margin-top:28px;color:#5C7471;font-size:10px}</style></head><body><h1>VentaLocal</h1><div class="muted">${escapeHtml(title)}</div>${body}<div class="footer">Documento generado localmente · VentaLocal</div></body></html>`;

const summary = (report: ReportModel) => `<div class="summary"><div class="metric">Ingresos<strong>${money(report.revenue)}</strong></div><div class="metric">Egresos<strong>${money(report.expensesTotal)}</strong></div><div class="metric ${report.net < 0 ? 'loss' : 'net'}">Utilidad neta<strong>${money(report.net)}</strong></div><div class="metric">Ventas<strong>${report.saleCount}</strong></div><div class="metric">Unidades<strong>${report.units}</strong></div><div class="metric">Ticket promedio<strong>${money(report.averageTicket)}</strong></div></div>`;

export function reportHtml(data: AppData, report: ReportModel, generatedBy: string) {
  const sales = report.sales.length ? `<table><tr><th>Fecha</th><th>Cliente</th><th class="amount">Total</th></tr>${report.sales.map((sale) => { const client = data.clients.find((item) => item.id === sale.clientId); return `<tr><td>${dateLabel(sale.date.slice(0, 10))}</td><td>${escapeHtml(client ? `${client.firstName} ${client.lastName}`.trim() || client.email : 'Cliente')}</td><td class="amount">${money(sale.total)}</td></tr>`; }).join('')}</table>` : '<div class="empty">No hay ventas en este intervalo.</div>';
  const expenses = report.expenses.length ? `<table><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="amount">Monto</th></tr>${report.expenses.map((expense) => `<tr><td>${dateLabel(expense.date)}</td><td>${escapeHtml(expense.concept)}</td><td>${escapeHtml(expense.category)}</td><td class="amount">${money(expense.amount)}</td></tr>`).join('')}</table>` : '<div class="empty">No hay egresos en este intervalo.</div>';
  const products = report.products.length ? `<table><tr><th>Producto</th><th class="amount">Unidades</th><th class="amount">Ingresos</th></tr>${report.products.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="amount">${item.quantity}</td><td class="amount">${money(item.revenue)}</td></tr>`).join('')}</table>` : '<div class="empty">No hay productos vendidos en este intervalo.</div>';
  const clients = report.clients.length ? `<table><tr><th>Cliente</th><th class="amount">Ventas</th><th class="amount">Ingresos</th></tr>${report.clients.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="amount">${item.sales}</td><td class="amount">${money(item.revenue)}</td></tr>`).join('')}</table>` : '';
  return base(`Reporte financiero · ${dateLabel(report.from)} a ${dateLabel(report.to)}`, `<p class="meta">Generado por: ${escapeHtml(generatedBy)}<br>Intervalo inclusivo: ${dateLabel(report.from)} - ${dateLabel(report.to)}</p>${summary(report)}<h2>Ventas</h2>${sales}<h2>Egresos</h2>${expenses}<h2>Resumen por producto</h2>${products}${clients ? `<h2>Resumen por cliente</h2>${clients}` : ''}`);
}

export function saleHtml(data: AppData, sale: SaleHeader) {
  const client = data.clients.find((item) => item.id === sale.clientId);
  const details = data.saleDetails.filter((item) => item.headerId === sale.id);
  const rows = details.map((detail) => { const product = data.products.find((item) => item.id === detail.productId); const unit = detail.quantity ? detail.subtotal / detail.quantity : 0; return `<tr><td>${escapeHtml(product?.name ?? 'Producto')}</td><td>${detail.quantity}</td><td class="amount">${money(unit)}</td><td class="amount">${money(detail.subtotal)}</td></tr>`; }).join('');
  return base('Comprobante de venta', `<p class="meta">ID: ${escapeHtml(sale.id)}<br>Fecha: ${dateLabel(sale.date.slice(0, 10))}<br>Cliente: ${escapeHtml(client ? `${client.firstName} ${client.lastName}`.trim() || client.email : 'Cliente')}</p><h2>Detalle</h2><table><tr><th>Producto</th><th>Cantidad</th><th class="amount">Precio unitario</th><th class="amount">Subtotal</th></tr>${rows}</table><h2 style="text-align:right">Total: ${money(sale.total)}</h2><p class="muted">Esta venta es inmutable y no puede editarse ni eliminarse.</p>`);
}

async function printAndShare(html: string, title: string) {
  const file = await Print.printToFileAsync({ html, base64: false });
  if (!(await Sharing.isAvailableAsync())) throw new Error('El dispositivo no permite compartir archivos PDF.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
  return file.uri;
}

export async function exportReportPdf(data: AppData, filters: { from: string; to: string; clientId?: string }, generatedBy: string) {
  return printAndShare(reportHtml(data, buildReport(data, filters), generatedBy), 'Compartir reporte VentaLocal');
}

export async function exportSalePdf(data: AppData, sale: SaleHeader) {
  return printAndShare(saleHtml(data, sale), 'Compartir comprobante VentaLocal');
}
