# Modelo de Datos (Google Sheets)

La estructura está diseñada como una base relacional. Todos los timestamps usan `America/Bogota`.

## 1. Tareas
| Columna | Tipo | Restricciones / Reglas |
|---------|------|------------------------|
| `task_id` | UUID | Llave Primaria (generada por Make). |
| `titulo` | String | Requerido. |
| `descripcion` | String | Opcional. |
| `lista` | String | FK -> Listas.nombre. |
| `prioridad` | Enum | `Alta`, `Media`, `Baja`. |
| `estado` | Enum | `Pendiente`, `En curso`, `Hecha`, `Cancelada`. Default: `Pendiente`. |
| `fecha` | Date | `YYYY-MM-DD`. Opcional. |
| `hora` | Time | `HH:MM`. Opcional. |
| `duracion_min`| Number | Opcional. |
| `tipo` | Enum | `tarea`, `cita`, `reunion`, `compromiso`. Default: `tarea`. |
| `calendar_event_id` | String | Opcional. ID para ubicar el evento en Calendar. |
| `origen` | Enum | `texto`, `voz`. |
| `creada_en` | Timestamp | Automático. |
| `actualizada_en`| Timestamp | Automático. |
| `completada_en` | Timestamp | Opcional. |
| `cancelada_en` | Timestamp | Opcional. |
| `pospuesta_desde` | Timestamp | Opcional. Si fue reprogramada. |

## 2. Listas
| Columna | Tipo | Restricciones / Valores Iniciales |
|---------|------|-----------------------------------|
| `lista_id` | UUID | Llave Primaria. |
| `nombre` | String | Único. Iniciales: `Personal`, `Trabajo`, `Estudio`. |
| `activa` | Boolean | `TRUE` / `FALSE`. Default: `TRUE`. |
| `creada_en`| Timestamp | Automático. |

## 3. Configuracion
| Columna | Tipo | Valores Iniciales | Descripción |
|---------|------|-------------------|-------------|
| `clave` | String | `authorized_chat_id` | PENDIENTE_DE_CONFIGURAR |
| `clave` | String | `timezone` | `America/Bogota` |
| `clave` | String | `daily_summary_time` | `07:00` |
| `clave` | String | `weekly_summary_day` | `Sunday` |
| `clave` | String | `weekly_summary_time` | `18:00` |
| `clave` | String | `calendar_enabled` | `true` |
| `clave` | String | `default_calendar_behavior_on_complete` | `delete_event` |
| `clave` | String | `voice_max_seconds` | `60` |

## 4. Registro (Auditoría)
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `registro_id` | UUID | |
| `fecha_hora` | Timestamp | |
| `accion` | String | Ej: `create_task`, `error_timeout`. |
| `task_id` | String | Opcional. |
| `origen` | Enum | `texto`, `voz`, `sistema`. |
| `mensaje_entrada`| String| El prompt del usuario. |
| `resultado` | Enum | `exito`, `error`, `requiere_confirmacion`. |
| `detalle_error`| String | Stacktrace o motivo. |

## 5. Confirmaciones
Manejo de estado para callbacks asíncronos (Botones de Telegram).
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `confirmation_id`| String | UUID enviado en el `callback_data` de Telegram. |
| `chat_id` | String | Validación de seguridad. |
| `tipo` | String | Ej: `cancelar_tarea`. |
| `payload_json` | JSON | Los datos para ejecutar si el usuario acepta. |
| `estado` | Enum | `pendiente`, `resuelta`, `expirada`. |
| `creada_en` | Timestamp | |
| `vence_en` | Timestamp | `creada_en` + 5 minutos. |
