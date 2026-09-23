import { calculateCartTotal, canSellForClient, clientLabel, filterProducts, normalizeEmail, validateBirthDate, validatePassword, validateProduct } from '../utils';
import type { Product } from '../types';

describe('reglas de VentaLocal', () => {
  it('normaliza correos para detectar duplicados', () => {
    expect(normalizeEmail('  USUARIO@Correo.COM ')).toBe('usuario@correo.com');
  });

  it('valida contraseñas con los requisitos mínimos', () => {
    expect(validatePassword('Admin123*')).toBe(true);
    expect(validatePassword('solominusculas')).toBe(false);
  });

  it('rechaza fechas futuras o con formato inválido', () => {
    expect(validateBirthDate('2000-02-29')).toBe(true);
    expect(validateBirthDate('2999-01-01')).toBe(false);
    expect(validateBirthDate('01/01/2000')).toBe(false);
  });

  it('exige stock y precio enteros no negativos', () => {
    expect(() => validateProduct({ name: 'Café', description: 'Bolsa de café', stock: 2, unitPrice: 18000 })).not.toThrow();
    expect(() => validateProduct({ name: 'Café', description: 'Bolsa de café', stock: -1, unitPrice: 18000 })).toThrow('stock');
  });

  it('calcula el total de las líneas del carrito', () => {
    const products: Product[] = [
      { id: 'a', name: 'A', description: 'A', stock: 5, unitPrice: 1200, tagIds: [] },
      { id: 'b', name: 'B', description: 'B', stock: 3, unitPrice: 2500, tagIds: ['bebidas'] },
    ];
    expect(calculateCartTotal(products, [{ productId: 'a', quantity: 2 }, { productId: 'b', quantity: 1 }])).toBe(4900);
  });

  it('identifica al cliente invitado y limita la venta del rol cliente', () => {
    expect(clientLabel({ firstName: 'Cliente', lastName: 'invitado', email: 'invitado@ventalocal.local', isGuest: true })).toBe('Cliente invitado');
    expect(clientLabel(null)).toBe('Sin seleccionar');
    expect(canSellForClient('admin', undefined, 'otro')).toBe(true);
    expect(canSellForClient('client', 'propio', 'propio')).toBe(true);
    expect(canSellForClient('client', 'propio', 'otro')).toBe(false);
  });

  it('filtra por texto y por una o varias etiquetas', () => {
    const products: Product[] = [
      { id: 'a', name: 'Jugo', description: 'Natural', stock: 2, unitPrice: 1000, tagIds: ['bebidas'] },
      { id: 'b', name: 'Galletas', description: 'Dulces', stock: 2, unitPrice: 1000, tagIds: ['snacks'] },
      { id: 'c', name: 'Combo', description: 'Jugo y galletas', stock: 2, unitPrice: 1000, tagIds: ['bebidas', 'snacks'] },
    ];
    expect(filterProducts(products, 'jugo', []).map((item) => item.id)).toEqual(['a', 'c']);
    expect(filterProducts(products, '', ['bebidas', 'snacks']).map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(filterProducts(products, 'galletas', ['bebidas']).map((item) => item.id)).toEqual(['c']);
    expect(filterProducts(products, 'galletas', ['hogar'])).toEqual([]);
  });
});
