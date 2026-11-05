# Horario nocturno y atención urgente

## Horario autorizado

El mantenimiento programado de HAKI se realiza de noche, desde las 21:00, zona America/El_Salvador. Incluye revisiones de Supabase, Netlify, catálogo, rendimiento, seguridad y estado de los respaldos. Comprobar la hora local antes de iniciar trabajo rutinario; no adelantarlo por una ejecución flexible. Una ejecución nocturna puede continuar después de medianoche. Las peticiones directas del usuario con otro horario prevalecen.

La vigilancia ligera de caídas existente continúa durante el día para detectar urgencias. No crear otra vigilancia horaria. Las historias de Instagram son una tarea independiente y conservan su horario propio.

El bloque nocturno revisa catálogo, rendimiento y seguridad con alcance ligero, y verifica disponibilidad, integridad registrada y antigüedad de los respaldos. No descarga todas las imágenes, crea copias completas ni ejecuta restauraciones cada noche. Realizar análisis ampliado o respaldos nuevos solo cuando lo justifique un problema, un cambio o una solicitud.

## Autorización permanente para urgencias

El usuario autorizó resolver rápidamente los problemas que requieran atención inmediata, incluso fuera del horario nocturno. Esta autorización permite aplicar y publicar una corrección mínima y reversible sin volver a pedir permiso para esa reparación concreta.

Requieren actuación inmediata una caída confirmada, un fallo que impida ventas u operaciones esenciales, un riesgo activo y verificado de pérdida/corrupción de datos o una exposición crítica confirmada. Un timeout aislado, una alerta informativa, un umbral bajo de presupuesto o una mejora visual no son urgencias. Confirmar con evidencia y una segunda comprobación breve cuando proceda; una limitación de acceso del agente no prueba una caída.

1. Acotar el incidente y localizar su causa con las comprobaciones y límites de logs existentes. Consultar la rama/estado actual y preservar cambios ajenos.
2. Elegir la solución mínima con reversión conocida. Antes de tocar datos, conservar una copia recuperable del alcance afectado; no usar una copia antigua como garantía de cambios nuevos.
3. Verificar el arreglo con las comprobaciones pertinentes, aplicarlo mediante conexiones autorizadas y comprobar el servicio después. Un despliegue urgente debe contener únicamente la reparación; no fusionar otras mejoras pendientes.
4. Si empeora o falla la comprobación, revertir el cambio cuando sea seguro y verificar el resultado. Si el acceso o las capacidades no permiten resolverlo, comunicar qué sigue fallando y qué acción necesita el usuario.
5. Tras una incidencia real, informar brevemente problema, reparación o bloqueo, evidencia de recuperación y cualquier límite. No declarar resuelto algo que no se verificó.

Esta autorización no permite compras, cambios de plan/pago/auto recarga, borrado irreversible de ventas/historial/fotos, cambios comerciales de stock/precios/estados, migraciones destructivas ni reducir seguridad como atajo. Las confirmaciones obligatorias de la plataforma siguen aplicándose.

Las mejoras que puedan esperar se trabajan en el bloque nocturno; preparar correcciones verificadas en una rama y mantener la autorización de publicación habitual fuera de la excepción urgente. No convertir la revisión de respaldos en una limpieza programada.
