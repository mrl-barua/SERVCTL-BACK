# SERVCTL Backend - Ready to Use! 🎉

## ✅ Current Status

Your complete SERVCTL backend is now **fully configured and ready**:

- ✅ NestJS application scaffolded
- ✅ PostgreSQL database initialized with auto-creation
- ✅ Docker Compose configured
- ✅ Prisma ORM ready
- ✅ Authentication (JWT + bcrypt) implemented
- ✅ Server CRUD endpoints with per-user isolation
- ✅ Environment configuration prepared

## Quick Start (5 minutes)

### 1. Start the Database
```bash
docker compose up -d
```

Verify it's running:
```bash
docker compose logs servctl-db | grep "ready to accept connections"
```

### 2. Run Database Migrations
```bash
npm install
npx prisma migrate dev --name init
```

This creates the `User` and `Server` tables automatically.

### 3. Start the NestJS Backend
```bash
npm run start:dev
```

You'll see:
```
Server running on port 3000
```

### 4. Test the API
```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "testPassword123",
    "name": "Test User"
  }'

# Save the access_token from response
export TOKEN="<your_token_here>"

# Get current user
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Project Files Reference

### Core Backend
- `src/main.ts` - Entry point
- `src/app.module.ts` - Main app module
- `src/auth/` - Authentication (register, login, JWT)
- `src/servers/` - Server CRUD operations
- `src/prisma/` - Database connection

### Database & Configuration
- `prisma/schema.prisma` - Database schema (User, Server models)
- `docker-compose.yml` - PostgreSQL setup
- `.env` - Environment variables (auto-created from .env.example)
- `scripts/init-db.sql` - Auto-database creation script

### Documentation
- `README.md` - Full API reference
- `DOCKER_QUICK_START.md` - Docker setup details
- `SETUP.md` - Complete setup guide
- `PROJECT_MANIFEST.md` - File inventory

## Database Credentials

Used in Docker:
```
Host: localhost
Port: 5432
Database: Servctl
User: developer
Password: masterkey
```

Connection string in `.env`:
```
DATABASE_URL=postgresql://developer:masterkey@localhost:5432/Servctl?sslmode=disable
```

## Common Commands

```bash
# Development
npm run start:dev              # Start with hot reload
npm run build                  # Build for production
npm start:prod               # Run production build

# Database
npx prisma migrate dev       # Create migrations
npx prisma migrate deploy    # Run migrations (production)
npx prisma db push           # Push schema to DB (dev shortcut)
npx prisma studio            # Open Prisma Studio GUI

# Docker
docker compose up -d         # Start database
docker compose down          # Stop database
docker compose logs -f       # View logs
docker compose exec -T servctl-db psql -U developer -d Servctl  # Connect to DB

# Code Quality
npm run lint                 # ESLint
npm run format              # Prettier
npm test                    # Jest tests
```

## API Endpoints

All endpoints are documented in `README.md`, but here's a quick reference:

### No Authentication Required
- `POST /auth/register` - Create account
- `POST /auth/login` - Login & get JWT

### Requires JWT Authorization
- `GET /auth/me` - Get current user
- `GET /servers` - List your servers
- `POST /servers` - Create server
- `GET /servers/:id` - Get server details
- `PATCH /servers/:id` - Update server
- `DELETE /servers/:id` - Delete server

## Database Schema

### User Table
```javascript
id         Int (PK)
email      String (Unique)
password   String (Hashed)
name       String
createdAt  DateTime
servers    Server[] (Relation)
```

### Server Table
```javascript
id         Int (PK)
name       String
host       String
user       String (default: "ubuntu")
port       Int (default: 22)
env        String ("prod"|"live"|"qa"|"test")
notes      String?
deploy     String?
logpath    String?
status     String (default: "unknown")
uptime     Float (default: 0)
createdAt  DateTime
updatedAt  DateTime
ownerId    Int (FK) → User
```

## Troubleshooting

### Database not responding?
```bash
# Restart database
docker compose down
docker compose up -d

# Check status
docker compose logs servctl-db
```

### Migrations fail?
```bash
# Ensure .env has correct DATABASE_URL
cat .env | grep DATABASE_URL

# Try migration again
npx prisma migrate deploy

# Or create initial migration
npx prisma db push
npx prisma migrate dev --name init
```

### Port 5432 already in use?
Edit `docker-compose.yml`:
```yaml
ports:
  - 5433:5432  # Use different port
```

Update `.env`:
```
DATABASE_URL=postgresql://developer:masterkey@localhost:5433/Servctl?sslmode=disable
```

### Backend won't start?
```bash
# Check for TypeScript errors
npm run build

# Check all dependencies installed
npm install

# View logs
npm run start:dev
```

## Production Deployment

### For Vercel / Serverless
1. Update `DATABASE_URL` to use production PostgreSQL (e.g., Neon.tech)
2. Set strong `JWT_SECRET` in environment
3. Configure `CORS_ORIGIN` for your frontend domain
4. Run: `npx prisma migrate deploy` in CI/CD before deploy
5. Deploy: `git push` (Vercel auto-deploys)

### For Traditional Server
1. Use managed PostgreSQL (RDS, Heroku Postgres, etc.)
2. Update `DATABASE_URL` in production environment
3. Run migrations: `npx prisma migrate deploy`
4. Start: `npm start:prod` on port 3000
5. Use reverse proxy (nginx) for SSL

## Next Steps

1. **Verify database is working**:
   ```bash
   docker compose ps
   ```

2. **Create Prisma migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Start development**:
   ```bash
   npm run start:dev
   ```

4. **Create frontend** to consume the API

5. **Deploy** to production when ready

## Architecture Overview

```
Client (Frontend)
    ↓
NestJS Backend (localhost:3000)
    ↓
Prisma ORM
    ↓
PostgreSQL Database (localhost:5432 via Docker)
    ↓
User & Server Data
```

## Environment Variables

Essential variables in `.env` (already configured):
```
DATABASE_URL=postgresql://developer:masterkey@localhost:5432/Servctl?sslmode=disable
JWT_SECRET=your-super-secret-key-change-this...
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

For production, change:
- `JWT_SECRET` to a strong random key
- `CORS_ORIGIN` to your frontend domain
- `DATABASE_URL` to production database
- `NODE_ENV=production`

## File Structure
```
backend/
├── src/
│   ├── auth/               # JWT authentication
│   ├── servers/            # CRUD operations
│   ├── prisma/             # Database service
│   ├── app.module.ts       # Main module
│   └── main.ts             # Entry point
├── prisma/
│   └── schema.prisma       # ORM schema
├── docker-compose.yml      # Database container
├── .env                    # Configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── README.md               # Full documentation
```

## Support & Resources

- **API Docs**: See [README.md](README.md)
- **Setup Guide**: See [SETUP.md](SETUP.md)
- **Docker Help**: See [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md)
- **NestJS Docs**: https://docs.nestjs.com
- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL**: https://www.postgresql.org/docs

---

**🚀 You're all set! Start with `docker compose up -d && npm run start:dev`**
