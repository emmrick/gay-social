
-- Replace the ticket number generator with a sequential one
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1;

-- Set sequence to current max if tickets exist
DO $$
DECLARE
  max_num BIGINT;
BEGIN
  SELECT MAX(ticket_number::bigint) INTO max_num FROM public.support_tickets WHERE ticket_number ~ '^\d+$';
  IF max_num IS NOT NULL AND max_num > 0 THEN
    PERFORM setval('public.support_ticket_seq', max_num);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LPAD(nextval('public.support_ticket_seq')::text, 13, '0');
END;
$function$;
