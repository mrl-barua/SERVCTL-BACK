# Claude.md

This document defines the backend architecture and implementation guidelines for this codebase.

## 1. System Overview

- Framework: NestJS 10
- Runtime: Node.js 18+
- Data layer: Prisma + PostgreSQL
- Authentication: JWT (Passport strategy)
- API docs: Swagger/OpenAPI at `/api/docs`

The application is a modular REST API for user authentication and server inventory/control.

## 2. High-Level Architecture

### Application Composition

- `AppModule` wires global modules and feature modules.
- `ConfigModule` is global and loads environment variables from `.env`.
- `PrismaModule` provides a shared `PrismaService`.
- `AuthModule` owns login, register, token validation, and current-user context.
- `ServersModule` owns CRUD and status operations for user-owned servers.

### Request Flow

1. Incoming HTTP request reaches a controller route.
2. JWT guard validates protected routes and resolves user context.
3. Global `ValidationPipe` validates and transforms DTOs.
4. Controller delegates business logic to service layer.
5. Service uses `PrismaService` for persistence.
6. Response is returned and reflected in Swagger schema.

## 3. Code Organization

### Feature Structure

Use this folder pattern per feature:

```text
src/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  dto/
```

Current features:

- `src/auth`
- `src/servers`
- `src/prisma` (shared infrastructure)

### Responsibility Rules

- Controller: route mapping, request/response contract, auth decorators.
- Service: business logic, authorization checks, data operations.
- DTO: validation and API schema definition.
- Prisma service/module: DB access setup only.

## 4. API and DTO Guidelines

- Every new route should include Swagger decorators:
  - `@ApiOperation`
  - `@ApiResponse` for success and expected errors
  - `@ApiParam`/`@ApiQuery` where applicable
  - `@ApiBearerAuth('JWT-auth')` for protected endpoints
- Every DTO field should use validation decorators and `@ApiProperty`.
- Keep response payloads explicit and stable; avoid leaking internal fields.

## 5. Authentication and Authorization

- Auth tokens are JWT bearer tokens.
- Public endpoints are limited to registration/login.
- Feature modules that contain user data should use `AuthGuard('jwt')`.
- Service methods must enforce per-user ownership checks before read/write/delete.

## 6. Error Handling Conventions

- Use Nest standard exceptions (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`) in service logic.
- Return clear, actionable error messages.
- Document common error responses with Swagger.

## 7. Environment and Configuration

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `CORS_ORIGIN`

Guidelines:

- Never commit secrets.
- Keep `.env.example` in sync with actual usage.
- Prefer `ConfigService` for values used outside bootstrap.

## 8. Development Workflow

Core commands:

- `npm run start:dev`
- `npm run build`
- `npm run lint`
- `npm test`
- `npm run prisma:migrate`
- `npm run prisma:generate`

Before merging code:

1. Build passes.
2. Lint passes.
3. Swagger docs reflect new/changed endpoints.
4. DTO validation exists for all new request shapes.

## 9. Change Guidelines for Future Contributors

- Follow existing module boundaries; do not place business logic in controllers.
- Prefer small DTOs over optional, catch-all request bodies.
- Keep naming consistent (`<Feature>Controller`, `<Feature>Service`, `<Action>Dto`).
- Update Swagger decorators as part of endpoint changes.
- Add or update tests for non-trivial business logic and authorization rules.

## 10. Documentation Policy

- Keep `README.md` as the primary onboarding doc.
- Keep `claude.md` as the architecture and implementation guide.
- Avoid creating one-off completion/report files in root.
- Place any additional long-form docs in `docs/` only when they provide ongoing value.
