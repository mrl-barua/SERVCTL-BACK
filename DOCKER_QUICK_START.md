# SERVCTL Backend - Complete Docker + Database Setup

## Quick Start (Docker)

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for running Prisma migrations)

### 1. Start PostgreSQL Database

```bash
cd backend

# Start the database container (creates database automatically)
docker compose up -d

# Verify database was created
docker compose exec -T servctl-db psql -U developer -d Servctl -c "SELECT NOW();"
```

### 2. Configure Environment

```bash
cp .env.example .env

# .env should have for Docker development:
# DATABASE_URL=postgresql://developer:masterkey@localhost:5432/Servctl
```

### 3. Initialize Database Schema

```bash
# Install dependencies first
npm install

# Create Prisma migrations (creates tables)
npx prisma migrate dev --name init

# Or deploy existing migrations
npx prisma migrate deploy
```

### 4. Start NestJS Backend

```bash
npm run start:dev
```

Server runs on `http://localhost:3000` ✅

## Database Initialization Explained

### How It Works

The database is automatically created on first startup via initialization scripts:

1. **`scripts/init-db.sql`** - SQL script that creates the "Servctl" database if it doesn't exist
2. **`docker-compose.yml`** - Mounts the SQL script to `/docker-entrypoint-initdb.d/`
3. **PostgreSQL** - Automatically executes all scripts in `/docker-entrypoint-initdb.d/` on first initialization

### Files Involved

```
backend/
├── docker-compose.yml          # Volume mount for init-db.sql
├── scripts/
│   ├── init-db.sql             # Database creation script
│   └── init-db.sh              # Bash init script (optional)
├── .env.example                # Docker connection string
└── prisma/
    └── schema.prisma           # Table definitions
```

## Docker Commands

### Status & Logs

```bash
# View running containers
docker compose ps

# Check database logs
docker compose logs -f servctl-db

# Check last 50 lines
docker compose logs servctl-db --tail 50
```

### Connect to Database

```bash
# Interactive psql prompt
docker compose exec servctl-db psql -U developer -d Servctl

# In psql prompt:
\dt                    # List all tables
\l                     # List all databases
SELECT * FROM "User";  # Query users table
\q                     # Exit
```

### Restart & Reset

```bash
# Restart containers
docker compose restart

# Stop containers
docker compose down

# Full reset (removes everything)
docker compose down -v

# Start fresh
docker compose up -d
```

## Troubleshooting

### Database doesn't exist after startup

✅ **Solution**: The init script only runs on first initialization

```bash
# Fresh start with new volume
docker compose down -v
docker compose up -d
```

### Connection refused

```bash
# Check if container is running
docker compose ps

# Check container status
docker compose logs servctl-db | tail -20

# Wait a few seconds - container needs time to start
sleep 5
docker compose exec -T servctl-db psql -U developer -d Servctl -c "SELECT NOW();"
```

### Migrations fail to run

```bash
# Ensure .env has correct database URL
cat .env | grep DATABASE_URL

# Example for Docker:
# DATABASE_URL=postgresql://developer:masterkey@localhost:5432/Servctl

# Verify database exists
docker compose exec -T servctl-db psql -U developer -d postgres -c "\l"
```

### Port 5432 already in use

Change the port in `docker-compose.yml`:

```yaml
services:
  servctl-db:
    ports:
      - '5433:5432' # Use 5433 externally, 5432 internally
```

Update `.env`:

```
DATABASE_URL=postgresql://developer:masterkey@localhost:5433/Servctl
```

### Permission denied on scripts

On Linux/Mac:

```bash
chmod +x scripts/init-db.sh
```

## Database Credentials

Used in `docker-compose.yml`:

- **Database Name**: Servctl
- **Username**: developer
- **Password**: masterkey
- **Port**: 5432

Connection string:

```
postgresql://developer:masterkey@localhost:5432/Servctl
```

## Full Development Workflow

```bash
# 1. Start database
docker compose up -d

# 2. Setup environment
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Run migrations
npx prisma migrate dev --name init

# 5. Start development server
npm run start:dev

# 6. In another terminal, test the API
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testPassword123",
    "name": "Test User"
  }'
```

## Stopping Everything

```bash
# Stop all containers (keeps volumes/data)
docker compose down

# Stop all containers and remove volumes (clean state)
docker compose down -v

# Remove only the database container (keeps volume)
docker container rm backend-servctl-db-1

# Stop individual service
docker compose stop servctl-db
```

## Production Deployment

For production, use managed PostgreSQL (Neon.tech, RDS, etc.):

```bash
# In .env for production
DATABASE_URL=postgresql://user:password@database-host:5432/servctl?sslmode=require
```

Docker Compose is for development only. For production:

- Use managed database service
- Run NestJS app on Vercel/Railway/Heroku
- Never commit `.env` with production secrets

## Verify Everything Works

```bash
# Database running?
docker compose ps

# Database is initialized?
docker compose exec -T servctl-db psql -U developer -d Servctl -c "SELECT NOW();"

# Prisma can connect?
npx prisma db execute --stdin < /dev/null

# Backend can start?
npm run build

# All set!
npm run start:dev
```

## See Also

- [README.md](README.md) - Full API documentation
- [SETUP.md](SETUP.md) - Quick start guide
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Docker setup details
- [PROJECT_MANIFEST.md](PROJECT_MANIFEST.md) - File inventory
