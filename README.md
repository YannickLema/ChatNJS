# ChatNJS

Petit chat temps-réel (NestJS + Vue 3/Vite). Ce guide décrit comment démarrer le projet sur une nouvelle machine.

## Prérequis
- Node.js 18+ et npm
- (Optionnel) Docker + Docker Compose

## Configuration rapide (sans Docker)
Dans deux terminaux séparés :

1) Backend
```bash
cd backend
npm install
npm run start:dev
```
Le backend écoute sur `http://localhost:3000`.

2) Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env.local
echo "VITE_WS_URL=http://localhost:3000" >> .env.local
npm run dev -- --host
```
Le frontend tourne sur `http://localhost:5173`.

## Démarrage via Docker
```bash
docker compose up --build -d
```
Ensuite ouvrez `http://localhost:5173`.

## Utilisation
- Créez un compte ou connectez-vous.
- Accédez au chat via `/chat`.
- Gérez votre pseudo et couleur via `/profil`.

## Tests (backend)
```bash
cd backend
npm test
```