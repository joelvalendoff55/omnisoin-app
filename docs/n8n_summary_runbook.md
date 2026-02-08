# n8n Summary Runbook - Résumé IA des Transcriptions

Ce document décrit le workflow n8n pour la génération de résumés IA à partir des transcriptions.

## Architecture

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Application   │      │     n8n      │      │      LLM        │
│   (Frontend)    │      │  (Backend)   │      │ (OpenAI/Claude) │
├─────────────────┤      ├──────────────┤      ├─────────────────┤
│ 1. Cliquer      │      │              │      │                 │
│    "Générer     │ ───► │ 2. Recevoir  │      │                 │
│    résumé"      │      │    webhook   │      │                 │
│                 │      │    + Bearer  │      │                 │
│ 4. UI affiche   │      │ 3. Valider   │      │                 │
│    spinner      │      │    token     │      │                 │
│                 │      │ 4. Fetch     │      │                 │
│                 │      │    transcript│      │                 │
│                 │      │ 5. Préparer  │      │                 │
│                 │      │    prompt    │ ───► │ 6. Générer      │
│                 │      │              │      │    résumé       │
│ 9. Realtime:    │ ◄─── │ 7. Update DB │ ◄─── │ 8. Return text  │
│    affiche      │      │    status=   │      │                 │
│    résumé       │      │    'ready'   │      │                 │
└─────────────────┘      └──────────────┘      └─────────────────┘
```

## Endpoint Webhook

**URL attendue par l'application :**
```
POST [VOTRE_URL_N8N]/webhook/transcript-summary
```

**Variables d'environnement Frontend :**
```env
VITE_N8N_SUMMARY_WEBHOOK=https://your-n8n-instance.com/webhook/transcript-summary
VITE_N8N_TOKEN=your-secret-token-here
```

## Payload Types

L'application envoie deux types de payloads :

### 1. Ping (test de connexion)

```json
{
  "type": "ping",
  "timestamp": "2026-01-18T10:30:00.000Z"
}
```

Utilisé par Paramètres → Intégrations pour tester la connexion.

### 2. Summary Request (demande de résumé)

```json
{
  "type": "summary_request",
  "summary_id": "uuid-du-summary",
  "structure_id": "uuid-de-la-structure",
  "transcript_id": "uuid-du-transcript",
  "patient_id": "uuid-du-patient",
  "requested_by": "uuid-du-user",
  "requested_at": "2026-01-19T10:30:00.000Z",
  "lang": "fr",
  "options": {
    "format": "markdown",
    "max_tokens": 900
  }
}
```

Déclenché quand un utilisateur clique sur "Générer résumé".

## Headers envoyés

```
Content-Type: application/json
Authorization: Bearer <valeur de VITE_N8N_TOKEN>
```

**Important :** 
- Le payload ne contient PAS le texte de la transcription ni les données patient
- Le header `Authorization: Bearer {token}` doit être validé côté n8n pour sécuriser l'endpoint
- C'est n8n qui doit récupérer les données via l'API Supabase avec le service_role

## Workflow n8n

### Étape 1 : Recevoir le Webhook

**Type:** Webhook Trigger

- Method: POST
- Path: `/webhook/transcript-summary`
- Response Mode: "Respond Immediately" (important pour ne pas bloquer le frontend)
- Authentication: Header Auth avec `Authorization: Bearer {token}`

### Étape 2 : Router selon le type de payload

**Type:** Switch Node

```javascript
// Vérifier le type de payload
const payloadType = $json.type;

// Route vers différentes branches:
// - "ping" → répondre avec succès immédiatement
// - "summary_request" → continuer le workflow de génération
```

### Étape 3 : Valider le token de sécurité

**Option 1 : Authentification native n8n (recommandé)**
- Activer "Header Auth" sur le webhook
- Type: Bearer Token
- Token: votre token secret (même valeur que VITE_N8N_TOKEN)

**Option 2 : Code Node pour validation manuelle**

```javascript
// Vérifier le header Authorization
const expectedToken = $env.OMNISOIN_WEBHOOK_TOKEN;
const authHeader = $request.headers['authorization'];
const receivedToken = authHeader?.replace('Bearer ', '');

if (receivedToken !== expectedToken) {
  throw new Error('Invalid token');
}
```

### Étape 4 : Récupérer les données du transcript (pour summary_request)

**Type:** HTTP Request (Supabase REST API)

```
GET https://[PROJECT_ID].supabase.co/rest/v1/patient_transcripts?id=eq.{{ $json.transcript_id }}&select=*,patients(first_name,last_name)

Headers:
  apikey: [SUPABASE_SERVICE_ROLE_KEY]
  Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]
```

**Response:**
```json
[{
  "id": "uuid",
  "transcript_text": "Le texte complet...",
  "language": "fr",
  "patients": {
    "first_name": "Jean",
    "last_name": "Dupont"
  }
}]
```

### Étape 5 : Préparer le prompt

**Type:** Code Node

```javascript
const transcript = $json[0];
const transcriptText = transcript.transcript_text;
const patientName = `${transcript.patients.first_name} ${transcript.patients.last_name}`;
const language = transcript.language || 'unknown';

const systemPrompt = `Tu es un assistant médical de documentation. Ta tâche est de résumer des transcriptions de consultations médicales.

RÈGLES STRICTES :
1. NE JAMAIS poser de diagnostic
2. NE JAMAIS prescrire de traitement ou médicament
3. NE JAMAIS donner de conseils médicaux
4. Rester FACTUEL et DESCRIPTIF uniquement
5. Utiliser un langage professionnel et neutre

Le résumé doit contenir :
- Motif de consultation (si mentionné)
- Éléments factuels discutés
- Actions mentionnées (examens, orientations, etc.)
- Points de suivi évoqués

Format : Résumé concis en paragraphes, max 200 mots.`;

const userPrompt = `Patient: ${patientName}
Langue: ${language}

Transcription à résumer :
---
${transcriptText}
---

Résumé factuel :`;

return {
  system_prompt: systemPrompt,
  user_prompt: userPrompt,
  summary_id: $node["Webhook"].json.summary_id,
  transcript_id: $node["Webhook"].json.transcript_id
};
```

### Étape 6 : Appeler le LLM

**Option A : OpenAI GPT-4**

**Type:** HTTP Request

```
POST https://api.openai.com/v1/chat/completions

Headers:
  Authorization: Bearer [OPENAI_API_KEY]
  Content-Type: application/json

Body:
{
  "model": "gpt-4-turbo-preview",
  "messages": [
    {"role": "system", "content": "{{ $json.system_prompt }}"},
    {"role": "user", "content": "{{ $json.user_prompt }}"}
  ],
  "temperature": 0.3,
  "max_tokens": 500
}
```

**Option B : Anthropic Claude**

```
POST https://api.anthropic.com/v1/messages

Headers:
  x-api-key: [ANTHROPIC_API_KEY]
  anthropic-version: 2023-06-01
  Content-Type: application/json

Body:
{
  "model": "claude-3-sonnet-20240229",
  "max_tokens": 500,
  "system": "{{ $json.system_prompt }}",
  "messages": [
    {"role": "user", "content": "{{ $json.user_prompt }}"}
  ]
}
```

### Étape 7 : Mettre à jour la base de données

**Type:** HTTP Request (Supabase REST API)

**En cas de succès :**

```
PATCH https://[PROJECT_ID].supabase.co/rest/v1/transcript_summaries?id=eq.{{ $json.summary_id }}

Headers:
  apikey: [SUPABASE_SERVICE_ROLE_KEY]
  Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]
  Content-Type: application/json
  Prefer: return=minimal

Body:
{
  "status": "ready",
  "summary_text": "{{ $json.choices[0].message.content }}",
  "model_used": "gpt-4-turbo-preview",
  "latency_ms": {{ $now.toMillis() - Date.parse($json.requested_at) }}
}
```

### Étape 8 : Gestion des erreurs

En cas d'échec de l'appel LLM :

```
PATCH https://[PROJECT_ID].supabase.co/rest/v1/transcript_summaries?id=eq.{{ $json.summary_id }}

Headers:
  apikey: [SUPABASE_SERVICE_ROLE_KEY]
  Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]
  Content-Type: application/json

Body:
{
  "status": "failed",
  "error_message": "Erreur lors de la génération du résumé",
  "error_details": {
    "code": "{{ $json.error.code }}",
    "message": "{{ $json.error.message }}",
    "timestamp": "{{ $now.toISO() }}"
  }
}
```

### Étape 9 : Logger l'activité (optionnel)

```sql
INSERT INTO activity_logs (
  structure_id,
  actor_user_id,
  action,
  patient_id,
  metadata
)
SELECT 
  ts.structure_id,
  ts.generated_by,
  'TRANSCRIPT_SUMMARY_READY',
  ts.patient_id,
  jsonb_build_object('transcript_id', ts.transcript_id, 'summary_id', ts.id)
FROM transcript_summaries ts
WHERE ts.id = '{{ summary_id }}'
```

## Configuration requise

### Variables d'environnement n8n

| Nom | Description |
|-----|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (admin) |
| `OPENAI_API_KEY` | Clé API OpenAI (si utilisation GPT) |
| `ANTHROPIC_API_KEY` | Clé API Anthropic (si utilisation Claude) |
| `OMNISOIN_WEBHOOK_TOKEN` | Token secret pour valider les requêtes |

### Variables d'environnement Frontend

| Nom | Description |
|-----|-------------|
| `VITE_N8N_SUMMARY_WEBHOOK` | URL du webhook n8n |
| `VITE_N8N_TOKEN` | Token de sécurité (doit matcher `OMNISOIN_WEBHOOK_TOKEN` côté n8n) |

## Sécurité du Token

Le header `Authorization: Bearer {token}` sert à :
1. Empêcher les appels non autorisés au webhook
2. Valider que la requête vient bien de l'application OmniSoin
3. Éviter les abus de l'API LLM

**Configuration recommandée :**
```bash
# Générer un token sécurisé
openssl rand -hex 32
# Exemple: a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1

# Configurer côté frontend (secret Lovable)
VITE_N8N_TOKEN=a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1

# Configurer côté n8n (credentials)
OMNISOIN_WEBHOOK_TOKEN=a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

## Prompt suggéré - Version complète

```
Tu es un assistant de documentation médicale. Tu dois résumer une transcription de consultation.

IMPORTANT - RÈGLES À RESPECTER IMPÉRATIVEMENT :
1. Tu NE DOIS JAMAIS poser de diagnostic médical
2. Tu NE DOIS JAMAIS recommander ou prescrire de traitement
3. Tu NE DOIS JAMAIS donner de conseils médicaux au patient
4. Tu dois rester strictement factuel et descriptif
5. Tu ne fais que DOCUMENTER ce qui a été dit, pas interpréter

Structure du résumé :
• Motif de la consultation (si évoqué)
• Éléments discutés par le patient
• Examens ou actions mentionnés par le praticien
• Points de suivi évoqués

Ton résumé sera relu par un professionnel de santé.
Maximum 200 mots, style professionnel et neutre.
```

## Tests

### 1. Test ping (vérification connexion)

```bash
curl -X POST https://your-n8n.com/webhook/transcript-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "type": "ping",
    "timestamp": "2026-01-18T10:30:00.000Z"
  }'
```

### 2. Test summary_request

```bash
curl -X POST https://your-n8n.com/webhook/transcript-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "type": "summary_request",
    "summary_id": "test-summary-uuid",
    "structure_id": "test-structure-uuid",
    "transcript_id": "test-transcript-uuid",
    "patient_id": "test-patient-uuid",
    "requested_by": "test-user-uuid",
    "requested_at": "2026-01-19T10:30:00.000Z",
    "lang": "fr",
    "options": {
      "format": "markdown",
      "max_tokens": 900
    }
  }'
```

### 3. Test sans token (doit retourner 401)

```bash
curl -X POST https://your-n8n.com/webhook/transcript-summary \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ping",
    "timestamp": "2026-01-18T10:30:00.000Z"
  }'
# Attendu: 401 Unauthorized
```

### 4. Vérification DB

```sql
SELECT id, status, summary_text, model_used, error_message
FROM transcript_summaries
WHERE id = 'test-summary-uuid';
```

## Messages d'erreur UX

L'interface Paramètres → Intégrations affiche des messages clairs selon l'erreur :

| Code HTTP | Message affiché |
|-----------|-----------------|
| 200-299 | ✅ Connecté |
| 401/403 | Token invalide ou absent |
| 404 | URL invalide (endpoint non trouvé) |
| 500+ | Erreur serveur n8n |
| Timeout | n8n indisponible |

## Monitoring

Vérifier régulièrement :
1. Nombre de résumés bloqués en `generating` depuis > 2 min
2. Taux d'échec (status = 'failed')
3. Temps moyen de génération
4. Coût API LLM
5. Tentatives avec token invalide (sécurité)

## Debug

### Query pour voir l'état des résumés

```sql
SELECT 
  ts.id,
  ts.status,
  ts.started_at,
  ts.created_at,
  NOW() - ts.started_at as generating_time,
  ts.latency_ms,
  ts.model_used,
  ts.error_message,
  ts.error_details
FROM transcript_summaries ts
WHERE ts.status IN ('pending', 'generating', 'failed')
ORDER BY ts.created_at DESC
LIMIT 20;
```

### Query pour détecter les résumés "stuck"

```sql
SELECT 
  ts.id,
  ts.status,
  ts.started_at,
  EXTRACT(EPOCH FROM (NOW() - ts.started_at)) / 60 as minutes_stuck
FROM transcript_summaries ts
WHERE ts.status IN ('pending', 'generating')
  AND ts.started_at < NOW() - INTERVAL '5 minutes'
ORDER BY ts.started_at ASC;
```

### Réinitialiser un résumé bloqué

```sql
DELETE FROM transcript_summaries
WHERE id = 'uuid-du-summary'
AND status = 'generating';
```

## Considérations de sécurité

1. **Token de sécurité** : Le header `Authorization: Bearer` empêche les appels non autorisés au webhook.
   - Générer un token fort (min 32 caractères hex)
   - Ne jamais exposer le token dans les logs
   - Rotation régulière recommandée

2. **Privacy by Design** : Le webhook reçoit uniquement les IDs, pas les données sensibles. 
   n8n récupère les données via service_role, ce qui :
   - Réduit l'exposition des données en transit
   - Centralise l'accès aux données dans n8n
   - Facilite l'audit et le logging

3. **Données médicales** : Les transcriptions contiennent des données de santé sensibles. Assurez-vous que :
   - Le webhook n8n est sécurisé (HTTPS)
   - Les logs n8n ne persistent pas les données patients
   - L'API LLM utilisée est conforme aux réglementations (RGPD, HDS si applicable)

4. **Clés API** : Utilisez les credentials n8n pour stocker les clés, jamais en clair dans les workflows.

5. **Rate limiting** : Configurez des limites pour éviter les abus.
