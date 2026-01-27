# 🧪 PHASE 2 Testing Guide

## Quick Start Testing

### Prerequisites
1. PostgreSQL running
2. Database configured in `.env`
3. Dependencies installed

### Step 1: Setup Database

```bash
# Create database tables
npx prisma db push

# Seed admin account
npm run prisma:seed
```

Expected output:
```
✅ Admin user created:
   Email: admin@robohatch.com
   Role: ADMIN
   
⚠️  Default password: Admin@123456
```

### Step 2: Start Application

```bash
npm run start:dev
```

Application should start at: `http://localhost:3000`

---

## Test Scenarios

### ✅ Test 1: Health Check (Public Route)

```bash
curl http://localhost:3000/api/v1/health
```

**Expected:** 200 OK
```json
{
  "status": "ok",
  "environment": "development"
}
```

---

### ✅ Test 2: Register Customer

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Customer123"
  }'
```

**Expected:** 201 Created
```json
{
  "user": {
    "id": "uuid",
    "email": "customer@test.com",
    "role": "CUSTOMER"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

✅ **Verify:** Role is automatically set to CUSTOMER

---

### ❌ Test 3: Invalid Registration (Short Password)

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "short"
  }'
```

**Expected:** 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Password must be at least 8 characters long"],
  "error": "Bad Request"
}
```

---

### ❌ Test 4: Duplicate Email

```bash
# Try to register with same email again
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Customer123"
  }'
```

**Expected:** 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "path": "/api/v1/auth/register",
  "timestamp": "2026-01-08T..."
}
```

---

### ✅ Test 5: Admin Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@robohatch.com",
    "password": "Admin@123456"
  }'
```

**Expected:** 200 OK
```json
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

✅ **Save the accessToken for next tests!**

---

### ❌ Test 6: Invalid Credentials

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@robohatch.com",
    "password": "WrongPassword"
  }'
```

**Expected:** 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "path": "/api/v1/auth/login",
  "timestamp": "2026-01-08T..."
}
```

---

### ✅ Test 7: Access Admin-Only Route

```bash
# Use the admin access token from Test 5
curl http://localhost:3000/api/v1/demo/admin-only \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

**Expected:** 200 OK
```json
{
  "message": "This route is only accessible by ADMIN role",
  "success": true
}
```

---

### ❌ Test 8: Customer Tries Admin Route

```bash
# First login as customer, then use that token
curl http://localhost:3000/api/v1/demo/admin-only \
  -H "Authorization: Bearer <CUSTOMER_ACCESS_TOKEN>"
```

**Expected:** 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "path": "/api/v1/demo/admin-only",
  "timestamp": "2026-01-08T..."
}
```

---

### ✅ Test 9: Customer Access Customer Route

```bash
curl http://localhost:3000/api/v1/demo/customer-only \
  -H "Authorization: Bearer <CUSTOMER_ACCESS_TOKEN>"
```

**Expected:** 200 OK
```json
{
  "message": "This route is only accessible by CUSTOMER role",
  "success": true
}
```

---

### ❌ Test 10: No Token Provided

```bash
curl http://localhost:3000/api/v1/demo/customer-only
```

**Expected:** 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### ✅ Test 11: Token Refresh

```bash
# Use refreshToken from login/register
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<USER_ID>",
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

**Expected:** 200 OK
```json
{
  "user": {
    "id": "uuid",
    "email": "customer@test.com",
    "role": "CUSTOMER"
  },
  "accessToken": "NEW_ACCESS_TOKEN",
  "refreshToken": "NEW_REFRESH_TOKEN"
}
```

✅ **Verify:** Old refresh token no longer works (token rotation)

---

### ✅ Test 12: Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected:** 200 OK
```json
{
  "message": "Logged out successfully"
}
```

---

### ❌ Test 13: Invalid Token Format

```bash
curl http://localhost:3000/api/v1/demo/customer-only \
  -H "Authorization: Bearer invalid-token-12345"
```

**Expected:** 401 Unauthorized

---

## 🎯 Test Checklist

- [ ] Health check works without authentication
- [ ] Customer can register with valid email and password
- [ ] Registration fails with short password
- [ ] Duplicate email registration fails with 409
- [ ] Admin can login with seeded credentials
- [ ] Invalid credentials fail with 401
- [ ] Admin can access admin-only routes
- [ ] Customer cannot access admin-only routes (403)
- [ ] Customer can access customer-only routes
- [ ] Routes without token fail with 401
- [ ] Token refresh works and rotates tokens
- [ ] Logout clears refresh token
- [ ] Invalid token format fails with 401

---

## 🛠️ Using Postman

### 1. Create Collection

1. Open Postman
2. Create new collection "RoboHatch API"
3. Set base URL: `http://localhost:3000/api/v1`

### 2. Environment Variables

Create environment with:
- `base_url`: `http://localhost:3000/api/v1`
- `admin_token`: (will be set after login)
- `customer_token`: (will be set after login)

### 3. Auth Setup

For protected routes:
- Authorization Type: Bearer Token
- Token: `{{admin_token}}` or `{{customer_token}}`

### 4. Collection Structure

```
RoboHatch API/
├── Auth/
│   ├── Register Customer
│   ├── Login Admin
│   ├── Login Customer
│   ├── Refresh Token
│   └── Logout
├── Demo/
│   ├── Admin Only Route
│   └── Customer Only Route
└── Health/
    └── Health Check
```

---

## 📊 Expected Results Summary

| Test | Endpoint | Auth | Expected Status | Role Check |
|------|----------|------|-----------------|------------|
| Health | GET /health | No | 200 OK | - |
| Register | POST /auth/register | No | 201 Created | Auto CUSTOMER |
| Login | POST /auth/login | No | 200 OK | Returns role |
| Refresh | POST /auth/refresh | No | 200 OK | Rotates token |
| Logout | POST /auth/logout | Yes | 200 OK | - |
| Admin Route (Admin) | GET /demo/admin-only | Admin | 200 OK | ✅ Pass |
| Admin Route (Customer) | GET /demo/admin-only | Customer | 403 Forbidden | ❌ Fail |
| Customer Route (Customer) | GET /demo/customer-only | Customer | 200 OK | ✅ Pass |
| Any Protected (No Auth) | GET /demo/* | No | 401 Unauthorized | ❌ Fail |

---

## 🐛 Common Issues

### Issue: "Cannot connect to database"
**Solution:** Make sure PostgreSQL is running and DATABASE_URL in `.env` is correct

### Issue: "Admin already exists"
**Solution:** Admin already seeded. Use existing credentials or delete from database

### Issue: "401 Unauthorized"
**Solution:** Check if token is valid and not expired (15min lifetime)

### Issue: "403 Forbidden"
**Solution:** User role doesn't match required role for route

---

## ✅ All Tests Passing Means:

- ✅ Authentication system working
- ✅ JWT tokens generated correctly
- ✅ Password hashing functional
- ✅ Role-based authorization enforced
- ✅ Refresh token rotation working
- ✅ Global guards applied properly
- ✅ Error handling correct
- ✅ Phase 2 complete!

---

**Ready for Phase 3!** 🚀
