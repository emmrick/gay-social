# Règles techniques du projet

- La présence en ligne passe par Supabase Realtime Presence (en mémoire), pas par des écritures répétées sur `profiles` — sinon la charge base de données croît en N² avec les utilisateurs connectés.
- Écriture DB de présence limitée à 1 fois/15 min max par session (`useOnlineHeartbeat`) — économie de crédits cloud.
- Les fréquences des tâches planifiées vivent dans `public.cron_schedule_config` (jamais codées en dur) — modifiables sans redéploiement.
- Les `refetchInterval` côté client restent >= 60 s pour les écrans non critiques (>= 2 min en admin) — limite la consommation de requêtes.
