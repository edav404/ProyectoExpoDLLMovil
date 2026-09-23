# Arquitectura y Diseño del Sistema

## 1. Módulos y Roles
- **Telegram Bot:** Interfaz exclusiva. Soporta `Inline Keyboards` para requerir confirmación en acciones destructivas.
- **Make:** Actúa como backend sin servidor. Se encarga del enrutamiento, validaciones lógicas, llamadas a APIs externas y manejo de errores.
- **Groq:** Motor cognitivo. Convierte notas de voz a texto (Whisper) y extrae entidades del texto a un esquema JSON estricto (LLM). No guarda estado.
- **Google Sheets:** Única fuente de verdad (SSOT). Facilita futuras migraciones (n8n, Supabase).
- **Google Calendar:** Motor de notificaciones. Solo se alimenta de tareas con fecha/hora específica.

## 2. Escenarios de Make (Límite: 2 en MVP Free)

### Escenario 1: Conversacional (Webhook)
Recibe todos los eventos de Telegram.
**Mapa de Rutas (Router):**
1. **Comandos Directos:** (`/hoy`, `/mañana`, `/lista`, `/ayuda`). Lee directamente de Sheets. *Bypass de Groq para ahorrar créditos*.
2. **Audio:** Descarga archivo -> Valida duración (<60s) -> Groq (Whisper) -> Texto -> Pasa a Ruta 3.
3. **Texto (Lenguaje Natural):** Envía texto a Groq (LLM) -> Recibe JSON estructurado -> Router secundario (crear, editar, completar, etc.) -> Sheets/Calendar -> Responde al usuario.
4. **Botones (Callback Query):** Procesa confirmaciones (ej. Cancelar tarea). Ejecuta acción y edita el mensaje en Telegram.
5. **Error/Fallback:** Si algo falla (ej. timeout de Groq), registra en la hoja `Registro` y avisa por Telegram de forma amigable.

### Escenario 2: Resúmenes (Cron)
- **Ejecución 1 (Diario a las 07:00 America/Bogota):** Busca tareas (Atrasadas, Alta, Media, Baja, Sin fecha, Mañana breve). Ordena por hora y fecha de creación. Envía mensaje.
- **Ejecución 2 (Domingo a las 18:00 America/Bogota):** Calcula estadísticas semanales (hechas, canceladas, pendientes) y envía resumen estructurado con observaciones.

## 3. Estrategia de Bajo Consumo (Make Free)
*Límite Free: 1000 operaciones/mes (~32/día).*
- **Estimación Baja (5 msjs/día):** ~15 ops + 2 resúmenes = 17 ops/día (~510/mes).
- **Estimación Media (10 msjs/día):** ~30 ops + 2 resúmenes = 32 ops/día (~960/mes). *Límite.*
- **Estrategias aplicadas:**
  - Los comandos `/` no usan Groq.
  - El resumen semanal usa el mismo escenario del diario mediante filtros de fecha.
  - "Make an API Call" en Sheets permite operaciones masivas en 1 sola operación de Make si es necesario.
