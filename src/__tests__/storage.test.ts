import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { openMemoryDatabase } from '../services/memoryDatabase';
import { LocalStore } from '../services/storage';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('crypto') as typeof import('crypto');
  let sequence = 0;
  return {
    CryptoDigestAlgorithm: { SHA256: 'sha256' },
    randomUUID: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    getRandomBytesAsync: async (length: number) => new Uint8Array(length).fill(7),
    digestStringAsync: async (_algorithm: string, value: string) => crypto.createHash('sha256').update(value).digest('hex'),
  };
});

const mockedStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('LocalStore', () => {
  let values: Map<string, string>;

  beforeEach(() => {
    values = new Map();
    jest.clearAllMocks();
    mockedStorage.getItem.mockImplementation(async (key) => values.get(key) ?? null);
    mockedStorage.setItem.mockImplementation(async (key, value) => { values.set(key, value); });
    mockedStorage.removeItem.mockImplementation(async (key) => { values.delete(key); });
    mockedSecureStore.isAvailableAsync.mockResolvedValue(true);
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('crea la cuenta administradora inicial y permite iniciar sesión', async () => {
    const store = new LocalStore(openMemoryDatabase());
    const data = await store.initialize();
    expect(data.users).toHaveLength(1);
    await expect(store.login('ADMIN@DEMO.COM', 'Admin123*')).resolves.toMatchObject({ role: 'admin' });
    await expect(store.login('admin@demo.com', 'incorrecta')).rejects.toThrow('incorrectos');
  });

  it('guarda la sesión en AsyncStorage cuando SecureStore no está disponible', async () => {
    mockedSecureStore.isAvailableAsync.mockResolvedValue(false);
    const store = new LocalStore(openMemoryDatabase());
    await store.initialize();
    const user = await store.login('admin@demo.com', 'Admin123*');
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(JSON.parse(values.get('ventalocal.session')!).userId).toBe(user.id);
    await expect(store.getSession()).resolves.toEqual({ userId: user.id });
  });

  it('migra un documento local anterior conservando sus colecciones', async () => {
    values.set('ventalocal:data:v1', JSON.stringify({ version: 0, users: [], clients: [], products: [], saleHeaders: [], saleDetails: [] }));
    const store = new LocalStore(openMemoryDatabase());
    const data = await store.initialize();
    expect(data.version).toBe(4);
    expect(data.expenses).toEqual([]);
    expect(data.tags).toEqual([]);
    expect(data.clients.some((client) => client.isGuest)).toBe(true);
    expect(values.has('ventalocal:data:v1')).toBe(false);
  });

  it('crea usuario en estado pendiente al registrarse (sin auto-login)', async () => {
    const store = new LocalStore(openMemoryDatabase());
    await store.initialize();
    await store.register({ email: 'ANA@correo.com', password: 'Segura123' });
    const snapshot = store.snapshot();
    const user = snapshot.users.find((u) => u.email === 'ana@correo.com');
    expect(user).toBeDefined();
    expect(user?.status).toBe('pending');
    // No debe poder iniciar sesión hasta ser activado
    await expect(store.login('ana@correo.com', 'Segura123')).rejects.toThrow('aprobada');
    // No puede duplicar correo
    await expect(store.register({ email: 'ana@correo.com', password: 'Segura123' })).rejects.toThrow('ya está registrado');
  });

  it('registra encabezado y detalles y descuenta el stock', async () => {
    const store = new LocalStore(openMemoryDatabase());
    await store.initialize();
    const client = await store.saveClient({ firstName: 'Carlos', lastName: 'Pérez', birthDate: '1990-01-01', email: 'carlos@correo.com' });
    const product = await store.saveProduct({ name: 'Café', description: 'Café molido', stock: 5, unitPrice: 18000 });
    const sale = await store.createSale(client.id, [{ productId: product.id, quantity: 2 }]);
    const data = store.snapshot();
    expect(sale.total).toBe(36000);
    expect(data.products[0].stock).toBe(3);
    expect(data.saleDetails[0]).toMatchObject({ headerId: sale.id, quantity: 2, subtotal: 36000 });
  });

  it('rechaza stock insuficiente sin modificar el documento', async () => {
    const db = openMemoryDatabase();
    const store = new LocalStore(db);
    await store.initialize();
    const client = await store.saveClient({ firstName: 'Carlos', lastName: 'Pérez', birthDate: '1990-01-01', email: 'carlos@correo.com' });
    const product = await store.saveProduct({ name: 'Pan', description: 'Pan artesanal', stock: 1, unitPrice: 4000 });
    await expect(store.createSale(client.id, [{ productId: product.id, quantity: 2 }])).rejects.toThrow('Stock insuficiente');
    const again = await new LocalStore(db).initialize();
    expect(again.products.find((item) => item.id === product.id)?.stock).toBe(1);
    expect(again.saleHeaders).toHaveLength(0);
  });

  it('protege clientes y productos referenciados por ventas', async () => {
    const store = new LocalStore(openMemoryDatabase());
    await store.initialize();
    const client = await store.saveClient({ firstName: 'Laura', lastName: 'Ruiz', birthDate: '1995-08-20', email: 'laura@correo.com' });
    const product = await store.saveProduct({ name: 'Té', description: 'Té verde', stock: 4, unitPrice: 6000 });
    await store.createSale(client.id, [{ productId: product.id, quantity: 1 }]);
    await expect(store.deleteClient(client.id)).rejects.toThrow('ventas registradas');
    await expect(store.deleteProduct(product.id)).rejects.toThrow('historial de ventas');
  });

  it('crea, actualiza y elimina egresos con validaciones', async () => {
    const store = new LocalStore(openMemoryDatabase());
    await store.initialize();
    const expense = await store.saveExpense({ concept: 'Transporte', category: 'Transporte', amount: 12000, date: '2026-01-10' });
    expect(store.snapshot().expenses[0]).toMatchObject({ concept: 'Transporte', amount: 12000 });
    await store.saveExpense({ concept: 'Transporte urbano', category: 'Operativo', amount: 15000, date: '2026-01-11' }, expense.id);
    expect(store.snapshot().expenses[0]).toMatchObject({ category: 'Operativo', amount: 15000 });
    await expect(store.saveExpense({ concept: 'Prueba', category: 'Otro', amount: -1, date: '2026-01-10' })).rejects.toThrow('monto');
    await expect(store.saveExpense({ concept: 'Futuro', category: 'Otro', amount: 1, date: '2099-01-01' })).rejects.toThrow('futura');
    await store.deleteExpense(expense.id);
    expect(store.snapshot().expenses).toHaveLength(0);
  });

  it('vende a un cliente nuevo y al cliente invitado, y rechaza una venta vacía', async () => {
    const store = new LocalStore(openMemoryDatabase());
    const initial = await store.initialize();
    const guest = initial.clients.find((client) => client.isGuest);
    const product = await store.saveProduct({ name: 'Agua', description: 'Botella', stock: 4, unitPrice: 2000, tagIds: [] });
    const created = await store.saveClient({ firstName: 'Marta', lastName: 'López', birthDate: '', email: 'marta@correo.com' });
    const sale = await store.createSale(created.id, [{ productId: product.id, quantity: 1 }]);
    expect(sale.clientId).toBe(created.id);
    expect(sale.total).toBe(2000);
    const guestSale = await store.createSale(guest!.id, [{ productId: product.id, quantity: 1 }]);
    expect(guestSale.clientId).toBe(guest!.id);
    expect(store.snapshot().products.find((item) => item.id === product.id)?.stock).toBe(2);
    await expect(store.createSale(created.id, [])).rejects.toThrow('al menos un producto');
    await expect(store.deleteClient(guest!.id)).rejects.toThrow('invitado');
    await expect(store.saveClient({ firstName: 'Otro', lastName: 'Nombre', birthDate: '', email: 'otro@correo.com' }, guest!.id)).rejects.toThrow('no se puede editar');
  });

  it('migra la versión 3 conservando egresos y sin etiquetas', async () => {
    values.set('ventalocal:data:v1', JSON.stringify({
      version: 3,
      users: [],
      clients: [],
      products: [{ id: 'p', name: 'Café', description: 'Molido', stock: 2, unitPrice: 10 }],
      saleHeaders: [],
      saleDetails: [],
      expenses: [{ id: 'e', concept: 'Caja', category: 'Operativo', amount: 1000, date: '2026-01-01', createdAt: '2026-01-01T00:00:00.000Z' }],
    }));
    const db = openMemoryDatabase();
    const store = new LocalStore(db);
    const data = await store.initialize();
    expect(data.version).toBe(4);
    expect(data.expenses).toHaveLength(1);
    expect(data.products[0].tagIds).toEqual([]);
    expect(data.products[0].stock).toBe(2);
    expect(data.tags).toEqual([]);
    expect(data.clients.some((client) => client.isGuest)).toBe(true);
    const again = await new LocalStore(db).initialize();
    expect(again.products[0]).toMatchObject({ stock: 2, tagIds: [] });
    expect(again.expenses).toHaveLength(1);
  });

  it('crea, renombra y elimina etiquetas sin alterar stock ni ventas', async () => {
    const store = new LocalStore(openMemoryDatabase());
    await store.initialize();
    const bebidas = await store.saveTag('Bebidas');
    const snacks = await store.saveTag('Snacks');
    await expect(store.saveTag('bebidas')).rejects.toThrow('Ya existe');
    const product = await store.saveProduct({ name: 'Jugo', description: 'Natural', stock: 6, unitPrice: 3000, tagIds: [bebidas.id, snacks.id] });
    expect(store.snapshot().products.find((item) => item.id === product.id)?.tagIds).toEqual([bebidas.id, snacks.id]);
    await store.saveTag('Bebidas frías', bebidas.id);
    await store.deleteTag(snacks.id);
    const after = store.snapshot().products.find((item) => item.id === product.id);
    expect(after).toMatchObject({ tagIds: [bebidas.id], stock: 6, unitPrice: 3000 });
    expect(store.snapshot().tags.map((tag) => tag.name)).toEqual(['Bebidas frías']);
    expect(store.snapshot().saleHeaders).toHaveLength(0);
    await store.deleteProduct(product.id);
    expect(store.snapshot().tags.map((tag) => tag.name)).toEqual(['Bebidas frías']);
    expect(store.snapshot().products).toHaveLength(0);
  });

  it('guarda la venta en sqlite y la vuelve a leer', async () => {
    const db = openMemoryDatabase();
    const store = new LocalStore(db);
    await store.initialize();
    const client = await store.saveClient({ firstName: 'Ana', lastName: 'Díaz', birthDate: '1992-02-02', email: 'ana.diaz@correo.com' });
    const tag = await store.saveTag('Bebidas');
    const product = await store.saveProduct({ name: 'Café', description: 'Molido', stock: 5, unitPrice: 18000, tagIds: [tag.id] });
    const sale = await store.createSale(client.id, [{ productId: product.id, quantity: 2 }]);
    const data = await new LocalStore(db).initialize();
    expect(data.products.find((item) => item.id === product.id)).toMatchObject({ stock: 3, tagIds: [tag.id] });
    expect(data.saleHeaders[0]).toMatchObject({ id: sale.id, clientId: client.id, total: 36000 });
    expect(data.saleDetails[0]).toMatchObject({ productId: product.id, quantity: 2, subtotal: 36000 });
    expect(data.clients.some((item) => item.isGuest)).toBe(true);
  });
});
