#!/usr/bin/env bash
set -euo pipefail

cd /app
npm install
npm run migrate up
npm run start
