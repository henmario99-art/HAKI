# Respaldar y recuperar HAKI

## Alcance

Crear un respaldo lógico de la aplicación a partir de [backup-export.sql](backup-export.sql). Incluir tablas, restricciones, índices, funciones, disparadores, RLS y permisos; conservar todos los datos operativos y las copias internas. Excluir sesiones vigentes y credenciales. Registrar metadata de Storage y descargar los objetos públicos del bucket previsto, conservando una relación de rutas, tamaños y SHA-256.

Distinguir un respaldo de aplicación de un pg_dump completo del proyecto: no incluye Auth administrado por Supabase, secretos, configuración del alojamiento ni servicios de plataforma. Registrar los trabajos cron como instrucciones de aprovisionamiento, sin ejecutarlos al restaurar localmente. Las imágenes ya alojadas en GitHub tienen su propio respaldo en ese repositorio; guardar su referencia exacta.

## Crear una copia consistente

1. Verificar los esquemas actuales y actualizar el exportador si cambiaron. Ejecutar una sola sentencia de exportación para que los datos operativos compartan una instantánea.
2. Para una salida grande, comprimir/cifrar la exportación con pgcrypto y una clave de transporte temporal creada con un generador criptográfico; transferirla en fragmentos manejables y descifrarla fuera de producción. No escribir una tabla temporal ni una copia adicional en Supabase.
3. Conservar el JSON original como texto. No volver a serializar números JSON si se necesita conservar exactamente su representación decimal. [backup-restore.mjs](../scripts/backup-restore.mjs) ofrece extractRawTableData y renderApplicationSql.
4. Descargar fotos solo cuando se solicite un respaldo, con concurrencia limitada. Usar origen fijo, rutas codificadas y validación de tamaño. Si falta un archivo o cambia, no declarar que la copia está completa.
5. Validar recuentos y huellas de contenido por tabla, tamaños y SHA-256 de fotos, y la integridad del archivo final.
6. Guardar el respaldo privado y comprobar el éxito del guardado antes de cualquier limpieza. No subir datos privados a GitHub ni al paquete del complemento.

## Probar recuperación

Restaurar el SQL en PostgreSQL 17 aislado y vacío. El generador debe impedir restaurar sobre tablas HAKI existentes. Crear los roles necesarios sin incluir contraseñas, cargar los datos antes de activar los disparadores y restituir RLS y permisos.

Comparar count y MD5 calculado sobre las filas JSONB ordenadas con la instantánea original. Comprobar restricciones de stock y rechazo de escrituras anónimas. Restaurar y verificar también los archivos por sus hashes. Indicar qué conexiones externas no se probaron: una prueba local no valida por sí sola Netlify, Auth o las subidas al Storage de otro proyecto.

## Limpieza de sesiones

La regla conservadora aplicada en el mantenimiento autorizado es limpiar solo public.haki_sessions con expires_at anterior al corte respaldado y con más de siete días de vencimiento. Conservar sesiones vigentes y vencidas recientemente. No extender esta regla a ventas, inventario, imágenes o históricos.

Antes de limpiar:
- Conservar las filas candidatas en una copia privada recuperable, con su corte y huella SHA-256.
- Probar en una copia que una sesión vigente o vencida recientemente permanece.
- Comprobar nuevamente los candidatos en producción sin leer tokens en la salida del informe.
- Usar cleanupExpiredSql con máximo de filas, cantidad esperada y huella de los candidatos. El SQL bloquea candidatos, revalida su expiración y elimina solo si coincide el alcance esperado.
- Verificar cantidad eliminada, sesiones restantes y disponibilidad del servicio. Si no coincide la huella, no limpiar ni ampliar el criterio automáticamente.

La autorización de continuar el mantenimiento permite esta limpieza concreta; no crea por sí sola un trabajo programado de borrado. Una ejecución posterior requiere el alcance autorizado y una copia nueva de sus propios candidatos.
