# Docker Database Initialization Guide

## Problem
The PostgreSQL container was failing with:
```
FATAL:  database "Servctl" does not exist
```

This happens because:
1. The `POSTGRES_DB` environment variable only creates the database on **first initialization**
2. Once the volume has data, PostgreSQL skips initialization
3. If the database doesn't exist in the volume, connection attempts fail

## Solution
We've added automatic database initialization scripts that will create the database if it doesn't exist.

## Files Added
- `scripts/init-db.sql` - SQL initialization script
- `scripts/init-db.sh` - Shell initialization script (optional)
- Updated `docker-compose.yml` with volume mount for init script

## How It Works

### For Fresh Starts (New Volume)
When you run `docker compose up` with a new/fresh volume:
1. PostgreSQL starts and initializes the cluster
2. The init script in `/docker-entrypoint-initdb.d/` runs automatically
3. The database "Servctl" is created if it doesn't exist
4. Migrations can then be applied

### For Existing Volumes (Database Already Created)
If the volume already exists with data but the database is missing:
1. The init script won't run automatically (only runs on first init)
2. You need to manually create the database

## Steps to Fix Existing Setup

### Option 1: Complete Fresh Start (RECOMMENDED)
```bash
# Stop containers
docker compose down

# Remove the old volume to force fresh initialization
docker volume rm servctl_db_data

# Start fresh - init script will now run and create the database
docker compose up -d

# Verify database was created
docker compose exec servctl-db psql -U developer -d Servctl -c "\l"
```

### Option 2: Keep Data, Create Database Manually
```bash
# Connect to the database container
docker compose exec servctl-db psql -U developer -d postgres

# In the psql prompt run:
CREATE DATABASE "Servctl";
\q

# Verify
docker compose exec servctl-db psql -U developer -d Servctl -c "\l"
```

### Option 3: Reset Volume Only (Keep Container Running)
```bash
# Stop and remove volume but keep data elsewhere (if needed)
docker compose down

# Remove volume
docker volume rm servctl_db_data

# Restart
docker compose up -d
```

## Verify Database Creation

```bash
# Check if database exists
docker compose exec servctl-db psql -U developer -d postgres -c "SELECT datname FROM pg_database WHERE datname='Servctl';"

# Should output:
#  datname 
# ---------
#  Servctl
# (1 row)

# Or list all databases
docker compose exec servctl-db psql -U developer -d postgres -c "\l"
```

## Run Migrations

Once the database is created, run Prisma migrations:

```bash
# From your backend directory
npx prisma migrate deploy

# Or for development with tracking
npx prisma migrate dev --name init
```

## Auto-Initialization Details

The init script:
- ✅ Checks if database "Servctl" exists before creating
- ✅ Won't fail if database already exists (idempotent)
- ✅ Runs only on first PostgreSQL initialization
- ✅ Executes in the correct order with proper error handling

## Connection String

Once the database is created, you can use:
```
DATABASE_URL=postgresql://developer:masterkey@localhost:5432/Servctl
```

## Troubleshooting

### Init script not running?
This is expected if the volume already has data. Use one of the manual options above.

### Still getting "database does not exist"?
```bash
# Force clean start
docker compose down -v
docker compose up -d

# Check logs
docker compose logs servctl-db
```

### Permission denied on init script?
On Linux/Mac, make it executable:
```bash
chmod +x scripts/init-db.sh
```

### Want to see init script execution?
```bash
docker compose logs servctl-db | grep -i "database\|servctl"
```

## Best Practices Going Forward

1. **Always** run `docker compose up` before running migrations
2. **Always** wait for healthcheck to pass before running migrations
3. **Use** `docker compose exec` to run commands in containers
4. **Check** container logs first when debugging: `docker compose logs -f servctl-db`

## Environment Variables

The database is configured with:
- **Database Name**: Servctl
- **Database User**: developer
- **Database Password**: masterkey
- **Port**: 5432
- **Image**: postgres:17-alpine (lightweight)

Update these in `.env` if needed:
```env
DATABASE_URL=postgresql://developer:masterkey@localhost:5432/Servctl
POSTGRES_USER=developer
POSTGRES_PASSWORD=masterkey
POSTGRES_DB=Servctl
```
