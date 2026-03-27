# SERVCTL Backend - Server Control Panel SaaS

A production-ready NestJS backend for managing servers in a SaaS control panel application.

## Architecture And Contribution Guide

See `claude.md` for backend architecture, module boundaries, coding guidelines, and documentation policy.

## Tech Stack

- **Framework**: NestJS 10
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + Passport
- **Password Hashing**: bcrypt
- **Deployment**: Vercel (serverless)

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- PostgreSQL database (or Neon.tech free tier)

## Installation

1. **Clone the repository**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL`: Your PostgreSQL connection string (compatible with Neon.tech)
   - `JWT_SECRET`: A secure secret key for JWT signing
   - `JWT_EXPIRES_IN`: Token expiration time (default: "7d")
   - `PORT`: Server port (default: 3000)
   - `CORS_ORIGIN`: CORS allowed origins (default: "\*")

4. **Set up the database**

   ```bash
   npx prisma migrate dev --name init
   ```

   This will:
   - Create the database schema
   - Generate Prisma Client

5. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

## Development

### Start the development server

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` and watch for file changes.

### Other useful commands

```bash
# Build for production
npm run build

# Start production server
npm start:prod

# Run linting
npm run lint

# Format code
npm run format

# Run tests
npm test

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## API Endpoints

### Authentication (No Guard Required)

#### Register

```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

Response:
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Login

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Get Current User

```
GET /auth/me
Authorization: Bearer <access_token>

Response:
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Servers (All Require JWT Authorization)

#### List All Servers

```
GET /servers
Authorization: Bearer <access_token>

Response:
[
  {
    "id": 1,
    "name": "Production API",
    "host": "api.example.com",
    "user": "ubuntu",
    "port": 22,
    "env": "prod",
    "notes": "Main API server",
    "deploy": "docker",
    "logpath": "/var/log/app.log",
    "status": "online",
    "uptime": 99.8,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

#### Create Server

```
POST /servers
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Production API",
  "host": "api.example.com",
  "user": "ubuntu",
  "port": 22,
  "env": "prod",
  "notes": "Main API server",
  "deploy": "docker",
  "logpath": "/var/log/app.log"
}

Response: Same as created server object
```

#### Get Server Details

```
GET /servers/:id
Authorization: Bearer <access_token>

Response: Server object
```

#### Update Server

```
PATCH /servers/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "offline",
  "uptime": 95.2
}

Response: Updated server object
```

#### Delete Server

```
DELETE /servers/:id
Authorization: Bearer <access_token>

Response:
{
  "message": "Server deleted successfully"
}
```

## Server DTO Validation Rules

- **name** (required): string
- **host** (required): string (IP or hostname)
- **user** (optional): string (defaults to "ubuntu")
- **port** (optional): number 1-65535 (defaults to 22)
- **env** (optional): string, one of "prod" | "live" | "qa" | "test"
- **notes** (optional): string
- **deploy** (optional): string
- **logpath** (optional): string

## Security Features

- ✅ JWT-based authentication with configurable expiration
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ Per-user server isolation (403 Forbidden on unauthorized access)
- ✅ Global validation pipe with whitelist and transform
- ✅ CORS support with configurable origins
- ✅ Environment variables for sensitive data

## Database Schema

### User Model

```
- id (Int, PK, Auto-increment)
- email (String, Unique)
- password (String, Hashed)
- name (String)
- createdAt (DateTime)
- servers (Relation)
```

### Server Model

```
- id (Int, PK, Auto-increment)
- name (String)
- host (String)
- user (String, Default: "ubuntu")
- port (Int, Default: 22)
- env (String, Default: "prod")
- notes (String, Optional)
- deploy (String, Optional)
- logpath (String, Optional)
- status (String, Default: "unknown")
- uptime (Float, Default: 0)
- createdAt (DateTime)
- updatedAt (DateTime)
- ownerId (Int, FK)
- owner (User Relation)
```

## Deployment to Vercel

1. **Connect your GitHub repository to Vercel**

2. **Set environment variables in Vercel project settings**:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A secure random string
   - `JWT_EXPIRES_IN`: Token expiration (e.g., "7d")
   - `NODE_ENV`: Set to "production"

3. **Deploy**:

   ```bash
   git push origin main
   ```

   Vercel will automatically build and deploy.

4. **Run migrations**:
   After deployment, run:
   ```bash
   npx prisma migrate deploy
   ```
   (You may need to do this via a one-time Vercel serverless function or your deployment CI/CD)

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

Error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "BadRequest"
}
```

## Development Notes

- All files are production-ready with no placeholder code
- Validation is strict with whitelist enabled
- Database migrations are automatic via Prisma
- CORS is enabled for all origins in development
- JWT strategy uses Bearer token authentication
- All server endpoints require authentication
- Users can only access/modify their own servers

## Troubleshooting

### Database connection fails

- Check `DATABASE_URL` format and credentials
- Ensure PostgreSQL is running
- For Neon.tech, verify tier is active

### Migrations fail

- Try `npx prisma db push` if migrations folder is corrupted
- Check database permissions for the user

### Build fails on Vercel

- Ensure Node.js version >= 18
- Check environment variables are set
- Verify database connection works

## License

MIT
