# VentaLocal

Aplicación móvil para registrar clientes, productos y ventas en el dispositivo. Usa Expo, React Native, Expo Router y TypeScript. Los datos de negocio viven en SQLite (`ventalocal.db`); no hace falta un servidor. La sesión sigue en el almacenamiento seguro del dispositivo. Si había un documento anterior, la primera apertura lo importa a las tablas y lo retira.

## Venta

El administrador completa la venta en tres pasos: productos, cliente y resumen. El cliente autenticado omite la elección de cliente y compra solo para su perfil.

- En cada paso se ven el subtotal de cada producto, el total, el cliente y la fecha.
- No se puede continuar sin productos, con una cantidad mayor al stock o sin cliente.
- Desde el resumen se pueden cambiar productos o cliente sin borrar el resto.
- Al confirmar, la venta, sus detalles y el descuento de stock se guardan juntos. Si el stock no alcanza, no se modifica nada.
- El comprobante muestra el resultado y permite empezar otra venta o abrir el historial.

### Cliente invitado

Las ventas sin registro usan un cliente fijo, `Cliente invitado`. El encabezado siempre guarda un id de cliente. Ese registro no se edita ni se elimina. Solo el administrador puede usarlo. Un cliente con sesión no puede comprar a nombre de otra persona ni como invitado.

### Cliente nuevo

Durante la venta, el administrador puede crear un cliente con nombre, apellido y correo. La fecha de nacimiento sigue siendo opcional. El cliente queda seleccionado para el resumen.

## Etiquetas

Cada producto puede tener varias etiquetas, por ejemplo Bebidas o Snacks. Se crean, renombran y eliminan desde el formulario de producto. El nombre es único, sin distinguir mayúsculas.

- Editar un producto solo cambia sus etiquetas.
- Eliminar un producto deja las etiquetas en el catálogo.
- Eliminar una etiqueta la quita de todos los productos y no cambia stock, precios ni ventas.
- En el catálogo, el inventario y la venta, varias etiquetas se combinan con **o**: aparece el producto si tiene al menos una de las elegidas. El texto de búsqueda se aplica además de ese filtro.
- Si no hay coincidencias, la lista muestra un estado vacío.

## Roles

| Rol | Qué puede hacer |
| --- | --- |
| Administrador | Clientes, productos, etiquetas, ventas para cualquier cliente o invitado, egresos, reportes e historial. |
| Cliente | Su perfil, el catálogo y sus propias compras. No compra si el perfil está incompleto o si no hay productos. |

La cuenta de demostración es `admin@demo.com` / `Admin123*`.

## Decisiones de diseño

- El contenido se centra y no pasa de 760 px en pantallas anchas. En el teléfono usa el ancho disponible.
- La acción principal de la venta queda en una barra sobre el menú. Los demás botones son secundarios.
- Los errores de la venta se muestran en la pantalla, no solo en un alerta. El éxito es el comprobante.
- Los botones de toque mantienen al menos 44 px de alto.

## Scripts

```bash
npm install
npm run start
npm run typecheck
npm run lint
npm test
```
