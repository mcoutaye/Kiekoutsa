#!/bin/bash
set -e

echo "→ Pull des dernières modifications..."
git pull origin main

echo "→ Installation des dépendances..."
npm ci --production=false

echo "→ Build..."
npm run build

echo "→ Redémarrage PM2..."
pm2 restart kiekoutsa

echo "✓ Déploiement terminé"
