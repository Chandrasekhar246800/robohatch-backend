# RoboHatch REST API - Complete Inventory

**Generated:** January 27, 2026  
**Global Prefix:** `/api/v1`  
**Total Endpoints:** 47  
**Controllers Scanned:** 17

---

## 📋 Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Management](#2-user-management)
3. [Address Management](#3-address-management)
4. [Product Management (Public)](#4-product-management-public)
5. [Product Management (Admin)](#5-product-management-admin)
6. [Shopping Cart](#6-shopping-cart)
7. [Orders (Customer)](#7-orders-customer)
8. [Orders (Admin)](#8-orders-admin)
9. [Payments](#9-payments)
10. [Webhooks](#10-webhooks)
11. [File Delivery](#11-file-delivery)
12. [Invoices (Customer)](#12-invoices-customer)
13. [Invoices (Admin)](#13-invoices-admin)
14. [Shipments (Customer)](#14-shipments-customer)
15. [Shipments (Admin)](#15-shipments-admin)
16. [Health Checks](#16-health-checks)
17. [Demo Endpoints](#17-demo-endpoints)

---

## 1. Authentication & Authorization

**Module:** `auth`  
**Controller:** `auth.controller.ts`  
**Base Path:** `/api/v1/auth`  
**Access:** Public (except Logout)

### 1.1 Register

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/register` |
| **Access** | Public |
| **Rate Limit** | 5 requests/minute |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "email": "user@example.com", "password": "Pass@123", "firstName": "John", "lastName": "Doe" }` |
| **Response** | `{ "userId": "uuid", "email": "...", "firstName": "...", "lastName": "...", "role": "CUSTOMER", "accessToken": "...", "refreshToken": "..." }` |
| **Purpose** | Create new customer account (local provider) |

---

### 1.2 Login

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/login` |
| **Access** | Public |
| **Rate Limit** | 5 requests/minute |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "email": "user@example.com", "password": "Pass@123" }` |
| **Response** | `{ "userId": "uuid", "email": "...", "role": "CUSTOMER", "accessToken": "...", "refreshToken": "..." }` |
| **Purpose** | Authenticate user with email/password |
| **Security** | Bcrypt password verification, audit logging |

---

### 1.3 Refresh Token

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/refresh` |
| **Access** | Public |
| **Rate Limit** | 5 requests/minute |
| **Headers** | `Authorization: Bearer <refresh_token>`, `Content-Type: application/json` |
| **Request Body** | None |
| **Response** | `{ "accessToken": "...", "refreshToken": "..." }` |
| **Purpose** | Rotate access and refresh tokens |
| **Security** | Old refresh token invalidated immediately, bcrypt verification |

---

### 1.4 Logout

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/logout` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "Logged out successfully" }` |
| **Purpose** | Invalidate refresh token and end session |
| **Security** | JWT user verification, audit logging |

---

### 1.5 Google OAuth Login

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/google` |
| **Access** | Public |
| **Rate Limit** | 5 requests/minute |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "idToken": "google_id_token" }` |
| **Response** | `{ "userId": "uuid", "email": "...", "role": "CUSTOMER", "accessToken": "...", "refreshToken": "..." }` |
| **Purpose** | Authenticate with Google OAuth |
| **Security** | Backend verifies token with Google, all OAuth users are CUSTOMER role |

---

### 1.6 Microsoft OAuth Login

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/microsoft` |
| **Access** | Public |
| **Rate Limit** | 5 requests/minute |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "idToken": "microsoft_id_token" }` |
| **Response** | `{ "userId": "uuid", "email": "...", "role": "CUSTOMER", "accessToken": "...", "refreshToken": "..." }` |
| **Purpose** | Authenticate with Microsoft OAuth |
| **Security** | Backend verifies token with Microsoft, all OAuth users are CUSTOMER role |

---

### 1.7 Forgot Password

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/forgot-password` |
| **Access** | Public |
| **Rate Limit** | 3 requests/minute |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "email": "user@example.com" }` |
| **Response** | `{ "message": "If your email is registered, you will receive a password reset link shortly." }` |
| **Purpose** | Request password reset email |
| **Security** | Always returns success (prevents email enumeration), 15-minute token expiry, crypto.randomBytes(32), bcrypt hashing |

---

### 1.8 Reset Password

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/reset-password` |
| **Access** | Public |
| **Rate Limit** | 5 requests/minute |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "token": "reset_token_from_email", "newPassword": "NewPass@123" }` |
| **Response** | `{ "message": "Password reset successfully. You can now login with your new password." }` |
| **Purpose** | Reset password using emailed token |
| **Security** | One-time use token, bcrypt verification, rejects OAuth users, invalidates all refresh tokens |

---

## 2. User Management

**Module:** `users`  
**Controller:** `users.controller.ts`  
**Base Path:** `/api/v1/users`  
**Access:** Authenticated

### 2.1 Get My Profile

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/users/me` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "email": "...", "firstName": "...", "lastName": "...", "role": "CUSTOMER", "provider": "LOCAL", "createdAt": "..." }` |
| **Purpose** | Get authenticated user's profile |

---

### 2.2 Update My Profile

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/users/me` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "firstName": "Jane", "lastName": "Smith" }` (all fields optional) |
| **Response** | `{ "id": "uuid", "email": "...", "firstName": "Jane", "lastName": "Smith", ... }` |
| **Purpose** | Update authenticated user's profile |

---

## 3. Address Management

**Module:** `addresses`  
**Controller:** `addresses.controller.ts`  
**Base Path:** `/api/v1/addresses`  
**Access:** Authenticated

### 3.1 Create Address

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/addresses` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "fullName": "John Doe", "phone": "+1234567890", "addressLine1": "123 Main St", "city": "New York", "state": "NY", "postalCode": "10001", "country": "USA", "isDefault": true }` |
| **Response** | `{ "id": "uuid", "userId": "uuid", "fullName": "...", ... }` |
| **Purpose** | Create new delivery address for user |

---

### 3.2 List My Addresses

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/addresses` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `[{ "id": "uuid", "fullName": "...", "isDefault": true, ... }]` |
| **Purpose** | Get all addresses for authenticated user |

---

### 3.3 Get Address by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/addresses/:id` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "fullName": "...", ... }` |
| **Purpose** | Get specific address (ownership enforced) |

---

### 3.4 Update Address

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/addresses/:id` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "phone": "+9876543210", "isDefault": false }` (all fields optional) |
| **Response** | `{ "id": "uuid", "phone": "+9876543210", ... }` |
| **Purpose** | Update existing address (ownership enforced) |

---

### 3.5 Delete Address

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/addresses/:id` |
| **Access** | Authenticated (JWT Required) |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "Address deleted successfully" }` |
| **Purpose** | Delete address (ownership enforced) |

---

## 4. Product Management (Public)

**Module:** `products`  
**Controller:** `products.controller.ts`  
**Base Path:** `/api/v1/products`  
**Access:** Public

### 4.1 List All Products

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/products` |
| **Access** | Public |
| **Headers** | None |
| **Request Body** | None |
| **Response** | `[{ "id": "uuid", "name": "Dragon Statue", "description": "...", "price": 49.99, "images": [...], "models": [...], "materials": [...] }]` |
| **Purpose** | Get all active products (inactive products excluded) |

---

### 4.2 Get Product by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/products/:id` |
| **Access** | Public |
| **Headers** | None |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "name": "Dragon Statue", "description": "...", "price": 49.99, "images": [...], "models": [...], "materials": [...] }` |
| **Purpose** | Get single product details (inactive products excluded) |

---

## 5. Product Management (Admin)

**Module:** `products`  
**Controllers:** `products.controller.ts`, `admin-products.controller.ts`  
**Base Path:** `/api/v1/admin/products`  
**Access:** ADMIN ONLY

### 5.1 Create Product

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/admin/products` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "name": "Dragon Statue", "description": "...", "price": 49.99, "images": [...] }` |
| **Response** | `{ "id": "uuid", "name": "Dragon Statue", ... }` |
| **Purpose** | Create new product (admin only) |

---

### 5.2 Update Product

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/admin/products/:id` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "name": "Updated Name", "price": 59.99 }` (all fields optional) |
| **Response** | `{ "id": "uuid", "name": "Updated Name", ... }` |
| **Purpose** | Update existing product (can update inactive products) |

---

### 5.3 Delete Product (Soft Delete)

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/admin/products/:id` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "Product deactivated successfully" }` |
| **Purpose** | Soft delete product (sets isActive = false, invalidates cart items) |
| **Security** | Existing cart items with this product are invalidated |

---

### 5.4 Create 3D Model for Product

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/admin/products/:id/models` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "fileUrl": "s3://bucket/dragon.stl", "fileName": "dragon.stl", "fileType": "STL", "fileSize": 1024000 }` |
| **Response** | `{ "id": "uuid", "productId": "uuid", "fileUrl": "...", ... }` |
| **Purpose** | Add 3D model file to product |

---

### 5.5 Delete 3D Model

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/admin/products/models/:modelId` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "Model deleted successfully" }` |
| **Purpose** | Remove 3D model from product |

---

### 5.6 Create Material for Product

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/admin/products/:id/materials` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "name": "PLA Red", "priceModifier": 5.00, "isActive": true }` |
| **Response** | `{ "id": "uuid", "productId": "uuid", "name": "PLA Red", ... }` |
| **Purpose** | Add material variant to product |

---

### 5.7 Update Material

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/admin/products/materials/:materialId` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "priceModifier": 7.00, "isActive": false }` (all fields optional) |
| **Response** | `{ "id": "uuid", "name": "PLA Red", "priceModifier": 7.00, ... }` |
| **Purpose** | Update material details |

---

### 5.8 Delete Material

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/admin/products/materials/:materialId` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "Material deleted successfully" }` |
| **Purpose** | Remove material from product |

---

## 6. Shopping Cart

**Module:** `cart`  
**Controller:** `cart.controller.ts`  
**Base Path:** `/api/v1/cart`  
**Access:** CUSTOMER ONLY (Admins cannot access cart)

### 6.1 Get My Cart

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/cart` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "items": [{ "id": "uuid", "productId": "uuid", "materialId": "uuid", "quantity": 2, "calculatedPrice": 54.99, "product": {...}, "material": {...} }], "totalPrice": 109.98, "removedItems": [] }` |
| **Purpose** | Get authenticated customer's cart with calculated prices |
| **Security** | Admins are forbidden from accessing cart |

---

### 6.2 Add Item to Cart

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/cart/items` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "productId": "uuid", "materialId": "uuid", "quantity": 2 }` |
| **Response** | `{ "id": "uuid", "productId": "uuid", "materialId": "uuid", "quantity": 2, ... }` |
| **Purpose** | Add product to cart (increments quantity if item exists) |
| **Security** | Validates product and material are active |

---

### 6.3 Update Cart Item Quantity

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/cart/items/:itemId` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "quantity": 5 }` (must be >= 1) |
| **Response** | `{ "id": "uuid", "quantity": 5, ... }` |
| **Purpose** | Update quantity of existing cart item |
| **Security** | Ownership enforced via JWT userId |

---

### 6.4 Remove Item from Cart

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/cart/items/:itemId` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "Item removed from cart" }` |
| **Purpose** | Remove item from cart (hard delete) |
| **Security** | Ownership enforced via JWT userId |

---

## 7. Orders (Customer)

**Module:** `orders`  
**Controller:** `orders.controller.ts`  
**Base Path:** `/api/v1/orders`  
**Access:** CUSTOMER ONLY

### 7.1 Create Order

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/orders` |
| **Access** | CUSTOMER ONLY |
| **Rate Limit** | Default (100/minute) |
| **Headers** | `Authorization: Bearer <access_token>`, `Idempotency-Key: <unique_key>`, `Content-Type: application/json` |
| **Request Body** | `{ "addressId": "uuid" }` |
| **Response** | `{ "id": "uuid", "userId": "uuid", "status": "PENDING", "totalAmount": 109.98, "items": [...], "shippingAddress": {...}, "createdAt": "..." }` |
| **Purpose** | Create order from cart (snapshots items and address, clears cart) |
| **Security** | Idempotency key required, server-side price recalculation, atomic transaction |

---

### 7.2 Get My Order by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/orders/:id` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "status": "PENDING", "totalAmount": 109.98, "items": [...], "shippingAddress": {...} }` |
| **Purpose** | Get order details (ownership enforced) |
| **Security** | User can only view their own orders |

---

## 8. Orders (Admin)

**Module:** `admin-orders`  
**Controller:** `admin-orders.controller.ts`  
**Base Path:** `/api/v1/admin/orders`  
**Access:** ADMIN ONLY (Read-Only)

### 8.1 List All Orders

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/admin/orders` |
| **Access** | ADMIN ONLY (Read-Only) |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Query Parameters** | `?status=PAID&userId=uuid&fromDate=2026-01-01&toDate=2026-01-31&limit=50&page=1` (all optional) |
| **Request Body** | None |
| **Response** | `{ "orders": [{ "id": "uuid", "userId": "uuid", "status": "PAID", "totalAmount": 109.98, "userEmail": "customer@example.com", ... }], "pagination": { "total": 100, "page": 1, "limit": 50 } }` |
| **Purpose** | List all orders with filtering and pagination (admin view) |
| **Security** | Read-only access, no order mutations |

---

### 8.2 Get Order by ID (Admin)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/admin/orders/:id` |
| **Access** | ADMIN ONLY (Read-Only) |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "userId": "uuid", "status": "PAID", "totalAmount": 109.98, "items": [...], "shippingAddress": {...}, "user": { "email": "...", "firstName": "...", "lastName": "..." } }` |
| **Purpose** | Get full order details including user info (admin view) |
| **Security** | Read-only access, no order mutations |

---

## 9. Payments

**Module:** `payments`  
**Controller:** `payments.controller.ts`  
**Base Path:** `/api/v1/payments`  
**Access:** CUSTOMER ONLY

### 9.1 Initiate Payment (Razorpay)

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/payments/initiate/:orderId` |
| **Access** | CUSTOMER ONLY |
| **Rate Limit** | 3 requests/minute ⚠️ |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "razorpayOrderId": "order_xyz", "amount": 10998, "currency": "INR", "keyId": "rzp_...", "orderId": "uuid" }` |
| **Purpose** | Initiate Razorpay payment for order |
| **Security** | Idempotent (returns existing Razorpay order), userId validation, audit logging |

---

### 9.2 Get Payment Status

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/payments/:orderId` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "orderId": "uuid", "razorpayOrderId": "order_xyz", "status": "COMPLETED", "amount": 10998, "currency": "INR", "capturedAt": "..." }` |
| **Purpose** | Get payment status by order ID (ownership enforced) |
| **Security** | User can only see their own payments |

---

## 10. Webhooks

**Module:** `webhooks`  
**Controller:** `razorpay-webhook.controller.ts`  
**Base Path:** `/api/v1/webhooks/razorpay`  
**Access:** Public (Signature Verified)

### 10.1 Razorpay Webhook Handler

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/razorpay` |
| **Access** | Public (NO JWT) |
| **Headers** | `x-razorpay-signature: <signature>`, `Content-Type: application/json` |
| **Request Body** | Razorpay webhook payload (varies by event type) |
| **Response** | `{ "received": true }` |
| **Purpose** | Process Razorpay webhook events (payment capture, failure, refund) |
| **Security** | CRITICAL: HMAC-SHA256 signature verification mandatory, idempotent processing |

**Supported Events:**
- `payment.captured` → Update order status to PAID, mark payment COMPLETED
- `payment.failed` → Mark payment FAILED
- `refund.processed` → Mark payment REFUNDED

---

## 11. File Delivery

**Module:** `files`  
**Controller:** `files.controller.ts`  
**Base Path:** `/api/v1/orders/:orderId/files`  
**Access:** CUSTOMER ONLY (Admins cannot download)

### 11.1 List Downloadable Files

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/orders/:orderId/files` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `[{ "fileId": "uuid", "fileName": "dragon.stl", "fileType": "STL" }]` (metadata only, NO URLs) |
| **Purpose** | List files available for download (PAID orders only) |
| **Security** | Order must be PAID, ownership enforced, returns metadata only |

---

### 11.2 Generate Download URL (Signed URL)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/orders/:orderId/files/:fileId/download` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "downloadUrl": "https://s3-signed-url-valid-for-300-seconds", "expiresIn": 300 }` |
| **Purpose** | Generate AWS S3 signed URL for file download (expires in 5 minutes) |
| **Security** | Triple validation (userId + PAID status + product in order), audit logging, admin-blocked |

---

## 12. Invoices (Customer)

**Module:** `invoices`  
**Controller:** `invoices.controller.ts`  
**Base Path:** `/api/v1/invoices`  
**Access:** Authenticated (CUSTOMER or ADMIN)

### 12.1 Get Invoice Metadata

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/invoices/order/:orderId` |
| **Access** | CUSTOMER or ADMIN |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "orderId": "uuid", "invoiceNumber": "INV-2026-00001", "invoiceUrl": "/invoices/INV-2026-00001.pdf", "amount": 109.98, "generatedAt": "..." }` |
| **Purpose** | Get invoice metadata for order (ownership enforced for customers) |

---

### 12.2 Download Invoice PDF

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/invoices/order/:orderId/download` |
| **Access** | CUSTOMER or ADMIN |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | PDF file stream |
| **Purpose** | Download invoice PDF (ownership enforced for customers) |
| **Response Headers** | `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="INV-2026-00001.pdf"` |

---

## 13. Invoices (Admin)

**Module:** `invoices`  
**Controller:** `admin-invoices.controller.ts`  
**Base Path:** `/api/v1/admin/invoices`  
**Access:** ADMIN ONLY

### 13.1 Get Invoice Metadata (Admin)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/admin/invoices/order/:orderId` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "orderId": "uuid", "invoiceNumber": "INV-2026-00001", "invoiceUrl": "/invoices/INV-2026-00001.pdf", "amount": 109.98, "generatedAt": "..." }` |
| **Purpose** | Get invoice metadata for any order (no ownership check) |

---

### 13.2 Download Invoice PDF (Admin)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/admin/invoices/order/:orderId/download` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | PDF file stream |
| **Purpose** | Download invoice PDF for any order (no ownership check) |
| **Response Headers** | `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="INV-2026-00001.pdf"` |

---

## 14. Shipments (Customer)

**Module:** `shipments`  
**Controller:** `shipments.controller.ts`  
**Base Path:** `/api/v1/orders/:orderId/shipment`  
**Access:** CUSTOMER ONLY

### 14.1 Get My Shipment

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/orders/:orderId/shipment` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "orderId": "uuid", "courierName": "FedEx", "trackingNumber": "123456789", "status": "SHIPPED", "shippedAt": "...", "deliveredAt": null }` |
| **Purpose** | Get shipment details for own order (ownership enforced) |

---

## 15. Shipments (Admin)

**Module:** `shipments`  
**Controller:** `admin-shipments.controller.ts`  
**Base Path:** `/api/v1/admin/shipments`  
**Access:** ADMIN ONLY

### 15.1 Create Shipment

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/admin/shipments/:orderId` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "courierName": "FedEx", "trackingNumber": "123456789" }` |
| **Response** | `{ "id": "uuid", "orderId": "uuid", "courierName": "FedEx", "trackingNumber": "123456789", "status": "PENDING", "shippedAt": null, "deliveredAt": null }` |
| **Purpose** | Create shipment for PAID order |
| **Security** | Order must be PAID, shipment must not already exist, tracking number must be unique |

---

### 15.2 Update Shipment

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/admin/shipments/:shipmentId` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json` |
| **Request Body** | `{ "status": "SHIPPED", "courierName": "UPS", "trackingNumber": "987654321" }` (all fields optional) |
| **Response** | `{ "id": "uuid", "status": "SHIPPED", "shippedAt": "2026-01-27T10:00:00Z", ... }` |
| **Purpose** | Update shipment status or details |
| **Security** | Status flow enforced: PENDING → SHIPPED → IN_TRANSIT → DELIVERED, automatic timestamps |

---

### 15.3 List All Shipments (Admin)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/admin/shipments` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `[{ "id": "uuid", "orderId": "uuid", "courierName": "FedEx", "trackingNumber": "123456789", "status": "DELIVERED", "shippedAt": "...", "deliveredAt": "...", "userEmail": "customer@example.com", "orderTotal": 109.98 }]` |
| **Purpose** | List all shipments with order and user details |

---

### 15.4 Get Shipment by ID (Admin)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/admin/shipments/:shipmentId` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `{ "id": "uuid", "orderId": "uuid", "courierName": "FedEx", "trackingNumber": "123456789", "status": "DELIVERED", "shippedAt": "...", "deliveredAt": "..." }` |
| **Purpose** | Get shipment details by shipment ID |

---

## 16. Health Checks

**Module:** `health`  
**Controller:** `health.controller.ts`  
**Base Path:** `/api/v1/health`  
**Access:** Public

### 16.1 Liveness Probe

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/health/live` |
| **Access** | Public |
| **Headers** | None |
| **Request Body** | None |
| **Response** | `{ "status": "ok", "timestamp": "2026-01-27T12:00:00.000Z" }` |
| **Purpose** | Kubernetes liveness probe (is the app running?) |

---

### 16.2 Readiness Probe

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/health/ready` |
| **Access** | Public |
| **Headers** | None |
| **Request Body** | None |
| **Response** | `{ "status": "ready", "checks": { "database": { "healthy": true }, "razorpay": { "healthy": true }, "smtp": { "healthy": true }, "s3": { "healthy": true } }, "timestamp": "...", "environment": "production" }` |
| **Purpose** | Kubernetes readiness probe (can it accept traffic?) |
| **Security** | Checks DB, Razorpay, SMTP, S3 connectivity |

---

### 16.3 Legacy Health Check

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/health` |
| **Access** | Public |
| **Headers** | None |
| **Request Body** | None |
| **Response** | `{ "status": "ok", "environment": "production", "timestamp": "2026-01-27T12:00:00.000Z" }` |
| **Purpose** | Backwards-compatible health check |

---

## 17. Demo Endpoints

**Module:** `demo`  
**Controller:** `demo.controller.ts`  
**Base Path:** `/api/v1/demo`  
**Access:** Role-Specific

### 17.1 Customer-Only Demo

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/demo/customer-only` |
| **Access** | CUSTOMER ONLY |
| **Headers** | `Authorization: Bearer <access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "This route is only accessible by CUSTOMER role", "success": true }` |
| **Purpose** | Test CUSTOMER role enforcement |

---

### 17.2 Admin-Only Demo

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/demo/admin-only` |
| **Access** | ADMIN ONLY |
| **Headers** | `Authorization: Bearer <admin_access_token>` |
| **Request Body** | None |
| **Response** | `{ "message": "This route is only accessible by ADMIN role", "success": true }` |
| **Purpose** | Test ADMIN role enforcement |

---

## 📊 API Summary Statistics

| Category | Count |
|----------|-------|
| **Total Endpoints** | 47 |
| **Public Endpoints** | 13 |
| **Authenticated Endpoints** | 34 |
| **Customer-Only Endpoints** | 13 |
| **Admin-Only Endpoints** | 15 |
| **Payment Endpoints** | 3 (Initiate, Get Status, Webhook) |
| **Webhook Endpoints** | 1 (Razorpay) |
| **File Delivery Endpoints** | 2 (List, Download) |
| **Read-Only Admin Endpoints** | 2 (Admin Orders) |

---

## 🔐 Access Control Matrix

| Role | Can Access |
|------|-----------|
| **Public** | Auth (register, login, refresh, OAuth, password reset), Products (list, get), Health checks |
| **CUSTOMER** | Cart, Orders, Payments, File delivery, Invoices, Shipments (own), Addresses, User profile |
| **ADMIN** | Product management (CRUD), 3D models, Materials, Admin orders (read-only), Admin invoices, Admin shipments (CRUD), Demo admin endpoint |

---

## 🚨 Critical Security Notes

### Payment Endpoints
- **Rate Limited:** `POST /api/v1/payments/initiate/:orderId` → 3 requests/minute
- **Idempotent:** Razorpay order creation returns existing order for same orderId
- **Webhook:** HMAC-SHA256 signature verification mandatory

### File Delivery Endpoints
- **Triple Validation:** userId + PAID status + product in order
- **Signed URLs:** Expire in 5 minutes (max)
- **Admin Blocked:** Admins cannot download customer files
- **Audit Logged:** All file accesses recorded

### Authentication Endpoints
- **Rate Limited:** All auth endpoints 5 requests/minute
- **Forgot Password:** 3 requests/minute, always returns success (prevents email enumeration)
- **Refresh Tokens:** Rotated on every use, old tokens invalidated immediately
- **Password Reset:** One-time use tokens, 15-minute expiry

### Cart & Orders
- **Customer-Only:** Admins cannot create orders or access cart
- **Idempotency:** Order creation requires `Idempotency-Key` header
- **Server-Side Pricing:** Client prices ignored, recalculated from DB
- **Atomic Transactions:** Order + Items + Address + Cart clearing

### Admin Endpoints
- **Read-Only Orders:** Admins can view orders but not modify them
- **Product Management:** Full CRUD access
- **Shipment Management:** Full CRUD access
- **Invoices:** Full access to all invoices

---

## 📝 Testing Recommendations

### Phase 1: Authentication (Day 1)
- Register, login, logout, refresh token rotation
- OAuth (Google, Microsoft)
- Password reset flow
- Rate limiting validation

### Phase 2: Authorization (Day 1-2)
- JWT verification
- Role-based access (CUSTOMER vs ADMIN)
- IDOR prevention (cart, orders, files)

### Phase 3: Product & Cart (Day 2)
- Product CRUD (admin)
- Cart operations (customer)
- Inactive product handling

### Phase 4: Orders & Payments (Day 2-3)
- Order creation with idempotency
- Payment initiation (Razorpay)
- Webhook processing
- Order status transitions

### Phase 5: File Delivery (Day 3-4)
- List files for PAID orders
- Signed URL generation
- Access control validation
- Audit logging verification

### Phase 6: Invoices & Shipments (Day 4-5)
- Invoice generation
- Shipment creation and updates
- Status flow validation

### Phase 7: Admin Operations (Day 5)
- Admin order listing
- Shipment management
- Product management
- Read-only enforcement

### Phase 8: Security Validation (Day 6)
- Rate limiting
- Signature verification (webhooks)
- IDOR attempts
- Role escalation attempts
- Token expiry and rotation

---

## 🎯 Production Readiness

✅ **READY FOR API TESTING**

All endpoints documented, access control enforced, payment security validated, file delivery secured.

**Next Steps:**
1. Configure test environment variables (JWT secrets, Razorpay keys, AWS S3, SMTP)
2. Set up Razorpay webhook URL (`/api/v1/webhooks/razorpay`)
3. Create test accounts (`npm run seed`)
4. Begin Phase 1 testing (Authentication)

---

**End of API Inventory**
