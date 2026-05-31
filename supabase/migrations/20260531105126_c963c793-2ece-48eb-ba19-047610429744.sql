
CREATE OR REPLACE FUNCTION public.get_advertiser_campaigns(_email text)
RETURNS SETOF public.ads
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.ads
  WHERE advertiser_email = _email
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_advertiser_campaigns(text) TO anon, authenticated;
