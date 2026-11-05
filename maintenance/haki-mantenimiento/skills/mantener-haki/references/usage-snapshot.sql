-- Solo lectura. No expone filas, nombres de archivos, clientes ni credenciales.
-- Uso tecnico actual: no sustituye la medicion de cuota del panel.
SELECT jsonb_build_object(
  'measured_at', now(),
  'database_bytes', pg_database_size(current_database()),
  'storage', (
    SELECT jsonb_build_object(
      'object_count', count(*),
      'bytes_from_metadata', coalesce(sum(
        CASE WHEN metadata->>'size' ~ '^[0-9]+$'
          THEN (metadata->>'size')::numeric ELSE 0 END
      ), 0),
      'objects_without_size', count(*) FILTER (
        WHERE metadata->>'size' IS NULL OR NOT (metadata->>'size' ~ '^[0-9]+$')
      )
    ) FROM storage.objects
  ),
  'largest_public_tables', (
    SELECT coalesce(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT relname AS table_name, pg_total_relation_size(relid) AS total_bytes
      FROM pg_catalog.pg_statio_user_tables WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC LIMIT 10
    ) t
  )
) AS usage_snapshot;
