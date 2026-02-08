# n8n STT (Speech-to-Text) Runbook

Ce document décrit le workflow n8n pour la transcription audio via Whisper (OpenAI).

## Architecture

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Application   │      │     n8n      │      │     OpenAI      │
│   (Frontend)    │      │  (Backend)   │      │    (Whisper)    │
├─────────────────┤      ├──────────────┤      ├─────────────────┤
│ 1. Upload audio │ ───► │ 2. Poll DB   │      │                 │
│ 2. Create record│      │ 3. Download  │      │                 │
│    status=      │      │    audio     │      │                 │
│    'uploaded'   │      │ 4. Send to   │ ───► │ 5. Transcribe   │
│ 3. Request      │      │    Whisper   │      │                 │
│    transcription│      │ 6. Update DB │ ◄─── │ 7. Return text  │
│    status=      │      │    status=   │      │                 │
│    'transcribing│      │    'ready'   │      │                 │
└─────────────────┘      └──────────────┘      └─────────────────┘
```

## Workflow n8n

### Étape 1 : Trigger - Polling de la base de données

**Type:** Schedule Trigger (toutes les 30 secondes)

**SQL Query:**
```sql
SELECT 
  pt.id,
  pt.structure_id,
  pt.patient_id,
  pt.audio_path,
  pt.source,
  pt.created_by
FROM patient_transcripts pt
WHERE pt.status = 'transcribing'
ORDER BY pt.created_at ASC
LIMIT 5
```

### Étape 2 : Vérification

Si aucun résultat, arrêter le workflow (condition: `{{ $json.length === 0 }}`).

### Étape 3 : Boucle sur chaque transcript

Pour chaque transcript trouvé :

### Étape 4 : Générer Signed URL

**Type:** HTTP Request (Supabase Storage API)

```
POST https://[PROJECT_ID].supabase.co/storage/v1/object/sign/transcripts-audio/{{ $json.audio_path }}

Headers:
  Authorization: Bearer [SERVICE_ROLE_KEY]
  Content-Type: application/json

Body:
{
  "expiresIn": 3600
}
```

**Response:**
```json
{
  "signedURL": "https://..."
}
```

### Étape 5 : Télécharger l'audio

**Type:** HTTP Request (GET)

```
GET {{ $json.signedURL }}
```

**Response:** Fichier binaire audio

### Étape 6 : Appel OpenAI Whisper

**Type:** HTTP Request (POST multipart/form-data)

```
POST https://api.openai.com/v1/audio/transcriptions

Headers:
  Authorization: Bearer [OPENAI_API_KEY]

Body (form-data):
  file: [audio binary]
  model: "whisper-1"
  response_format: "verbose_json"
```

**Response:**
```json
{
  "task": "transcribe",
  "language": "fr",
  "duration": 45.5,
  "text": "Bonjour, je suis le patient...",
  "segments": [...]
}
```

### Étape 7 : Mettre à jour le transcript

**Type:** Supabase Update (via service_role)

```sql
UPDATE patient_transcripts
SET 
  status = 'ready',
  transcript_text = '{{ $json.text }}',
  language = '{{ $json.language }}',
  duration_seconds = {{ Math.round($json.duration) }}
WHERE id = '{{ $node["Poll DB"].json.id }}'
```

### Étape 8 : Logger l'activité (optionnel)

**Type:** Supabase Insert

```sql
INSERT INTO activity_logs (
  structure_id,
  actor_user_id,
  action,
  patient_id,
  metadata
) VALUES (
  '{{ $node["Poll DB"].json.structure_id }}',
  '{{ $node["Poll DB"].json.created_by }}',
  'TRANSCRIPTION_READY',
  '{{ $node["Poll DB"].json.patient_id }}',
  '{"transcript_id": "{{ $node["Poll DB"].json.id }}"}'
)
```

## Gestion des erreurs

### En cas d'échec Whisper

```sql
UPDATE patient_transcripts
SET status = 'failed'
WHERE id = '{{ $node["Poll DB"].json.id }}'
```

Et logger :
```sql
INSERT INTO activity_logs (...)
VALUES (..., 'TRANSCRIPTION_FAILED', ...)
```

## Configuration requise

### Secrets Supabase

| Nom | Description |
|-----|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (admin) |

### Secrets OpenAI

| Nom | Description |
|-----|-------------|
| `OPENAI_API_KEY` | Clé API OpenAI avec accès Whisper |

## Payload de test

Pour tester manuellement depuis n8n :

```json
{
  "id": "uuid-du-transcript",
  "structure_id": "uuid-de-la-structure",
  "patient_id": "uuid-du-patient",
  "audio_path": "structure_id/filename.webm",
  "source": "mic",
  "created_by": "uuid-user"
}
```

## Limites

- **Taille audio max Whisper:** 25 MB
- **Durée max recommandée:** 30 minutes
- **Formats supportés:** mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg

## Monitoring

Vérifier régulièrement :
1. Nombre de transcripts bloqués en `transcribing` depuis > 10 min
2. Taux d'échec (status = 'failed')
3. Temps moyen de traitement

## Debug

### Query pour voir l'état des transcriptions

```sql
SELECT 
  id,
  status,
  created_at,
  NOW() - created_at as age
FROM patient_transcripts
WHERE status IN ('transcribing', 'failed')
ORDER BY created_at DESC
LIMIT 20;
```

### Réinitialiser un transcript bloqué

```sql
UPDATE patient_transcripts
SET status = 'uploaded'
WHERE id = 'uuid-du-transcript'
AND status = 'transcribing';
```
