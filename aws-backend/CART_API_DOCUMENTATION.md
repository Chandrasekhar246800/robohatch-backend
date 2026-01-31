# Shopping Cart API Documentation

## Overview
Complete CRUD operations for user shopping carts. All endpoints require JWT authentication.

---

## Base URL
```
http://localhost:5001/api/cart
```

---

## Authentication
All cart endpoints require JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Endpoints

### 1. GET /api/cart
Get current user's cart with all items. Auto-creates cart if doesn't exist.

**Request:**
```bash
GET /api/cart
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (Empty Cart):**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cart": {
      "id": 1,
      "user_id": 5,
      "created_at": "2026-01-30T10:00:00.000Z",
      "updated_at": "2026-01-30T10:00:00.000Z"
    },
    "items": [],
    "summary": {
      "total_items": 0,
      "total_price": 0.00
    }
  }
}
```

**Response (With Items):**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cart": {
      "id": 1,
      "user_id": 5,
      "created_at": "2026-01-30T10:00:00.000Z",
      "updated_at": "2026-01-30T10:15:30.000Z"
    },
    "items": [
      {
        "id": 1,
        "cart_id": 1,
        "product_id": 10,
        "quantity": 2,
        "product": {
          "name": "Premium Robot Kit",
          "description": "Advanced robotics kit",
          "price": 99.99,
          "image_url": "https://example.com/robot.jpg"
        },
        "item_total": 199.98,
        "created_at": "2026-01-30T10:15:00.000Z",
        "updated_at": "2026-01-30T10:15:30.000Z"
      },
      {
        "id": 2,
        "cart_id": 1,
        "product_id": 15,
        "quantity": 1,
        "product": {
          "name": "Arduino Starter Pack",
          "description": "Electronics starter kit",
          "price": 49.99,
          "image_url": "https://example.com/arduino.jpg"
        },
        "item_total": 49.99,
        "created_at": "2026-01-30T10:16:00.000Z",
        "updated_at": "2026-01-30T10:16:00.000Z"
      }
    ],
    "summary": {
      "total_items": 3,
      "total_price": 249.97
    }
  }
}
```

---

### 2. POST /api/cart/items
Add product to cart or increase quantity if already exists.

**Request:**
```bash
POST /api/cart/items
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "product_id": 10,
  "quantity": 2
}
```

**Request Body:**
- `product_id` (required, integer): ID of product to add
- `quantity` (optional, integer, default: 1): Quantity to add

**Response (New Item):**
```json
{
  "success": true,
  "message": "Product added to cart",
  "data": {
    "cart_item": {
      "id": 1,
      "cart_id": 1,
      "product_id": 10,
      "quantity": 2,
      "product_name": "Premium Robot Kit",
      "product_price": 99.99,
      "item_total": 199.98,
      "created_at": "2026-01-30T10:15:00.000Z"
    }
  }
}
```

**Response (Quantity Updated):**
```json
{
  "success": true,
  "message": "Cart item quantity updated",
  "data": {
    "cart_item": {
      "id": 1,
      "cart_id": 1,
      "product_id": 10,
      "quantity": 4,
      "product_name": "Premium Robot Kit",
      "product_price": 99.99,
      "item_total": 399.96,
      "updated_at": "2026-01-30T10:20:00.000Z"
    }
  }
}
```

**Error (Product Not Found):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

**Error (Validation):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "product_id",
      "message": "Product ID must be a positive integer"
    }
  ]
}
```

---

### 3. PUT /api/cart/items/:itemId
Update cart item quantity.

**Request:**
```bash
PUT /api/cart/items/1
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "quantity": 5
}
```

**Request Body:**
- `quantity` (required, integer, min: 1): New quantity

**Response:**
```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": {
    "cart_item": {
      "id": 1,
      "cart_id": 1,
      "product_id": 10,
      "quantity": 5,
      "product_name": "Premium Robot Kit",
      "product_price": 99.99,
      "item_total": 499.95,
      "updated_at": "2026-01-30T10:25:00.000Z"
    }
  }
}
```

**Error (Item Not Found or Unauthorized):**
```json
{
  "success": false,
  "message": "Cart item not found or unauthorized"
}
```

**Error (Invalid Quantity):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be at least 1"
    }
  ]
}
```

---

### 4. DELETE /api/cart/items/:itemId
Remove item from cart.

**Request:**
```bash
DELETE /api/cart/items/1
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart",
  "data": {
    "deleted_item": {
      "id": 1,
      "product_id": 10,
      "product_name": "Premium Robot Kit"
    }
  }
}
```

**Error (Item Not Found or Unauthorized):**
```json
{
  "success": false,
  "message": "Cart item not found or unauthorized"
}
```

---

### 5. DELETE /api/cart
Clear entire cart (remove all items).

**Request:**
```bash
DELETE /api/cart
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared successfully",
  "data": {
    "cart_id": 1,
    "items_removed": 3
  }
}
```

**Error (Cart Not Found):**
```json
{
  "success": false,
  "message": "Cart not found"
}
```

---

## Testing Workflow

### Step 1: Register/Login to get JWT token
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

# Save the token from response
```

### Step 2: View empty cart (auto-created)
```bash
GET /api/cart
Authorization: Bearer YOUR_TOKEN
```

### Step 3: Add product to cart
```bash
POST /api/cart/items
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```

### Step 4: Add another product
```bash
POST /api/cart/items
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "product_id": 2,
  "quantity": 1
}
```

### Step 5: Update quantity
```bash
PUT /api/cart/items/1
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "quantity": 5
}
```

### Step 6: View updated cart
```bash
GET /api/cart
Authorization: Bearer YOUR_TOKEN
```

### Step 7: Remove one item
```bash
DELETE /api/cart/items/2
Authorization: Bearer YOUR_TOKEN
```

### Step 8: Clear entire cart
```bash
DELETE /api/cart
Authorization: Bearer YOUR_TOKEN
```

---

## Security Features

✅ **JWT Authentication Required**: All endpoints protected
✅ **User Isolation**: Users can only access their own cart
✅ **Authorization Checks**: Item ownership verified before update/delete
✅ **Input Validation**: All inputs validated with express-validator
✅ **SQL Injection Prevention**: Parameterized queries only
✅ **No User ID in Request**: user_id derived from JWT, never trusted from request body

---

## Edge Cases Handled

1. **Auto-create cart**: First access creates cart automatically
2. **Duplicate products**: Adding existing product increases quantity instead of creating duplicate
3. **Race conditions**: Unique constraint on (cart_id, product_id) prevents duplicates
4. **Product validation**: Verifies product exists before adding to cart
5. **Unauthorized access**: Users cannot access/modify other users' carts
6. **Item ownership**: Update/delete operations verify item belongs to user's cart
7. **Zero/negative quantities**: Rejected with validation error
8. **Invalid IDs**: Validated as positive integers
9. **Non-existent items**: Returns 404 with clear message
10. **Database errors**: Generic error messages (no internal details exposed)

---

## HTTP Status Codes

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - New item added to cart
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Missing/invalid JWT token
- `404 Not Found` - Cart item or product not found
- `409 Conflict` - Duplicate product (edge case)
- `500 Internal Server Error` - Server error

---

## Database Schema

### carts table
```sql
id          INT PRIMARY KEY AUTO_INCREMENT
user_id     INT UNIQUE NOT NULL (FK to users.id)
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### cart_items table
```sql
id          INT PRIMARY KEY AUTO_INCREMENT
cart_id     INT NOT NULL (FK to carts.id)
product_id  INT NOT NULL (FK to products.id)
quantity    INT NOT NULL DEFAULT 1
created_at  TIMESTAMP
updated_at  TIMESTAMP

UNIQUE KEY (cart_id, product_id)
```

**Constraints:**
- One cart per user (UNIQUE on user_id)
- One product per cart (UNIQUE on cart_id + product_id)
- CASCADE delete on cart deletion
- CASCADE delete on product deletion

---

## Complete Example Session

```bash
# 1. Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# Response: { "data": { "token": "eyJhbGci..." } }

# 2. Set token variable
TOKEN="eyJhbGci..."

# 3. View cart (auto-created)
curl -X GET http://localhost:5001/api/cart \
  -H "Authorization: Bearer $TOKEN"

# 4. Add product (quantity 2)
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":2}'

# 5. Add same product again (increases to 4)
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":2}'

# 6. Update quantity to 10
curl -X PUT http://localhost:5001/api/cart/items/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":10}'

# 7. View updated cart
curl -X GET http://localhost:5001/api/cart \
  -H "Authorization: Bearer $TOKEN"

# 8. Remove item
curl -X DELETE http://localhost:5001/api/cart/items/1 \
  -H "Authorization: Bearer $TOKEN"

# 9. Clear entire cart
curl -X DELETE http://localhost:5001/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

After implementing cart, you can proceed to:
- **Step 9**: Orders & Checkout API
- **Step 10**: Payment Integration (Razorpay)
- **Step 11**: Email Notifications
- **Step 12**: Admin Order Management
