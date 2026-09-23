import { primaryTabLabels, primaryTabs } from '../navigation';

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
});
