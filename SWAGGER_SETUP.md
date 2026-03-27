# Swagger/OpenAPI Setup Guide

## Overview

Swagger documentation has been fully integrated into the SERVCTL backend. The API documentation is automatically generated and accessible at:

```
http://localhost:3000/api/docs
```

## Features

✅ **Auto-Discovery**: Swagger automatically detects all endpoints from your controllers  
✅ **Request/Response Examples**: Real examples for each endpoint  
✅ **JWT Authentication**: Built-in JWT token testing in Swagger UI  
✅ **Input Validation**: All DTO properties documented with validation rules  
✅ **Error Codes**: HTTP status codes and error responses documented  
✅ **Try-It-Out**: Test API endpoints directly from the documentation  

## How New Endpoints Are Automatically Added

When you add a new method to a controller, Swagger **automatically** includes it in the documentation if you add the proper decorators. Here's how:

### Step 1: Add Route Handler to Controller

Example - adding a new route to `servers.controller.ts`:

```typescript
@Get('status/:id')
getServerStatus(@Param('id', ParseIntPipe) id: number) {
  return this.serversService.getServerStatus(id);
}
```

### Step 2: Add Swagger Decorators (Required for Documentation)

To make the endpoint appear in Swagger with proper documentation:

```typescript
@Get('status/:id')
@ApiOperation({ summary: 'Get server status' })
@ApiParam({
  name: 'id',
  description: 'Server ID',
  example: 1,
})
@ApiResponse({
  status: 200,
  description: 'Server status information',
  schema: {
    example: {
      id: 1,
      status: 'running',
      uptime: 99.5,
      lastCheck: '2024-01-15T10:30:00Z',
    },
  },
})
@ApiBearerAuth('JWT-auth')
getServerStatus(@Param('id', ParseIntPipe) id: number) {
  return this.serversService.getServerStatus(id);
}
```

### Swagger Decorator Reference

#### Common Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@ApiOperation` | Describes what the endpoint does | `@ApiOperation({ summary: 'Get user by ID' })` |
| `@ApiResponse` | Documents response status and structure | `@ApiResponse({ status: 200, description: 'Success' })` |
| `@ApiParam` | Documents URL parameters | `@ApiParam({ name: 'id', example: 1 })` |
| `@ApiQuery` | Documents query parameters | `@ApiQuery({ name: 'limit', type: Number })` |
| `@ApiBody` | Documents request body | `@ApiBody({ type: CreateServerDto })` |
| `@ApiBearerAuth` | Marks endpoint as requiring JWT | `@ApiBearerAuth('JWT-auth')` |
| `@ApiTags` | Groups endpoints by tag | `@ApiTags('servers')` |
| `@ApiProperty` | Describes DTO properties | `@ApiProperty({ example: 'test@example.com' })` |

## Current API Documentation

### Authentication Endpoints

**POST /auth/register**
- Register a new user
- Returns JWT token and user data
- No authentication required

**POST /auth/login**
- Login with email and password
- Returns JWT token and user data
- No authentication required

**GET /auth/me**
- Get current user information
- Requires JWT authentication

### Server Management Endpoints

**GET /servers**
- List all servers for current user
- Requires JWT authentication

**GET /servers/:id**
- Get specific server details
- Requires JWT authentication
- Returns 403 Forbidden if server doesn't belong to user

**POST /servers**
- Create a new server
- Requires JWT authentication

**PATCH /servers/:id**
- Update a server
- Requires JWT authentication
- Returns 403 Forbidden if server doesn't belong to user

**DELETE /servers/:id**
- Delete a server
- Requires JWT authentication
- Returns 403 Forbidden if server doesn't belong to user

## Adding a New Endpoint - Complete Example

Let's say you want to add an endpoint to restart a server:

### 1. Update the Service

```typescript
// src/servers/servers.service.ts
async restartServer(id: number, userId: number) {
  const server = await this.prisma.server.findUnique({
    where: { id },
  });

  if (!server || server.ownerId !== userId) {
    throw new ForbiddenException('Server not found or unauthorized');
  }

  // TODO: Implement SSH restart logic
  return { id, status: 'restarting' };
}
```

### 2. Add the Controller Method with Swagger Decorators

```typescript
// src/servers/servers.controller.ts
@Post(':id/restart')
@ApiOperation({ summary: 'Restart a server' })
@ApiParam({
  name: 'id',
  description: 'Server ID',
  example: 1,
})
@ApiResponse({
  status: 200,
  description: 'Server restart initiated',
  schema: {
    example: {
      id: 1,
      status: 'restarting',
    },
  },
})
@ApiResponse({
  status: 403,
  description: 'Forbidden - server does not belong to user',
})
@ApiBearerAuth('JWT-auth')
async restartServer(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: any,
) {
  return this.serversService.restartServer(id, user.id);
}
```

### 3. Build and Access Documentation

```bash
npm run build
npm run start:dev
# Navigate to http://localhost:3000/api/docs
```

The new `POST /servers/:id/restart` endpoint will automatically appear in the Swagger documentation with full request/response examples.

## Swagger Configuration

The Swagger configuration is in `src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('SERVCTL API')
  .setDescription('Server Control Panel SaaS API Documentation')
  .setVersion('1.0.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'JWT-auth',
  )
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
  },
});
```

### Configuration Options

- **Title**: "SERVCTL API" - Shown at top of documentation
- **Description**: Describe your API
- **Version**: Current API version
- **BearerAuth**: JWT token authentication setup
- **Endpoint**: `/api/docs` - Where Swagger UI is accessible

## Testing with Swagger UI

1. Open http://localhost:3000/api/docs
2. Click "Authorize" button (lock icon)
3. Enter your JWT token from login response
4. All endpoints will now have authorization
5. Click "Try it out" on any endpoint to test it
6. Click "Execute" to send the request

## Advanced: Custom Response Schemas

For complex responses, you can define separate DTO classes:

```typescript
export class ServerResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  host: string;

  @ApiProperty({ type: () => UserResponseDto })
  owner: UserResponseDto;
}
```

Then use it in the decorator:

```typescript
@ApiResponse({
  status: 200,
  type: ServerResponseDto,
})
```

## Best Practices

1. **Always Add Decorators**: Every public endpoint should have `@ApiOperation` and `@ApiResponse`
2. **Provide Examples**: Include realistic examples in `@ApiProperty` decorators
3. **Document Error Codes**: Show all possible error responses with `@ApiResponse`
4. **Use Consistent Tags**: Group related endpoints with `@ApiTags`
5. **Update Documentation**: Keep descriptions in sync with actual behavior

## Troubleshooting

**Endpoint not appearing in Swagger:**
- Ensure you've added `@ApiOperation` decorator
- Make sure the controller method is exported
- Rebuild the application: `npm run build`

**Wrong status code shown:**
- Check that your `@ApiResponse` decorators match actual HTTP status codes

**JWT not working in Swagger UI:**
- Copy the full token from login response (including "Bearer " prefix)
- Paste it in the Authorize dialog
- Refresh the page

## Links

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [API Documentation Endpoint](http://localhost:3000/api/docs)
