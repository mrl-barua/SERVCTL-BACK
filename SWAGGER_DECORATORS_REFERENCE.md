# Swagger Decorators Quick Reference

## Essential Decorators for New Endpoints

### 1. Controller-Level Decorators

```typescript
@ApiTags('servers')           // Groups endpoints under "servers" tab
@Controller('servers')        // Route prefix
@UseGuards(AuthGuard('jwt'))  // Require JWT for all methods
@ApiBearerAuth('JWT-auth')    // Mark all endpoints as needing JWT
export class ServersController { ... }
```

### 2. Endpoint-Level Decorators

#### Describe the Operation
```typescript
@Get('/:id')
@ApiOperation({ 
  summary: 'Get a server by ID',
  description: 'Retrieves detailed information about a specific server'
})
getServer(@Param('id') id: number) { ... }
```

#### Document Responses
```typescript
@ApiResponse({
  status: 200,
  description: 'Server retrieved successfully',
  schema: {
    example: {
      id: 1,
      name: 'Production Server',
      status: 'running'
    }
  }
})
@ApiResponse({
  status: 404,
  description: 'Server not found'
})
@ApiResponse({
  status: 403,
  description: 'Forbidden - server does not belong to user'
})
```

#### Document Parameters
```typescript
@ApiParam({
  name: 'id',
  description: 'Server ID',
  example: 1,
  type: Number
})

@ApiQuery({
  name: 'limit',
  description: 'Number of items to return',
  required: false,
  example: 10
})
```

### 3. DTO Property Decorators

```typescript
export class CreateServerDto {
  @ApiProperty({
    example: 'Production Server',
    description: 'Human-readable server name',
    minLength: 1,
    maxLength: 255
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '192.168.1.100',
    description: 'Server IP address or hostname',
  })
  @IsString()
  host: string;

  @ApiProperty({
    example: 22,
    description: 'SSH port number',
    required: false,
    minimum: 1,
    maximum: 65535
  })
  @IsNumber()
  @IsOptional()
  port?: number;

  @ApiProperty({
    description: 'Environment type',
    enum: ['prod', 'staging', 'dev'],
    required: false
  })
  @IsIn(['prod', 'staging', 'dev'])
  @IsOptional()
  environment?: string;
}
```

## Complete Endpoint Example

```typescript
@Post('restart')
@ApiOperation({
  summary: 'Restart a server',
  description: 'Initiates a server restart and returns the status'
})
@ApiParam({
  name: 'id',
  description: 'Server ID to restart',
  example: 1
})
@ApiBody({
  description: 'Restart options',
  type: RestartServerDto,
  example: {
    timeout: 300,
    force: false
  }
})
@ApiResponse({
  status: 200,
  description: 'Server restart initiated successfully',
  schema: {
    example: {
      id: 1,
      status: 'restarting',
      message: 'Server restart initiated'
    }
  }
})
@ApiResponse({
  status: 403,
  description: 'Forbidden - server does not belong to user'
})
@ApiResponse({
  status: 404,
  description: 'Server not found'
})
@ApiBearerAuth('JWT-auth')
async restartServer(
  @Param('id', ParseIntPipe) id: number,
  @Body() restartDto: RestartServerDto,
  @CurrentUser() user: any
) {
  return this.serversService.restart(id, user.id, restartDto);
}
```

## Common Patterns

### Protected Endpoint
```typescript
@Get()
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
getSecure() { ... }
```

### List with Pagination
```typescript
@Get()
@ApiQuery({
  name: 'skip',
  required: false,
  example: 0,
  description: 'Number of items to skip'
})
@ApiQuery({
  name: 'take',
  required: false,
  example: 10,
  description: 'Number of items to return'
})
list(@Query() pagination: PaginationDto) { ... }
```

### Create with Location Header
```typescript
@Post()
@ApiResponse({
  status: 201,
  description: 'Resource created',
  headers: {
    Location: {
      description: 'URL of the created resource',
      example: '/servers/1'
    }
  }
})
create(@Body() dto: CreateDto) { ... }
```

### Exception Responses
```typescript
@ApiResponse({ status: 400, description: 'Bad Request' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 404, description: 'Not Found' })
@ApiResponse({ status: 500, description: 'Internal Server Error' })
```

## Tips & Tricks

### 1. Type Inference
Swagger can automatically infer types from your DTOs:
```typescript
@ApiBody({ type: CreateServerDto })
create(@Body() dto: CreateServerDto) { ... }
```

### 2. Array Responses
```typescript
@ApiResponse({
  status: 200,
  type: [ServerDto]  // Array of ServerDto
})
list() { ... }
```

### 3. Reusable Decorators
Create a decorator composition:
```typescript
const AuthorizedOp = () => applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiResponse({ status: 401, description: 'Unauthorized' })
);

// Usage
@Get()
@AuthorizedOp()
secure() { ... }
```

### 4. Skip a Property in Documentation
```typescript
@ApiHideProperty()
internalField: string;
```

## Validation Rules

### Auto-Document Validators
```typescript
@IsEmail()              // Swagger sees as email format
@IsString()             // Swagger sees as string type
@MinLength(6)           // Swagger shows minLength: 6
@MaxLength(100)         // Swagger shows maxLength: 100
@Min(1)                 // Swagger shows minimum: 1
@Max(65535)             // Swagger shows maximum: 65535
@IsIn(['a', 'b'])       // Swagger shows enum
@IsOptional()           // Swagger shows as not required
```

## Access Swagger UI

```
http://localhost:3000/api/docs
```

Features:
- ✅ View all endpoints grouped by tags
- ✅ Try endpoints directly from browser
- ✅ See request/response examples
- ✅ Test with JWT tokens
- ✅ View validation rules
- ✅ See error responses

## Common Mistakes to Avoid

❌ **Don't**: Forget `@ApiProperty` on DTO fields
```typescript
export class MyDto {
  field: string;  // Won't show in Swagger
}
```

✅ **Do**: Add the decorator
```typescript
export class MyDto {
  @ApiProperty()
  field: string;  // Shows in Swagger
}
```

---

❌ **Don't**: Skip `@ApiResponse` decorators
```typescript
@Post()
create() { ... }  // Swagger only shows 201
```

✅ **Do**: Document all responses
```typescript
@Post()
@ApiResponse({ status: 201, description: 'Created' })
@ApiResponse({ status: 400, description: 'Bad Request' })
create() { ... }
```

---

❌ **Don't**: Forget examples
```typescript
@ApiProperty({ description: 'Email' })
```

✅ **Do**: Include realistic examples
```typescript
@ApiProperty({
  example: 'user@example.com',
  description: 'User email address'
})
```
