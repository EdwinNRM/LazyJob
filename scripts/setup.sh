#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run setup
printf '\nExecute npm start e abra http://127.0.0.1:3001\n'
printf 'Para coleta em sites: npm run browser:install\n'
