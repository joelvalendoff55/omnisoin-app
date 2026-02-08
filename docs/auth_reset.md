# Réinitialisation de mot de passe

Ce document décrit le fonctionnement du flux de réinitialisation de mot de passe dans OmniSoin.

## Flux utilisateur

1. **Demande de réinitialisation**
   - L'utilisateur va dans `/settings?tab=security`
   - Clique sur "Changer le mot de passe"
   - Un email est envoyé avec un lien de réinitialisation

2. **Réception de l'email**
   - L'utilisateur reçoit un email de Supabase Auth
   - Le lien pointe vers `{APP_URL}/auth?reset=1`
   - Le lien contient des tokens de session dans le fragment URL

3. **Formulaire de réinitialisation**
   - La page `/auth` détecte le paramètre `?reset=1`
   - Elle vérifie si une session de recovery existe
   - Si valide : affiche le formulaire de nouveau mot de passe
   - Si invalide : affiche un message d'erreur avec lien retour

4. **Mise à jour du mot de passe**
   - L'utilisateur saisit un nouveau mot de passe (min 10 caractères)
   - Confirme le mot de passe
   - Soumet le formulaire
   - `supabase.auth.updateUser({ password })` est appelé
   - Redirection vers `/settings?tab=security`

## Configuration Supabase

### Redirect URLs

Dans la configuration Supabase Auth, les URLs de redirection doivent être configurées :

**Site URL :**
```
https://your-app.lovable.app
```

**Redirect URLs :**
```
https://your-app.lovable.app/**
https://preview-xxxxx.lovable.app/**
```

Note : Lovable Cloud configure automatiquement ces URLs.

### Email Template (optionnel)

Le template d'email peut être personnalisé dans Supabase Dashboard > Authentication > Email Templates.

Template par défaut pour "Reset Password" :
```html
<h2>Réinitialisez votre mot de passe</h2>
<p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
<p><a href="{{ .ConfirmationURL }}">Réinitialiser le mot de passe</a></p>
<p>Ce lien expire dans 24 heures.</p>
```

## Code technique

### Demande de reset (SecurityTab)

```typescript
const handleResetPassword = async () => {
  const redirectUrl = `${window.location.origin}/auth?reset=1`;
  
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: redirectUrl,
  });
  
  if (!error) {
    toast.success('Email envoyé');
  }
};
```

### Détection du mode reset (Auth.tsx)

```typescript
// Vérifier le paramètre URL
const resetParam = searchParams.get('reset');

if (resetParam === '1') {
  // Vérifier si session valide
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // Afficher formulaire reset
  } else {
    // Afficher erreur "lien invalide"
  }
}
```

### Mise à jour du mot de passe

```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

## Validation

| Critère | Règle |
|---------|-------|
| Longueur minimum | 10 caractères |
| Confirmation | Doit correspondre |
| Différent de l'ancien | Oui (erreur Supabase) |

## Gestion des erreurs

| Cas | Message affiché |
|-----|-----------------|
| Lien expiré/invalide | "Lien invalide ou expiré. Veuillez refaire une demande." |
| Mots de passe différents | "Les mots de passe ne correspondent pas" |
| Même mot de passe | "Le nouveau mot de passe doit être différent de l'ancien" |
| Trop court | "Le mot de passe doit contenir au moins 10 caractères" |

## Test manuel

1. **Prérequis**
   - Compte utilisateur existant
   - Accès à l'email du compte

2. **Étapes**
   - Se connecter à l'application
   - Aller dans `/settings?tab=security`
   - Cliquer "Changer le mot de passe"
   - Vérifier l'email reçu
   - Cliquer sur le lien
   - Saisir nouveau mot de passe (10+ chars)
   - Confirmer
   - Vérifier redirection vers settings
   - Se déconnecter
   - Se reconnecter avec nouveau mot de passe

3. **Test lien invalide**
   - Ouvrir `/auth?reset=1` directement (sans tokens)
   - Vérifier que le message "Lien invalide" s'affiche

## Test E2E

### Fichiers de test

| Fichier | Description |
|---------|-------------|
| `tests/e2e/reset-invalid.spec.ts` | Tests du lien invalide/expiré |
| `tests/e2e/reset-ui.spec.ts` | Tests de l'UI du formulaire de reset |

### Flag dev_recovery (DEV ONLY)

Pour tester l'UI du formulaire de reset sans avoir de vraie session recovery, un flag spécial est disponible **uniquement en mode développement** :

```
/auth?reset=1&dev_recovery=1
```

Ce flag :
- ✅ Fonctionne **uniquement** en `import.meta.env.DEV`
- ❌ Est **ignoré** en production
- 🧪 Permet de tester l'UI du formulaire sans email/token

### Exécuter les tests

```bash
# Tous les tests E2E
npx playwright test

# Seulement les tests de reset
npx playwright test tests/e2e/reset-invalid.spec.ts tests/e2e/reset-ui.spec.ts

# Mode interactif
npx playwright test --ui
```

### Data-testid disponibles

| Element | data-testid |
|---------|-------------|
| Container invalide | `reset-invalid` |
| Titre invalide | `reset-invalid-title` |
| Bouton retour login | `back-to-login` |
| Bouton renvoyer lien | `resend-reset-link` |
| Container valide | `reset-valid` |
| Titre valide | `reset-valid-title` |
| Input mot de passe | `reset-password` |
| Input confirmation | `reset-password-confirm` |
| Bouton submit | `reset-submit` |
| Input email forgot | `forgot-password-email` |

## Remember Me (Se souvenir de moi)

### Fonctionnement

La checkbox "Se souvenir de moi" sur la page de connexion contrôle la persistance de la session :

| Option | Stockage | Comportement |
|--------|----------|--------------|
| Cochée (défaut) | localStorage | Session persistante après fermeture du navigateur |
| Décochée | sessionStorage | Session terminée à la fermeture du navigateur |

### Implémentation technique

```typescript
// src/lib/authStorage.ts

// Lecture de la préférence
const rememberMe = getRememberMe(); // true par défaut

// Sauvegarde de la préférence
setRememberMe(false);

// Transfert de session après login sans "remember me"
if (!rememberMe) {
  transferSessionToSessionStorage();
}
```

### Stockage personnalisé

Le client Supabase utilise un storage adapter personnalisé (`customAuthStorage`) qui :

1. **En lecture** : cherche d'abord dans sessionStorage, puis localStorage
2. **En écriture** : stocke dans localStorage (remember=true) ou sessionStorage (remember=false)
3. **En suppression** : nettoie les deux storages

### Clé localStorage

```
omnisoin_remember_me = '1' | '0'
```

### Test manuel

1. **Avec "Se souvenir de moi" cochée :**
   - Se connecter → Rafraîchir → Toujours connecté
   - Fermer/rouvrir navigateur → Toujours connecté

2. **Sans "Se souvenir de moi" :**
   - Se connecter → Rafraîchir → Toujours connecté
   - Fermer/rouvrir navigateur → Déconnecté

## Sécurité

- Les tokens de reset sont à usage unique
- Expiration après 24h (configurable dans Supabase)
- Le mot de passe n'est jamais logué
- Validation côté client ET serveur (Supabase)
- Pas de révélation d'existence de compte
- Session-only storage disponible pour appareils partagés
