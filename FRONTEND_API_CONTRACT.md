# FRONTEND API CONTRACT v1.0

**Backend URL (Production)**: Railway deployment URL (set via environment)  
**API Version**: v1  
**Authentication**: Cookie-based JWT (httpOnly, secure)

---

## 🔒 GLOBAL AUTHENTICATION RULES

### Cookie Behavior
```
access_token:
  - Expiry: 15 minutes
  - Flags: httpOnly, secure (in production), sameSite: lax
  - Auto-refresh: Use /auth/refresh before expiry

refresh_token:
  - Expiry: 7 days
  - Flags: httpOnly, secure (in production), sameSite: lax
  - Must re-login after 7 days
```

### Logout Behavior
```
POST /auth/logout → Clears BOTH cookies
```

### Authentication Errors
```json
401 Unauthorized:
{
  "message": "Unauthorized",
  "statusCode": 401
}

403 Forbidden (wrong role):
{
  "message": "Forbidden resource",
  "statusCode": 403
}
```

---

## 📍 API ENDPOINTS

### **1. AUTHENTICATION**

#### `POST /auth/register`
**Auth Required**: NO  
**Role**: Public

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "CUSTOMER"
}
```

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "createdAt": "2025-01-27T10:00:00.000Z"
  },
  "message": "Registration successful"
}
```
**Note**: Sets `access_token` and `refresh_token` cookies

**Error Responses**:
```json
400 Bad Request (duplicate email):
{
  "message": "User already exists",
  "statusCode": 400
}

400 Bad Request (validation):
{
  "message": ["email must be a valid email"],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

#### `POST /auth/login`
**Auth Required**: NO  
**Role**: Public

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER"
  },
  "message": "Login successful"
}
```
**Note**: Sets `access_token` and `refresh_token` cookies

**Error Responses**:
```json
401 Unauthorized (wrong credentials):
{
  "message": "Invalid credentials",
  "statusCode": 401
}
```

---

#### `POST /auth/refresh`
**Auth Required**: YES (refresh_token cookie)  
**Role**: Any authenticated user

**Request Body**: None (uses refresh_token cookie)

**Success Response** (200 OK):
```json
{
  "message": "Token refreshed"
}
```
**Note**: Sets NEW `access_token` cookie

**Error Responses**:
```json
401 Unauthorized (expired/invalid refresh token):
{
  "message": "Invalid refresh token",
  "statusCode": 401
}
```

---

#### `POST /auth/logout`
**Auth Required**: YES (access_token cookie)  
**Role**: Any authenticated user

**Request Body**: None

**Success Response** (200 OK):
```json
{
  "message": "Logout successful"
}
```
**Note**: Clears BOTH `access_token` and `refresh_token` cookies

---

#### `GET /auth/google` (OAuth)
**Auth Required**: NO  
**Role**: Public  
**Action**: Redirects to Google OAuth consent screen

---

#### `GET /auth/google/callback` (OAuth)
**Auth Required**: NO  
**Role**: Public  
**Action**: Handles Google OAuth callback, sets cookies, redirects to frontend

---

#### `GET /auth/microsoft` (OAuth)
**Auth Required**: NO  
**Role**: Public  
**Action**: Redirects to Microsoft OAuth consent screen

---

#### `GET /auth/microsoft/callback` (OAuth)
**Auth Required**: NO  
**Role**: Public  
**Action**: Handles Microsoft OAuth callback, sets cookies, redirects to frontend

---

### **2. USER / PROFILE**

#### `GET /users/me`
**Auth Required**: YES (access_token cookie)  
**Role**: Any authenticated user

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "CUSTOMER",
  "createdAt": "2025-01-27T10:00:00.000Z",
  "profile": {
    "id": "uuid",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

---

#### `PATCH /users/me`
**Auth Required**: YES (access_token cookie)  
**Role**: Any authenticated user

**Request Body** (all fields optional):
```json
{
  "name": "Jane Doe",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA"
}
```

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "CUSTOMER",
  "profile": {
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

---

### **3. PRODUCTS** (Public Access)

#### `GET /products`
**Auth Required**: NO  
**Role**: Public

**Query Parameters**: None

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "name": "Custom Phone Case",
    "description": "3D printed phone case",
    "basePrice": 1500,
    "isActive": true,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:00:00.000Z",
    "models": [
      {
        "id": "uuid",
        "fileName": "phone_case.stl",
        "fileType": "model/stl",
        "fileSize": 2048576,
        "createdAt": "2025-01-20T10:00:00.000Z"
      }
    ],
    "materials": [
      {
        "id": "uuid",
        "name": "PLA (Standard)",
        "price": 500,
        "isActive": true
      },
      {
        "id": "uuid",
        "name": "ABS (Durable)",
        "price": 800,
        "isActive": true
      }
    ]
  }
]
```
**Note**: Only returns products with `isActive: true` and materials with `isActive: true`

---

#### `GET /products/:id`
**Auth Required**: NO  
**Role**: Public

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Custom Phone Case",
  "description": "3D printed phone case",
  "basePrice": 1500,
  "isActive": true,
  "createdAt": "2025-01-20T10:00:00.000Z",
  "updatedAt": "2025-01-20T10:00:00.000Z",
  "models": [
    {
      "id": "uuid",
      "fileName": "phone_case.stl",
      "fileUrl": "https://s3.amazonaws.com/...",
      "fileType": "model/stl",
      "fileSize": 2048576,
      "createdAt": "2025-01-20T10:00:00.000Z"
    }
  ],
  "materials": [
    {
      "id": "uuid",
      "name": "PLA (Standard)",
      "price": 500,
      "isActive": true,
      "createdAt": "2025-01-20T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

**Error Responses**:
```json
404 Not Found:
{
  "message": "Product not found",
  "statusCode": 404
}
```

---

### **4. CART** (Customer Only)

#### `GET /cart`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only (Admins get 403)

**Success Response** (200 OK):
```json
{
  "cartId": "uuid",
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "Custom Phone Case",
      "materialId": "uuid",
      "materialName": "PLA (Standard)",
      "quantity": 2,
      "itemPrice": 2000,
      "lineTotal": 4000
    }
  ],
  "total": 4000,
  "warnings": []
}
```
**Pricing Formula**: `itemPrice = basePrice + materialPrice`, `lineTotal = itemPrice * quantity`

**With Warnings** (items auto-removed):
```json
{
  "cartId": "uuid",
  "userId": "uuid",
  "items": [],
  "total": 0,
  "warnings": [
    "Product 'Phone Case v1' was removed (no longer available)"
  ]
}
```
**Note**: Inactive products/materials are auto-removed at read time

---

#### `POST /cart/items`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Request Body**:
```json
{
  "productId": "uuid",
  "materialId": "uuid",
  "quantity": 2
}
```

**Success Response** (200 OK):
```json
{
  "cartId": "uuid",
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "Custom Phone Case",
      "materialId": "uuid",
      "materialName": "PLA (Standard)",
      "quantity": 2,
      "itemPrice": 2000,
      "lineTotal": 4000
    }
  ],
  "total": 4000,
  "warnings": []
}
```
**Note**: If item already exists, quantity is incremented

**Error Responses**:
```json
404 Not Found (product):
{
  "message": "Product not found",
  "statusCode": 404
}

404 Not Found (material):
{
  "message": "Material not found or does not belong to this product",
  "statusCode": 404
}

400 Bad Request (inactive product):
{
  "message": "Product is no longer available",
  "statusCode": 400
}

400 Bad Request (inactive material):
{
  "message": "Material is no longer available",
  "statusCode": 400
}
```

---

#### `PUT /cart/items/:itemId`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Request Body**:
```json
{
  "quantity": 5
}
```
**Note**: Quantity must be >= 1. Use DELETE to remove items.

**Success Response** (200 OK):
```json
{
  "cartId": "uuid",
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "quantity": 5,
      "lineTotal": 10000
    }
  ],
  "total": 10000,
  "warnings": []
}
```

**Error Responses**:
```json
404 Not Found:
{
  "message": "Cart item not found",
  "statusCode": 404
}

400 Bad Request (validation):
{
  "message": ["quantity must be at least 1"],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

#### `DELETE /cart/items/:itemId`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Success Response** (200 OK):
```json
{
  "cartId": "uuid",
  "userId": "uuid",
  "items": [],
  "total": 0,
  "warnings": []
}
```

**Error Responses**:
```json
404 Not Found:
{
  "message": "Cart item not found",
  "statusCode": 404
}
```

---

### **5. ADDRESSES** (Customer Only)

#### `GET /addresses`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Home Address",
    "phone": "+1234567890",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "isDefault": true,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:00:00.000Z"
  }
]
```

---

#### `POST /addresses`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Request Body**:
```json
{
  "name": "Office Address",
  "phone": "+1234567890",
  "addressLine1": "456 Business Ave",
  "addressLine2": "Suite 200",
  "city": "New York",
  "state": "NY",
  "postalCode": "10002",
  "country": "USA",
  "isDefault": false
}
```

**Success Response** (201 Created):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Office Address",
  "phone": "+1234567890",
  "addressLine1": "456 Business Ave",
  "addressLine2": "Suite 200",
  "city": "New York",
  "state": "NY",
  "postalCode": "10002",
  "country": "USA",
  "isDefault": false,
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T10:00:00.000Z"
}
```

---

#### `PATCH /addresses/:id`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Request Body** (all fields optional):
```json
{
  "name": "Updated Office",
  "isDefault": true
}
```

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Updated Office",
  "isDefault": true
}
```
**Note**: Setting `isDefault: true` will set all other addresses to `false`

---

#### `DELETE /addresses/:id`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Success Response** (200 OK):
```json
{
  "message": "Address deleted successfully"
}
```

**Error Responses**:
```json
404 Not Found:
{
  "message": "Address not found",
  "statusCode": 404
}
```

---

### **6. ORDERS** (Customer Only)

#### `POST /orders/checkout`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only  
**Headers Required**: `Idempotency-Key: <unique-uuid>`

**Request Body**:
```json
{
  "addressId": "uuid"
}
```

**Success Response** (201 Created):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "status": "CREATED",
  "total": 4000,
  "addressSnapshot": {
    "name": "Home Address",
    "phone": "+1234567890",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "Custom Phone Case",
      "materialId": "uuid",
      "materialName": "PLA (Standard)",
      "basePrice": 1500,
      "materialPrice": 500,
      "itemPrice": 2000,
      "quantity": 2,
      "lineTotal": 4000
    }
  ],
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T10:00:00.000Z"
}
```
**CRITICAL**: 
- Cart is cleared after order creation
- Prices are FROZEN at checkout time
- Order is IMMUTABLE after creation (NO mutations)

**Error Responses**:
```json
400 Bad Request (empty cart):
{
  "message": "Cart is empty",
  "statusCode": 400
}

404 Not Found (address):
{
  "message": "Address not found",
  "statusCode": 404
}

409 Conflict (duplicate idempotency key):
{
  "message": "Order already created with this idempotency key",
  "statusCode": 409
}
```

---

#### `GET /orders`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "status": "PAID",
    "total": 4000,
    "createdAt": "2025-01-27T10:00:00.000Z",
    "updatedAt": "2025-01-27T11:00:00.000Z",
    "addressSnapshot": {...},
    "items": [...]
  }
]
```

---

#### `GET /orders/:id`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "status": "PAID",
  "total": 4000,
  "addressSnapshot": {...},
  "items": [...],
  "payment": {
    "id": "uuid",
    "razorpayOrderId": "order_xyz",
    "status": "CAPTURED",
    "amount": 4000,
    "currency": "INR",
    "createdAt": "2025-01-27T10:30:00.000Z"
  },
  "shipment": {
    "id": "uuid",
    "trackingNumber": "TRACK123",
    "status": "SHIPPED",
    "carrier": "FedEx"
  },
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T11:00:00.000Z"
}
```

**Error Responses**:
```json
404 Not Found:
{
  "message": "Order not found",
  "statusCode": 404
}

403 Forbidden (not your order):
{
  "message": "Forbidden resource",
  "statusCode": 403
}
```

---

### **7. PAYMENTS** (Customer Only)

#### `POST /payments/initiate`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only  
**Headers Required**: `Idempotency-Key: <unique-uuid>`

**Request Body**:
```json
{
  "orderId": "uuid"
}
```

**Success Response** (200 OK):
```json
{
  "razorpayOrderId": "order_xyz123",
  "amount": 4000,
  "currency": "INR",
  "key": "rzp_live_xxxxx"
}
```
**Note**: Use this data to initialize Razorpay Checkout on frontend

**Error Responses**:
```json
404 Not Found:
{
  "message": "Order not found",
  "statusCode": 404
}

403 Forbidden (not your order):
{
  "message": "You can only pay for your own orders",
  "statusCode": 403
}

400 Bad Request (already paid):
{
  "message": "Order has already been paid",
  "statusCode": 400
}

409 Conflict (duplicate):
{
  "message": "Payment already initiated for this order",
  "statusCode": 409
}
```

---

#### `POST /payments/verify`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Request Body**:
```json
{
  "razorpayOrderId": "order_xyz123",
  "razorpayPaymentId": "pay_abc456",
  "razorpaySignature": "signature_string"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "orderId": "uuid",
  "paymentId": "uuid"
}
```
**Note**: Order status updated to PAID, payment status updated to CAPTURED

**Error Responses**:
```json
400 Bad Request (invalid signature):
{
  "message": "Invalid payment signature",
  "statusCode": 400
}

404 Not Found:
{
  "message": "Payment not found",
  "statusCode": 404
}
```

---

#### `POST /webhooks/razorpay`
**Auth Required**: NO (webhook signature verified)  
**Role**: Razorpay server

**Note**: This endpoint is called by Razorpay server, not frontend. It handles:
- `payment.captured` → Updates order status to PAID
- `payment.failed` → Updates payment status to FAILED (order remains unpaid)

---

### **8. FILES** (Customer Only - PAID Orders)

#### `GET /files/orders/:orderId`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only

**Success Response** (200 OK):
```json
[
  {
    "fileId": "uuid",
    "fileName": "phone_case.stl",
    "fileSize": 2048576,
    "productName": "Custom Phone Case"
  }
]
```

**Error Responses**:
```json
404 Not Found (order):
{
  "message": "Order not found",
  "statusCode": 404
}

403 Forbidden (not your order):
{
  "message": "Access denied",
  "statusCode": 403
}

403 Forbidden (unpaid order):
{
  "message": "Order must be paid to access files",
  "statusCode": 403
}
```

---

#### `GET /files/download/:fileId`
**Auth Required**: YES (access_token cookie)  
**Role**: CUSTOMER only  
**Query Parameters**: `?orderId=<uuid>`

**Success Response** (200 OK):
```json
{
  "downloadUrl": "https://robohatch-stl-uploads.s3.amazonaws.com/...?X-Amz-Signature=...",
  "expiresIn": 300
}
```
**Note**: 
- Signed S3 URL valid for 5 minutes ONLY
- Each download requires new URL generation
- NO permanent URLs exist

**Error Responses**:
```json
404 Not Found (file):
{
  "message": "File not found",
  "statusCode": 404
}

403 Forbidden (not in order):
{
  "message": "File not available in this order",
  "statusCode": 403
}

403 Forbidden (unpaid):
{
  "message": "Order must be paid to download files",
  "statusCode": 403
}
```

---

### **9. ADMIN - ORDERS** (Admin Only)

#### `GET /admin/orders`
**Auth Required**: YES (access_token cookie)  
**Role**: ADMIN only

**Query Parameters**:
- `status`: Filter by order status (CREATED, PAYMENT_PENDING, PAID)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Success Response** (200 OK):
```json
{
  "orders": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "PAID",
      "total": 4000,
      "createdAt": "2025-01-27T10:00:00.000Z",
      "user": {
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

#### `GET /admin/orders/:id`
**Auth Required**: YES (access_token cookie)  
**Role**: ADMIN only

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "status": "PAID",
  "total": 4000,
  "addressSnapshot": {...},
  "items": [...],
  "payment": {...},
  "shipment": {...},
  "user": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "createdAt": "2025-01-27T10:00:00.000Z"
}
```

**Note**: Admin has read-only access. NO order mutation endpoints exist.

---

## 🚨 CRITICAL BUSINESS RULES (NO REFUNDS)

### Order Immutability
```
✅ Orders CANNOT be deleted after payment
✅ Orders CANNOT be modified after creation
✅ Prices are FROZEN at checkout time
✅ NO cancellation endpoints exist
✅ NO refund endpoints exist
```

### Payment Integrity
```
✅ Payment verification is SERVER-SIDE ONLY
✅ Failed payments do NOT create paid orders
✅ Duplicate payments prevented via idempotency keys
✅ Razorpay webhook signature validated
```

### File Security
```
✅ Files ONLY accessible for PAID orders
✅ Signed URLs expire in 5 minutes maximum
✅ NO permanent URLs ever returned
✅ User ownership verified (userId + orderId + fileId)
✅ All access logged with audit trail
```

---

## 🔄 PAYMENT FLOW DIAGRAM

```
1. Customer adds items to cart
   └─> POST /cart/items

2. Customer proceeds to checkout
   └─> POST /orders/checkout (Idempotency-Key header)
       └─> Cart cleared
       └─> Order created (status: CREATED)
       └─> Prices frozen (immutable snapshot)

3. Customer initiates payment
   └─> POST /payments/initiate (Idempotency-Key header)
       └─> Razorpay order created
       └─> Order status: PAYMENT_PENDING
       └─> Returns: razorpayOrderId, amount, currency, key

4. Frontend opens Razorpay Checkout
   └─> User completes payment on Razorpay

5. Razorpay returns payment details to frontend
   └─> POST /payments/verify
       └─> Server verifies signature
       └─> Order status: PAID (atomic update)
       └─> Payment status: CAPTURED (atomic update)

6. Razorpay webhook (backup verification)
   └─> POST /webhooks/razorpay
       └─> payment.captured event
       └─> Order status: PAID (if not already)

7. Customer downloads files
   └─> GET /files/orders/:orderId (list files)
   └─> GET /files/download/:fileId?orderId=xxx (get signed URL)
       └─> Ownership verified
       └─> PAID status verified
       └─> Signed S3 URL returned (5-minute expiry)
```

---

## ⚠️ FRONTEND INTEGRATION NOTES

### Cookie Handling
```javascript
// Axios configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // CRITICAL: Send cookies with requests
});
```

### Idempotency Keys
```javascript
// Checkout
import { v4 as uuidv4 } from 'uuid';

const checkoutIdempotencyKey = uuidv4();
await api.post('/orders/checkout', {
  addressId: selectedAddressId
}, {
  headers: {
    'Idempotency-Key': checkoutIdempotencyKey
  }
});

// Payment initiation (use DIFFERENT key)
const paymentIdempotencyKey = uuidv4();
await api.post('/payments/initiate', {
  orderId: orderId
}, {
  headers: {
    'Idempotency-Key': paymentIdempotencyKey
  }
});
```

### Razorpay Integration
```javascript
const paymentData = await api.post('/payments/initiate', { orderId });

const options = {
  key: paymentData.key,
  amount: paymentData.amount,
  currency: paymentData.currency,
  order_id: paymentData.razorpayOrderId,
  handler: async (response) => {
    // Verify payment on backend
    await api.post('/payments/verify', {
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    });
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

### Error Handling
```javascript
try {
  const response = await api.get('/orders');
} catch (error) {
  if (error.response?.status === 401) {
    // Try refresh token
    await api.post('/auth/refresh');
    // Retry original request
  } else if (error.response?.status === 403) {
    // Redirect to login (wrong role or unauthorized)
  } else {
    // Show error message
    console.error(error.response?.data?.message);
  }
}
```

### File Downloads
```javascript
// Step 1: Get signed URL
const response = await api.get(`/files/download/${fileId}?orderId=${orderId}`);

// Step 2: Download file (URL expires in 5 minutes)
window.open(response.data.downloadUrl, '_blank');

// If user needs to re-download: Generate NEW signed URL
```

---

## 🔐 SECURITY CHECKLIST FOR FRONTEND

- [ ] **Credentials**: `withCredentials: true` in all API requests
- [ ] **HTTPS**: Only use HTTPS in production (cookies marked `secure`)
- [ ] **Token Refresh**: Auto-refresh access_token before 15-minute expiry
- [ ] **Logout**: Clear local state after `/auth/logout`
- [ ] **Idempotency**: Use unique UUIDs for checkout + payment
- [ ] **No Client-Side Pricing**: NEVER calculate prices in frontend
- [ ] **Signed URLs**: NEVER cache signed URLs (5-minute expiry)
- [ ] **Error Handling**: Handle 401 (refresh), 403 (redirect), 404, 500
- [ ] **Role Guards**: Admins can't access `/cart`, customers can't access `/admin`

---

## 📊 API RESPONSE FORMATS

### Success Responses
```
200 OK: Resource retrieved successfully
201 Created: Resource created successfully
204 No Content: Resource deleted successfully (rare)
```

### Error Responses
```
400 Bad Request: Validation error or business rule violation
401 Unauthorized: Missing or invalid access_token
403 Forbidden: Valid token but wrong role/ownership
404 Not Found: Resource doesn't exist
409 Conflict: Duplicate idempotency key
500 Internal Server Error: Unexpected server error
```

### Standard Error Shape
```json
{
  "message": "Error description",
  "statusCode": 400,
  "error": "Bad Request"
}
```

---

## 🎯 PRODUCTION DEPLOYMENT INFO

**Backend**: Railway (auto-deploy from GitHub)  
**Frontend**: Vercel (Next.js)  
**Database**: AWS RDS MySQL  
**Storage**: AWS S3  
**Payment**: Razorpay

**Environment Variables Required**:
```
DATABASE_URL=mysql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-north-1
AWS_S3_BUCKET=robohatch-stl-uploads
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
JWT_SECRET=...
FRONTEND_URL=https://your-vercel-app.vercel.app
```

---

## ✅ BACKEND SAFETY VERIFIED

✅ **Authentication**: Cookie-based, httpOnly, secure  
✅ **Order Immutability**: NO deletion/mutation after payment  
✅ **Payment Integrity**: Server-side verification, idempotent  
✅ **File Security**: PAID orders only, signed URLs, 5-min expiry  
✅ **Infrastructure**: Railway-ready, no filesystem dependencies  

**This backend is PRODUCTION-SAFE for revenue-generating deployment.**

---

**Last Updated**: January 27, 2025  
**Contract Version**: 1.0  
**Backend Version**: NestJS 10.3.0  
**Prisma Version**: 5.22.0
