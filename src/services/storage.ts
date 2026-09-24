import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type {
  ActivateUserInput,
  AppData,
  CartLine,
  Client,
  ClientInput,
  Expense,
  ExpenseInput,
  Product,
  ProductInput,
  RegisterInput,
  Role,
  SaleHeader,
  Session,
  Tag,
  User,
} from '../types';
import {
  normalizeEmail,
  normalizeText,
  validateClient,
  validateEmail,
  validateExpense,
  validatePassword,
  validateProduct,
} from '../utils';
import { applySchema, loadSnapshot, openAppDatabase, saveSnapshot, type SqlDatabase } from './database';

const DATA_KEY = 'ventalocal:data:v1';
// SecureStore solo permite letras, números, puntos, guiones y guiones bajos.
const SESSION_KEY = 'ventalocal.session';

/** En web el módulo nativo llega vacío y getItemAsync lanza. Ahí la sesión va a AsyncStorage. */
async function secureStoreAvailable() {
  try {
    return typeof SecureStore.isAvailableAsync === 'function' && await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readSessionRaw() {
  if (await secureStoreAvailable()) return SecureStore.getItemAsync(SESSION_KEY);
  return AsyncStorage.getItem(SESSION_KEY);
}

async function writeSessionRaw(value: string | null) {
  if (await secureStoreAvailable()) {
    if (value) await SecureStore.setItemAsync(SESSION_KEY, value);
    else await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  if (value) await AsyncStorage.setItem(SESSION_KEY, value);
  else await AsyncStorage.removeItem(SESSION_KEY);
}
const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASSWORD = 'Admin123*';
const GUEST_EMAIL = 'invitado@ventalocal.local';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const id = () => Crypto.randomUUID();

async function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

async function passwordRecord(password: string) {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(bytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('');
  return { passwordSalt: salt, passwordHash: await hashPassword(password, salt) };
}

function guestClient(): Client {
  return { id: id(), firstName: 'Cliente', lastName: 'invitado', birthDate: '', email: GUEST_EMAIL, isGuest: true };
}

function ensureGuest(data: AppData): AppData {
  if (data.clients.some((client) => client.isGuest)) return data;
  return { ...data, clients: [...data.clients, guestClient()] };
}

async function createSeedData(): Promise<AppData> {
  const password = await passwordRecord(ADMIN_PASSWORD);
  return ensureGuest({
    version: 4,
    users: [{ id: id(), email: ADMIN_EMAIL, role: 'admin', status: 'active', createdAt: new Date().toISOString(), ...password }],
    clients: [],
    products: [],
    saleHeaders: [],
    saleDetails: [],
    expenses: [],
    tags: [],
  });
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AppData>;
  return data.version === 4 && ['users', 'clients', 'products', 'saleHeaders', 'saleDetails', 'expenses', 'tags'].every(
    (key) => Array.isArray(data[key as keyof AppData]),
  );
}

function migrateAppData(value: unknown): AppData | null {
  if (isAppData(value)) return ensureGuest(value);
  if (!value || typeof value !== 'object') return null;
  const legacy = value as Omit<Partial<AppData>, 'version'> & { version?: number };
  if (legacy.version !== undefined && legacy.version !== 0 && legacy.version !== 1 && legacy.version !== 2 && legacy.version !== 3) return null;
  if (!['users', 'clients', 'products', 'saleHeaders', 'saleDetails'].every(
    (key) => Array.isArray(legacy[key as keyof AppData]),
  )) return null;
  return ensureGuest({
    version: 4,
    users: (legacy.users ?? []).map((u) => ({ ...u, status: (u as User & { status?: string }).status ?? 'active' as const })),
    clients: (legacy.clients ?? []).map((c) => {
      const legacyClient = c as Client & { name?: string };
      return {
        id: legacyClient.id ?? '',
        firstName: legacyClient.firstName ?? legacyClient.name ?? '',
        lastName: legacyClient.lastName ?? '',
        birthDate: legacyClient.birthDate ?? '',
        email: legacyClient.email ?? '',
        isGuest: legacyClient.isGuest,
      };
    }),
    products: (legacy.products ?? []).map((product) => ({ ...product, tagIds: product.tagIds ?? [] })),
    saleHeaders: legacy.saleHeaders!,
    saleDetails: legacy.saleDetails!,
    expenses: (legacy as Partial<AppData>).expenses ?? [],
    tags: (legacy as Partial<AppData>).tags ?? [],
  });
}

export class LocalStore {
  private data: AppData | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private sql: SqlDatabase | null;
  private schemaReady = false;

  constructor(database?: SqlDatabase) {
    this.sql = database ?? null;
  }

  private async connection() {
    if (!this.sql) this.sql = await openAppDatabase();
    if (!this.schemaReady) {
      await applySchema(this.sql);
      this.schemaReady = true;
    }
    return this.sql;
  }

  private async importLegacy(db: SqlDatabase): Promise<AppData | null> {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    const migrated = migrateAppData(parsed);
    if (!migrated) return null;
    await saveSnapshot(db, migrated);
    await AsyncStorage.removeItem(DATA_KEY);
    return migrated;
  }

  async initialize() {
    if (this.data) return clone(this.data);
    const db = await this.connection();
    const existing = await loadSnapshot(db);
    if (existing) {
      this.data = existing;
      return clone(existing);
    }
    const imported = await this.importLegacy(db);
    if (imported) {
      this.data = imported;
      return clone(imported);
    }
    this.data = await createSeedData();
    await saveSnapshot(db, this.data);
    return clone(this.data);
  }

  snapshot() {
    if (!this.data) throw new Error('El almacenamiento local no está listo.');
    return clone(this.data);
  }

  private async update<T>(mutator: (draft: AppData) => T | Promise<T>): Promise<T> {
    let result!: T;
    const operation = this.queue.then(async () => {
      if (!this.data) await this.initialize();
      const draft = clone(this.data!);
      result = await mutator(draft);
      await saveSnapshot(await this.connection(), draft);
      this.data = draft;
    });
    this.queue = operation.catch(() => undefined);
    await operation;
    return result;
  }

  async getSession() {
    const raw = await readSessionRaw();
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as Session;
      if (this.data?.users.some((user) => user.id === session.userId)) return session;
      await writeSessionRaw(null);
      return null;
    } catch {
      await writeSessionRaw(null);
      return null;
    }
  }

  async setSession(userId: string | null) {
    await writeSessionRaw(userId ? JSON.stringify({ userId } satisfies Session) : null);
  }

  async login(email: string, password: string) {
    const user = this.snapshot().users.find((item) => item.email === normalizeEmail(email));
    if (!user || (await hashPassword(password, user.passwordSalt)) !== user.passwordHash) {
      throw new Error('Correo o contraseña incorrectos.');
    }
    if (user.status !== 'active') {
      throw new Error('Tu cuenta aún no ha sido aprobada. Contacta al administrador.');
    }
    await this.setSession(user.id);
    return user;
  }

  /**
   * Registra un visitante. La cuenta queda en estado "pending" (pendiente de activación
   * por un administrador). No inicia sesión automáticamente.
   */
  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);
    if (!validateEmail(email)) throw new Error('Ingresa un correo válido.');
    if (!validatePassword(input.password)) {
      throw new Error('La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.');
    }
    const password = await passwordRecord(input.password);
    await this.update<User>((draft) => {
      if (email === GUEST_EMAIL || draft.users.some((item) => item.email === email) || draft.clients.some((item) => item.email === email)) {
        throw new Error('Este correo ya está registrado.');
      }
      const created: User = {
        id: id(),
        email,
        role: 'client', // rol por defecto; el admin puede cambiarlo al activar
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...password,
      };
      draft.users.push(created);
      return created;
    });
    // No iniciamos sesión; el usuario debe esperar aprobación
  }

  /**
   * El administrador activa una cuenta pendiente y le asigna un rol.
   * Si el rol es 'client', se crea el registro vacío en la tabla Client para que
   * el usuario pueda completar sus datos al ingresar por primera vez.
   */
  async activateUser(input: ActivateUserInput) {
    return this.update<User>((draft) => {
      const user = draft.users.find((item) => item.id === input.userId);
      if (!user) throw new Error('Usuario no encontrado.');
      if (user.status !== 'pending') throw new Error('Esta cuenta ya fue activada.');
      user.role = input.role as Role;
      user.status = 'active';
      if (input.role === 'client' && !user.clientId) {
        const newClientId = id();
        user.clientId = newClientId;
        draft.clients.push({
          id: newClientId,
          firstName: '',
          lastName: '',
          birthDate: '',
          email: user.email,
        });
      }
      return user;
    });
  }

  async saveClient(input: ClientInput, clientId?: string) {
    validateClient(input);
    const email = normalizeEmail(input.email);
    if (email === GUEST_EMAIL) throw new Error('Este correo está reservado.');
    return this.update<Client>((draft) => {
      const current = clientId ? draft.clients.find((item) => item.id === clientId) : undefined;
      if (clientId && current?.isGuest) throw new Error('El cliente invitado no se puede editar.');
      const duplicateClient = draft.clients.some((item) => item.email === email && item.id !== clientId);
      const linkedUser = clientId ? draft.users.find((item) => item.clientId === clientId) : undefined;
      const duplicateUser = draft.users.some((item) => item.email === email && item.id !== linkedUser?.id);
      if (duplicateClient || duplicateUser) throw new Error('Este correo ya está en uso.');
      const payload = {
        firstName: normalizeText(input.firstName),
        lastName: normalizeText(input.lastName),
        birthDate: input.birthDate,
        email,
      };
      if (!clientId) {
        const created = { id: id(), ...payload };
        draft.clients.push(created);
        return created;
      }
      if (!current) throw new Error('Cliente no encontrado.');
      const index = draft.clients.findIndex((item) => item.id === clientId);
      draft.clients[index] = { id: clientId, ...payload, isGuest: current.isGuest };
      if (linkedUser) linkedUser.email = email;
      return draft.clients[index];
    });
  }

  async deleteClient(clientId: string) {
    return this.update<void>((draft) => {
      const client = draft.clients.find((item) => item.id === clientId);
      if (client?.isGuest) throw new Error('No se puede eliminar el cliente invitado.');
      if (draft.saleHeaders.some((sale) => sale.clientId === clientId)) {
        throw new Error('No se puede eliminar: el cliente tiene ventas registradas.');
      }
      if (draft.users.some((user) => user.clientId === clientId)) {
        throw new Error('No se puede eliminar: el cliente tiene una cuenta vinculada.');
      }
      draft.clients = draft.clients.filter((item) => item.id !== clientId);
    });
  }

  async saveProduct(input: ProductInput, productId?: string) {
    validateProduct(input);
    return this.update<Product>((draft) => {
      const normalizedName = normalizeText(input.name);
      if (draft.products.some((item) => item.name.toLowerCase() === normalizedName.toLowerCase() && item.id !== productId)) {
        throw new Error('Ya existe un producto con este nombre.');
      }
      const tagIds = [...new Set(input.tagIds ?? [])];
      if (tagIds.some((tagId) => !draft.tags.some((tag) => tag.id === tagId))) throw new Error('Una de las etiquetas ya no existe.');
      const payload = { name: normalizedName, description: normalizeText(input.description), stock: input.stock, unitPrice: input.unitPrice, tagIds };
      if (!productId) {
        const created = { id: id(), ...payload };
        draft.products.push(created);
        return created;
      }
      const index = draft.products.findIndex((item) => item.id === productId);
      if (index < 0) throw new Error('Producto no encontrado.');
      draft.products[index] = { id: productId, ...payload };
      return draft.products[index];
    });
  }

  async deleteProduct(productId: string) {
    return this.update<void>((draft) => {
      if (draft.saleDetails.some((detail) => detail.productId === productId)) {
        throw new Error('No se puede eliminar: el producto aparece en el historial de ventas.');
      }
      draft.products = draft.products.filter((item) => item.id !== productId);
    });
  }

  async saveTag(name: string, tagId?: string) {
    const normalized = normalizeText(name);
    if (normalized.length < 2) throw new Error('La etiqueta debe tener al menos 2 caracteres.');
    return this.update<Tag>((draft) => {
      if (draft.tags.some((tag) => tag.name.toLowerCase() === normalized.toLowerCase() && tag.id !== tagId)) {
        throw new Error('Ya existe una etiqueta con este nombre.');
      }
      if (!tagId) {
        const created = { id: id(), name: normalized };
        draft.tags.push(created);
        return created;
      }
      const index = draft.tags.findIndex((tag) => tag.id === tagId);
      if (index < 0) throw new Error('Etiqueta no encontrada.');
      draft.tags[index] = { id: tagId, name: normalized };
      return draft.tags[index];
    });
  }

  async deleteTag(tagId: string) {
    return this.update<void>((draft) => {
      if (!draft.tags.some((tag) => tag.id === tagId)) throw new Error('Etiqueta no encontrada.');
      draft.tags = draft.tags.filter((tag) => tag.id !== tagId);
      draft.products.forEach((product) => {
        product.tagIds = product.tagIds.filter((assigned) => assigned !== tagId);
      });
    });
  }

  async saveExpense(input: ExpenseInput, expenseId?: string) {
    validateExpense(input);
    return this.update<Expense>((draft) => {
      const payload = { concept: normalizeText(input.concept), category: input.category, amount: input.amount, date: input.date };
      if (!expenseId) {
        const created = { id: id(), ...payload, createdAt: new Date().toISOString() };
        draft.expenses.push(created);
        return created;
      }
      const index = draft.expenses.findIndex((expense) => expense.id === expenseId);
      if (index < 0) throw new Error('Egreso no encontrado.');
      draft.expenses[index] = { ...draft.expenses[index], ...payload };
      return draft.expenses[index];
    });
  }

  async deleteExpense(expenseId: string) {
    return this.update<void>((draft) => {
      if (!draft.expenses.some((expense) => expense.id === expenseId)) throw new Error('Egreso no encontrado.');
      draft.expenses = draft.expenses.filter((expense) => expense.id !== expenseId);
    });
  }

  async createSale(clientId: string, lines: CartLine[]) {
    return this.update<SaleHeader>((draft) => {
      if (!draft.clients.some((client) => client.id === clientId)) throw new Error('Selecciona un cliente válido.');
      const selected = lines.filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);
      if (!selected.length) throw new Error('Agrega al menos un producto a la venta.');
      const headerId = id();
      let total = 0;
      const details = selected.map((line) => {
        const product = draft.products.find((item) => item.id === line.productId);
        if (!product) throw new Error('Uno de los productos ya no existe.');
        if (product.stock < line.quantity) throw new Error(`Stock insuficiente para ${product.name}.`);
        product.stock -= line.quantity;
        const subtotal = product.unitPrice * line.quantity;
        total += subtotal;
        return { id: id(), headerId, productId: product.id, quantity: line.quantity, subtotal };
      });
      const header = { id: headerId, clientId, date: new Date().toISOString(), total };
      draft.saleHeaders.push(header);
      draft.saleDetails.push(...details);
      return header;
    });
  }

  async reset() {
    const seed = await createSeedData();
    await saveSnapshot(await this.connection(), seed);
    this.data = seed;
    await this.setSession(null);
    return clone(seed);
  }
}

export const localStore = new LocalStore();
