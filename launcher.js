#!/usr/bin/env node
/**
 * launcher.js — démarre le serveur Next.js standalone et ouvre le navigateur.
 * Empaqueté en .exe via `pkg` : Node.js est inclus dans l'exe.
 * L'utilisateur n'a rien à installer.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

// pkg snapshot : __dirname = dossier de l'exe au runtime
// next build --output standalone génère .next/standalone/server.js
const serverScript = path.join(__dirname, 'server.js');

if (!fs.existsSync(serverScript)) {
  console.error('[ERREUR] server.js introuvable dans : ' + __dirname);
  console.error('Assurez-vous que le build Next.js standalone a été effectué.');
  process.exit(1);
}

// Ouvre le navigateur par défaut Windows
function openBrowser(url) {
  exec(`start "" "${url}"`);
}

// Attend que le serveur réponde avant d'ouvrir le navigateur
function waitForServer(url, retries, callback) {
  http.get(url, () => {
    callback();
  }).on('error', () => {
    if (retries > 0) {
      setTimeout(() => waitForServer(url, retries - 1, callback), 500);
    } else {
      console.error('[ERREUR] Le serveur n\'a pas répondu après 20 secondes.');
    }
  });
}

// Lance le serveur Next.js standalone
// process.execPath = chemin vers Node.js embarqué dans l'exe par pkg
const server = spawn(process.execPath, [serverScript], {
  env: {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
  },
  stdio: 'ignore',
  detached: false,
});

server.on('error', (err) => {
  console.error('[ERREUR] Impossible de démarrer le serveur :', err.message);
  process.exit(1);
});

console.log('Démarrage du dashboard...');

// Attendre max ~20 secondes (40 tentatives × 500ms)
waitForServer(URL, 40, () => {
  console.log('Ouverture du navigateur...');
  openBrowser(URL);
});

// Quand le launcher est fermé, tuer le serveur proprement
process.on('SIGINT', () => { server.kill(); process.exit(); });
process.on('SIGTERM', () => { server.kill(); process.exit(); });
process.on('exit', () => server.kill());
