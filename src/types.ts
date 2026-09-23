export type Role = 'admin' | 'client';
export type UserStatus = 'pending' | 'active';
export type ExpenseCategory = 'Operativo' | 'Inventario' | 'Transporte' | 'Servicios' | 'Otro';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: Role;
  status: UserStatus;
  clientId?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  /** Fecha de nacimiento en formato AAAA-MM-DD */
  birthDate: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  stock: number;
  unitPrice: number;
}

export interface SaleHeader {
  id: string;
  clientId: string;
  date: string;
  total: number;
}

export interface SaleDetail {
  id: string;
  headerId: string;
  productId: string;
  quantity: number;
  subtotal: number;
}

export interface Expense {
  id: string;
  concept: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  createdAt: string;
}

export interface AppData {
  version: 3;
  users: User[];
  clients: Client[];
  products: Product[];
  saleHeaders: SaleHeader[];
  saleDetails: SaleDetail[];
  expenses: Expense[];
}

export interface Session { userId: string }
export interface CartLine { productId: string; quantity: number }

/** Datos que el visitante envía al registrarse (cuenta queda pendiente de aprobación). */
export interface RegisterInput {
  email: string;
  password: string;
}

/** Datos que el Admin envía al activar una cuenta pendiente. */
export interface ActivateUserInput {
  userId: string;
  role: Role;
}

/** Datos del perfil del cliente (se rellenan tras la activación). */
export interface ClientInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
}

export interface ProductInput { name: string; description: string; stock: number; unitPrice: number }
export interface ExpenseInput { concept: string; category: ExpenseCategory; amount: number; date: string }
