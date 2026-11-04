# Proyecto HAKI

- Catálogo: https://haki-sv.netlify.app/
- Panel: https://haki-sv.netlify.app/admin/sales.html
- Repositorio real: https://github.com/henmario99-art/HAKI
- Rama principal: main. Verificar el HEAD actual en cada intervención.
- Supabase: uysfqzlihiosebqzvfrl.
- Organización: dymrbrtdblbpfpfktyej.
- Usage: https://supabase.com/dashboard/org/dymrbrtdblbpfpfktyej/usage
- Zona horaria: America/El_Salvador.
- Vigilancia horaria existente: Errores de HAKI. Mantener su propósito y no crear otra vigilancia de caídas.

## Reglas autorizadas

Revisar, medir y preparar correcciones verificadas. Publicar cambios requiere autorización.
Precios, cantidades, estados de ventas, eliminaciones y migraciones de producción requieren una instrucción concreta o una política expresamente aprobada.
Conservar tallas S/M/L/XL, ocultar agotadas y reaparecer al reponer respetando ocultación manual, ventas archivadas, diseño y animaciones actuales.
Conservar noindex global y acceso directo por enlace. No cambiar consentimiento ni seguimiento por una optimización de consumo.
No incluir credenciales, cookies, tokens, datos personales de compradores ni metadatos privados de ventas en informes, GitHub o paquetes.

## Arquitectura verificada el 4 de noviembre de 2026

Verificar de nuevo antes de basarse en estos detalles:
- Imágenes públicas de Supabase pasan por netlify/functions/catalog-image.mjs con caché y validación de ruta.
- image-delivery.js conserva originales para detalle/zoom y usa miniaturas de Netlify para listados.
- online-catalog.js y catalog-loader.js coordinan refrescos; hay pruebas en scripts/test-catalog-refresh.mjs y scripts/test-image-delivery.mjs.
- admin/admin.js convierte cargas habituales a WebP con límite de 1600 px y conserva un camino preserveQuality; revisar portadas antes de tocarlo.
- supabase/functions/haki-operations/index.ts implementa las operaciones de backend.
- Tablas públicas incluyen haki_inventory, haki_sales, haki_sales_history, haki_recovery_snapshots, haki_sessions y haki_meta. Reinspeccionar columnas antes de consultas específicas.
- RLS sin políticas bloquea el acceso público a filas; el backend usa credenciales privadas. Verificar grants y operaciones antes de añadir políticas para eliminar un aviso informativo.

## Fuentes de referencia

https://supabase.com/docs/guides/platform/manage-your-usage
https://supabase.com/docs/guides/platform/manage-your-usage/egress
https://supabase.com/docs/guides/platform/manage-your-usage/logs-query
https://supabase.com/docs/guides/storage/production/scaling
https://supabase.com/docs/guides/platform/backups
