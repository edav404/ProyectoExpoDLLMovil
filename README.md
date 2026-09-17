# VentaLocal

Aplicación móvil offline para administrar clientes, productos y ventas. Está construida con Expo, React Native, Expo Router y TypeScript; no requiere backend ni una base de datos remota.

## Características

- Registro e inicio de sesión con correo, contraseña y rol (`admin` o `client`).
- Gestión de clientes y productos para administradores.
- Catálogo de productos con disponibilidad de stock.
- Registro de ventas con detalle de productos, cantidades, subtotales y total.
- Historial de ventas inmutable: el administrador ve todas las ventas y cada cliente solo consulta las propias.
- Persistencia totalmente local: los datos se guardan con AsyncStorage y la sesión con SecureStore.
- Validaciones de correos únicos, contraseñas, fechas, cantidades, precios y stock.
- Restablecimiento explícito de datos de demostración desde el perfil de administrador.

## Roles

| Rol | Permisos |
| --- | --- |
| Administrador | Gestiona clientes y productos, registra ventas para cualquier cliente y consulta todo el historial. |
| Cliente | Consulta el catálogo, compra productos, actualiza su propia ficha y ve únicamente sus compras. |

## Datos y seguridad local

La aplicación usa un único documento local versionado para guardar usuarios, clientes, productos, encabezados de venta y detalles de venta. Al confirmar una venta, el encabezado, sus detalles y el descuento de stock se actualizan en una sola operación.

Las contraseñas no se guardan en texto plano: se generan con salt aleatorio y hash SHA-256 mediante Expo Crypto. Esta solución es apropiada para una demostración académica local; para producción se requiere autenticación gestionada por un servidor.

En el primer inicio se crea la cuenta administrativa de demostración:

| Campo | Valor |
| --- | --- |
| Correo | `admin@demo.com` |
| Contraseña | `Admin123*` |

## Requisitos

- Node.js LTS.
- npm.
- Expo Go en Android o iOS, o un emulador configurado.

## Instalación y ejecución

```powershell
npm install
npm run start
```

Desde la consola de Expo puedes abrir la aplicación en Android, iOS o web. Para usar un dispositivo físico en la misma red, inicia Expo con LAN:

```powershell
npx expo start --lan
```

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run start` | Inicia el servidor de desarrollo de Expo. |
| `npm run android` | Inicia Expo y abre Android. |
| `npm run ios` | Inicia Expo y abre iOS. |
| `npm run web` | Inicia la versión web. |
| `npm run lint` | Ejecuta ESLint. |
| `npm run typecheck` | Ejecuta la comprobación de tipos de TypeScript. |
| `npm test` | Ejecuta las pruebas con Jest. |

## Reglas de negocio principales

- Los precios y totales se manejan como enteros en pesos colombianos (COP).
- No se permiten ventas vacías, productos agotados ni cantidades mayores al stock disponible.
- Una venta confirmada no se puede editar ni eliminar.
- No se puede eliminar un cliente con ventas o con una cuenta vinculada.
- No se puede eliminar un producto que aparezca en una venta histórica.
- El correo se normaliza y se compara sin distinguir mayúsculas y minúsculas.

## Estructura del proyecto

```text
app/                  Rutas y pantallas de Expo Router
src/components/       Componentes reutilizables de interfaz
src/context/          Estado global y control de permisos
src/services/         Persistencia local y reglas de mutación
src/types.ts          Modelos de dominio
src/utils.ts          Validaciones y formateadores
src/__tests__/        Pruebas unitarias
```

## Verificación

```powershell
npm run typecheck
npm run lint
npm test
```
