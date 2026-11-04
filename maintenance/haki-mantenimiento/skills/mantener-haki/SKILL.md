---
name: mantener-haki
description: "Usar para mantenimiento de HAKI, revisión del catálogo público y Supabase, consumo del plan gratuito, sincronización de tallas, lentitud, seguridad y preparación de correcciones. Usar también en revisiones programadas de consumo de HAKI."
---

# Mantener HAKI

Consultar [el proyecto y las reglas](references/project.md) antes de actuar.
Usar las conexiones existentes de Supabase y GitHub. Cargar también sus instrucciones vigentes cuando corresponda.
Responder en español con resultados confirmados, fecha de medición, trabajo realizado y límites de la revisión.

## Control de consumo

1. Abrir la página Usage de la organización indicada en project.md con el navegador conectado cuando no exista una herramienta para estas métricas. Mantener «Current billing cycle» y «All projects» para las cuotas compartidas. Leer inicio y fin del ciclo, fecha de actualización, métricas, avisos de prórroga y restricciones.
2. Recoger por separado Egress y Cached Egress; no sumarlos como una cuota intercambiable. Recoger Database Size, Storage Size, funciones, Realtime, usuarios y Logs. Distinguir almacenamiento actual de promedios del ciclo.
3. Ejecutar como máximo una vez [la medición SQL ligera](references/usage-snapshot.sql) por revisión si se necesita tamaño actual. Leer únicamente agregados; no descargar ventas, clientes, fotos o tablas completas. La medición técnica de SQL no sustituye a la medición del panel ni mide transferencia mensual.
4. Preparar un JSON con measured_at ISO, cycle_start/cycle_end ISO, metrics y grace según el contrato en policy.json. Usar null cuando no se pueda verificar una métrica. Cargar [la política](references/policy.json) y ejecutar assessUsage del [evaluador](scripts/usage-budget.mjs), o su interfaz CLI con JSON y política. Confirmar cuotas y estado de aplicación en la documentación/panel vigente antes de cambiar policy.json.
5. Avisar por umbrales 60/75/85 %, previsión de agotamiento antes del cierre o aviso de restricción/prórroga. Informar una medición incompleta como incompleta; nunca convertir falta de acceso en consumo cero ni considerar una prórroga resuelta solo porque el ciclo actual esté bajo cuota.
6. Guardar un resumen fechado sin secretos ni datos de clientes en el destino persistente del usuario cuando se pida un informe. Usar el resultado anterior de la tarea para comparar, deduplicar y seguir tendencias; si no hay una medición comparable del mismo ciclo, etiquetar la proyección lineal como estimación inicial.
7. En ejecución programada, notificar cambios de nivel, previsiones preocupantes, pérdida persistente de acceso a métricas o avisos de restricción próximos. No emitir mensajes diarios cuando todo esté verificado y normal. Mantener un recordatorio breve de una prórroga activa si faltan 3 días o menos; no generar alertas horarias duplicadas.

## Mantenimiento del catálogo

- Identificar la rama actual del repositorio real, leer AGENTS.md aplicables y revisar cambios pendientes antes de editar. Comprobar si una optimización ya existe.
- Comprobar carga y navegación, fotos, selector S/M/L/XL, carrito y sincronización de prendas visibles/ocultas y existencias. Inspeccionar la interfaz antes de concluir que una talla sin seleccionar está agotada.
- Conservar diseño, animaciones, noindex global y consentimiento. Preparar pruebas sin ventas reales ni modificación de stock.
- Revisar consultas duplicadas, respuestas completas innecesarias, tamaños de imagen y caché. Mantener verificación de disponibilidad al comprar; no aplicar caché prolongada a inventario ni datos privados.
- Usar Security/Performance Advisor en revisiones completas o tras cambios relacionados. RLS habilitado sin políticas puede ser deliberado si solo accede el backend; inspeccionar la arquitectura antes de «corregir» permisos.
- Revisar respaldos de base de datos e imágenes por separado. Comprobar restauración únicamente en una copia aislada. Un historial de recuperación dentro de la misma base no equivale a una copia externa.
- Preparar mejoras reversibles en una rama independiente, verificar lo cambiado y abrir PR borrador. Publicar o fusionar solo con autorización del usuario.
- Para retención, identificar candidatos y proponer plazo; no borrar sesiones, archivos ni historial automáticamente sin una regla aprobada y una copia recuperable.

## Evitar que el mantenimiento consuma la cuota

Reutilizar la vigilancia horaria de caídas existente. No duplicarla.
No consultar logs periódicamente. Ante un fallo confirmado, limitar primero a 15 minutos con filtros de servicio y HTTP; ampliar como máximo a 1 hora si es necesario.
No descargar todas las imágenes para probarlas ni crear respaldos completos en cada revisión.
Usar la página Usage para medir consultas de logs, no volver a escanear logs para medirlas.
Si el navegador o una conexión no está disponible, completar las comprobaciones independientes y declarar lo que no se pudo medir. No afirmar que existe vigilancia completa.
