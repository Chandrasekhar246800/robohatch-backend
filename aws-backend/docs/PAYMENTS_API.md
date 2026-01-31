# Razorpay Payment Integration - Complete API Documentation

## 🎯 Overview

Complete payment system using Razorpay for RoboHatch e-commerce platform. Supports products and custom STL design orders with enterprise-grade security.

**Base URL:** `http://localhost:5001/api/payments`

---

## 🔐 Security Architecture

### **Critical Security Rules:**

1. ✅ **Amount ALWAYS from database** (never frontend)
2. ✅ **Signature verification MANDATORY** (prevents fraud)
3. ✅ **User ownership enforced** (users cannot pay for others' orders)
4. ✅ **Idempotent operations** (safe to retry)
5. ✅ **Webhook signature validation** (production safety)

### **Payment State Machine:**

```
Order Created (pending)
  ↓
Payment Order Created (created)
  ↓
User Pays via Razorpay
  ↓
Signature Verified
  ↓
Order Confirmed (paid → processing)
```

---

## 📊 Database Schema Changes

### **Migration 004: Payment Fields**

```sql
ALTER TABLE orders
  ADD COLUMN payment_provider VARCHAR(50) DEFAULT 'razorpay',
  ADD COLUMN payment_id VARCHAR(255) NULL,
  ADD COLUMN payment_status ENUM('created','paid','failed') DEFAULT 'created',
  ADD COLUMN razorpay_order_id VARCHAR(255) NULL;
```

### **Order States:**

| Field | Purpose | Values |
|-------|---------|--------|
| `status` | Order lifecycle | `pending`, `processing`, `shipped`, `completed`, `cancelled` |
| `payment_status` | Money state | `created`, `paid`, `failed` |
| `payment_provider` | Gateway used | `razorpay` (default) |
| `payment_id` | Razorpay payment ID | `pay_xxxxx` |
| `razorpay_order_id` | Razorpay order ID | `order_xxxxx` |

---

## 🚀 API Endpoints

### **1. Create Payment Order**

**Endpoint:** `POST /api/payments/create`

**Purpose:** Create Razorpay order for existing unpaid order

**Authentication:** JWT required

**Request:**
```json
{
  "order_id": 15
}
```

**Backend Flow:**
```
1. Verify JWT → Extract user_id
2. Fetch order from database WHERE id = ? AND user_id = ?
3. Verify order not already paid
4. Read total_amount FROM DATABASE (CRITICAL)
5. Convert rupees to paise (× 100)
6. Create Razorpay order
7. Save razorpay_order_id to database
8. Return Razorpay details
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "razorpay_order_id": "order_Ns8VkPcAhPKTuz",
    "amount": 259900,
    "currency": "INR",
    "key_id": "rzp_test_xxxxxxxxxxxxx"
  }
}
```

**Frontend Integration:**
```javascript
// Step 1: Create payment order
const response = await fetch('/api/payments/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ order_id: 15 })
});

const { data } = await response.json();

// Step 2: Open Razorpay checkout
const options = {
  key: data.key_id,
  amount: data.amount,
  currency: data.currency,
  order_id: data.razorpay_order_id,
  name: "RoboHatch",
  description: "Order Payment",
  handler: function(response) {
    // Step 3: Verify payment (next endpoint)
    verifyPayment(response);
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

**Error Responses:**

Order not found (404):
```json
{
  "success": false,
  "message": "Order not found or unauthorized"
}
```

Already paid (400):
```json
{
  "success": false,
  "message": "Order has already been paid"
}
```

**Idempotency:**
- If Razorpay order already exists → Returns existing order (safe to retry)

---

### **2. Verify Payment** 🔐 CRITICAL

**Endpoint:** `POST /api/payments/verify`

**Purpose:** Verify payment signature and mark order as paid

**Authentication:** JWT required

**Request:**
```json
{
  "razorpay_order_id": "order_Ns8VkPcAhPKTuz",
  "razorpay_payment_id": "pay_Ns8YhZqLZBk9Vx",
  "razorpay_signature": "9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"
}
```

**Backend Flow:**
```
1. Verify JWT
2. CRITICAL: Verify signature
   - message = razorpay_order_id|razorpay_payment_id
   - expected_signature = HMAC_SHA256(message, RAZORPAY_SECRET)
   - if (expected_signature !== razorpay_signature) → REJECT
3. Find order by razorpay_order_id AND user_id
4. START TRANSACTION
5. Update orders SET:
   - payment_status = 'paid'
   - payment_id = razorpay_payment_id
   - status = 'processing'
6. COMMIT TRANSACTION
7. Return success
```

**Signature Verification (Node.js):**
```javascript
const crypto = require('crypto');

const message = `${razorpay_order_id}|${razorpay_payment_id}`;
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(message)
  .digest('hex');

if (expectedSignature !== razorpay_signature) {
  throw new Error('Invalid signature');
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment verified and order confirmed",
  "data": {
    "order_id": 15,
    "payment_status": "paid",
    "order_status": "processing"
  }
}
```

**Error Responses:**

Invalid signature (400):
```json
{
  "success": false,
  "message": "Payment verification failed. Invalid signature."
}
```

Order not found (404):
```json
{
  "success": false,
  "message": "Order not found or unauthorized"
}
```

**Idempotency:**
- If order already paid → Returns success (safe to retry)

**Frontend Integration:**
```javascript
async function verifyPayment(response) {
  const result = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    })
  });

  if (result.ok) {
    alert('Payment successful!');
    window.location.href = '/orders';
  }
}
```

---

### **3. Webhook Handler**

**Endpoint:** `POST /api/payments/webhook`

**Purpose:** Receive payment updates from Razorpay servers

**Authentication:** Webhook signature (NOT JWT)

**Razorpay Configuration:**
```
1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Create webhook: https://yourdomain.com/api/payments/webhook
3. Events: payment.captured, payment.failed
4. Copy webhook secret to .env
```

**Request Headers:**
```
X-Razorpay-Signature: 9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
Content-Type: application/json
```

**Request Body (payment.captured):**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_Ns8YhZqLZBk9Vx",
        "order_id": "order_Ns8VkPcAhPKTuz",
        "status": "captured",
        "amount": 259900
      }
    }
  }
}
```

**Backend Flow:**
```
1. Read X-Razorpay-Signature header
2. Verify webhook signature:
   - expected = HMAC_SHA256(raw_body, WEBHOOK_SECRET)
   - if (expected !== signature) → REJECT
3. Parse event type
4. Handle payment.captured:
   - Find order by razorpay_order_id
   - Update: payment_status='paid', status='processing'
5. Handle payment.failed:
   - Update: payment_status='failed', status='cancelled'
6. Return 200 OK (always, even on error)
```

**Webhook Signature Verification:**
```javascript
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
```

**Success Response (200):**
```json
{
  "status": "ok"
}
```

**Why Webhooks?**
- ✅ Captures payment even if user closes browser
- ✅ Handles network failures
- ✅ Production reliability
- ✅ Backup verification mechanism

**Idempotency:**
- Checks `payment_status !== 'paid'` before updating

---

### **4. Get Payment Status**

**Endpoint:** `GET /api/payments/order/:orderId`

**Purpose:** Check payment status for an order

**Authentication:** JWT required

**Request:**
```
GET /api/payments/order/15
Authorization: Bearer eyJhbGc...
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "order_id": 15,
    "payment_status": "paid",
    "payment_id": "pay_Ns8YhZqLZBk9Vx",
    "razorpay_order_id": "order_Ns8VkPcAhPKTuz",
    "order_status": "processing"
  }
}
```

---

## 🧪 Testing

### **Setup Razorpay Test Account:**

1. Go to https://dashboard.razorpay.com
2. Sign up (free test account)
3. Get test credentials:
   - Key ID: `rzp_test_xxxxx`
   - Key Secret: `xxxxxxxx`
4. Add to `.env`

### **Test Cards (Razorpay Test Mode):**

```
Success Card:
  Card: 4111 1111 1111 1111
  CVV: Any 3 digits
  Expiry: Any future date

Failure Card:
  Card: 4000 0000 0000 0002
```

### **Test UPI:**

```
Success: success@razorpay
Failure: failure@razorpay
```

### **Complete Test Flow:**

```bash
# 1. Register user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
# Response: { token: "..." }

# 2. Add product to cart
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":2}'

# 3. Checkout (create order)
curl -X POST http://localhost:5001/api/orders/checkout \
  -H "Authorization: Bearer <TOKEN>"
# Response: { order: { id: 15 } }

# 4. Create payment order
curl -X POST http://localhost:5001/api/payments/create \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"order_id":15}'
# Response: { razorpay_order_id: "order_xxx", amount: 5000, key_id: "rzp_test_xxx" }

# 5. Simulate payment (frontend Razorpay SDK)
# User pays → Razorpay returns: order_id, payment_id, signature

# 6. Verify payment
curl -X POST http://localhost:5001/api/payments/verify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "xxx"
  }'

# 7. Check order status
curl http://localhost:5001/api/payments/order/15 \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🔒 Security Checklist

| Security Feature | Status | Implementation |
|------------------|--------|----------------|
| Amount from DB | ✅ | Never accepts frontend amount |
| Signature verification | ✅ | HMAC SHA256 mandatory |
| User ownership | ✅ | JWT user_id + DB filter |
| Webhook signature | ✅ | Verified before processing |
| Idempotent payments | ✅ | Duplicate payment blocked |
| No secret exposure | ✅ | RAZORPAY_KEY_SECRET never sent |
| Transaction safety | ✅ | DB transactions for updates |
| Rate limiting | ⚠️ | Add in production |

---

## 🚨 Error Scenarios

### **Scenario 1: User tampers with amount**

```
Frontend sends: amount: 1 (₹1)
Actual order: total_amount: 2599 (₹2599)

Backend reads amount from DB ✅
Razorpay order created for ₹2599 ✅
User forced to pay correct amount ✅
```

### **Scenario 2: Invalid signature**

```
Attacker sends fake payment_id with wrong signature

Backend verifies signature ❌
Payment rejected ✅
Order remains unpaid ✅
```

### **Scenario 3: Network failure after payment**

```
User pays ✅
Browser crashes before verify call ❌

Webhook receives payment.captured event ✅
Backend updates order status ✅
Order marked as paid ✅
```

### **Scenario 4: Double payment attempt**

```
User clicks "Pay" twice

First payment: Processes ✅
Second payment: 
  - Order already paid
  - Returns 400 error
  - Payment not initiated ✅
```

---

## 📈 Payment Flow Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. POST /orders/checkout
       ▼
┌─────────────┐
│   Backend   │ Creates order (status=pending, payment_status=created)
└──────┬──────┘
       │ 2. POST /payments/create
       │    → Reads amount from DB
       │    → Creates Razorpay order
       ▼
┌─────────────┐
│  Razorpay   │
└──────┬──────┘
       │ 3. Returns order_id + key_id
       ▼
┌─────────────┐
│   Frontend  │ Opens Razorpay checkout UI
│  (Razorpay  │ User enters card/UPI
│    SDK)     │
└──────┬──────┘
       │ 4. User pays
       ▼
┌─────────────┐
│  Razorpay   │ Processes payment
└──────┬──────┘
       │ 5. Returns: payment_id, signature
       ▼
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 6. POST /payments/verify
       ▼
┌─────────────┐
│   Backend   │ Verifies signature (CRITICAL)
│             │ Updates: payment_status=paid, status=processing
└─────────────┘

       │ Parallel: Webhook
       ▼
┌─────────────┐
│  Razorpay   │ Sends payment.captured event
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Backend   │ Verifies webhook signature
│  (Webhook)  │ Updates order (backup mechanism)
└─────────────┘
```

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Replace test keys with live keys
- [ ] Configure webhook URL in Razorpay dashboard
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add request logging
- [ ] Monitor webhook failures
- [ ] Set up payment reconciliation
- [ ] Add retry mechanism for failed webhooks
- [ ] Configure HTTPS (required for webhooks)
- [ ] Add email notifications on payment
- [ ] Set up refund workflow
- [ ] Add payment analytics

---

## 📞 Razorpay Dashboard

**Test Mode:**
- Dashboard: https://dashboard.razorpay.com/app/dashboard
- Webhooks: https://dashboard.razorpay.com/app/webhooks
- Payments: https://dashboard.razorpay.com/app/payments

**Test vs Live:**
- Test keys: `rzp_test_xxxxx`
- Live keys: `rzp_live_xxxxx`
- Separate webhook secrets

---

## 🆘 Troubleshooting

### **Payment verification fails:**
```
Check:
1. RAZORPAY_KEY_SECRET matches dashboard
2. Signature calculation uses order_id|payment_id format
3. HMAC SHA256 algorithm used
4. No extra whitespace in concatenation
```

### **Webhook not received:**
```
Check:
1. Webhook URL is publicly accessible
2. HTTPS enabled (required in production)
3. Webhook signature verification passes
4. Events enabled: payment.captured, payment.failed
5. Razorpay dashboard shows webhook delivery status
```

### **Amount mismatch:**
```
Issue: Frontend shows ₹25.99, Razorpay shows ₹2599
Cause: Amount must be in paise (multiply by 100)
Fix: Backend converts automatically (amount * 100)
```

---

**Implementation Date:** January 31, 2026  
**Version:** 1.0.0  
**Status:** Production-Ready with Test Mode
