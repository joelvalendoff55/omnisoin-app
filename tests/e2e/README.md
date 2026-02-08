# Tests E2E - OmniSoin Assist

Ce dossier contient les tests end-to-end (E2E) utilisant Playwright.

## Quick Start

```bash
# 1. Installer les dépendances
npm install

# 2. Installer Playwright
npx playwright install --with-deps

# 3. Configurer les variables d'environnement
export TEST_USER_EMAIL=test@omnisoin.local
export TEST_USER_PASSWORD=testpassword123
export VITE_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 4. Créer l'utilisateur de test (une seule fois)
# Aller sur /auth et s'inscrire avec TEST_USER_EMAIL

# 5. Lancer le seed automatique
npm run e2e:seed

# 6. Lancer les tests
npm run e2e:smoke   # Tests rapides (@smoke)
npm run e2e:full    # Suite complète
npm run e2e:report  # Voir le rapport HTML
```

## Seed Automatique (recommandé)

Le seed script (`tests/e2e/seed/seed.ts`) crée automatiquement toutes les données de test via l'API Supabase REST. **Aucune dépendance au SQL Editor.**

### Prérequis

1. **Utilisateur de test** : Créez un compte via `/auth` avec l'email `TEST_USER_EMAIL` (signup une seule fois)
2. **Service Role Key** : Nécessaire pour le seed (disponible dans Lovable Cloud > Backend)

### Variables d'environnement

**Pour le seed (`npm run e2e:seed`):**

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` ou `SUPABASE_URL` | URL du projet Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (pour accès admin) | ✅ |
| `TEST_USER_EMAIL` | Email de l'utilisateur de test | ✅ |
| `E2E_STRUCTURE_ID` | UUID de la structure | ❌ (défaut: `11111111-1111-1111-1111-111111111111`) |

**Pour les tests Playwright:**

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `TEST_USER_EMAIL` | Email de l'utilisateur de test | ✅ |
| `TEST_USER_PASSWORD` | Mot de passe du test user | ✅ |
| `PLAYWRIGHT_BASE_URL` | URL de l'app | ❌ (défaut: `http://localhost:8080`) |

> **Note:** Le seed utilise `service_role` pour créer les données avec privilèges admin. Les tests Playwright utilisent `email/password` pour se connecter comme un utilisateur normal.

### Données créées par le seed

- 1 structure "OmniSoin Assist Demo"
- 1 profile + rôle admin pour l'utilisateur de test
- 3 patients (dont 1 archivé)
- 2 transcripts (ready, uploaded)
- 1 summary ready
- 3 inbox messages (1 non assigné, 2 assignés)
- 10 activity logs

### Commandes NPM

```bash
# Lancer le seed (crée/met à jour les données)
npm run e2e:seed

# Lancer les tests smoke (rapide, @smoke tag)
npm run e2e:smoke

# Lancer tous les tests
npm run e2e:full

# Voir le rapport HTML après les tests
npm run e2e:report
```

### Procédure complète en local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
export VITE_SUPABASE_URL=https://uueayfajjnvmkfpgrlkj.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export TEST_USER_EMAIL=praticien@structure.com
export TEST_USER_PASSWORD=your-password

# 3. Créer l'utilisateur de test (si pas déjà fait)
# Aller sur http://localhost:8080/auth et s'inscrire

# 4. Lancer le seed
npm run e2e:seed

# 5. Lancer les tests smoke
npm run e2e:smoke

# 6. En cas d'échec, voir le rapport
npm run e2e:report
```

## CI GitHub Actions

Le workflow `.github/workflows/e2e.yml` exécute automatiquement :
1. Installation des dépendances
2. **Seed des données de test** ← Automatique en CI
3. Démarrage de l'app
4. Exécution des tests
5. Upload des artifacts (rapport, traces, screenshots)

### Mode strict CI vs Local

| Environnement | Comportement |
|---------------|--------------|
| **CI** (`process.env.CI=true`) | **Strict** : Fail fast si données manquantes |
| **Local** | **Lenient** : Warnings uniquement, tests continuent |

En mode strict (CI), le `global-setup` échoue immédiatement si :
- Les transcripts sont absents
- Les messages inbox sont absents
- Le transcript "ready" est absent

Cela garantit que les tests ne s'exécutent pas sur des données incomplètes.

### Secrets GitHub requis

Configurez dans Settings → Secrets → Actions :

| Secret | Description |
|--------|-------------|
| `TEST_USER_EMAIL` | Email de l'utilisateur de test |
| `TEST_USER_PASSWORD` | Mot de passe |
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (pour seed) |

### Artifacts générés

- `playwright-report/` : Rapport HTML détaillé
- `test-results/` : Traces, screenshots, vidéos des tests échoués

Retention : 7 jours

## Structure des tests

```
tests/e2e/
├── seed/
│   └── seed.ts           # Script de seed automatique
├── helpers/
│   └── auth.ts           # Helper de login
├── global-setup.ts       # Setup global (vérifie données)
├── smoke.spec.ts         # Tests @smoke rapides
├── summary.spec.ts       # Tests pour les résumés IA
├── inbox.spec.ts         # Tests pour l'inbox
├── transcripts.spec.ts   # Tests pour la page transcripts
├── transcripts-filters.spec.ts # Tests filtres transcripts
├── patients.spec.ts      # Tests pour la page patients
├── inbox-filters.spec.ts # Tests filtres inbox
├── reset-invalid.spec.ts # Tests reset password invalide
├── reset-ui.spec.ts      # Tests UI reset password
└── README.md             # Ce fichier
```

## Tests disponibles

### smoke.spec.ts (@smoke)

Tests rapides pour vérifier les chemins critiques :
- Login fonctionne
- Pages principales accessibles
- Navigation entre pages

### summary.spec.ts

- Connexion et navigation vers transcripts
- Génération de résumé
- Copie du résumé

### inbox.spec.ts

- Affichage des messages
- Ouverture du drawer détail
- Filtres par statut

### inbox-filters.spec.ts

- **@smoke** Affichage de la page et des filtres
- Filtre "Non rattachés" affiche seulement les messages non assignés
- Filtre "Rattachés" affiche seulement les messages assignés (si existe)
- Switching entre filtres ne crash pas

> Sélecteurs : `[data-testid="inbox-message"]`, `[data-testid="inbox-empty"]`, `data-assigned="true|false"`

### transcripts.spec.ts

- Affichage des transcripts seeded
- Filtres par status (ready, uploaded)
- Ouverture du drawer détail
- Affichage des détails et actions

> Utilise `loginAsTestUser()` helper et sélecteurs stables `[data-testid="transcript-card"]`

### transcripts-filters.spec.ts

- **@smoke** Affichage de la page et des filtres
- Filtre "ready" affiche seulement les transcripts ready
- Filtre "uploaded" affiche seulement les transcripts uploaded
- Switching entre filtres ne crash pas

> Sélecteurs : `[data-testid="transcripts-filters"]`, `[data-testid="transcripts-filter-all"]`, `[data-testid="transcripts-filter-ready"]`, `[data-testid="transcripts-filter-uploaded"]`, `[data-testid="transcripts-filter-failed"]`

### patients.spec.ts

- Affichage des patients seeded
- Navigation vers la page détail patient
- Affichage des informations patient
- Section transcripts du patient
- **Clic sur une ligne transcript → ouverture du drawer**
- Fermeture du drawer

> Utilise `loginAsTestUser()` helper et sélecteurs stables `[data-testid="patient-card"]`, `[data-testid="patient-transcript-row"]`

### reset-invalid.spec.ts / reset-ui.spec.ts

- Tests du formulaire de reset password

## Data-testid disponibles

| Élément | data-testid | Attributs |
|---------|-------------|-----------|
| Carte transcript | `transcript-card` | `data-status="ready\|uploaded\|..."` |
| Message inbox | `inbox-message` | `data-status`, `data-assigned="true\|false"` |
| Carte patient | `patient-card` | `data-archived="true\|false"` |
| Ligne transcript patient | `patient-transcript-row` | `data-transcript-id`, `data-status` |
| Container filtres transcripts | `transcripts-filters` | - |
| Filtre "Tous" | `transcripts-filter-all` | - |
| Filtre "Prêts" | `transcripts-filter-ready` | - |
| Filtre "À transcrire" | `transcripts-filter-uploaded` | - |
| Filtre "Échecs" | `transcripts-filter-failed` | - |
| Empty state inbox | `inbox-empty` | - |

## Exécution locale (headed)

Pour lancer les tests localement en mode **headed** (navigateur visible) :

### Commandes principales

```bash
# Smoke tests en mode headed (rapide, ~30s)
pnpm playwright test --grep @smoke --headed

# Tous les tests en mode headed
pnpm playwright test --headed

# Tests de filtres seulement (transcripts + inbox)
pnpm playwright test transcripts-filters.spec.ts inbox-filters.spec.ts --headed

# Un seul fichier de test
pnpm playwright test inbox-filters.spec.ts --headed
```

### Mode UI interactif (recommandé pour debug)

```bash
# Ouvre une interface graphique pour sélectionner/débugger les tests
pnpm playwright test --ui
```

Le mode UI permet de :
- Voir chaque étape du test
- Mettre en pause et inspecter
- Re-jouer des tests individuels
- Voir les sélecteurs en surbrillance

### Mode Debug Playwright

```bash
# Active le debugger Playwright (step-by-step)
PWDEBUG=1 pnpm playwright test inbox-filters.spec.ts

# Variante Windows PowerShell
$env:PWDEBUG=1; pnpm playwright test inbox-filters.spec.ts
```

Le mode `PWDEBUG=1` :
- Ouvre Playwright Inspector
- Pause à chaque action
- Permet de step-through le test
- Affiche les sélecteurs en temps réel

### Smoke check rapide localhost

```bash
# 1. Lancer l'app en dev (terminal 1)
pnpm dev

# 2. Lancer smoke tests (terminal 2)
pnpm playwright test --grep @smoke --headed

# 3. Vérifier le rapport si échecs
pnpm playwright show-report
```

### Check-list vérification filtres localement

#### 1️⃣ Vérification rapide headed

```bash
pnpm playwright test transcripts-filters.spec.ts inbox-filters.spec.ts --headed
```

#### 2️⃣ Avec trace (pour analyser après)

```bash
pnpm playwright test transcripts-filters.spec.ts inbox-filters.spec.ts --headed --trace on
# Puis ouvrir le rapport pour voir les traces
pnpm playwright show-report
```

#### 3️⃣ Debug pas à pas (step-through)

```bash
# Active le debugger Playwright Inspector
PWDEBUG=1 pnpm playwright test inbox-filters.spec.ts

# Variante : désactive aussi le timeout
PWDEBUG=1 pnpm playwright test inbox-filters.spec.ts --timeout 0
```

> **Note:** `PWDEBUG=1` active automatiquement le slow-mo et ouvre l'Inspector.

#### 4️⃣ Test ciblé par nom

```bash
# Tester seulement "Non rattachés"
pnpm playwright test inbox-filters.spec.ts -g "Non rattachés" --headed

# Tester seulement "ready"
pnpm playwright test transcripts-filters.spec.ts -g "ready" --headed
```

### Points de contrôle visuel

#### Inbox (`/inbox`)

| Checkpoint | Ce qu'on doit voir |
|------------|-------------------|
| Page chargée | Liste de messages OU "Aucun message" |
| Filtre "Tous" | Tous les messages (assignés + non assignés) |
| Filtre "Non rattachés" | Uniquement messages avec icône "?" ou sans patient |
| Filtre "Rattachés" | Uniquement messages liés à un patient |
| Switch filtre | Pas de crash, UI reste réactive |

#### Transcripts (`/transcripts`)

| Checkpoint | Ce qu'on doit voir |
|------------|-------------------|
| Page chargée | Liste de cartes OU "Aucun transcript" |
| Filtre "Tous" | Toutes les cartes transcripts |
| Filtre "Prêts" | Cartes avec badge vert "Prêt" |
| Filtre "À transcrire" | Cartes avec badge bleu "Uploaded" |
| Filtre "Échecs" | Cartes avec badge rouge "Échec" (si existent) |
| Switch filtre | Pas de crash, UI reste réactive |

### Options de ralentissement

```bash
# PWDEBUG active automatiquement slow-mo + headed + timeout infini
PWDEBUG=1 pnpm playwright test inbox-filters.spec.ts

# Slow-mo manuel (500ms entre chaque action) - via config ou CLI
pnpm playwright test --headed --config=playwright.config.ts
# puis ajouter `use: { launchOptions: { slowMo: 500 } }` dans la config

# Timeout désactivé pour debug ciblé (observer sans pression)
pnpm playwright test inbox-filters.spec.ts --headed --timeout 0
```

### Conseils stabilité locale

| Problème | Solution |
|----------|----------|
| Tests flaky localement | Utiliser `--retries 1` pour retry automatique |
| App pas démarrée | Lancer `pnpm dev` dans un terminal séparé |
| Données manquantes | Relancer `pnpm e2e:seed` avant les tests |
| Port 8080 occupé | Vérifier avec `lsof -i :8080` et tuer le process |
| Login échoue | Vérifier `TEST_USER_EMAIL` et `TEST_USER_PASSWORD` |
| Sélecteurs introuvables | Vérifier les `data-testid` dans le code source |
| Timeout trop court | Ajouter `--timeout 60000` ou `--timeout 0` pour debug |

### Voir le rapport

```bash
pnpm playwright show-report
```

## Debug pas-à-pas (Inbox filters) — Sprint 36

### Commande Inspector

```bash
# Ouvre Playwright Inspector pour debug step-by-step
PWDEBUG=1 pnpm playwright test e2e/inbox-filters.spec.ts -g "Non rattachés"

# Windows PowerShell
$env:PWDEBUG=1; pnpm playwright test e2e/inbox-filters.spec.ts -g "Non rattachés"
```

### Vérifications Console dans Inspector

Après chaque étape, ouvrir DevTools (F12) et vérifier :

| Étape | Commande Console | Résultat attendu |
|-------|------------------|------------------|
| Après `goto('/inbox')` | `document.querySelectorAll('[data-testid="inbox-message"]').length` | Nombre de messages |
| Après clic filtre | `document.querySelectorAll('[data-testid="inbox-message"]:visible').length` | Nombre filtré |
| Vérif assignation | `[...document.querySelectorAll('[data-testid="inbox-message"]')].map(m => m.dataset.assigned)` | `['false', 'false', ...]` |

### Patch anti-flaky avec `.or()` 

Le pattern `.or()` évite la race condition "liste visible mais filtre pas encore appliqué" :

```typescript
// ❌ Flaky : attend juste le premier message
await expect(page.locator('[data-testid="inbox-message"]').first()).toBeVisible();

// ✅ Robuste : attend message OU état vide (filtre appliqué)
await expect(
  page.locator('[data-testid="inbox-message"]:visible').first()
    .or(page.locator('[data-testid="inbox-empty"]'))
).toBeVisible({ timeout: 10000 });
```

**Pourquoi ça marche :**
- Si messages existent après filtre → le premier devient visible
- Si filtre retourne 0 résultats → `inbox-empty` s'affiche
- Dans les deux cas, l'attente se termine proprement

### Commandes résumé Sprint 36

```bash
# Debug pas-à-pas "Non rattachés"
PWDEBUG=1 pnpm playwright test e2e/inbox-filters.spec.ts -g "Non rattachés"

# Debug tous les tests inbox
PWDEBUG=1 pnpm playwright test e2e/inbox-filters.spec.ts

# Headed rapide (sans pause)
pnpm playwright test e2e/inbox-filters.spec.ts --headed

# Trace complète pour analyse post-mortem
pnpm playwright test e2e/inbox-filters.spec.ts --trace on
pnpm playwright show-report
```

## Troubleshooting

### "MISSING TEST CREDENTIALS"

```bash
export TEST_USER_EMAIL=your-email@test.com
export TEST_USER_PASSWORD=yourpassword
```

### "TEST USER NOT FOUND" lors du seed

L'utilisateur de test n'existe pas. Créez-le via `/auth` (signup).

### Seed échoue avec erreur REST

Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est correct.

### Tests échouent au login

1. Vérifier que l'utilisateur existe
2. Vérifier `auto_confirm_email` activé
3. Relancer `npm run e2e:seed`

### Données manquantes (transcripts, inbox)

```bash
npm run e2e:seed
```

### Voir les traces après échec

```bash
npx playwright show-report
```

## Migration depuis seed SQL

L'ancien fichier `docs/seed_dev.sql` est conservé pour référence mais n'est plus utilisé.
Le seed automatique (`npm run e2e:seed`) le remplace et ne nécessite plus d'accès au SQL Editor.
