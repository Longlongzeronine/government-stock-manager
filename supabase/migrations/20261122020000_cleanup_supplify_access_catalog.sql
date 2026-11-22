-- Remove permissions that belonged to the reference cooperative system rather
-- than Supplify. This follow-up also repairs environments where the earlier
-- draft of the access-control migration was already recorded as executed.

delete from public.permission_catalog
where module_key not in (
  'dashboard', 'inventory', 'scanner', 'ris_history', 'forms',
  'requisitions', 'stock', 'categories', 'suppliers', 'assistant',
  'approvals', 'user_access', 'audit_logs', 'dev_space', 'migrations'
);

create or replace function public.normalize_user_access(_access jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_module record;
  v_actions jsonb;
begin
  if _access is null or jsonb_typeof(_access) <> 'object' then
    return '{}'::jsonb;
  end if;

  for v_module in
    select module_key, min(sort_order) module_order
    from public.permission_catalog
    group by module_key
    order by min(sort_order)
  loop
    if _access ? v_module.module_key and jsonb_typeof(_access -> v_module.module_key) = 'array' then
      select coalesce(jsonb_agg(c.action_key order by c.sort_order), '[]'::jsonb)
      into v_actions
      from public.permission_catalog c
      where c.module_key = v_module.module_key
        and (_access -> v_module.module_key) ? c.action_key;

      if jsonb_array_length(v_actions) > 0
         and exists (select 1 from public.permission_catalog c where c.module_key = v_module.module_key and c.action_key = 'view')
         and not (v_actions ? 'view') then
        v_actions := '["view"]'::jsonb || v_actions;
      end if;

      v_result := v_result || jsonb_build_object(v_module.module_key, v_actions);
    end if;
  end loop;

  if v_result ? 'migrations' and jsonb_array_length(v_result -> 'migrations') > 0 then
    v_result := v_result || '{"dev_space":["view"]}'::jsonb;
  end if;
  return v_result;
end;
$$;

update public.user_access
set access = public.normalize_user_access(access), updated_at = now();

notify pgrst, 'reload schema';
