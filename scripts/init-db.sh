#!/bin/bash
# Initialize PostgreSQL database
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
until pg_isready -h localhost -U developer; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is ready!"

# Create the database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
  SELECT 'CREATE DATABASE "Servctl"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'Servctl')\gexec
EOSQL

echo "Database initialization complete!"
