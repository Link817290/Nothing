#!/bin/bash
# Nothing — Pull + rebuild + restart
# Usage:
#   bash deploy/update.sh          # rebuild all
#   bash deploy/update.sh server   # rebuild server only
#   bash deploy/update.sh web      # rebuild web only
set -e

cd ~/Nothing && git pull
cd deploy

SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
  echo "=== Rebuilding all ==="
  docker compose build && docker compose up -d
else
  echo "=== Rebuilding $SERVICE ==="
  docker compose up -d --build --force-recreate "$SERVICE"
fi

echo ""
docker compose ps
echo ""
echo "=== Done ==="
