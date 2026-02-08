-- SPRINT 2 Part 1: Ajouter les rôles nurse et ipa à l'enum app_role
-- Note: Ces valeurs seront disponibles après commit de cette migration

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'nurse';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ipa';