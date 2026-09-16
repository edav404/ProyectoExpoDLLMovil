export type Role = 'admin' | 'client';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: Role;
  clientId?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
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

export interface AppData {
  version: 1;
  users: User[];
  clients: Client[];
  products: Product[];
  saleHeaders: SaleHeader[];
  saleDetails: SaleDetail[];
}

export interface Session { userId: string }
export interface CartLine { productId: string; quantity: number }

export interface RegisterInput {
  name: string;
  birthDate: string;
  email: string;
  password: string;
  role: Role;
}

export interface ClientInput { name: string; birthDate: string; email: string }
export interface ProductInput { name: string; description: string; stock: number; unitPrice: number }

