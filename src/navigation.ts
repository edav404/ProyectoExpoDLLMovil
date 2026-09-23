import type { Role } from './types';

export const primaryTabs = ['dashboard', 'sale', 'products', 'more'] as const;
export type PrimaryTab = typeof primaryTabs[number];

export const primaryTabLabels: Record<Role, Record<PrimaryTab, string>> = {
  admin: { dashboard: 'Inicio', sale: 'Vender', products: 'Productos', more: 'Más' },
  client: { dashboard: 'Inicio', sale: 'Comprar', products: 'Catálogo', more: 'Más' },
};
