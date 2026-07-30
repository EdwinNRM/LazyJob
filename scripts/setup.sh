#!/bin/bash
set -e

echo "=== LazyJob - Setup ==="

echo ""
echo "[1/4] Instalando dependências do backend..."
cd "$(dirname "$0")/../backend"
npm install

echo ""
echo "[2/4] Inicializando banco de dados..."
npx prisma migrate dev --name init

echo ""
echo "[3/4] Instalando dependências do frontend..."
cd "$(dirname "$0")/../frontend"
npm install

echo ""
echo "[4/4] Instalando Playwright browsers..."
npx playwright install chromium

echo ""
echo "=== Setup concluído! ==="
echo ""
echo "Para iniciar:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Acesse: http://localhost:5173"
