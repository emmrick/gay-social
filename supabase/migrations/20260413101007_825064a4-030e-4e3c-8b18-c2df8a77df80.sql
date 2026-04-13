UPDATE profiles 
SET avatar_url = 'https://vxrsqftlaguiwprcqlbw.supabase.co/storage/v1/object/public/avatars/1c905091-e095-4f76-aa07-85bd3d1e446e/1776008299693-kdhyyb.jpeg'
WHERE user_id = '1c905091-e095-4f76-aa07-85bd3d1e446e'
AND avatar_url LIKE '%/storage/v1/object/sign/%';