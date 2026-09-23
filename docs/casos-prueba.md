# Casos de Prueba (QA)

| ID | Mensaje (Input Telegram) | JSON Groq Esperado | Impacto (Sheets / Calendar) | Respuesta Telegram (Output) |
|---|---|---|---|---|
| 01 | "Comprar leche" | `intencion: crear`, `datos.titulo: "Comprar leche"`, `datos.lista: "Personal"` | Insert Tareas (estado=Pendiente). | "✅ Creada: Comprar leche (Personal)" |
| 02 | "Reunión de equipo mañana a las 10" | `intencion: crear`, `datos.tipo: "reunion"`, `datos.fecha: "[MAÑANA]"`, `datos.hora: "10:00"` | Insert Tareas. Create Event en Calendar. | "📅 Reunión agendada para mañana a las 10:00." |
| 03 | "Cancelar la reunión" | `intencion: cancelar`, `datos.termino_busqueda: "reunion"` | Búsqueda Tareas. Insert Confirmaciones. | (Botones Inline): "¿Seguro que deseas cancelar 'Reunión de equipo'? [Sí] [No]" |
| 04 | (Clic en botón Sí) | Callback Query (Make Router) | Update Tareas (Cancelada). Delete Calendar Event. Update Confirmaciones. | "🗑️ Tarea cancelada y eliminada del calendario." |
| 05 | "Ya pagué la luz" | `intencion: completar`, `datos.termino_busqueda: "luz"` | Update Tareas (Hecha). Delete Calendar Event. | "🎉 ¡Excelente! 'Pagar la luz' marcada como Hecha." |
| 06 | Comando `/hoy` | Router directo (Sin Groq) | Select Tareas where fecha=Hoy and estado=Pendiente | Lista de tareas ordenada según reglas. |
| 07 | Audio > 60 seg | Router directo (Valida Size/Dur) | Insert Registro (Error). | "⚠️ El audio supera los 60 segs. Envía uno más corto." |
| 08 | Mensaje ambiguo: "Bórralo" | `intencion: aclarar`, `mensaje_aclaracion: "¿Qué tarea..."` | Ninguno. | "¿Qué tarea deseas cancelar o borrar?" |
| 09 | "Pasa la junta para el viernes a las 4pm" | `intencion: posponer`, `datos.termino_busqueda: "junta"`, `datos.nueva_fecha: "[VIERNES]"`, `datos.nueva_hora: "16:00"` | Update Tareas (fecha/hora). Update Calendar Event. | "🕒 'Junta' pospuesta para el Viernes a las 16:00." |
| 10 | Chat ID incorrecto | Webhook inicial (Filtro) | Ninguno. | (Silencio, no autorizado). |
