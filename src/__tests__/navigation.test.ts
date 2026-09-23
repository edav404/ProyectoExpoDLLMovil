import { breadcrumbs, primaryTabLabels, primaryTabs } from '../navigation';

describe('navegación principal', () => {
  it('mantiene cuatro accesos principales para cada rol', () => {
    expect(primaryTabs).toEqual(['dashboard', 'sale', 'products', 'more']);
    expect(Object.keys(primaryTabLabels.admin)).toHaveLength(4);
    expect(Object.keys(primaryTabLabels.client)).toHaveLength(4);
  });

  it('adapta las etiquetas operativas al rol', () => {
    expect(primaryTabLabels.admin.sale).toBe('Vender');
    expect(primaryTabLabels.client.sale).toBe('Comprar');
    expect(primaryTabLabels.client.products).toBe('Catálogo');
  });

  it('arma la miga para volver sin enlazar la pantalla actual', () => {
    expect(breadcrumbs('/history', 'admin').map((crumb) => crumb.label)).toEqual(['Inicio', 'Más', 'Historial']);
    expect(breadcrumbs('/history', 'admin').at(-1)?.href).toBeUndefined();
    expect(breadcrumbs('/history', 'admin')[0].href).toBe('/dashboard');
    expect(breadcrumbs('/sale', 'client').map((crumb) => crumb.label)).toEqual(['Inicio', 'Comprar']);
    expect(breadcrumbs('/', null)).toEqual([{ label: 'Inicio' }]);
  });
});
