create or replace function public.user_can_access_form(_user_id uuid, _form_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select public.role_access_allowed(
      array(select ur.role from public.user_roles ur where ur.user_id = _user_id),
      profile.employment_status,
      _form_key
    )
    from public.profiles profile where profile.id = _user_id
  ), false);
$$;
