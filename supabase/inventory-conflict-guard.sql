CREATE OR REPLACE FUNCTION public.haki_set_inventory(p_product_code text, p_product_id bigint, p_stock jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s text;
  q integer;
  out jsonb := '{}'::jsonb;
  resolved_code text;
  current_qty integer;
begin
  resolved_code := upper(trim(coalesce(p_product_code, '')));

  if resolved_code = '' and p_product_id is not null then
    select upper(trim(product_code))
      into resolved_code
    from public.haki_inventory
    where product_id = p_product_id
      and nullif(trim(product_code), '') is not null
    order by updated_at desc
    limit 1;
  end if;

  if coalesce(resolved_code, '') = '' and p_product_id is not null then
    resolved_code := '__ID_' || p_product_id::text || '__';
  end if;

  if coalesce(resolved_code, '') = '' then
    raise exception 'Código de producto inválido.';
  end if;

  foreach s in array array['S','M','L','XL'] loop
    select quantity into current_qty from public.haki_inventory
    where product_code=resolved_code and size=s for update;
    if p_stock ? '__expected' and coalesce(current_qty,0) <> coalesce((p_stock->'__expected'->>s)::integer,0) then
      raise exception 'El inventario cambió en otra ventana o venta. Recarga y revisa las cantidades antes de guardar.';
    end if;
    q := coalesce(nullif(p_stock->>s,'')::integer,0);
    if q < 0 then raise exception 'Las cantidades deben ser números enteros de cero o más.'; end if;

    insert into public.haki_inventory(product_code,size,product_id,quantity,updated_at)
    values(resolved_code,s,p_product_id,q,now())
    on conflict(product_code,size) do update
      set product_id = coalesce(excluded.product_id, public.haki_inventory.product_id),
          quantity = excluded.quantity,
          updated_at = now();

    out := out || jsonb_build_object(s,q);
  end loop;

  return out;
end;
$function$
;
