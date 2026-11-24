-- Reconcile counters with posted forms. Old reservations without a form
-- consumed numbers, so only committed forms set the starting counter.
INSERT INTO public.form_number_counters (form_prefix, series_year, last_number)
SELECT 'RIS', extract(year FROM created_at)::integer,
       max(NULLIF(substring(ris_no FROM '-([0-9]+)$'), '')::bigint)
FROM public.ris_forms
WHERE ris_no ~ '^\d{4}-\d{2}-\d{2}-\d+$'
GROUP BY extract(year FROM created_at)::integer
ON CONFLICT (form_prefix, series_year)
DO UPDATE SET last_number = EXCLUDED.last_number;

INSERT INTO public.form_number_counters (form_prefix, series_year, last_number)
SELECT 'IAR', extract(year FROM created_at)::integer, count(*)
FROM public.iar_forms
GROUP BY extract(year FROM created_at)::integer
ON CONFLICT (form_prefix, series_year)
DO UPDATE SET last_number = EXCLUDED.last_number;

CREATE OR REPLACE FUNCTION public.next_form_number(
  p_form_prefix text,
  p_form_date date DEFAULT current_date
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  form_prefix text := upper(p_form_prefix);
  series_year integer := extract(year FROM p_form_date)::integer;
  history_number bigint := 0;
  next_number bigint;
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR NOT public.can_write_inventory(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to reserve a form number';
  END IF;

  IF form_prefix = 'RIS' THEN
    SELECT coalesce(max(NULLIF(substring(ris_no FROM '-([0-9]+)$'), '')::bigint), 0)
      INTO history_number
    FROM public.ris_forms
    WHERE ris_no LIKE to_char(p_form_date, 'YYYY') || '-%';
  ELSIF form_prefix = 'IAR' THEN
    SELECT count(*) INTO history_number
    FROM public.iar_forms
    WHERE created_at >= make_date(series_year, 1, 1)
      AND created_at < make_date(series_year + 1, 1, 1);
  ELSIF form_prefix = 'ICS' THEN
    SELECT coalesce(max(NULLIF(substring(ics_no FROM '-([0-9]+)$'), '')::bigint), 0)
      INTO history_number
    FROM public.ics_forms
    WHERE ics_no LIKE to_char(p_form_date, 'YYYY-MM-DD') || '-%'
       OR ics_no LIKE 'ICS-' || to_char(p_form_date, 'YYYY-MM-DD') || '-%';
  END IF;

  INSERT INTO public.form_number_counters (form_prefix, series_year, last_number)
  VALUES (form_prefix, series_year, history_number + 1)
  ON CONFLICT (form_prefix, series_year)
  DO UPDATE SET last_number = greatest(
    public.form_number_counters.last_number + 1,
    EXCLUDED.last_number
  )
  RETURNING last_number INTO next_number;

  IF form_prefix IN ('RIS', 'ICS') THEN
    RETURN to_char(p_form_date, 'YYYY-MM-DD') || '-' || lpad(next_number::text, 7, '0');
  END IF;

  RETURN form_prefix || '-' || to_char(p_form_date, 'YYYY-MM-DD') || '-' ||
    lpad(next_number::text, 7, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_form_number(text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.next_form_number(text, date) TO authenticated;
