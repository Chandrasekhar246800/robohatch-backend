# RoboHatch AWS Backend

Production-ready e-commerce backend built with Node.js, Express, and AWS RDS MySQL.

## 🏗️ Architecture

```
aws-backend/
├── config/           # Database connection & pooling
├── middleware/       # Authentication & authorization
├── routes/           # API endpoints (auth, products, test)
├── schema.sql        # Database structure documentation
├── app.js            # Express app setup
├── server.js         # Entry point
└── .env.example      # Environment variables template
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: AWS RDS MySQL (mysql2/promise, no ORM)
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **Architecture**: RESTful API

## 📋 Prerequisites

- Node.js 16+ installed
- AWS RDS MySQL instance running
- Database created (`robohatch_db`)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd aws-backend
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
NODE_ENV=development
PORT=5001

DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=robohatch_db

JWT_SECRET=<generate-with-crypto>
JWT_EXPIRES_IN=24h
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Setup Database Schema

Run the SQL commands from `schema.sql` in your AWS RDS MySQL instance.

### 4. Start Server

### 4. Start Server

```bash
npm start
```

**Development mode with auto-restart:**
```bash
npm run dev
```

Server runs at: **http://localhost:5001**

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Products (Public reads, Admin writes)
- `GET /api/products` - List all products (paginated)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Shopping Cart (Auth required)
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item quantity
- `DELETE /api/cart/items/:id` - Remove item from cart
- `DELETE /api/cart` - Clear entire cart

### Custom STL Designs (Auth required)
- `POST /api/designs/upload` - Upload STL file to S3
- `GET /api/designs` - List user's designs
- `GET /api/designs/:id` - Get design details
- `DELETE /api/designs/:id` - Delete design from S3

### Orders & Checkout (Auth required)
- `POST /api/orders/checkout` - Convert cart to order (transaction)
- `GET /api/orders` - List user's orders
- `GET /api/orders/:id` - Get order details
- `GET /api/admin/orders` - Admin: View all orders

### Payments (Razorpay Integration)
- `POST /api/payments/create` - Create Razorpay payment order
- `POST /api/payments/verify` - Verify payment signature (critical)
- `POST /api/payments/webhook` - Razorpay webhook handler
- `GET /api/payments/order/:id` - Get payment status

### Health & Testing
- `GET /` - API info
- `GET /api/health` - Health check
- `GET /api/test-db` - Database connectivity test (dev only)
- `GET /api/profile` - Get current user profile (auth required)
- `GET /api/admin-only` - Admin-only test endpoint

---

## 🔐 Authentication

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Using JWT Token
Include token in Authorization header for protected routes:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Database Structure

See [`schema.sql`](schema.sql) for complete schema with indexes.

**Tables:**
- `users` - User accounts (auth, roles)
- `products` - Product catalog
- `carts` - User shopping carts
- `cart_items` - Cart line items
- `custom_designs` - STL file uploads (AWS S3)
- `orders` - Finalized orders
- `order_items` - Order line items (with price snapshots)

---

## 🛡️ Security Features

- ✅ Parameterized SQL queries (SQL injection prevention)
- ✅ bcrypt password hashing (salt rounds: 10)
- ✅ JWT token expiration (24h default)
- ✅ Role-based authorization (user/admin)
- ✅ Input validation on all routes
- ✅ CORS enabled
- ✅ Sensitive data excluded from responses
- ✅ SSL for production database connections
- ✅ Fail-fast startup validation

---

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `5001` |
| `DB_HOST` | AWS RDS endpoint | **Yes** | - |
| `DB_PORT` | MySQL port | No | `3306` |
| `DB_USER` | Database user | **Yes** | - |
| `DB_PASSWORD` | Database password | **Yes** | - |
| `DB_NAME` | Database name | **Yes** | - |
| `DB_CONNECTION_LIMIT` | Pool size | No | `10` |
| `JWT_SECRET` | JWT signing secret | **Yes** | - |
| `JWT_EXPIRES_IN` | Token expiration | No | `24h` |

---

## 🚨 Error Handling

Consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## 📦 Production Deployment

### Pre-deployment Checklist

1. **Rotate secrets:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Set production environment:**
   ```env
   NODE_ENV=production
   ```

3. **Restrict CORS** in `app.js`:
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

4. **Add rate limiting** (recommended):
   ```bash
   npm install express-rate-limit
   ```

5. **Add security headers** (recommended):
   ```bash
   npm install helmet
   ```

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5001/api/health
```

### Create Product (requires admin token)
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "price": 29.99
  }'
```

---

## 🔄 Next Steps

- [ ] Shopping Cart API (Step 8)
- [ ] Orders & Checkout (Step 9)
- [ ] Payment Integration (Razorpay)
- [ ] File Upload (product images)
- [ ] Email Notifications
- [ ] API Rate Limiting
- [ ] CI/CD Pipeline

---

## 🐛 Troubleshooting

### Server won't start
- Check environment variables: `node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"`
- Test database connection manually

### JWT token errors
- **Token expired**: User must login again
- **Invalid token**: Verify JWT_SECRET matches

### Database connection errors
- Check RDS security group allows port 3306
- Verify credentials in `.env`
- Ensure SSL is enabled for production

---

## Expected Output

### Successful Start:
```
============================================================
🚀 Starting RoboHatch Backend Server
============================================================

📋 Step 1: Validating environment variables...
✅ Environment variables validated

📋 Step 2: Testing database connection...
✅ Database connection successful: { result: 2 }

📋 Step 3: Starting Express server...
============================================================
✅ SERVER RUNNING
============================================================
🌍 Environment: development
🔗 Server: http://localhost:5001
🗄️  Database: robohatch_db
🔒 SSL: Disabled
============================================================

✨ Server is ready to accept connections
```

---

## ✅ Features Implemented

- ✅ Connection pooling & SSL support
- ✅ Fail-fast startup validation
- ✅ JWT authentication with bcrypt
- ✅ Role-based authorization
- ✅ Products CRUD API
- ✅ Input validation & error handling
- ✅ Graceful shutdown
- ✅ Request logging

---

**Built with ❤️ for RoboHatch E-commerce Platform**
