#!/usr/bin/env bash
# Starts all backend services for local development.
# Run from /home/Nathan/car_help/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/intelligence/.env.local"

# Load .env.local if it exists, skipping comments, blank lines, and
# any keys that aren't valid shell identifiers (e.g. 2015_BMW_320I)
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading $ENV_FILE"
  while IFS= read -r line; do
    # Skip comments and blank lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    # Only export lines that look like VALID_NAME=value
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "${line%%#*}"   # strip inline comments before exporting
    fi
  done < "$ENV_FILE"
else
  echo "No .env.local found at $ENV_FILE — running without API keys"
fi

echo ""
echo "Starting Vehicle Intelligence Service (FastAPI :8001)..."
cd "$SCRIPT_DIR/intelligence"
venv/bin/uvicorn app.main:app --port 8001 --reload &
FASTAPI_PID=$!

sleep 2

echo "Starting API Gateway (Hono :3001)..."
cd "$SCRIPT_DIR/api"
INTELLIGENCE_URL=http://localhost:8001 node --import tsx/esm src/index.ts &
HONO_PID=$!

echo ""
echo "Backend running:"
echo "  Intelligence: http://localhost:8001/docs"
echo "  Gateway:      http://localhost:3001/health"
echo ""
echo "Start mobile: cd mobile && npx expo start"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $FASTAPI_PID $HONO_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
