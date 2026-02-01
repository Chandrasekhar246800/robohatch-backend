# API_CONTRACT.md

**Base URL:** `/api/v1`

**Authentication:** httpOnly cookies (`access_token`, `refresh_token`)

**Required Header for Authenticated Requests:**
```http
Cookie: access_token=<jwt_token>; refresh_token=<refresh_token>
credentials: include
```

---

## Authentication

### POST /auth/register
**Auth Required:** No  
**Role:** ANY  
**Rate Limit:** 5 requests/minute  

**Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "Password@123",
  "name": "John Doe",
  "fullName": "John Doe"
}
```

**Success Response (201)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "fullName": "John Doe",
    "role": "CUSTOMER",
    "provider": "LOCAL",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

**Error Responses**
- **400** - Invalid email format, password too short (<8 chars), or validation error
- **409** - Email already exists
- **429** - Rate limit exceeded
- **500** - Server error

**Side Effects**
- Creates user in database
- Sets httpOnly cookies: `access_token` (15 min), `refresh_token` (7 days)
- Logs authentication event

---

### POST /auth/login
**Auth Required:** No  
**Role:** ANY  
**Rate Limit:** 5 requests/minute  

**Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

**Success Response (200)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "provider": "LOCAL",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

**Error Responses**
- **400** - Invalid email format or missing fields
- **401** - Invalid email or password
- **429** - Rate limit exceeded
- **500** - Server error

**Side Effects**
- Sets httpOnly cookies: `access_token` (15 min), `refresh_token` (7 days)
- Logs authentication event with IP address

---

### POST /auth/refresh
**Auth Required:** No (uses refresh_token cookie)  
**Role:** ANY  
**Rate Limit:** 5 requests/minute  

**Headers**
```http
Cookie: refresh_token=<jwt_refresh_token>
credentials: include
```

**Request Body**
```json
{}
```

**Success Response (200)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER"
  }
}
```

**Error Responses**
- **401** - Refresh token missing, invalid, or expired
- **429** - Rate limit exceeded
- **500** - Server error

**Side Effects**
- Rotates both tokens: new `access_token` and `refresh_token`
- Invalidates old refresh token
- Clears cookies if token invalid

---

### POST /auth/logout
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**Request Body**
```json
{}
```

**Success Response (200)**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses**
- **401** - Not authenticated
- **500** - Server error

**Side Effects**
- Clears httpOnly cookies: `access_token`, `refresh_token`
- Invalidates refresh token in database
- Logs logout event with IP address

---

### POST /auth/google
**Auth Required:** No  
**Role:** ANY (auto-assigned CUSTOMER)  
**Rate Limit:** 5 requests/minute  

**Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "idToken": "google_id_token_from_frontend"
}
```

**Success Response (200)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "provider": "GOOGLE",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

**Error Responses**
- **400** - Invalid or missing idToken
- **401** - Token verification failed
- **429** - Rate limit exceeded
- **500** - Server error

**Side Effects**
- Creates user if not exists (provider=GOOGLE, role=CUSTOMER)
- Sets httpOnly cookies: `access_token`, `refresh_token`
- Backend verifies token with Google

---

### POST /auth/microsoft
**Auth Required:** No  
**Role:** ANY (auto-assigned CUSTOMER)  
**Rate Limit:** 5 requests/minute  

**Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "idToken": "microsoft_id_token_from_frontend"
}
```

**Success Response (200)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@outlook.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "provider": "MICROSOFT",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

**Error Responses**
- **400** - Invalid or missing idToken
- **401** - Token verification failed
- **429** - Rate limit exceeded
- **500** - Server error

**Side Effects**
- Creates user if not exists (provider=MICROSOFT, role=CUSTOMER)
- Sets httpOnly cookies: `access_token`, `refresh_token`
- Backend verifies token with Microsoft

---

### POST /auth/forgot-password
**Auth Required:** No  
**Role:** ANY  
**Rate Limit:** 5 requests/minute  

**Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200)**
```json
{
  "message": "If your email is registered, you will receive a password reset link shortly."
}
```

**Error Responses**
- **400** - Invalid email format
- **429** - Rate limit exceeded
- **500** - Server error

**Side Effects**
- Generates secure 32-byte random token
- Hashes token with bcrypt before storing
- Sends email with reset link (token expires in 15 minutes)
- Only sends email if user exists AND provider=LOCAL
- Always returns success (prevents email enumeration)

---

### POST /auth/reset-password
**Auth Required:** No  
**Role:** ANY  
**Rate Limit:** 5 requests/minute  

**Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewPassword@123"
}
```

**Success Response (200)**
```json
{
  "message": "Password reset successfully. You can now login with your new password."
}
```

**Error Responses**
- **400** - Invalid token, expired, or already used / Password validation failed
- **403** - Cannot reset OAuth user password
- **429** - Rate limit exceeded
- **500** - Server error

**Side Effects**
- Invalidates all refresh tokens for user
- Marks reset token as used
- Hashes and stores new password
- Rejects OAuth users (GOOGLE/MICROSOFT)

---

## Users & Profiles

### GET /users/me
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "fullName": "John Doe",
  "role": "CUSTOMER",
  "provider": "LOCAL",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **401** - Not authenticated
- **404** - User not found
- **500** - Server error

**Side Effects**
- None (read-only)

---

### PATCH /users/me
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{
  "name": "Jane Doe",
  "fullName": "Jane Marie Doe"
}
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "fullName": "Jane Marie Doe",
  "role": "CUSTOMER",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T12:00:00Z"
}
```

**Error Responses**
- **400** - Validation error
- **401** - Not authenticated
- **500** - Server error

**Side Effects**
- Updates user profile in database
- Cannot change email, password, role, or provider

---

## Addresses

### POST /addresses
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{
  "line1": "123 Main St",
  "line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA"
}
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "line1": "123 Main St",
  "line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Validation error (max lengths: line1/line2=200, city/state/country=100, postalCode=20)
- **401** - Not authenticated
- **500** - Server error

**Side Effects**
- Creates address in database linked to authenticated user

---

### GET /addresses
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**Success Response (200)**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-02-01T10:00:00Z"
  }
]
```

**Error Responses**
- **401** - Not authenticated
- **500** - Server error

**Side Effects**
- None (read-only)

---

### GET /addresses/:id
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `id` - Address UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "line1": "123 Main St",
  "line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Address does not belong to user
- **404** - Address not found
- **500** - Server error

**Side Effects**
- None (read-only)

---

### PATCH /addresses/:id
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `id` - Address UUID

**Request Body** (all fields optional)
```json
{
  "line1": "456 Oak Ave",
  "city": "Boston",
  "state": "MA",
  "postalCode": "02101"
}
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "line1": "456 Oak Ave",
  "line2": "Apt 4B",
  "city": "Boston",
  "state": "MA",
  "postalCode": "02101",
  "country": "USA",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T12:00:00Z"
}
```

**Error Responses**
- **400** - Validation error
- **401** - Not authenticated
- **403** - Address does not belong to user
- **404** - Address not found
- **500** - Server error

**Side Effects**
- Updates address in database
- Ownership verified before update

---

### DELETE /addresses/:id
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `id` - Address UUID

**Success Response (200)**
```json
{
  "message": "Address deleted successfully"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Address does not belong to user
- **404** - Address not found
- **500** - Server error

**Side Effects**
- Hard deletes address from database
- Ownership verified before deletion

---

## Products

### GET /products
**Auth Required:** No  
**Role:** ANY  

**Headers**
```http
None required
```

**Success Response (200)**
```json
[
  {
    "id": "uuid",
    "name": "Dragon Miniature",
    "description": "Detailed 3D printed dragon",
    "basePrice": 29.99,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z",
    "product_models": [
      {
        "id": "uuid",
        "productId": "uuid",
        "fileName": "dragon.stl",
        "fileType": "STL",
        "fileSizeBytes": 1024000,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "materials": [
      {
        "id": "uuid",
        "productId": "uuid",
        "name": "PLA",
        "priceModifier": 0,
        "isActive": true
      },
      {
        "id": "uuid",
        "productId": "uuid",
        "name": "ABS",
        "priceModifier": 5.00,
        "isActive": true
      }
    ]
  }
]
```

**Error Responses**
- **500** - Server error

**Side Effects**
- None (read-only)
- Only returns active products (isActive=true)

---

### GET /products/:id
**Auth Required:** No  
**Role:** ANY  

**Headers**
```http
None required
```

**URL Params**
- `id` - Product UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "name": "Dragon Miniature",
  "description": "Detailed 3D printed dragon",
  "basePrice": 29.99,
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z",
  "product_models": [
    {
      "id": "uuid",
      "productId": "uuid",
      "fileName": "dragon.stl",
      "fileType": "STL",
      "fileSizeBytes": 1024000,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "materials": [
    {
      "id": "uuid",
      "productId": "uuid",
      "name": "PLA",
      "priceModifier": 0,
      "isActive": true
    }
  ]
}
```

**Error Responses**
- **404** - Product not found or inactive
- **500** - Server error

**Side Effects**
- None (read-only)
- Only returns if product is active

---

## Products (Admin Only)

### POST /admin/products
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{
  "name": "Dragon Miniature",
  "description": "Detailed 3D printed dragon",
  "basePrice": 29.99
}
```

**Success Response (201)**
```json
{
  "id": "uuid",
  "name": "Dragon Miniature",
  "description": "Detailed 3D printed dragon",
  "basePrice": 29.99,
  "isActive": true,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Validation error (name max 200, description max 2000, basePrice >= 0)
- **401** - Not authenticated
- **403** - Not admin role
- **500** - Server error

**Side Effects**
- Creates product in database (isActive=true by default)

---

### PATCH /admin/products/:id
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `id` - Product UUID

**Request Body** (all fields optional)
```json
{
  "name": "Updated Dragon",
  "description": "New description",
  "basePrice": 34.99,
  "isActive": false
}
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "name": "Updated Dragon",
  "description": "New description",
  "basePrice": 34.99,
  "isActive": false,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Validation error
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Product not found
- **500** - Server error

**Side Effects**
- Updates product in database
- Can update inactive products

---

### DELETE /admin/products/:id
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `id` - Product UUID

**Success Response (200)**
```json
{
  "message": "Product deleted successfully"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Product not found
- **500** - Server error

**Side Effects**
- Soft delete: sets isActive=false
- Existing cart items with this product become invalid

---

### POST /admin/products/:id/models
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `id` - Product UUID

**Request Body**
```json
{
  "fileName": "dragon.stl",
  "fileUrl": "products/dragon/dragon.stl",
  "fileType": "STL",
  "fileSizeBytes": 1024000
}
```

**Success Response (201)**
```json
{
  "id": "uuid",
  "productId": "uuid",
  "fileName": "dragon.stl",
  "fileUrl": "products/dragon/dragon.stl",
  "fileType": "STL",
  "fileSizeBytes": 1024000,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Validation error / Invalid file type (must be STL or OBJ)
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Product not found
- **500** - Server error

**Side Effects**
- Stores S3 KEY (not full URL) in database
- File must exist in S3 bucket
- fileUrl validated against whitelist

---

### DELETE /admin/products/models/:modelId
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `modelId` - Product Model UUID

**Success Response (200)**
```json
{
  "message": "Product model deleted successfully"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Model not found
- **500** - Server error

**Side Effects**
- Hard deletes product model from database
- Does NOT delete file from S3

---

### POST /admin/products/:id/materials
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `id` - Product UUID

**Request Body**
```json
{
  "name": "PLA",
  "priceModifier": 0
}
```

**Success Response (201)**
```json
{
  "id": "uuid",
  "productId": "uuid",
  "name": "PLA",
  "priceModifier": 0,
  "isActive": true,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Validation error
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Product not found
- **500** - Server error

**Side Effects**
- Creates material in database (isActive=true by default)

---

### PATCH /admin/products/materials/:materialId
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `materialId` - Material UUID

**Request Body** (all fields optional)
```json
{
  "name": "Premium PLA",
  "priceModifier": 5.00,
  "isActive": false
}
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "productId": "uuid",
  "name": "Premium PLA",
  "priceModifier": 5.00,
  "isActive": false,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Validation error
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Material not found
- **500** - Server error

**Side Effects**
- Updates material in database

---

### DELETE /admin/products/materials/:materialId
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `materialId` - Material UUID

**Success Response (200)**
```json
{
  "message": "Material deleted successfully"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Material not found
- **500** - Server error

**Side Effects**
- Soft delete: sets isActive=false
- Existing cart items with this material become invalid

---

## Cart

### GET /cart
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:30:00Z",
  "items": [
    {
      "id": "uuid",
      "cartId": "uuid",
      "productId": "uuid",
      "materialId": "uuid",
      "quantity": 2,
      "createdAt": "2026-02-01T10:00:00Z",
      "updatedAt": "2026-02-01T10:00:00Z",
      "product": {
        "id": "uuid",
        "name": "Dragon Miniature",
        "basePrice": 29.99,
        "isActive": true
      },
      "material": {
        "id": "uuid",
        "name": "PLA",
        "priceModifier": 0,
        "isActive": true
      },
      "itemPrice": 29.99
    }
  ],
  "totalPrice": 59.98,
  "removedItems": []
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role (admins cannot access cart)
- **500** - Server error

**Side Effects**
- Auto-removes invalid items (inactive products/materials)
- Returns warnings if items were removed

---

### POST /cart/items
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{
  "productId": "uuid",
  "materialId": "uuid",
  "quantity": 2
}
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:30:00Z",
  "items": [
    {
      "id": "uuid",
      "cartId": "uuid",
      "productId": "uuid",
      "materialId": "uuid",
      "quantity": 2,
      "createdAt": "2026-02-01T10:00:00Z",
      "updatedAt": "2026-02-01T10:00:00Z",
      "product": {
        "id": "uuid",
        "name": "Dragon Miniature",
        "basePrice": 29.99,
        "isActive": true
      },
      "material": {
        "id": "uuid",
        "name": "PLA",
        "priceModifier": 0,
        "isActive": true
      },
      "itemPrice": 29.99
    }
  ],
  "totalPrice": 59.98
}
```

**Error Responses**
- **400** - Validation error / quantity < 1 / product or material not found or inactive
- **401** - Not authenticated
- **403** - Not customer role
- **500** - Server error

**Side Effects**
- Creates cart if not exists
- If item already exists, increments quantity
- Validates product and material are active

---

### PUT /cart/items/:itemId
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `itemId` - Cart Item UUID

**Request Body**
```json
{
  "quantity": 5
}
```

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "quantity": 5,
      "itemPrice": 29.99
    }
  ],
  "totalPrice": 149.95
}
```

**Error Responses**
- **400** - Validation error / quantity < 1
- **401** - Not authenticated
- **403** - Not customer role / item does not belong to user's cart
- **404** - Cart item not found
- **500** - Server error

**Side Effects**
- Updates quantity in database
- Use DELETE endpoint to remove items (quantity=0 rejected)

---

### DELETE /cart/items/:itemId
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `itemId` - Cart Item UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "items": [],
  "totalPrice": 0
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role / item does not belong to user's cart
- **404** - Cart item not found
- **500** - Server error

**Side Effects**
- Hard deletes cart item from database

---

## Orders

### POST /orders/checkout
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{}
```

**Success Response (201)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "status": "CREATED",
  "totalAmount": 59.98,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z",
  "order_items": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "productId": "uuid",
      "materialId": "uuid",
      "quantity": 2,
      "snapshotProductName": "Dragon Miniature",
      "snapshotMaterialName": "PLA",
      "snapshotBasePrice": 29.99,
      "snapshotPriceModifier": 0,
      "snapshotItemPrice": 29.99,
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ]
}
```

**Error Responses**
- **400** - Cart is empty / Cart contains invalid items
- **401** - Not authenticated
- **403** - Not customer role
- **500** - Server error

**Side Effects**
- Creates order with status=CREATED
- Snapshots cart items (prices, names frozen)
- Clears cart after successful order creation
- Transaction: all-or-nothing

---

### POST /orders
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
Idempotency-Key: unique_key_per_request
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{
  "addressId": "uuid"
}
```

**Success Response (201)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "addressId": "uuid",
  "status": "CREATED",
  "totalAmount": 59.98,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z",
  "address": {
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "order_items": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "productId": "uuid",
      "materialId": "uuid",
      "quantity": 2,
      "snapshotProductName": "Dragon Miniature",
      "snapshotMaterialName": "PLA",
      "snapshotBasePrice": 29.99,
      "snapshotPriceModifier": 0,
      "snapshotItemPrice": 29.99
    }
  ]
}
```

**Error Responses**
- **400** - Missing Idempotency-Key header / Cart is empty / Invalid addressId
- **401** - Not authenticated
- **403** - Not customer role / Address does not belong to user
- **404** - Address not found
- **500** - Server error

**Side Effects**
- Creates order with status=CREATED
- Snapshots cart items and address
- Clears cart after successful order creation
- Idempotency: Same key returns same order (no duplicate orders)
- Transaction: all-or-nothing

---

### GET /orders
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**Success Response (200)**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "addressId": "uuid",
    "status": "PAID",
    "totalAmount": 59.98,
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-02-01T10:30:00Z",
    "order_items": [
      {
        "id": "uuid",
        "snapshotProductName": "Dragon Miniature",
        "snapshotMaterialName": "PLA",
        "quantity": 2,
        "snapshotItemPrice": 29.99
      }
    ]
  }
]
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role
- **500** - Server error

**Side Effects**
- None (read-only)
- User can only see their own orders

---

### GET /orders/:id
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `id` - Order UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "addressId": "uuid",
  "status": "PAID",
  "totalAmount": 59.98,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:30:00Z",
  "address": {
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "order_items": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "productId": "uuid",
      "materialId": "uuid",
      "quantity": 2,
      "snapshotProductName": "Dragon Miniature",
      "snapshotMaterialName": "PLA",
      "snapshotBasePrice": 29.99,
      "snapshotPriceModifier": 0,
      "snapshotItemPrice": 29.99
    }
  ]
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role / Order does not belong to user
- **404** - Order not found
- **500** - Server error

**Side Effects**
- None (read-only)

---

## Orders (Admin Only)

### GET /admin/orders
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**Query Params** (all optional)
- `status` - Filter by order status (CREATED, PAYMENT_PENDING, PAID, etc.)
- `userId` - Filter by user UUID
- `fromDate` - Filter orders from date (ISO 8601)
- `toDate` - Filter orders to date (ISO 8601)
- `limit` - Results per page (default: 50)
- `page` - Page number (default: 1)

**Success Response (200)**
```json
{
  "orders": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "PAID",
      "totalAmount": 59.98,
      "createdAt": "2026-02-01T10:00:00Z",
      "user": {
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **500** - Server error

**Side Effects**
- None (read-only)

---

### GET /admin/orders/:id
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `id` - Order UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "addressId": "uuid",
  "status": "PAID",
  "totalAmount": 59.98,
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:30:00Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "address": {
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "order_items": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "productId": "uuid",
      "materialId": "uuid",
      "quantity": 2,
      "snapshotProductName": "Dragon Miniature",
      "snapshotMaterialName": "PLA",
      "snapshotBasePrice": 29.99,
      "snapshotPriceModifier": 0,
      "snapshotItemPrice": 29.99
    }
  ]
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Order not found
- **500** - Server error

**Side Effects**
- None (read-only)

---

## Payments

### POST /payments/initiate
**Auth Required:** Yes  
**Role:** CUSTOMER  
**Rate Limit:** 10 requests/minute  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{
  "orderId": "uuid"
}
```

**Success Response (200)**
```json
{
  "paymentId": "uuid",
  "razorpayOrderId": "order_abc123",
  "amount": 5998,
  "currency": "INR",
  "status": "PENDING",
  "createdAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Order already paid / Invalid order
- **401** - Not authenticated
- **403** - Not customer role / Order does not belong to user
- **404** - Order not found
- **429** - Rate limit exceeded
- **500** - Razorpay API error / Server error

**Side Effects**
- Creates payment record in database (status=PENDING)
- Creates Razorpay order via SDK
- Updates order status to PAYMENT_PENDING
- Logs payment initiation with IP address

---

### GET /payments/:orderId
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "razorpayOrderId": "order_abc123",
  "razorpayPaymentId": "pay_xyz789",
  "amount": 5998,
  "currency": "INR",
  "status": "CAPTURED",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-01T10:05:00Z"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role / Payment does not belong to user's order
- **404** - Payment not found
- **500** - Server error

**Side Effects**
- None (read-only)

---

## File Downloads (Customer)

### GET /orders/:orderId/files
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Success Response (200)**
```json
[
  {
    "fileId": "uuid",
    "fileName": "dragon.stl",
    "fileType": "STL"
  }
]
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role
- **404** - Order not found / not paid / not owned by user
- **500** - Server error

**Side Effects**
- None (read-only)
- Returns metadata only (NO URLs)
- Order must be PAID

---

### GET /orders/:orderId/files/:fileId/download
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID
- `fileId` - Product Model UUID

**Success Response (200)**
```json
{
  "downloadUrl": "https://s3.amazonaws.com/signed-url?expires=300",
  "expiresIn": 300
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role / File not available for this order
- **404** - Order not found / not paid / file not in order
- **500** - S3 signed URL generation failed / Server error

**Side Effects**
- Generates AWS S3 signed URL (expires in 5 minutes)
- Logs download access in file_access_logs table (audit trail)
- Order must be PAID
- User must own order
- File must belong to product in order

---

## Custom File Uploads

### POST /custom-files/upload
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: multipart/form-data
credentials: include
```

**Request Body** (FormData)
```
file: <binary_file> (required)
productId: uuid (required)
notes: string (optional)
```

**Allowed File Types:** .stl, .zip, .pdf, .png, .jpg, .jpeg, .docx  
**Max File Size:** 50MB

**Success Response (201)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "productId": "uuid",
  "fileName": "custom_model.stl",
  "fileSize": 1024000,
  "notes": "Custom engraving request",
  "createdAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - File missing / productId missing / Invalid file type / File too large
- **401** - Not authenticated
- **404** - Product not found
- **500** - Email sending failed / Server error

**Side Effects**
- Sends email to robohatchorders@gmail.com with file attachment
- Saves metadata in database (NOT file itself)
- Email includes user email, product name, file name, notes
- File is NOT stored in S3

---

## Custom Text Requests

### POST /custom-text
**Auth Required:** Yes  
**Role:** ANY  

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**Request Body**
```json
{
  "productId": "uuid",
  "customizationText": "HAPPY BIRTHDAY",
  "notes": "Please use bold font"
}
```

**Success Response (201)**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "productId": "uuid",
  "customizationText": "HAPPY BIRTHDAY",
  "notes": "Please use bold font",
  "createdAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **400** - Validation error (text length 1-100 chars, notes max 300 chars) / productId missing
- **401** - Not authenticated
- **404** - Product not found
- **500** - Email sending failed / Server error

**Side Effects**
- Sends email to robohatchorders@gmail.com
- Saves text request in database
- HTML sanitization applied
- Email includes user email, product name, customization text, notes

---

## Invoices

### GET /api/v1/invoices/order/:orderId
**Auth Required:** Yes  
**Role:** CUSTOMER or ADMIN  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "invoiceNumber": "INV-2026-0001",
  "invoiceUrl": "/invoices/INV-2026-0001.pdf",
  "generatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Invoice does not belong to user (customers only)
- **404** - Invoice not found
- **500** - Server error

**Side Effects**
- None (read-only)
- Customers can only access their own invoices

---

### GET /api/v1/invoices/order/:orderId/download
**Auth Required:** Yes  
**Role:** CUSTOMER or ADMIN  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Success Response (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="INV-2026-0001.pdf"

<PDF_BINARY_DATA>
```

**Error Responses**
- **401** - Not authenticated
- **403** - Invoice does not belong to user (customers only)
- **404** - Invoice not found / Invoice file not found
- **500** - Server error

**Side Effects**
- Streams PDF file from local filesystem
- Customers can only download their own invoices

---

## Invoices (Admin Only)

### GET /api/v1/admin/invoices/order/:orderId
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "invoiceNumber": "INV-2026-0001",
  "invoiceUrl": "/invoices/INV-2026-0001.pdf",
  "generatedAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Invoice not found
- **500** - Server error

**Side Effects**
- None (read-only)
- Can access any invoice

---

### GET /api/v1/admin/invoices/order/:orderId/download
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Success Response (200)**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="INV-2026-0001.pdf"

<PDF_BINARY_DATA>
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Invoice not found / Invoice file not found
- **500** - Server error

**Side Effects**
- Streams PDF file from local filesystem
- Can download any invoice

---

## Shipments (Customer)

### GET /orders/:orderId/shipment
**Auth Required:** Yes  
**Role:** CUSTOMER  

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "courierName": "FedEx",
  "trackingNumber": "123456789",
  "status": "SHIPPED",
  "shippedAt": "2026-01-27T10:00:00Z",
  "deliveredAt": null,
  "createdAt": "2026-01-27T09:00:00Z",
  "updatedAt": "2026-01-27T10:00:00Z"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not customer role
- **404** - Order not found / not owned by user / shipment doesn't exist
- **500** - Server error

**Side Effects**
- None (read-only)
- User must own order

---

## Shipments (Admin Only)

### POST /admin/shipments/:orderId
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `orderId` - Order UUID

**Request Body**
```json
{
  "courierName": "FedEx",
  "trackingNumber": "123456789"
}
```

**Success Response (201)**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "courierName": "FedEx",
  "trackingNumber": "123456789",
  "status": "PENDING",
  "shippedAt": null,
  "deliveredAt": null,
  "createdAt": "2026-01-27T09:00:00Z",
  "updatedAt": "2026-01-27T09:00:00Z"
}
```

**Error Responses**
- **400** - Order not PAID / Validation error
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Order not found
- **409** - Shipment already exists / Tracking number in use
- **500** - Server error

**Side Effects**
- Creates shipment in database (status=PENDING)
- Order must be PAID

---

### PATCH /admin/shipments/:shipmentId
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
Content-Type: application/json
credentials: include
```

**URL Params**
- `shipmentId` - Shipment UUID

**Request Body** (all fields optional)
```json
{
  "status": "SHIPPED",
  "courierName": "UPS",
  "trackingNumber": "987654321"
}
```

**Status Flow (enforced):** PENDING → SHIPPED → IN_TRANSIT → DELIVERED

**Success Response (200)**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "courierName": "UPS",
  "trackingNumber": "987654321",
  "status": "SHIPPED",
  "shippedAt": "2026-01-27T10:00:00Z",
  "deliveredAt": null,
  "createdAt": "2026-01-27T09:00:00Z",
  "updatedAt": "2026-01-27T10:00:00Z"
}
```

**Error Responses**
- **400** - Invalid status transition (backwards/skip)
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Shipment not found
- **409** - Tracking number already in use
- **500** - Server error

**Side Effects**
- Updates shipment in database
- Auto-sets shippedAt when status → SHIPPED
- Auto-sets deliveredAt when status → DELIVERED

---

### GET /admin/shipments
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**Success Response (200)**
```json
[
  {
    "id": "uuid",
    "orderId": "uuid",
    "courierName": "FedEx",
    "trackingNumber": "123456789",
    "status": "DELIVERED",
    "shippedAt": "2026-01-27T10:00:00Z",
    "deliveredAt": "2026-01-27T15:00:00Z",
    "createdAt": "2026-01-27T09:00:00Z",
    "updatedAt": "2026-01-27T15:00:00Z",
    "userEmail": "customer@example.com",
    "orderTotal": 1499.99
  }
]
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **500** - Server error

**Side Effects**
- None (read-only)
- Ordered by: Most recent first (createdAt DESC)

---

### GET /admin/shipments/:shipmentId
**Auth Required:** Yes  
**Role:** ADMIN  
**FORBIDDEN FOR FRONTEND**

**Headers**
```http
Cookie: access_token=<jwt_token>
credentials: include
```

**URL Params**
- `shipmentId` - Shipment UUID

**Success Response (200)**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "courierName": "FedEx",
  "trackingNumber": "123456789",
  "status": "DELIVERED",
  "shippedAt": "2026-01-27T10:00:00Z",
  "deliveredAt": "2026-01-27T15:00:00Z",
  "createdAt": "2026-01-27T09:00:00Z",
  "updatedAt": "2026-01-27T15:00:00Z"
}
```

**Error Responses**
- **401** - Not authenticated
- **403** - Not admin role
- **404** - Shipment not found
- **500** - Server error

**Side Effects**
- None (read-only)

---

## Webhooks

### POST /webhooks/razorpay
**Auth Required:** No (signature verified)  
**Role:** PUBLIC  
**FORBIDDEN FOR FRONTEND - RAZORPAY ONLY**

**Headers**
```http
Content-Type: application/json
X-Razorpay-Signature: <webhook_signature>
```

**Request Body**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xyz789",
        "order_id": "order_abc123",
        "amount": 5998,
        "status": "captured"
      }
    }
  }
}
```

**Success Response (200)**
```json
{
  "received": true
}
```

**Error Responses**
- **400** - Missing signature / Invalid signature / Invalid payload
- **500** - Event processing failed

**Side Effects**
- Verifies webhook signature with Razorpay secret
- Updates payment status in database
- Updates order status to PAID when payment captured
- Generates invoice PDF
- Sends order confirmation email
- Logs webhook event

---

## Health

### GET /health
**Auth Required:** No  
**Role:** PUBLIC  

**Headers**
```http
None required
```

**Success Response (200)**
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T10:00:00Z",
  "environment": "production"
}
```

**Error Responses**
- None

**Side Effects**
- None (read-only)

---

### GET /health/ready
**Auth Required:** No  
**Role:** PUBLIC  

**Headers**
```http
None required
```

**Success Response (200)**
```json
{
  "status": "ready",
  "timestamp": "2026-02-01T10:00:00Z"
}
```

**Error Responses**
- **503** - Database not reachable

**Side Effects**
- Checks database connectivity
- Used by Kubernetes/Railway for readiness probes

---

### GET /health/db
**Auth Required:** No  
**Role:** PUBLIC  

**Headers**
```http
None required
```

**Success Response (200)**
```json
{
  "status": "DB CONNECTED",
  "result": [
    { "1": 1 }
  ]
}
```

**Error Responses**
- **500** - Database connection failed

**Side Effects**
- Executes test query: `SELECT 1`

---

## Security Notes

### Cookie Authentication
- All authenticated endpoints require `access_token` cookie
- Frontend MUST send `credentials: include` in fetch/axios
- Cookies are httpOnly (cannot be accessed via JavaScript)
- Cookies are secure in production (HTTPS only)
- Access token expires in 15 minutes
- Refresh token expires in 7 days

### Rate Limiting
- Auth endpoints: 5 requests/minute
- Payment initiation: 10 requests/minute
- All other endpoints: Default rate limits apply

### CORS Configuration
- Production: Locked to specific origin
- Development: Permissive for localhost

### Role-Based Access Control
- CUSTOMER: Can access cart, orders, payments, file downloads
- ADMIN: Full access to all admin endpoints
- Admins CANNOT access customer cart (role check enforced)

### Admin Endpoints - FORBIDDEN FOR FRONTEND
- All `/admin/*` routes require ADMIN role
- Frontend applications should NOT call these endpoints
- Used for internal admin dashboards only

### File Security
- Product files: Signed S3 URLs expire in 5 minutes
- File downloads: PAID orders only
- All downloads logged in audit trail
- Custom uploads: Email-based (not stored in S3)

### Payment Security
- Razorpay webhook signature verification mandatory
- Payment amounts in paise (1 INR = 100 paise)
- Server-side signature verification before order update
- Idempotency keys prevent duplicate orders

---

## Enums

### Order Status
- `CREATED` - Order created, no payment initiated
- `PAYMENT_PENDING` - Payment initiated, awaiting capture
- `PAID` - Payment successful
- `FAILED` - Payment failed
- `CANCELLED` - Order cancelled

### Payment Status
- `PENDING` - Payment initiated
- `CAPTURED` - Payment successful
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded

### Shipment Status
- `PENDING` - Shipment created, not shipped yet
- `SHIPPED` - Package shipped
- `IN_TRANSIT` - Package in transit
- `DELIVERED` - Package delivered

### User Role
- `CUSTOMER` - Regular user
- `ADMIN` - Administrator

### Auth Provider
- `LOCAL` - Email/password registration
- `GOOGLE` - Google OAuth
- `MICROSOFT` - Microsoft OAuth

---

## Common Error Codes

- **400** - Bad Request (validation error, invalid data)
- **401** - Unauthorized (not authenticated, invalid token)
- **403** - Forbidden (insufficient permissions, wrong role)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (duplicate entry, already exists)
- **429** - Too Many Requests (rate limit exceeded)
- **500** - Internal Server Error (server-side error)
- **503** - Service Unavailable (database unreachable)

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All UUIDs are version 4
- All prices are in decimal format (e.g., 29.99)
- Payment amounts in Razorpay API are in paise (multiply by 100)
- Empty arrays returned when no results found
- All DELETE operations are hard deletes unless specified as soft delete
- Products and materials can be soft deleted (isActive=false)
- Cart auto-removes invalid items (inactive products/materials)
- Order items snapshot prices at checkout (immutable)
- No refund/cancellation endpoints (orders are immutable after payment)
