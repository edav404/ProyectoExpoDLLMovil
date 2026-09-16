import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type {
  AppData,
  CartLine,
  Client,
  ClientInput,
  Product,
  ProductInput,
  RegisterInput,
  SaleHeader,
  Session,
  User,
} from '../types';
import {
  normalizeEmail,
  normalizeText,
  validateClient,
  validateEmail,
  validatePassword,
  validateProduct,
} from '../utils';

const DATA_KEY = 'ventalocal:data:v1';
const SESSION_KEY = 'ventalocal:session';
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
    version: 1,
    users: [{ id: id(), email: ADMIN_EMAIL, role: 'admin', createdAt: new Date().toISOString(), ...password }],
    clients: [],
    products: [],
    saleHeaders: [],
    saleDetails: [],
  };
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AppData>;
  return data.version === 1 && ['users', 'clients', 'products', 'saleHeaders', 'saleDetails'].every(
    (key) => Array.isArray(data[key as keyof AppData]),
  );
}

function migrateAppData(value: unknown): AppData | null {
  if (isAppData(value)) return value;
  if (!value || typeof value !== 'object') return null;
  const legacy = value as Partial<AppData> & { version?: number };
  if (legacy.version !== undefined && legacy.version !== 0) return null;
  if (!['users', 'clients', 'products', 'saleHeaders', 'saleDetails'].every(
    (key) => Array.isArray(legacy[key as keyof AppData]),
  )) return null;
  return {
    version: 1,
    users: legacy.users!,
    clients: legacy.clients!,
    products: legacy.products!,
    saleHeaders: legacy.saleHeaders!,
    saleDetails: legacy.saleDetails!,
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
        // A corrupt document is replaced with a safe empty seed below.
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
    await this.setSession(user.id);
    return user;
  }

  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);
    if (!validateEmail(email)) throw new Error('Ingresa un correo válido.');
    if (!validatePassword(input.password)) {
      throw new Error('La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.');
    }
    if (input.role === 'client') validateClient({ name: input.name, birthDate: input.birthDate, email });
    const password = await passwordRecord(input.password);
    const user = await this.update<User>((draft) => {
      if (draft.users.some((item) => item.email === email) || draft.clients.some((item) => item.email === email)) {
        throw new Error('Este correo ya está registrado.');
      }
      let clientId: string | undefined;
      if (input.role === 'client') {
        const newClientId = id();
        clientId = newClientId;
        draft.clients.push({ id: newClientId, name: normalizeText(input.name), birthDate: input.birthDate, email });
      }
      const created: User = { id: id(), email, role: input.role, clientId, createdAt: new Date().toISOString(), ...password };
      draft.users.push(created);
      return created;
    });
    await this.setSession(user.id);
    return user;
  }

  async saveClient(input: ClientInput, clientId?: string) {
    validateClient(input);
    const email = normalizeEmail(input.email);
    return this.update<Client>((draft) => {
      const duplicateClient = draft.clients.some((item) => item.email === email && item.id !== clientId);
      const linkedUser = clientId ? draft.users.find((item) => item.clientId === clientId) : undefined;
      const duplicateUser = draft.users.some((item) => item.email === email && item.id !== linkedUser?.id);
      if (duplicateClient || duplicateUser) throw new Error('Este correo ya está en uso.');
      const payload = { name: normalizeText(input.name), birthDate: input.birthDate, email };
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
