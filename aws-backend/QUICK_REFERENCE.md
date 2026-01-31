# RoboHatch Backend - Quick Reference Guide

## 🚀 Complete API Overview

**Base URL:** `http://localhost:5001`

---

## Authentication Endpoints

### Register
```bash
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
# Returns: { token: "eyJhbGc..." }
```

---

## Products Endpoints

### List Products
```bash
GET /api/products?page=1&limit=10
```

### Get Single Product
```bash
GET /api/products/:id
```

### Create Product (Admin)
```bash
POST /api/products
Authorization: Bearer <admin_token>
{
  "name": "Arduino Uno",
  "description": "Microcontroller board",
  "price": 25.99,
  "image_url": "https://example.com/arduino.jpg"
}
```

### Update Product (Admin)
```bash
PUT /api/products/:id
Authorization: Bearer <admin_token>
{
  "name": "Arduino Uno R3",
  "price": 27.99
}
```

### Delete Product (Admin)
```bash
DELETE /api/products/:id
Authorization: Bearer <admin_token>
```

---

## Shopping Cart Endpoints

### Get Cart
```bash
GET /api/cart
Authorization: Bearer <token>
```

### Add Item to Cart
```bash
POST /api/cart/items
Authorization: Bearer <token>
{
  "product_id": 5,
  "quantity": 2
}
```

### Update Cart Item
```bash
PUT /api/cart/items/:id
Authorization: Bearer <token>
{
  "quantity": 5
}
```

### Remove Cart Item
```bash
DELETE /api/cart/items/:id
Authorization: Bearer <token>
```

### Clear Cart
```bash
DELETE /api/cart
Authorization: Bearer <token>
```

---

## Custom STL Designs Endpoints

### Upload STL File
```bash
POST /api/designs/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- stlFile: <file.stl>
- product_id: 5 (optional)
```

### List User's Designs
```bash
GET /api/designs?page=1&limit=10
Authorization: Bearer <token>
```

### Get Design Details
```bash
GET /api/designs/:id
Authorization: Bearer <token>
```

### Delete Design
```bash
DELETE /api/designs/:id
Authorization: Bearer <token>
```

---

## Orders & Checkout Endpoints

### Checkout (Convert Cart to Order)
```bash
POST /api/orders/checkout
Authorization: Bearer <token>
```

### List User's Orders
```bash
GET /api/orders
Authorization: Bearer <token>
```

### Get Order Details
```bash
GET /api/orders/:id
Authorization: Bearer <token>
```

### Admin: View All Orders
```bash
GET /api/admin/orders
Authorization: Bearer <admin_token>
```

---

## Health & Testing Endpoints

### API Info
```bash
GET /
```

### Health Check
```bash
GET /api/health
```

### Database Test (Development)
```bash
GET /api/test-db
```

### Profile Test
```bash
GET /api/profile
Authorization: Bearer <token>
```

### Admin Test
```bash
GET /api/admin-only
Authorization: Bearer <admin_token>
```

---

## Complete Workflow Examples

### 1. User Registration → Product Purchase

```bash
# Step 1: Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'

# Response: Save TOKEN

# Step 2: Browse products
curl http://localhost:5001/api/products

# Step 3: Add to cart
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 2
  }'

# Step 4: View cart
curl http://localhost:5001/api/cart \
  -H "Authorization: Bearer <TOKEN>"

# Step 5: Checkout
curl -X POST http://localhost:5001/api/orders/checkout \
  -H "Authorization: Bearer <TOKEN>"

# Step 6: View orders
curl http://localhost:5001/api/orders \
  -H "Authorization: Bearer <TOKEN>"
```

### 2. Custom STL Design Order

```bash
# Step 1: Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'

# Step 2: Upload STL file
curl -X POST http://localhost:5001/api/designs/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "stlFile=@robot-arm.stl" \
  -F "product_id=5"

# Step 3: View uploaded designs
curl http://localhost:5001/api/designs \
  -H "Authorization: Bearer <TOKEN>"

# Step 4: Place order for custom design
# (Future: Add custom_design_id to cart, then checkout)
```

### 3. Admin Product Management

```bash
# Step 1: Admin login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@robohatch.com",
    "password": "adminPassword"
  }'

# Step 2: Create product
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Raspberry Pi 4",
    "description": "8GB RAM single-board computer",
    "price": 75.00,
    "image_url": "https://example.com/pi4.jpg"
  }'

# Step 3: Update product
curl -X PUT http://localhost:5001/api/products/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 69.99
  }'

# Step 4: View all orders
curl http://localhost:5001/api/admin/orders \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Step 5: Delete product
curl -X DELETE http://localhost:5001/api/products/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success (GET, PUT, DELETE) |
| 201 | Created (POST) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate entry) |
| 500 | Internal Server Error |

---

## Authentication Headers

All protected routes require JWT:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Pagination

Endpoints that support pagination:
- `GET /api/products`
- `GET /api/cart` (items paginated)
- `GET /api/designs`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

## File Upload Constraints

### STL Files (`/api/designs/upload`)
- **Max Size:** 50MB
- **Allowed Extensions:** `.stl`, `.STL`
- **Allowed MIME Types:** `application/sla`, `application/vnd.ms-pki.stl`, `model/stl`
- **Storage:** AWS S3 (private bucket)
- **Naming:** UUID + original extension

---

## Order Status Values

| Status | Description |
|--------|-------------|
| `pending` | Order placed, awaiting payment |
| `processing` | Manufacturing in progress |
| `shipped` | Order dispatched |
| `completed` | Order delivered |
| `cancelled` | Order cancelled |

---

## Database Migrations

### Run Migrations
```bash
# Migration 001: Cart tables
node run-migration-001.js

# Migration 002: Custom designs STL columns
node run-migration-002.js

# Migration 003: Order items for custom designs
node run-migration-003.js
```

---

## Environment Setup

```bash
# 1. Clone and install
git clone <repo>
cd aws-backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 4. Setup database
# Run schema.sql in AWS RDS MySQL

# 5. Run migrations
node run-migration-001.js
node run-migration-002.js
node run-migration-003.js

# 6. Start server
npm start
```

---

## Troubleshooting

### Database Connection Timeout
- Check AWS RDS security group
- Verify inbound rules allow your IP on port 3306
- Check VPC settings

### JWT Invalid
- Ensure `JWT_SECRET` matches between .env and database
- Check token expiration (24h default)
- Verify Bearer token format

### File Upload Fails
- Check AWS credentials in .env
- Verify S3 bucket exists (robohatch-stl-uploads)
- Check file size (max 50MB)
- Verify file extension (.stl)

### Cart Empty on Checkout
- Ensure cart has items before checkout
- Cart auto-creates on first item add
- Check user_id matches between cart and token

---

## Documentation Files

- **README.md** - Main documentation
- **docs/ORDERS_API.md** - Complete orders API reference
- **schema.sql** - Database schema
- **STEP10-COMPLETE.md** - Implementation summary
- **.env.example** - Environment template

---

## NPM Scripts

```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "node test-s3-upload.js"
}
```

---

## Security Checklist

- ✅ JWT authentication on all protected routes
- ✅ bcrypt password hashing (10 salt rounds)
- ✅ Parameterized SQL queries (no string concatenation)
- ✅ Role-based authorization (user/admin)
- ✅ Private S3 bucket (no public access)
- ✅ SSL for production database
- ✅ Environment variables for secrets
- ✅ .env in .gitignore
- ✅ Input validation on all routes
- ✅ Ownership enforcement (user isolation)
- ✅ Transaction safety for orders

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 16+ |
| Framework | Express.js |
| Database | AWS RDS MySQL |
| Driver | mysql2/promise |
| ORM | None (raw SQL) |
| Authentication | JWT |
| Password Hash | bcrypt |
| File Storage | AWS S3 |
| Validation | express-validator |
| CORS | cors middleware |

---

## Development Tools

- **Postman** - API testing
- **curl** - Command-line testing
- **MySQL Workbench** - Database management
- **AWS Console** - RDS/S3 management
- **nodemon** - Development auto-restart

---

## Port Configuration

- **Server:** 5001
- **Database:** 3306 (MySQL)

---

## Future Enhancements

- [ ] Payment gateway (Razorpay/Stripe)
- [ ] Email notifications (Nodemailer)
- [ ] Invoice generation (PDF)
- [ ] Order status updates
- [ ] Refund support
- [ ] Inventory management
- [ ] Rate limiting
- [ ] API versioning
- [ ] WebSocket for real-time updates
- [ ] Redis caching
- [ ] Elasticsearch for product search
- [ ] GraphQL API

---

**Last Updated:** January 27, 2026  
**Version:** 1.0.0  
**Status:** Production-Ready
