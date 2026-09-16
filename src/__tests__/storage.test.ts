import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { LocalStore } from '../services/storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
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
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('crea la cuenta administradora inicial y permite iniciar sesión', async () => {
    const store = new LocalStore();
    const data = await store.initialize();
    expect(data.users).toHaveLength(1);
    await expect(store.login('ADMIN@DEMO.COM', 'Admin123*')).resolves.toMatchObject({ role: 'admin' });
    await expect(store.login('admin@demo.com', 'incorrecta')).rejects.toThrow('incorrectos');
  });

  it('migra un documento local anterior conservando sus colecciones', async () => {
    values.set('ventalocal:data:v1', JSON.stringify({ version: 0, users: [], clients: [], products: [], saleHeaders: [], saleDetails: [] }));
    const store = new LocalStore();
    const data = await store.initialize();
    expect(data.version).toBe(1);
    expect(JSON.parse(values.get('ventalocal:data:v1')!).version).toBe(1);
  });

  it('crea y enlaza usuario y cliente al registrarse', async () => {
    const store = new LocalStore();
    await store.initialize();
    const user = await store.register({ name: 'Ana Torres', birthDate: '2000-05-10', email: 'ANA@correo.com', password: 'Segura123', role: 'client' });
    expect(user.clientId).toBeDefined();
    expect(store.snapshot().clients[0]).toMatchObject({ name: 'Ana Torres', email: 'ana@correo.com' });
    await expect(store.register({ name: 'Otra Ana', birthDate: '2001-01-01', email: 'ana@correo.com', password: 'Segura123', role: 'client' })).rejects.toThrow('ya está registrado');
  });

  it('registra encabezado y detalles y descuenta el stock', async () => {
    const store = new LocalStore();
    await store.initialize();
    const client = await store.saveClient({ name: 'Carlos Pérez', birthDate: '1990-01-01', email: 'carlos@correo.com' });
    const product = await store.saveProduct({ name: 'Café', description: 'Café molido', stock: 5, unitPrice: 18000 });
    const sale = await store.createSale(client.id, [{ productId: product.id, quantity: 2 }]);
    const data = store.snapshot();
    expect(sale.total).toBe(36000);
    expect(data.products[0].stock).toBe(3);
    expect(data.saleDetails[0]).toMatchObject({ headerId: sale.id, quantity: 2, subtotal: 36000 });
  });

  it('rechaza stock insuficiente sin modificar el documento', async () => {
    const store = new LocalStore();
    await store.initialize();
    const client = await store.saveClient({ name: 'Carlos Pérez', birthDate: '1990-01-01', email: 'carlos@correo.com' });
    const product = await store.saveProduct({ name: 'Pan', description: 'Pan artesanal', stock: 1, unitPrice: 4000 });
    await expect(store.createSale(client.id, [{ productId: product.id, quantity: 2 }])).rejects.toThrow('Stock insuficiente');
    expect(store.snapshot().products[0].stock).toBe(1);
    expect(store.snapshot().saleHeaders).toHaveLength(0);
  });

  it('protege clientes y productos referenciados por ventas', async () => {
    const store = new LocalStore();
    await store.initialize();
    const client = await store.saveClient({ name: 'Laura Ruiz', birthDate: '1995-08-20', email: 'laura@correo.com' });
    const product = await store.saveProduct({ name: 'Té', description: 'Té verde', stock: 4, unitPrice: 6000 });
    await store.createSale(client.id, [{ productId: product.id, quantity: 1 }]);
    await expect(store.deleteClient(client.id)).rejects.toThrow('ventas registradas');
    await expect(store.deleteProduct(product.id)).rejects.toThrow('historial de ventas');
  });
});
