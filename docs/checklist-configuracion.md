# Checklist de Configuración Manual

*IMPORTANTE: No documentar secretos (API Keys, Tokens) en este archivo ni en repositorios.*

## 1. Telegram (BotFather)
- [ ] Enviar `/newbot` a `@BotFather`.
- [ ] Asignar nombre y username (ej. `MisPendientesBot`).
- [ ] Copiar el **Bot Token** de forma segura.
- [ ] Configurar menú de comandos (`/setcommands`):
  ```
  hoy - Ver pendientes de hoy
  mañana - Ver tareas de mañana
  semana - Resumen semanal
  lista - Ver listas disponibles
  ayuda - Instrucciones de uso
  ```
- [ ] Enviar un mensaje al bot desde tu cuenta. Entrar a `https://api.telegram.org/bot<TOKEN>/getUpdates` para extraer tu `chat_id`.

## 2. Groq
- [ ] Entrar a `console.groq.com`.
- [ ] Generar **API Key**. 
- [ ] (Opcional) Seleccionar modelo preferido para Whisper y LLM (ej. `llama3-70b-8192` o `mixtral-8x7b-32768`).

## 3. Google Sheets
- [ ] Crear el archivo "Gestor personal de pendientes".
- [ ] Crear las pestañas: `Tareas`, `Listas`, `Configuracion`, `Registro`, `Confirmaciones`.
- [ ] Añadir los encabezados definidos en `modelo-datos.md`.
- [ ] Llenar la pestaña `Configuracion` y reemplazar `PENDIENTE_DE_CONFIGURAR` con el `chat_id` obtenido en el Paso 1.

## 4. Google Calendar
- [ ] Crear un nuevo calendario (Settings > Add calendar) llamado "Pendientes Bot".
- [ ] Obtener el **Calendar ID** (ej. `tu_correo@group.calendar.google.com`).

## 5. Make
- [ ] Crear Escenario 1: Conversacional.
  - Añadir Webhook de Telegram.
  - Conectar Groq, Google Sheets y Google Calendar.
  - Implementar filtro inicial para `chat_id`.
- [ ] Crear Escenario 2: Resúmenes.
  - Configurar trigger cron (07:00 todos los días, `America/Bogota`).
  - Clonar para Domingo 18:00.

## Criterios de Aceptación (MVP)
- [ ] Solo el usuario autorizado recibe respuestas del bot.
- [ ] El audio transcribe correctamente y estructura los datos.
- [ ] Las fechas y horas se manejan de forma consistente en `America/Bogota`.
- [ ] Una tarea completada o cancelada elimina su bloque en Calendar automáticamente.
- [ ] Cancelar una tarea dispara obligatoriamente los botones `[Sí] [No]`.
- [ ] El consumo mensual proyectado se mantiene debajo de las 1000 operaciones de Make.
