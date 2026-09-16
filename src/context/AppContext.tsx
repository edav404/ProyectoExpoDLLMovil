import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { localStore } from '../services/storage';
import type { AppData, CartLine, ClientInput, ProductInput, RegisterInput, User } from '../types';

interface AppContextValue {
  ready: boolean;
  data: AppData | null;
  user: User | null;
  login(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  saveClient(input: ClientInput, id?: string): Promise<void>;
  deleteClient(id: string): Promise<void>;
  saveProduct(input: ProductInput, id?: string): Promise<void>;
  deleteProduct(id: string): Promise<void>;
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
      setUserId(signedIn.id);
    },
    register: async (input) => {
      const registered = await localStore.register(input);
      sync();
      setUserId(registered.id);
    },
    logout: async () => {
      await localStore.setSession(null);
      setUserId(null);
    },
    saveClient: async (input, id) => {
      if (activeUser?.role !== 'admin' && (!id || activeUser?.clientId !== id)) throw new Error('No tienes permiso para editar este cliente.');
      await localStore.saveClient(input, id); sync();
    },
    deleteClient: async (id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      await localStore.deleteClient(id); sync();
    },
    saveProduct: async (input, id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      await localStore.saveProduct(input, id); sync();
    },
    deleteProduct: async (id) => {
      if (activeUser?.role !== 'admin') throw new Error('No tienes permiso para realizar esta acción.');
      await localStore.deleteProduct(id); sync();
    },
    createSale: async (clientId, lines) => {
      if (!activeUser) throw new Error('Tu sesión ya no está disponible.');
      if (activeUser.role === 'client' && activeUser.clientId !== clientId) throw new Error('No puedes registrar ventas para otro cliente.');
      const sale = await localStore.createSale(clientId, lines); sync(); return sale.id;
    },
    reset: async () => {
      if (activeUser?.role !== 'admin') throw new Error('Solo un administrador puede restaurar los datos locales.');
      setData(await localStore.reset()); setUserId(null);
    },
  }), [activeUser, data, ready, sync, userId]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider.');
  return context;
}
