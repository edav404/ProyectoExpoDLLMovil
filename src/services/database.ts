import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { AppData, Client, Expense, Product, SaleDetail, SaleHeader, Tag, User } from '../types';

export type SqlValue = string | number | null;

export interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  transaction<T>(task: () => Promise<T>): Promise<T>;
}

export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  birthDate TEXT NOT NULL,
  email TEXT NOT NULL,
  isGuest INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  passwordSalt TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  clientId TEXT REFERENCES clients(id),
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  stock INTEGER NOT NULL,
  unitPrice INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_tags (
  productId TEXT NOT NULL REFERENCES products(id),
  tagId TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (productId, tagId)
);

CREATE TABLE IF NOT EXISTS sale_headers (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id),
  date TEXT NOT NULL,
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_details (
  id TEXT PRIMARY KEY,
  headerId TEXT NOT NULL REFERENCES sale_headers(id),
  productId TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  subtotal INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  concept TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`;

type Row = Record<string, SqlValue>;

function text(value: SqlValue | undefined) {
  return value == null ? '' : String(value);
}

function num(value: SqlValue | undefined) {
  return Number(value ?? 0);
}

export async function openAppDatabase(): Promise<SqlDatabase> {
  return adaptExpo(await openDatabaseAsync('ventalocal.db'));
}

function adaptExpo(database: SQLiteDatabase): SqlDatabase {
  return {
    exec: (sql) => database.execAsync(sql),
    async run(sql, params = []) {
      await database.runAsync(sql, params);
    },
    all: (sql, params = []) => database.getAllAsync(sql, params),
    async transaction(task) {
      await database.execAsync('BEGIN IMMEDIATE');
      try {
        const result = await task();
        await database.execAsync('COMMIT');
        return result;
      } catch (error) {
        await database.execAsync('ROLLBACK');
        throw error;
      }
    },
  };
}

export async function loadSnapshot(db: SqlDatabase): Promise<AppData | null> {
  const meta = await db.all<Row>('SELECT value FROM app_meta WHERE key = ?', ['version']);
  if (!meta.length) return null;

  const clients = (await db.all<Row>('SELECT * FROM clients ORDER BY rowid')).map((row): Client => ({
    id: text(row.id),
    firstName: text(row.firstName),
    lastName: text(row.lastName),
    birthDate: text(row.birthDate),
    email: text(row.email),
    isGuest: num(row.isGuest) === 1,
  }));

  const users = (await db.all<Row>('SELECT * FROM users ORDER BY rowid')).map((row): User => ({
    id: text(row.id),
    email: text(row.email),
    passwordHash: text(row.passwordHash),
    passwordSalt: text(row.passwordSalt),
    role: text(row.role) as User['role'],
    status: text(row.status) as User['status'],
    createdAt: text(row.createdAt),
    ...(row.clientId ? { clientId: text(row.clientId) } : {}),
  }));

  const tags = (await db.all<Row>('SELECT * FROM tags ORDER BY rowid')).map((row): Tag => ({
    id: text(row.id),
    name: text(row.name),
  }));

  const links = await db.all<Row>('SELECT productId, tagId FROM product_tags ORDER BY rowid');
  const tagsByProduct = new Map<string, string[]>();
  for (const link of links) {
    const productId = text(link.productId);
    const current = tagsByProduct.get(productId) ?? [];
    current.push(text(link.tagId));
    tagsByProduct.set(productId, current);
  }

  const products = (await db.all<Row>('SELECT * FROM products ORDER BY rowid')).map((row): Product => ({
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    stock: num(row.stock),
    unitPrice: num(row.unitPrice),
    tagIds: tagsByProduct.get(text(row.id)) ?? [],
  }));

  const saleHeaders = (await db.all<Row>('SELECT * FROM sale_headers ORDER BY rowid')).map((row): SaleHeader => ({
    id: text(row.id),
    clientId: text(row.clientId),
    date: text(row.date),
    total: num(row.total),
  }));

  const saleDetails = (await db.all<Row>('SELECT * FROM sale_details ORDER BY rowid')).map((row): SaleDetail => ({
    id: text(row.id),
    headerId: text(row.headerId),
    productId: text(row.productId),
    quantity: num(row.quantity),
    subtotal: num(row.subtotal),
  }));

  const expenses = (await db.all<Row>('SELECT * FROM expenses ORDER BY rowid')).map((row): Expense => ({
    id: text(row.id),
    concept: text(row.concept),
    category: text(row.category) as Expense['category'],
    amount: num(row.amount),
    date: text(row.date),
    createdAt: text(row.createdAt),
  }));

  return { version: 4, users, clients, products, saleHeaders, saleDetails, expenses, tags };
}

export async function saveSnapshot(db: SqlDatabase, data: AppData) {
  await db.transaction(async () => {
    await db.run('DELETE FROM product_tags');
    await db.run('DELETE FROM sale_details');
    await db.run('DELETE FROM sale_headers');
    await db.run('DELETE FROM expenses');
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM products');
    await db.run('DELETE FROM tags');
    await db.run('DELETE FROM clients');
    await db.run('DELETE FROM app_meta');

    for (const client of data.clients) {
      await db.run(
        'INSERT INTO clients (id, firstName, lastName, birthDate, email, isGuest) VALUES (?, ?, ?, ?, ?, ?)',
        [client.id, client.firstName, client.lastName, client.birthDate, client.email, client.isGuest ? 1 : 0],
      );
    }
    for (const user of data.users) {
      await db.run(
        'INSERT INTO users (id, email, passwordHash, passwordSalt, role, status, clientId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.email, user.passwordHash, user.passwordSalt, user.role, user.status, user.clientId ?? null, user.createdAt],
      );
    }
    for (const tag of data.tags) {
      await db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [tag.id, tag.name]);
    }
    for (const product of data.products) {
      await db.run(
        'INSERT INTO products (id, name, description, stock, unitPrice) VALUES (?, ?, ?, ?, ?)',
        [product.id, product.name, product.description, product.stock, product.unitPrice],
      );
      const seen = new Set<string>();
      for (const tagId of product.tagIds) {
        if (seen.has(tagId)) continue;
        seen.add(tagId);
        await db.run('INSERT INTO product_tags (productId, tagId) VALUES (?, ?)', [product.id, tagId]);
      }
    }
    for (const header of data.saleHeaders) {
      await db.run(
        'INSERT INTO sale_headers (id, clientId, date, total) VALUES (?, ?, ?, ?)',
        [header.id, header.clientId, header.date, header.total],
      );
    }
    for (const detail of data.saleDetails) {
      await db.run(
        'INSERT INTO sale_details (id, headerId, productId, quantity, subtotal) VALUES (?, ?, ?, ?, ?)',
        [detail.id, detail.headerId, detail.productId, detail.quantity, detail.subtotal],
      );
    }
    for (const expense of data.expenses) {
      await db.run(
        'INSERT INTO expenses (id, concept, category, amount, date, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [expense.id, expense.concept, expense.category, expense.amount, expense.date, expense.createdAt],
      );
    }
    await db.run('INSERT INTO app_meta (key, value) VALUES (?, ?)', ['version', String(data.version)]);
  });
}
