# VentaLocal

Aplicación móvil offline para administrar clientes, productos y ventas. Está construida con Expo, React Native, Expo Router y TypeScript; no requiere backend ni una base de datos remota.

## Características

- **Registro de usuario (HU-01)**: Formulario simplificado con correo electrónico y contraseña. Las cuentas nacen en estado `pending` (pendiente de aprobación).
- **Gestión y aprobación de cuentas (HU-02)**: Pantalla de administración para activar o inactivar cuentas de usuario y asignar roles (`admin` o `client`). Al activar un cliente, se genera automáticamente su ficha inicial.
- **Gestión de clientes (HU-03)**: Registro y edición con datos separados de `firstName` (nombre), `lastName` (apellido), correo y fecha de registro.
- **Compra y perfil obligatorio (HU-04)**: Pantalla de compras con validación estricta de perfil completo. Si el cliente no ha completado sus nombres/apellidos en su perfil, se requiere completarlo antes de realizar compras.
- **Gestión de productos y stock**: Catálogo de productos con disponibilidad, control de inventario y descuento automático de stock al efectuar ventas.
- **Historial de ventas**: Historial inmutable de compras por cliente y vista global para administradores.
- **Persistencia y seguridad local**: Almacenamiento en AsyncStorage y SecureStore con hash SHA-256 + salt para contraseñas.

## Roles y Estados de Cuenta

| Rol / Estado | Descripción |
| --- | --- |
| `pending` | Cuenta recién registrada. Requiere que un Administrador la active antes de permitir el inicio de sesión. |
| `active` | Cuenta activada por el Administrador. |
| Administrador | Gestiona clientes, productos, usuarios/aprobaciones, realiza ventas para cualquier cliente y consulta el historial global. |
| Cliente | Consulta el catálogo, completa su perfil personal, realiza compras (descontando stock) y consulta su historial personal de compras. |

## Datos y seguridad local

La aplicación usa un único documento local versionado para guardar usuarios, clientes, productos, encabezados de venta y detalles de venta. Al confirmar una venta, el encabezado, sus detalles y el descuento de stock se actualizan en una sola operación.

Las contraseñas no se guardan en texto plano: se generan con salt aleatorio y hash SHA-256 mediante Expo Crypto.

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

### Ejecución con Túnel Expo

Para probar la aplicación en dispositivos móviles fuera de la red local o mediante túnel seguro ngrok:

```powershell
npx expo start --tunnel
```

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run start` | Inicia el servidor de desarrollo de Expo. |
| `npx expo start --tunnel` | Inicia Expo con túnel accesible globalmente. |
| `npm run android` | Inicia Expo y abre Android. |
| `npm run ios` | Inicia Expo y abre iOS. |
| `npm run web` | Inicia la versión web. |
| `npm run lint` | Ejecuta ESLint. |
| `npm run typecheck` | Ejecuta la comprobación de tipos de TypeScript. |
| `npm test` | Ejecuta las pruebas con Jest. |

## Reglas de negocio principales

- El usuario registrado requiere aprobación (`status: 'active'`) por un administrador para poder iniciar sesión.
- Un cliente no puede realizar compras hasta haber completado su perfil (nombre y apellido obligatorios).
- Los precios y totales se manejan como enteros en pesos colombianos (COP).
- No se permiten ventas vacías, productos agotados ni cantidades mayores al stock disponible.
- Una venta confirmada no se puede editar ni eliminar y descuenta automáticamente el stock del producto.
- El correo se normaliza y se compara sin distinguir mayúsculas y minúsculas.

## Estructura del proyecto

```text
app/(auth)/           Pantallas de Login y Registro
app/(app)/            Pantallas principales (Dashboard, Clientes, Productos, Compra, Historial, Usuarios, Perfil)
src/components/       Componentes reutilizables de interfaz
src/context/          Estado global, sesión y control de permisos
src/services/         Persistencia local, autenticación y reglas de mutación
src/types.ts          Modelos de dominio (User, Client, Product, SaleHeader, SaleDetail)
src/utils.ts          Validaciones y formateadores
src/__tests__/        Pruebas unitarias con Jest
```

## Verificación

```powershell
npm run typecheck
npm run lint
npm test
```

