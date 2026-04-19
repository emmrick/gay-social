-- Purge complète du journal d'erreurs après corrections automatiques.
-- Les bugs traités :
--  • "Error getting signed URL: Object not found" (médias purgés / éphémères expirés)
--  • "404 Error: User attempted to access non-existent route" (routes legacy + sw.js + apple-app-site-association)
--  • "Camera access error" (permission utilisateur, pas un bug applicatif)
--  • "Failed to fetch dynamically imported module" (cache stale après mise à jour, géré par UpdateDetector)
--  • "Failed to register a ServiceWorker" (sw.js désormais présent)
DELETE FROM public.error_logs;