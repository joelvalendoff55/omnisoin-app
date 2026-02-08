# Configuration des variables d'environnement

Ce document décrit les variables d'environnement nécessaires pour le fonctionnement complet de l'application OmniSoin.

## Variables Supabase (automatiques avec Lovable Cloud)

Ces variables sont configurées automatiquement par Lovable Cloud :

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de l'instance Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique Supabase (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | ID du projet Supabase |

## Variables n8n (à configurer manuellement)

Ces variables sont nécessaires pour l'intégration avec n8n :

### VITE_N8N_SUMMARY_WEBHOOK

**Obligatoire pour les résumés automatiques**

URL du webhook n8n qui gère la génération de résumés.

```env
VITE_N8N_SUMMARY_WEBHOOK=https://votre-instance-n8n.app.n8n.cloud/webhook/transcript-summary
```

**Format attendu :**
- URL complète avec protocole HTTPS
- Doit pointer vers un workflow n8n actif

### VITE_N8N_TOKEN

**Obligatoire pour sécuriser les appels webhook**

Token d'authentification envoyé dans le header `X-OmniSoin-Token`.

```env
VITE_N8N_TOKEN=votre-token-secret-genere
```

**Bonnes pratiques :**
- Générer un token aléatoire (32+ caractères)
- Utiliser la commande : `openssl rand -base64 32`
- Ne jamais committer dans le code source
- Configurer le même token dans n8n pour validation

### VITE_N8N_STT_WEBHOOK (optionnel)

URL du webhook n8n pour la transcription audio (Speech-to-Text).

```env
VITE_N8N_STT_WEBHOOK=https://votre-instance-n8n.app.n8n.cloud/webhook/transcript-stt
```

## Configuration dans Lovable

1. Allez dans **Settings → Secrets** dans l'interface Lovable
2. Ajoutez chaque variable avec sa valeur
3. Les variables `VITE_*` sont accessibles côté client

## Vérification de la configuration

1. Connectez-vous en tant qu'administrateur
2. Allez sur `/settings/integrations`
3. Vérifiez les statuts affichés :
   - ✅ **Configuré** : Variable définie
   - ❌ **Non configuré** : Variable manquante
4. Utilisez le bouton **Tester la connexion** pour valider

## Dépannage

### "Webhook non configuré" dans l'UI

La variable `VITE_N8N_SUMMARY_WEBHOOK` n'est pas définie.

**Solution :**
1. Vérifiez la configuration dans Lovable Settings
2. Redéployez l'application après ajout

### "Test échoué - Erreur HTTP 401/403"

Le token est invalide ou n'est pas configuré dans n8n.

**Solution :**
1. Vérifiez que `VITE_N8N_TOKEN` est défini
2. Vérifiez que le même token est configuré dans n8n
3. Vérifiez la validation du header `X-OmniSoin-Token` dans n8n

### "Test échoué - Erreur réseau"

Problème de connectivité ou URL incorrecte.

**Solution :**
1. Vérifiez que l'URL est correcte et accessible
2. Vérifiez que le workflow n8n est actif
3. Vérifiez les règles CORS si applicable

## Exemple de fichier .env (développement local)

```env
# Supabase (fourni par Lovable Cloud)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx

# n8n Integration
VITE_N8N_SUMMARY_WEBHOOK=https://votre-n8n.app.n8n.cloud/webhook/transcript-summary
VITE_N8N_TOKEN=votre-token-secret-32-caracteres-minimum
VITE_N8N_STT_WEBHOOK=https://votre-n8n.app.n8n.cloud/webhook/transcript-stt
```

## Sécurité

⚠️ **Important :**
- Les variables `VITE_*` sont **exposées côté client** (incluses dans le bundle JavaScript)
- Le token `VITE_N8N_TOKEN` est visible dans les DevTools → utiliser des tokens rotatifs si possible
- Pour une sécurité maximale, préférer des edge functions qui gardent les secrets côté serveur
