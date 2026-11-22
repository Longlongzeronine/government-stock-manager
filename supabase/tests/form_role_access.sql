-- Run after 20261121000000_form_role_access.sql.
do $$
declare
  test_case record;
  actual boolean;
  expected boolean;
begin
  for test_case in
    select role::public.app_role as role, form_key, employment_status
    from (values
      ('regular_user'), ('permanent_employee'), ('supply_officer'),
      ('inspection_officer'), ('financial_analyst'), ('admin')
    ) roles(role)
    cross join (values
      ('supplies_ris'), ('supplies_iar'), ('supplies_rsmi'), ('supplies_rpci'),
      ('semi_ris'), ('semi_iar'), ('semi_splc'), ('semi_rspi'),
      ('ppe_ris'), ('ppe_iar'), ('ppe_ppelc')
    ) forms(form_key)
    cross join (values ('Permanent'), ('Casual')) statuses(employment_status)
  loop
    expected := case
      when test_case.role = 'admin' then true
      when test_case.form_key = 'supplies_ris' then true
      when test_case.form_key in ('semi_ris', 'ppe_ris') then
        test_case.role = 'regular_user'
        or (test_case.role = 'permanent_employee' and test_case.employment_status = 'Permanent')
      when test_case.form_key in ('supplies_iar', 'semi_iar', 'ppe_iar') then
        test_case.role in ('supply_officer', 'inspection_officer')
      when test_case.form_key in ('supplies_rsmi', 'supplies_rpci', 'semi_splc', 'semi_rspi', 'ppe_ppelc') then
        test_case.role in ('supply_officer', 'financial_analyst')
      else false
    end;
    actual := public.role_access_allowed(array[test_case.role], test_case.employment_status, test_case.form_key);
    if actual is distinct from expected then
      raise exception 'RBAC mismatch: role %, status %, form %, expected %, got %',
        test_case.role, test_case.employment_status, test_case.form_key, expected, actual;
    end if;
  end loop;

  if not public.role_access_allowed(array['supply_officer','financial_analyst']::public.app_role[], 'Casual', 'semi_splc') then
    raise exception 'Supply Officer + Financial Analyst must get union access';
  end if;
  if not public.role_access_allowed(array['permanent_employee','inspection_officer']::public.app_role[], 'Permanent', 'ppe_iar') then
    raise exception 'Permanent Employee + Inspection Officer must get union access';
  end if;
  if public.role_access_allowed(array['permanent_employee','inspection_officer']::public.app_role[], 'Job Order', 'semi_ris') then
    raise exception 'Job Order employee must not access semi-expendable RIS';
  end if;
end;
$$;
