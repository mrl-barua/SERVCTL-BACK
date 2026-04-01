#!/bin/sh
set -e

SECRETS_FILE="/app/data/.secrets"

# Auto-generate secrets if JWT_SECRET is not provided via environment
if [ -z "$JWT_SECRET" ]; then
  if [ -f "$SECRETS_FILE" ]; then
    # Load previously generated secrets
    . "$SECRETS_FILE"
    export JWT_SECRET ENCRYPTION_KEY
    echo "[servctl] Loaded existing secrets from $SECRETS_FILE"
  else
    # Generate new secrets on first run
    mkdir -p /app/data
    export JWT_SECRET=$(openssl rand -hex 32)
    export ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo "JWT_SECRET=$JWT_SECRET" > "$SECRETS_FILE"
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> "$SECRETS_FILE"
    chmod 600 "$SECRETS_FILE"
    echo "[servctl] Generated new secrets in $SECRETS_FILE"
  fi
fi

# Ensure ENCRYPTION_KEY is set (may come from env or secrets file)
if [ -z "$ENCRYPTION_KEY" ]; then
  if [ -f "$SECRETS_FILE" ] && grep -q ENCRYPTION_KEY "$SECRETS_FILE"; then
    . "$SECRETS_FILE"
    export ENCRYPTION_KEY
  else
    export ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> "$SECRETS_FILE"
    echo "[servctl] Generated ENCRYPTION_KEY"
  fi
fi

echo "[servctl] Running database migrations..."
npx prisma migrate deploy || npx prisma db push

echo "[servctl] Starting server..."
exec npm start
