-- Run after 20261122010000_user_access_control.sql.
do $$
declare normalized jsonb;
begin
  normalized := public.normalize_user_access('{"inventory":["delete"],"forms":["approve"],"migrations":["run"],"unknown":["view"]}'::jsonb);
  if not ((normalized -> 'inventory') ? 'view' and (normalized -> 'inventory') ? 'delete') then
    raise exception 'inventory.delete must imply inventory.view';
  end if;
  if not ((normalized -> 'forms') ? 'view' and (normalized -> 'forms') ? 'approve') then
    raise exception 'forms.approve must imply forms.view';
  end if;
  if not ((normalized -> 'migrations') ? 'view' and (normalized -> 'migrations') ? 'run') then
    raise exception 'migrations.run must imply migrations.view';
  end if;
  if not ((normalized -> 'dev_space') ? 'view') then
    raise exception 'migrations access must expose the Dev Space navigation section';
  end if;
  if normalized ? 'unknown' then raise exception 'unknown modules must be removed'; end if;
  if public.normalize_user_access('{"audit_logs":[]}'::jsonb) -> 'audit_logs' <> '[]'::jsonb then
    raise exception 'explicit empty module permissions must be preserved';
  end if;
end;
$$;
