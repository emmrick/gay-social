-- Fix: replace UNIQUE(user_id) with UNIQUE(user_id, role) to allow multiple roles per user
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);