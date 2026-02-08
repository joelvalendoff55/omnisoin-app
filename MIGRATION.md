# Migration Lovable (Vite) -> Next.js

## Vue d'ensemble

Ce guide documente la migration d'OmniSoin depuis Lovable (React + Vite + shadcn/ui) vers Next.js App Router.

## Prerequis

- Node.js >= 18
- npm >= 9

## Lancer la migration

```bash
# 1. Cloner le repo et basculer sur la branche
git clone https://github.com/joelvalendoff55/omnisoin-assist.git
cd omnisoin-assist
git checkout migration/nextjs

# 2. Installer les dependances
npm install

# 3. Lancer le script de migration
chmod +x migrate.sh generate-routes.sh
bash migrate.sh

# 4. Demarrer le serveur de developpement
npm run dev
```

## Ce que fait le script migrate.sh

1. Installe Next.js et supprime Vite, react-router-dom, lovable-tagger
2. Met a jour les scripts package.json (next dev/build/start)
3. Supprime les fichiers Vite (vite.config.ts, index.html, etc.)
4. Migre les variables d'env (VITE_ -> NEXT_PUBLIC_)
5. Ajoute "use client" aux composants qui utilisent des hooks React
6. Remplace react-router-dom par next/navigation et next/link
7. Genere les pages Next.js App Router (~50 routes)
8. Met a jour .gitignore
9. Reinstalle les dependances

## Fichiers crees pour Next.js

| Fichier | Role |
|---------|------|
| `next.config.ts` | Configuration Next.js |
| `tsconfig.json` | TypeScript pour Next.js (mis a jour) |
| `app/layout.tsx` | Layout racine |
| `app/page.tsx` | Page d'accueil |
| `app/providers.tsx` | Tous les providers (auth, query, etc.) |
| `generate-routes.sh` | Script de generation des ~50 pages |
| `migrate.sh` | Script principal de migration |

## Variables d'environnement

Les variables Vite sont renommees automatiquement :

| Avant (Vite) | Apres (Next.js) |
|---|---|
| VITE_SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | NEXT_PUBLIC_SUPABASE_ANON_KEY |
| VITE_SUPABASE_PROJECT_ID | NEXT_PUBLIC_SUPABASE_PROJECT_ID |

## Apres la migration

1. Verifier que `npm run dev` demarre sans erreurs
2. Tester toutes les routes
3. Corriger les erreurs TypeScript restantes
4. Verifier les imports manquants ou casses
