import type { ClientInput, ExpenseInput } from './types';

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');
export const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validateBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date();
}

export function validatePassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

export function validateClient(input: ClientInput) {
  if (normalizeText(input.firstName).length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
  if (normalizeText(input.lastName).length < 2) throw new Error('El apellido debe tener al menos 2 caracteres.');
  if (input.birthDate && !validateBirthDate(input.birthDate)) throw new Error('Usa una fecha válida en formato AAAA-MM-DD.');
  if (!validateEmail(input.email)) throw new Error('Ingresa un correo válido.');
}

export function validateProduct(input: import('./types').ProductInput) {
  if (normalizeText(input.name).length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
  if (!normalizeText(input.description)) throw new Error('La descripción es obligatoria.');
  if (!Number.isInteger(input.stock) || input.stock < 0) throw new Error('El stock debe ser un entero mayor o igual a cero.');
  if (!Number.isInteger(input.unitPrice) || input.unitPrice < 0) throw new Error('El precio debe ser un entero mayor o igual a cero.');
}

export function validateExpense(input: ExpenseInput) {
  if (normalizeText(input.concept).length < 2) throw new Error('El concepto debe tener al menos 2 caracteres.');
  if (!['Operativo', 'Inventario', 'Transporte', 'Servicios', 'Otro'].includes(input.category)) throw new Error('Selecciona una categoría válida.');
  if (!Number.isInteger(input.amount) || input.amount < 0) throw new Error('El monto debe ser un entero mayor o igual a cero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Usa una fecha válida en formato AAAA-MM-DD.');
  const date = new Date(`${input.date}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.date || date > new Date()) throw new Error('La fecha debe ser válida y no futura.');
}

export function calculateCartTotal(products: import('./types').Product[], lines: import('./types').CartLine[]) {
  return lines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    return sum + (product?.unitPrice ?? 0) * line.quantity;
  }, 0);
}
