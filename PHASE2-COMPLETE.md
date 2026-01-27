# ✅ PHASE 2 COMPLETE - Authentication & Role Authorization

## 🎉 What Has Been Implemented

A complete, secure authentication system with JWT and role-based access control:

### ✅ Core Features
- **Customer Registration** - Public endpoint for CUSTOMER role only
- **Login System** - For both ADMIN and CUSTOMER users
- **JWT Authentication** - Access tokens (15min) + Refresh tokens (7d)
- **Token Refresh** - Secure refresh token rotation
- **Role-Based Authorization** - ADMIN and CUSTOMER roles
- **Admin Seeding** - Secure admin creation via seed script
- **Global Guards** - JWT and Roles guards applied application-wide

### ✅ Security Features
- **bcrypt Password Hashing** - Secure password storage
- **Refresh Token Rotation** - Prevents token reuse
- **Hashed Refresh Tokens** - Stored securely in database
- **JWT Secrets** - Configurable via environment variables
- **Public Route Decorator** - Selective authentication bypass
- **403 Forbidden** - For insufficient permissions
- **401 Unauthorized** - For invalid credentials

## 📁 Project Structure

```
src/
├── auth/
│   ├── auth.module.ts              # Auth module configuration
│   ├── auth.controller.ts          # Auth endpoints
│   ├── auth.service.ts             # Auth business logic
│   ├── strategies/
│   │   └── jwt.strategy.ts         # Passport JWT strategy
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # JWT authentication guard
│   │   └── roles.guard.ts          # Role authorization guard
│   ├── decorators/
│   │   ├── roles.decorator.ts      # @Roles() decorator
│   │   └── public.decorator.ts     # @Public() decorator
│   └── dto/
│       ├── register.dto.ts         # Registration validation
│       └── login.dto.ts            # Login validation
├── users/
│   ├── users.module.ts             # Users module
│   └── users.service.ts            # User CRUD operations
├── config/
│   └── jwt.config.ts               # JWT configuration
└── prisma/
    └── seed.ts                     # Admin seeding script
```

## 🗄️ Database Schema

```prisma
enum Role {
  ADMIN
  CUSTOMER
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  password     String
  role         Role
  refreshToken String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## 🔐 API Endpoints

### Public Endpoints (No Auth Required)

#### Register Customer
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "SecurePass123"
}

Response: 201 Created
{
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "role": "CUSTOMER"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@robohatch.com",
  "password": "Admin@123456"
}

Response: 200 OK
{
  "user": {
    "id": "uuid",
    "email": "admin@robohatch.com",
    "role": "ADMIN"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "userId": "uuid",
  "refreshToken": "eyJhbGc..."
}

Response: 200 OK
{
  "user": {...},
  "accessToken": "new-token",
  "refreshToken": "new-refresh-token"
}
```

### Protected Endpoints (Auth Required)

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access-token>

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

#### Health Check (Public)
```http
GET /api/v1/health

Response: 200 OK
{
  "status": "ok",
  "environment": "development"
}
```

## 🛡️ Role-Based Access Control

### Using the Roles Decorator

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from './auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
export class AdminController {
  
  // Only ADMIN can access
  @Roles(Role.ADMIN)
  @Get('dashboard')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
}

@Controller('cart')
export class CartController {
  
  // Only CUSTOMER can access
  @Roles(Role.CUSTOMER)
  @Get()
  getCart() {
    return { message: 'Customer cart' };
  }
}
```

### Access Control Matrix

| Route | Access |
|-------|--------|
| `/api/v1/auth/register` | Public |
| `/api/v1/auth/login` | Public |
| `/api/v1/auth/refresh` | Public |
| `/api/v1/health` | Public |
| `/api/v1/cart/*` | CUSTOMER only |
| `/api/v1/orders/*` | CUSTOMER only |
| `/api/v1/admin/*` | ADMIN only |

## 🚀 Setup & Testing

### 1. Database Setup

```bash
# Create database (PostgreSQL must be running)
docker run --name robohatch-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres

# Create tables
npx prisma db push
```

### 2. Seed Admin Account

```bash
npm run prisma:seed
```

**Default Admin Credentials:**
- Email: `admin@robohatch.com`
- Password: `Admin@123456`

⚠️ **Change these in production!**

### 3. Test the API

```bash
# Register a customer
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Customer123"
  }'

# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@robohatch.com",
    "password": "Admin@123456"
  }'

# Access protected route
curl http://localhost:3000/api/v1/some-protected-route \
  -H "Authorization: Bearer <your-access-token>"
```

## ⚙️ Environment Variables

```env
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Admin Credentials (for seeding)
ADMIN_EMAIL=admin@robohatch.com
ADMIN_PASSWORD=Admin@123456
```

## 🔒 Security Best Practices Implemented

✅ **Password Hashing** - bcrypt with salt rounds of 10  
✅ **JWT Secrets** - Configurable via environment variables  
✅ **Refresh Token Rotation** - New token issued on each refresh  
✅ **Hashed Refresh Tokens** - Stored hashed in database  
✅ **No Sensitive Data in Responses** - Passwords excluded  
✅ **Role Verification** - Every request checked against roles  
✅ **Admin Registration Blocked** - No public admin signup  
✅ **Input Validation** - class-validator on all DTOs  
✅ **Proper HTTP Status Codes** - 401, 403, 409, etc.  

## 🧪 Testing Scenarios

### ✅ Customer Can Register
```bash
POST /api/v1/auth/register
# Should return 201 with CUSTOMER role
```

### ❌ Admin Cannot Register
```bash
# No public endpoint for admin registration
# Admin created only via seed script
```

### ✅ Admin Can Login
```bash
POST /api/v1/auth/login
# With admin credentials
# Should return 200 with ADMIN role
```

### ❌ Customer Cannot Access Admin Routes
```typescript
@Roles(Role.ADMIN)
@Get('admin-only')
// Returns 403 Forbidden for CUSTOMER
```

### ❌ Invalid Token is Rejected
```bash
# Use expired or malformed token
# Returns 401 Unauthorized
```

### ✅ Token Refresh Works
```bash
POST /api/v1/auth/refresh
# Returns new access + refresh tokens
```

## 🛠️ How Guards Work

1. **Global JWT Guard** - Applied to all routes by default
2. **@Public() Decorator** - Bypasses JWT guard for specific routes
3. **Global Roles Guard** - Checks user role after authentication
4. **@Roles() Decorator** - Specifies required roles for route

### Request Flow

```
Request → Global JWT Guard → Validate Token → Extract User
       → Global Roles Guard → Check Required Roles
       → Controller Method
```

## 📝 Validation Rules

### Register DTO
- ✅ Email must be valid format
- ✅ Password minimum 8 characters
- ❌ No role field allowed (auto-assigned as CUSTOMER)

### Login DTO
- ✅ Email required
- ✅ Password required

## 🚫 What's NOT Included (By Design)

As per Phase 2 scope:
- ❌ Products logic
- ❌ Cart logic
- ❌ Orders logic
- ❌ Payments logic
- ❌ User profiles
- ❌ Password reset
- ❌ Email verification

**These will be added in future phases.**

## 🎯 Next Steps (Phase 3 Suggestions)

- User profile management
- Password reset flow
- Email verification
- Product catalog
- Shopping cart
- Order management

## 📊 Key Files

- **[prisma/schema.prisma](prisma/schema.prisma)** - User model and Role enum
- **[src/auth/auth.service.ts](src/auth/auth.service.ts)** - Authentication logic
- **[src/auth/strategies/jwt.strategy.ts](src/auth/strategies/jwt.strategy.ts)** - JWT validation
- **[src/auth/guards/roles.guard.ts](src/auth/guards/roles.guard.ts)** - Role authorization
- **[prisma/seed.ts](prisma/seed.ts)** - Admin seeding script
- **[.env](.env)** - Environment configuration

## 🎯 Status

**Phase 2: COMPLETE ✅**

The authentication system is production-ready with:
- ✅ Secure password hashing
- ✅ JWT access + refresh tokens
- ✅ Role-based authorization
- ✅ Admin account seeding
- ✅ Global guards configured
- ✅ Proper error handling
- ✅ Input validation

---

**Built with:** NestJS | Passport.js | JWT | bcrypt | Prisma  
**Security:** Production-ready authentication & authorization  
**Status:** ✅ Ready for Phase 3
