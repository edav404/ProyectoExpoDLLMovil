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

const DATA_KEY = 'ventalocal:data:v1';
// SecureStore solo permite letras, números, puntos, guiones y guiones bajos.
const SESSION_KEY = 'ventalocal.session';
const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASSWORD = 'Admin123*';

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

async function createSeedData(): Promise<AppData> {
  const password = await passwordRecord(ADMIN_PASSWORD);
  return {
    version: 3,
    users: [{ id: id(), email: ADMIN_EMAIL, role: 'admin', status: 'active', createdAt: new Date().toISOString(), ...password }],
    clients: [],
    products: [],
    saleHeaders: [],
    saleDetails: [],
    expenses: [],
  };
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AppData>;
  return data.version === 3 && ['users', 'clients', 'products', 'saleHeaders', 'saleDetails', 'expenses'].every(
    (key) => Array.isArray(data[key as keyof AppData]),
  );
}

function migrateAppData(value: unknown): AppData | null {
  if (isAppData(value)) return value;
  if (!value || typeof value !== 'object') return null;
  const legacy = value as Omit<Partial<AppData>, 'version'> & { version?: number };
  if (legacy.version !== undefined && legacy.version !== 0 && legacy.version !== 1 && legacy.version !== 2) return null;
  if (!['users', 'clients', 'products', 'saleHeaders', 'saleDetails'].every(
    (key) => Array.isArray(legacy[key as keyof AppData]),
  )) return null;
  return {
    version: 3,
    users: (legacy.users ?? []).map((u) => ({ ...u, status: (u as User & { status?: string }).status ?? 'active' as const })),
    clients: (legacy.clients ?? []).map((c) => {
      const legacyClient = c as Client & { name?: string };
      return {
        id: legacyClient.id ?? '',
        firstName: legacyClient.firstName ?? legacyClient.name ?? '',
        lastName: legacyClient.lastName ?? '',
        birthDate: legacyClient.birthDate ?? '',
        email: legacyClient.email ?? '',
      };
    }),
    products: legacy.products!,
    saleHeaders: legacy.saleHeaders!,
    saleDetails: legacy.saleDetails!,
    expenses: (legacy as Partial<AppData>).expenses ?? [],
  };
}

export class LocalStore {
  private data: AppData | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  async initialize() {
    if (this.data) return clone(this.data);
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        const migrated = migrateAppData(parsed);
        if (migrated) {
          this.data = migrated;
          if (!isAppData(parsed)) await AsyncStorage.setItem(DATA_KEY, JSON.stringify(migrated));
          return clone(migrated);
        }
      } catch {
        // Un documento corrupto se reemplaza con el seed vacío a continuación.
      }
    }
    this.data = await createSeedData();
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(this.data));
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
      await AsyncStorage.setItem(DATA_KEY, JSON.stringify(draft));
      this.data = draft;
    });
    this.queue = operation.catch(() => undefined);
    await operation;
    return result;
  }

  async getSession() {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as Session;
      if (this.data?.users.some((user) => user.id === session.userId)) return session;
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
  }

  async setSession(userId: string | null) {
    if (userId) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ userId } satisfies Session));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
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
      if (draft.users.some((item) => item.email === email) || draft.clients.some((item) => item.email === email)) {
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
    return this.update<Client>((draft) => {
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
      const index = draft.clients.findIndex((item) => item.id === clientId);
      if (index < 0) throw new Error('Cliente no encontrado.');
      draft.clients[index] = { id: clientId, ...payload };
      if (linkedUser) linkedUser.email = email;
      return draft.clients[index];
    });
  }

  async deleteClient(clientId: string) {
    return this.update<void>((draft) => {
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
      const payload = { ...input, name: normalizedName, description: normalizeText(input.description) };
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
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(seed));
    this.data = seed;
    await this.setSession(null);
    return clone(seed);
  }
}

export const localStore = new LocalStore();
