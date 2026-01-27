# RoboHatch Backend - Phase 1: Core Foundation

Production-ready NestJS backend for 3D-printing e-commerce platform.

## 🎯 Phase 1 Features

✅ NestJS project with TypeScript strict mode  
✅ PostgreSQL database connection  
✅ Prisma ORM integration  
✅ Global request validation  
✅ Centralized error handling  
✅ API versioning (`/api/v1`)  
✅ Environment-based configuration  
✅ Health check endpoint  

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/robohatch_dev?schema=public"
   ```

3. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Run migrations (when models are added):**
   ```bash
   npm run prisma:migrate
   ```

### Running the Application

**Development mode:**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

The server will start at `http://localhost:3000`

## 🏥 Health Check

Test the API:
```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "development"
}
```

## 📁 Project Structure

```
src/
├── app.module.ts              # Root application module
├── main.ts                    # Application entry point
├── config/                    # Configuration files
│   ├── app.config.ts         # App settings
│   └── database.config.ts    # Database settings
├── prisma/                    # Database layer
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/                    # Shared utilities
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── constants/
└── health/                    # Health check feature
    ├── health.controller.ts
    └── health.module.ts
```

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in development mode with hot-reload |
| `npm run start:prod` | Start in production mode |
| `npm run build` | Build the project |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## ⚙️ Configuration

Configuration is managed through environment variables and the `@nestjs/config` module:

- **app.config.ts**: Application settings (port, environment, API version)
- **database.config.ts**: Database connection settings

All configurations are validated at startup. The application will fail fast if required variables are missing.

## 🔥 Features

### Global Validation
- Automatic DTO validation using `class-validator`
- Whitelisting of allowed properties
- Automatic type transformation
- Detailed validation errors in development

### Error Handling
- Centralized exception filter
- HTTP exception handling
- Prisma error transformation
- Standardized error response format

### API Versioning
- URI-based versioning (`/api/v1`)
- Easy to upgrade to v2
- Configured globally

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | *Required* |

## 🔐 Security

- CORS enabled (configurable per environment)
- Helmet integration ready
- Input validation enabled
- SQL injection protection via Prisma

## 📦 Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL
- **ORM**: Prisma 5.x
- **Validation**: class-validator, class-transformer
- **Configuration**: @nestjs/config

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 Next Steps (Future Phases)

- Phase 2: Authentication & Authorization
- Phase 3: User Management
- Phase 4: Product Management
- Phase 5: Order Management
- Phase 6: Payment Integration

## 🤝 Development Guidelines

- Follow NestJS best practices
- Use DTOs for all request/response objects
- Keep business logic in services
- Use dependency injection
- Write unit tests for services
- Keep controllers thin

---

**Status**: ✅ Phase 1 Complete - Foundation Ready
