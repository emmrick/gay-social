-- Add detailed profile fields for gay dating/hookup app
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sexual_position text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS body_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS height integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weight integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ethnicity text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS relationship_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hiv_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tribes text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accepts_nsfw boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_face boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS endowment text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS position_detail text DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.sexual_position IS 'Actif, Passif, Versatile, etc.';
COMMENT ON COLUMN public.profiles.looking_for IS 'Array: Plan cul, Relation, Amitié, etc.';
COMMENT ON COLUMN public.profiles.body_type IS 'Mince, Moyen, Musclé, Costaud, etc.';
COMMENT ON COLUMN public.profiles.height IS 'Height in cm';
COMMENT ON COLUMN public.profiles.weight IS 'Weight in kg';
COMMENT ON COLUMN public.profiles.tribes IS 'Array: Bear, Twink, Otter, Daddy, etc.';
COMMENT ON COLUMN public.profiles.endowment IS 'Small, Average, Large, XL';
COMMENT ON COLUMN public.profiles.position_detail IS 'Top only, Bottom only, Vers top, Vers bottom, etc.';