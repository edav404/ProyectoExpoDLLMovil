# Flujos de Lógica de Negocio y Calendar

## 1. Validación de Autorización
**Regla Estricta:** Todo webhook entrante evalúa `message.chat.id` o `callback_query.message.chat.id` contra `Configuracion.authorized_chat_id`. Si no coincide, la ejecución se detiene silenciosamente (sin consumir más créditos).

## 2. Reglas de Interpretación Temporal (`America/Bogota`)
Make debe calcular la fecha y hora *actual* en `America/Bogota` e inyectarla en el prompt de Groq.
Groq es responsable de devolver las fechas en formato ISO `YYYY-MM-DD` y `HH:MM`.
- Si el usuario omite la fecha pero dice una hora, Groq asume hoy (o mañana si la hora ya pasó).
- Ante ambigüedad severa, Groq debe retornar intención `aclarar` en el JSON.

## 3. Lógica de Google Calendar
Solo se dispara un evento a Calendar si:
- Existe `fecha` y `hora` en el payload.
- O si `tipo` es `cita|reunion|compromiso` (incluso si requiere preguntar por la hora primero).

**Operaciones:**
- **Crear:** Inserta en Sheets y hace `Create Event` en Calendar. Extrae el `eventId` y lo guarda en Sheets (`calendar_event_id`).
- **Editar:** Si la fecha/hora/título cambia, y `calendar_event_id` existe, realiza un `Update Event`.
- **Completar / Cancelar:** Dado que Calendar es solo una "proyección de agenda", por defecto los eventos se **eliminan** de Calendar al marcar la tarea como Hecha o Cancelada (`default_calendar_behavior_on_complete = delete_event`). El ID se conserva en Sheets para auditoría, pero no satura la vista del calendario.

## 4. Matriz de Permisos y Acciones Irreversibles

| Acción | Modifica DB | Modifica Calendar | ¿Irreversible? | Requiere Confirmación (Botón) |
|--------|-------------|-------------------|----------------|-------------------------------|
| Crear | Insert | Insert (si aplica) | No | No |
| Editar | Update | Update | No | No |
| Posponer| Update | Update | No | No |
| Completar| Update (`Hecha`) | Delete | No | No |
| Cancelar| Update (`Cancelada`)| Delete | Sí (Lógico) | **SÍ** |
| Ambigüedad (Múltiples hits)| Ninguna | Ninguna | N/A | **SÍ** (Lista de opciones) |

## 5. Eliminación Suave (Soft Delete)
Las tareas no se borran físicamente (Delete Row). "Eliminar" se traduce en actualizar la columna `estado` = `Cancelada` y rellenar `cancelada_en`.
