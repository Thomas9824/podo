# Déploiement Windows — Dashboard Revenus Podologue

## Ce que l'utilisateur final obtient

Un double-clic sur **`dashboard.exe`** (ou `Demarrer.bat` en mode portable) :
- démarre le serveur en arrière-plan
- ouvre automatiquement `http://localhost:3000` dans le navigateur par défaut
- aucune installation requise pour l'utilisateur final

---

## Prérequis pour le développeur (à faire une seule fois)

| Outil | Version minimale | Lien |
|-------|-----------------|------|
| Node.js | 18 LTS | https://nodejs.org |
| pnpm | 8+ | `npm i -g pnpm` |

---

## Étapes de build (sur Windows ou Mac/Linux avec Wine)

### Option A — Script automatique (Windows)

```bat
build-windows.bat
```

Le script fait tout dans l'ordre :
1. `pnpm install`
2. `pnpm build` (Next.js → `.next/standalone/`)
3. Copie des assets statiques
4. `pkg` → `dist/dashboard.exe`

Si `pkg` échoue, un **mode portable** est généré automatiquement dans `dist/app/` avec `Demarrer.bat`.

---

### Option B — Étapes manuelles

```bash
# 1. Installer les dépendances
pnpm install

# 2. Builder Next.js en mode standalone
pnpm build

# 3. Copier les assets dans le dossier standalone
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 4. Générer l'exe (nécessite pkg installé globalement)
npm install -g pkg
pkg launcher.js --targets node18-win-x64 --output dist/dashboard.exe
```

---

## Structure du dossier standalone (mode portable)

```
dist/
  app/
    server.js          ← serveur Next.js auto-généré
    .next/
      static/          ← assets JS/CSS
    public/            ← fichiers publics
    launcher.js        ← script de démarrage
    Demarrer.bat       ← double-clic pour lancer
```

---

## Distribuer à l'utilisateur

### Avec `pkg` (recommandé) :
→ Copier uniquement `dist/dashboard.exe` sur le PC cible. C'est tout.

### Mode portable :
→ Copier le dossier `dist/app/` entier sur le PC cible.
→ L'utilisateur double-clique sur `Demarrer.bat`.

> **Note :** le mode portable nécessite que Node.js soit installé sur le PC cible.
> L'exe généré par `pkg` est **totalement autonome** (Node.js inclus).

---

## Port utilisé

Par défaut : `3000`. Si ce port est déjà occupé, modifier la variable `PORT` dans [`launcher.js`](launcher.js).
