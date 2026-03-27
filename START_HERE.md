# SERVCTL Backend - Quick Reference

## 🚀 Start Immediately

```bash
# 1. Start database (one command)
docker compose up -d

# 2. Install & setup (wait for previous to finish)
npm install
npx prisma migrate dev --name init

# 3. Run backend
npm run start:dev
```

Server runs on **http://localhost:3000** ✅

## 📋 Test the API

```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'

# Copy the access_token from response, then:

# Get current user
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📖 Documentation

- **GETTING_STARTED.md** - First-time users (5 min setup)
- **README.md** - Complete API reference
- **DOCKER_QUICK_START.md** - Docker setup details
- **VERIFICATION.md** - System status & checklist

## ✅ Status

- ✅ Database: PostgreSQL 17 ready
- ✅ Backend: NestJS fully configured
- ✅ Auth: JWT + bcrypt implemented
- ✅ Database: Auto-initialization working
- ✅ Compilation: Zero errors

## 📁 Project Structure

```
backend/
├── src/
│   ├── auth/          # Login & registration
│   ├── servers/       # Server CRUD
│   └── prisma/        # Database connection
├── prisma/
│   └── schema.prisma  # User & Server models
├── docker-compose.yml # PostgreSQL setup
├── .env              # Configuration
└── package.json      # Dependencies
```

## 🔧 Commands

```bash
npm run start:dev         # Development mode
npm run build            # Production build
npm run build && npm start:prod  # Run production

# Database
npx prisma migrate dev   # Create migrations
npx prisma studio       # Open database GUI
docker compose down -v   # Reset database
```

## 🔐 Database Credentials

- **Host**: localhost
- **Port**: 5432
- **Database**: Servctl
- **User**: developer
- **Password**: masterkey

## 🌐 API Endpoints

**No Auth Required:**
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token

**Auth Required:**
- `GET /auth/me` - Current user
- `GET /servers` - List servers
- `POST /servers` - Create server
- `PATCH /servers/:id` - Update server
- `DELETE /servers/:id` - Delete server

## 🚨 Troubleshooting

### Database won't start?
```bash
docker compose down -v
docker compose up -d
```

### Migrations fail?
```bash
npx prisma db push
npx prisma migrate dev --name init
```

### Port 5432 in use?
Edit `docker-compose.yml` line 15:
```yaml
ports:
  - "5433:5432"  # Use 5433
```

Update `.env`:
```
DATABASE_URL=postgresql://developer:masterkey@localhost:5433/Servctl?sslmode=disable
```

## 📚 Need Help?

1. Read **GETTING_STARTED.md** (5 min guide)
2. Check **README.md** (detailed docs)
3. See **VERIFICATION.md** (system status)

## 🎯 Next Steps

1. ✅ Start database: `docker compose up -d`
2. ✅ Run migrations: `npx prisma migrate dev --name init`
3. ✅ Start backend: `npm run start:dev`
4. ✅ Create frontend to consume API
5. ✅ Deploy to production

---

**Everything is ready. Start with:**
```bash
docker compose up -d && npm install && npx prisma migrate dev --name init && npm run start:dev
```
