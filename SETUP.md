# SERVCTL Backend - Quick Start Guide

## ✅ Project Setup Complete!

Your NestJS backend has been successfully scaffolded and is ready for development.

### Current Status

- ✅ All 778 npm packages installed
- ✅ TypeScript compilation successful
- ✅ Build artifacts generated in `/dist`
- ✅ Project structure complete

### Next Steps

#### 1. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and set:

- `DATABASE_URL=postgresql://user:password@host/database?sslmode=require`
- `JWT_SECRET=your-secure-random-secret-key`
- `JWT_EXPIRES_IN=7d` (optional, already has default)
- `PORT=3000` (optional, can override)

#### 2. Initialize Database

```bash
npx prisma migrate dev --name init
```

This will:

- Create database schema
- Generate Prisma Client
- Create migration files

#### 3. Start Development Server

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` with hot-reload enabled.

#### 4. Test the API

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testPassword123",
    "name": "Test User"
  }'

# Response will include access_token - save it
```

### Available Scripts

```bash
# Development
npm run start:dev        # Start with watch mode
npm start               # Start in production mode

# Building
npm run build           # Build for production
npm run prebuild        # Clean dist folder

# Database
npm run prisma:migrate  # Create/run migrations
npm run prisma:studio   # Open Prisma Studio GUI
npm run prisma:generate # Generate Prisma Client

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm test               # Run tests
npm run test:watch     # Run tests in watch mode

# Database
npm run prisma:studio   # Open database GUI at localhost:5555
```

### Project Structure

```
src/
├── auth/              # Authentication module
│   ├── dto/           # Data validation objects
│   ├── decorators/    # Custom decorators (@CurrentUser)
│   └── auth.*         # Auth service/controller/strategy
├── servers/           # Server management module
│   ├── dto/           # Server DTOs
│   └── servers.*      # Service/controller
├── prisma/            # Database module
├── app.module.ts      # Main app module
└── main.ts            # Entry point
```

### API Endpoints

**Authentication** (No guard):

- `POST /auth/register` - Create new user
- `POST /auth/login` - Login and get JWT
- `GET /auth/me` - Get current user (requires JWT)

**Servers** (All require JWT):

- `GET /servers` - List user's servers
- `POST /servers` - Create server
- `GET /servers/:id` - Get single server
- `PATCH /servers/:id` - Update server
- `DELETE /servers/:id` - Delete server

### Required Environment Setup

Before running the server, you need:

1. **PostgreSQL Database**
   - Local: `postgresql://localhost/servctl`
   - Cloud: Use Neon.tech (free tier compatible)

2. **JWT Configuration**
   - `JWT_SECRET`: Generate a random key (min 32 chars recommended)
   - `JWT_EXPIRES_IN`: Token lifetime (e.g., "7d", "24h")

### Troubleshooting

#### Database Connection Issues

```bash
# Test Prisma connection
npx prisma db execute --stdin
SELECT NOW();
```

#### Type Errors

If you get TypeScript errors, ensure:

```bash
npm run prisma:generate  # Regenerate Prisma types
npm install              # Update dependencies
npm run build            # Test compilation
```

#### Port Already in Use

```bash
# Use a different port
PORT=3001 npm run start:dev
```

### For Production/Vercel

1. Set all environment variables in Vercel project settings
2. Ensure PostgreSQL SSL connection is configured
3. Run migrations before deploy:
   ```bash
   npx prisma migrate deploy
   ```

### Deployment Checklist

- [ ] Set strong `JWT_SECRET` (use `openssl rand -base64 32`)
- [ ] Update `CORS_ORIGIN` for your frontend domain
- [ ] Use PostgreSQL with SSL enabled
- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables
- [ ] Test API endpoints in production

### Support

For issues or questions:

1. Check README.md for detailed documentation
2. Review Prisma docs: https://www.prisma.io/docs
3. NestJS docs: https://docs.nestjs.com
4. PostgreSQL setup: https://www.postgresql.org/docs

---

**Ready to go!** Run `npm run start:dev` to begin development. 🚀
