-- Élargir les types MIME acceptés par le bucket 'media' pour inclure
-- les formats produits nativement par les téléphones (iPhone HEIC, MOV,
-- Android 3GPP, etc.) afin d'éviter les échecs de publication Tween.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Images
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/bmp',
  'image/tiff',
  -- Vidéos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',
  'video/mpeg',
  'video/x-m4v',
  'video/ogg'
]::text[]
WHERE id = 'media';