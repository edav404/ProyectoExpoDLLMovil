import type { Role } from './types';

export interface Crumb { label: string; href?: string }

export const primaryTabs = ['dashboard', 'sale', 'products', 'more'] as const;
export type PrimaryTab = typeof primaryTabs[number];

export const primaryTabLabels: Record<Role, Record<PrimaryTab, string>> = {
  admin: { dashboard: 'Inicio', sale: 'Vender', products: 'Productos', more: 'Más' },
  client: { dashboard: 'Inicio', sale: 'Comprar', products: 'Catálogo', more: 'Más' },
};

/** Recorrido fijo para volver. El último elemento es la pantalla actual y no navega. */
export function breadcrumbs(pathname: string, role: Role | null): Crumb[] {
  const segment = pathname.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  const home: Crumb = { label: 'Inicio', href: role ? '/dashboard' : '/' };
  const more: Crumb = { label: 'Más', href: '/more' };
  const here = (label: string): Crumb => ({ label });
  const saleLabel = role === 'client' ? 'Comprar' : 'Vender';
  const productLabel = role === 'client' ? 'Catálogo' : 'Productos';
  const historyLabel = role === 'client' ? 'Mis compras' : 'Historial';
  const trails: Record<string, Crumb[]> = {
    '': [here('Inicio')],
    dashboard: [here('Inicio')],
    login: [home, here('Iniciar sesión')],
    register: [home, here('Registro')],
    sale: [home, here(saleLabel)],
    products: [home, here(productLabel)],
    more: [home, here('Más')],
    clients: [home, more, here('Clientes')],
    users: [home, more, here('Usuarios')],
    history: [home, more, here(historyLabel)],
    reports: [home, more, here('Reportes')],
    expenses: [home, more, here('Egresos')],
    profile: [home, more, here('Perfil')],
  };
  return (trails[segment] ?? [home, here('Pantalla')]).map((crumb, index, trail) => (
    index === trail.length - 1 ? { label: crumb.label } : crumb
  ));
}
