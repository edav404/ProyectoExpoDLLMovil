import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { localStore } from '../services/storage';
import type { ActivateUserInput, AppData, CartLine, Client, ClientInput, ExpenseInput, Product, ProductInput, RegisterInput, Tag, User } from '../types';
import { canSellForClient } from '../utils';

interface AppContextValue {
  ready: boolean;
  data: AppData | null;
  user: User | null;
  login(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  activateUser(input: ActivateUserInput): Promise<void>;
  saveClient(input: ClientInput, id?: string): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  saveProduct(input: ProductInput, id?: string): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  saveTag(name: string, id?: string): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  saveExpense(input: ExpenseInput, id?: string): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  createSale(clientId: string, lines: CartLine[]): Promise<string>;
  reset(): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const sync = useCallback(() => setData(localStore.snapshot()), []);
  const activeUser = data?.users.find((item) => item.id === userId) ?? null;

  useEffect(() => {
    void (async () => {
      const loaded = await localStore.initialize();
      setData(loaded);
      const session = await localStore.getSession();
      setUserId(session?.userId ?? null);
      setReady(true);
    })();
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    ready,
    data,
    user: activeUser,
    login: async (email, password) => {
      const signedIn = await localStore.login(email, password);
      sync();
      setUserId(signedIn.id);
    },
    /**
     * Registra al visitante con estado "pending". NO inicia sesión automáticamente.
     * La UI debe mostrar un mensaje de pendiente de aprobación.
     */
    register: async (input) => {
      await localStore.register(input);
      sync();
      // No llamamos setUserId: el usuario debe esperar aprobación del admin.
    },
    logout: async () => {
      await localStore.setSession(null);
      setUserId(null);
    },
    activateUser: async (input) => {
      if (activeUser?.role !== 'admin') throw new Error('Solo un administrador puede activar cuentas.');
      await localStore.activateUser(input);
      sync();
    },
    saveClient: async (input, id) => {
      if (activeUser?.role !== 'admin' && (!id || activeUser?.clientId !== id)) throw new Error('No tienes permiso para editar este cliente.');
      const saved = await localStore.saveClient(input, id); sync(); return saved;
    },
    deleteClient: async (id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      await localStore.deleteClient(id); sync();
    },
    saveProduct: async (input, id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      const saved = await localStore.saveProduct(input, id); sync(); return saved;
    },
    deleteProduct: async (id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      await localStore.deleteProduct(id); sync();
    },
    saveTag: async (name, id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      const saved = await localStore.saveTag(name, id); sync(); return saved;
    },
    deleteTag: async (id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      await localStore.deleteTag(id); sync();
    },
    saveExpense: async (input, id) => {
      if (activeUser?.role !== 'admin') throw new Error('Solo un administrador puede gestionar egresos.');
      await localStore.saveExpense(input, id); sync();
    },
    deleteExpense: async (id) => {
      if (activeUser?.role !== 'admin') throw new Error('Solo un administrador puede gestionar egresos.');
      await localStore.deleteExpense(id); sync();
    },
    createSale: async (clientId, lines) => {
      if (!activeUser) throw new Error('Tu sesión ya no está disponible.');
      if (!canSellForClient(activeUser.role, activeUser.clientId, clientId)) throw new Error('No puedes registrar ventas para otro cliente.');
      const sale = await localStore.createSale(clientId, lines); sync(); return sale.id;
    },
    reset: async () => {
      if (activeUser?.role !== 'admin') throw new Error('Solo un administrador puede restaurar los datos locales.');
      setData(await localStore.reset()); setUserId(null);
    },
  }), [activeUser, data, ready, sync]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider.');
  return context;
}
