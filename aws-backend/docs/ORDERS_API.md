# Orders & Checkout API Documentation

## Overview
The Orders API converts shopping carts into finalized orders with transaction safety. Supports both product purchases and custom STL design manufacturing.

**Base URL:** `http://localhost:5001/api/orders`

---

## Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints

### 1. Checkout (Create Order)
**POST** `/checkout`

Converts user's cart into a finalized order using database transaction for atomicity.

**Flow:**
1. Validates user has cart with items
2. Snapshots current product prices
3. Creates order record
4. Creates order items with price snapshot
5. Clears cart
6. Commits transaction or rolls back on error

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:** None (uses JWT user_id to fetch cart)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "id": 15,
      "user_id": 3,
      "total_amount": 59.97,
      "status": "pending",
      "created_at": "2026-01-27T14:35:22.000Z",
      "items": [
        {
          "id": 28,
          "product_id": 5,
          "custom_design_id": null,
          "quantity": 3,
          "price_at_order": 19.99,
          "product_name": "Servo Motor SG90",
          "product_image": "https://example.com/servo.jpg",
          "item_total": 59.97
        }
      ],
      "items_count": 1
    }
  }
}
```

**Error Responses:**

Empty Cart (400):
```json
{
  "success": false,
  "message": "Cart is empty. Please add items before checkout."
}
```

No Cart (404):
```json
{
  "success": false,
  "message": "Cart not found. Please add items to cart first."
}
```

Transaction Failed (500):
```json
{
  "success": false,
  "message": "Checkout failed. Your cart has not been modified. Please try again."
}
```

---

### 2. Get User's Orders
**GET** `/`

Retrieves all orders for the authenticated user.

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": 15,
        "user_id": 3,
        "total_amount": 59.97,
        "status": "pending",
        "created_at": "2026-01-27T14:35:22.000Z",
        "updated_at": "2026-01-27T14:35:22.000Z",
        "items_count": 1
      },
      {
        "id": 12,
        "user_id": 3,
        "total_amount": 129.50,
        "status": "completed",
        "created_at": "2026-01-25T10:20:15.000Z",
        "updated_at": "2026-01-26T08:12:30.000Z",
        "items_count": 3
      }
    ],
    "total_orders": 2
  }
}
```

**Notes:**
- Orders sorted by `created_at DESC` (newest first)
- Only returns orders belonging to authenticated user
- Includes item count per order

---

### 3. Get Single Order Details
**GET** `/:id`

Retrieves complete details of a specific order with all items.

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**URL Parameters:**
- `id` (integer) - Order ID

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      "id": 15,
      "user_id": 3,
      "total_amount": 59.97,
      "status": "pending",
      "created_at": "2026-01-27T14:35:22.000Z",
      "updated_at": "2026-01-27T14:35:22.000Z",
      "items": [
        {
          "id": 28,
          "type": "product",
          "product_id": 5,
          "custom_design_id": null,
          "quantity": 3,
          "price_at_order": 19.99,
          "item_total": 59.97,
          "product": {
            "name": "Servo Motor SG90",
            "description": "High torque servo motor for robotics",
            "image_url": "https://example.com/servo.jpg"
          },
          "design": null
        }
      ],
      "items_count": 1
    }
  }
}
```

**Example with Custom Design:**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      "id": 18,
      "user_id": 3,
      "total_amount": 49.99,
      "status": "processing",
      "created_at": "2026-01-27T15:00:00.000Z",
      "updated_at": "2026-01-27T15:30:00.000Z",
      "items": [
        {
          "id": 35,
          "type": "custom_design",
          "product_id": null,
          "custom_design_id": 12,
          "quantity": 1,
          "price_at_order": 49.99,
          "item_total": 49.99,
          "product": null,
          "design": {
            "file_name": "custom-robot-arm.stl",
            "file_size": 2458120,
            "file_size_mb": "2.34",
            "file_type": "application/sla"
          }
        }
      ],
      "items_count": 1
    }
  }
}
```

**Error Responses:**

Invalid ID (400):
```json
{
  "success": false,
  "message": "Invalid order ID"
}
```

Not Found or Unauthorized (404):
```json
{
  "success": false,
  "message": "Order not found or unauthorized"
}
```

**Notes:**
- Enforces ownership: Users can only view their own orders
- Includes full product details via LEFT JOIN
- Includes custom design details if applicable
- Item `type` field: `"product"` or `"custom_design"`

---

### 4. Admin: Get All Orders
**GET** `/admin/orders`

**Admin only** - Retrieves all orders from all users with full details.

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Required Role:** `admin`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "All orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": 15,
        "user_id": 3,
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "total_amount": 59.97,
        "status": "pending",
        "created_at": "2026-01-27T14:35:22.000Z",
        "updated_at": "2026-01-27T14:35:22.000Z",
        "items": [
          {
            "id": 28,
            "type": "product",
            "product_id": 5,
            "product_name": "Servo Motor SG90",
            "custom_design_id": null,
            "design_file_name": null,
            "design_file_url": null,
            "quantity": 3,
            "price_at_order": 19.99
          }
        ],
        "items_count": 1
      },
      {
        "id": 12,
        "user_id": 5,
        "user_name": "Jane Smith",
        "user_email": "jane@example.com",
        "total_amount": 149.99,
        "status": "completed",
        "created_at": "2026-01-25T10:20:15.000Z",
        "updated_at": "2026-01-26T08:12:30.000Z",
        "items": [
          {
            "id": 22,
            "type": "custom_design",
            "product_id": null,
            "product_name": null,
            "custom_design_id": 8,
            "design_file_name": "robot-chassis.stl",
            "design_file_url": "https://robohatch-stl-uploads.s3.eu-north-1.amazonaws.com/stl-designs/5/abc123.stl",
            "quantity": 1,
            "price_at_order": 149.99
          }
        ],
        "items_count": 1
      }
    ],
    "total_orders": 2
  }
}
```

**Error Responses:**

Forbidden (403):
```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

**Notes:**
- Requires JWT with `role: 'admin'`
- Returns orders from ALL users
- Includes user name and email
- Includes S3 URLs for custom designs (admins can access)
- Sorted by `created_at DESC`

---

## Order Status Values
- `pending` - Order placed, awaiting payment/processing (default)
- `processing` - Order confirmed, manufacturing in progress
- `shipped` - Order dispatched
- `completed` - Order delivered successfully
- `cancelled` - Order cancelled by user or admin

---

## Price Snapshots
The system captures the **current product price** at checkout and stores it as `price_at_order`. This ensures:
- Historical order accuracy (prices may change later)
- Correct invoice generation
- Immutable order records

**Example:**
```
Product: Arduino Uno
Current Price: $25.99

User adds to cart → price reference only
User checks out → price_at_order = $25.99 (snapshot)

Later: Product price changes to $29.99
Order history still shows: $25.99 (original price)
```

---

## Transaction Safety
The checkout process uses MySQL transactions to ensure atomicity:

```
BEGIN TRANSACTION
  1. Validate cart exists
  2. Validate cart not empty
  3. Fetch cart items with prices
  4. Calculate total
  5. Create order
  6. Insert order items
  7. Clear cart
COMMIT (or ROLLBACK on error)
```

**Failure Scenarios:**
- Cart empty → Rollback, return 400
- Database error → Rollback, return 500
- Network timeout → Rollback, cart unchanged

---

## Testing Examples

### Test Checkout Flow
```bash
# 1. Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'

# Response: { "token": "eyJhbGc..." }

# 2. Add items to cart
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 5,
    "quantity": 3
  }'

# 3. Checkout
curl -X POST http://localhost:5001/api/orders/checkout \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"

# 4. View orders
curl -X GET http://localhost:5001/api/orders \
  -H "Authorization: Bearer eyJhbGc..."

# 5. View order details
curl -X GET http://localhost:5001/api/orders/15 \
  -H "Authorization: Bearer eyJhbGc..."
```

### Test Admin Access
```bash
# Admin login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@robohatch.com",
    "password": "adminPassword"
  }'

# View all orders
curl -X GET http://localhost:5001/api/admin/orders \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Database Schema Reference

### orders table
```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_orders (user_id),
  INDEX idx_order_status (status)
);
```

### order_items table
```sql
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NULL,
  custom_design_id INT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price_at_order DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (custom_design_id) REFERENCES custom_designs(id) ON DELETE RESTRICT,
  CHECK (
    (product_id IS NOT NULL AND custom_design_id IS NULL) OR
    (product_id IS NULL AND custom_design_id IS NOT NULL)
  ),
  INDEX idx_order_items (order_id)
);
```

**Constraint Notes:**
- Either `product_id` OR `custom_design_id` must be set (never both)
- `price_at_order` stores snapshot (immutable)
- `ON DELETE RESTRICT` prevents deletion of products/designs in active orders

---

## Security Features
1. **JWT Authentication:** All routes require valid JWT token
2. **Ownership Enforcement:** Users can only access their own orders
3. **Role-Based Access:** Admin endpoint requires `role: 'admin'`
4. **SQL Injection Protection:** All queries use parameterized statements
5. **Transaction Isolation:** Cart-to-order conversion is atomic
6. **Input Validation:** Order IDs validated before database query

---

## Future Enhancements
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Order status updates (PUT `/orders/:id/status`)
- [ ] Invoice generation (PDF)
- [ ] Email notifications on order placement
- [ ] Order cancellation (PUT `/orders/:id/cancel`)
- [ ] Refund support
- [ ] Shipment tracking integration
- [ ] Order search and filtering

---

## Error Handling Summary

| Status | Scenario |
|--------|----------|
| 400 | Invalid order ID, empty cart |
| 401 | Missing/invalid JWT token |
| 403 | Non-admin accessing admin endpoint |
| 404 | Order not found or unauthorized access |
| 500 | Database error, transaction failure |

All errors return JSON:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

**Implementation Date:** 2026-01-27  
**Backend:** Node.js + Express + mysql2  
**Database:** AWS RDS MySQL  
**Port:** 5001
