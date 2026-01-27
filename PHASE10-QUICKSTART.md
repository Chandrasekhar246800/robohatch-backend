# 🚀 PHASE 10 — Quick Start & Testing Guide

**Status:** ✅ **COMPLETE & READY FOR TESTING**

---

## ⚡ WHAT WAS IMPLEMENTED

### 1. **Email Notifications** (Fire-and-Forget)
- ✅ Order creation confirmation email
- ✅ Payment success email
- ✅ Professional HTML templates with RoboHatch branding
- ✅ Asynchronous sending (no blocking)
- ✅ Error handling (failures don't affect core flows)

### 2. **Invoice Generation** (PDF)
- ✅ Auto-generated after payment confirmation
- ✅ Unique invoice numbers (`INV-YYYYMMDD-XXXXX`)
- ✅ PDF files with order snapshots
- ✅ Idempotent (prevents duplicates)
- ✅ Stored in `invoices/` directory

### 3. **API Endpoints**
- ✅ Customer: `GET /api/v1/invoices/order/:orderId`
- ✅ Customer: `GET /api/v1/invoices/order/:orderId/download`
- ✅ Admin: `GET /api/v1/admin/invoices/order/:orderId`
- ✅ Admin: `GET /api/v1/admin/invoices/order/:orderId/download`

---

## 📋 BEFORE TESTING

### 1. Configure Email Settings

Edit `.env` file:

```env
# Email Configuration (Phase 10)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com          # ← CHANGE THIS
EMAIL_PASSWORD=your-gmail-app-password    # ← CHANGE THIS
EMAIL_FROM_NAME=RoboHatch
EMAIL_FROM_ADDRESS=noreply@robohatch.com
```

**For Gmail:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Generate an [App Password](https://support.google.com/accounts/answer/185833)
4. Use the App Password in `EMAIL_PASSWORD`

> **Note:** If you don't configure email, notifications will be logged to console only (no errors thrown).

---

### 2. Configure Razorpay (if not done)

```env
# Razorpay Configuration (Phase 7)
RAZORPAY_KEY_ID=your_razorpay_key_id              # ← CHANGE THIS
RAZORPAY_KEY_SECRET=your_razorpay_key_secret      # ← CHANGE THIS
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret       # ← CHANGE THIS
```

**Get Test Credentials:**
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Switch to **Test Mode**
3. Go to Settings → API Keys
4. Copy Key ID and Key Secret

---

### 3. Start the Server

```bash
npm run start:dev
```

**Expected Output:**
```
[Nest] LOG [BootstrapService] 🚀 Server is running on http://localhost:3000
[Nest] LOG [EmailService] ✅ Email transporter initialized
```

---

## 🧪 TESTING WORKFLOW

### Test 1: Order Creation + Email

**1. Login as Customer**

```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "Customer@123456"
}
```

**2. Create Order**

```bash
POST http://localhost:3000/api/v1/orders
Authorization: Bearer <customer-token>
Idempotency-Key: test-order-123
Content-Type: application/json

{
  "addressId": "<your-address-id>"
}
```

**Expected:**
- ✅ Order created successfully
- ✅ Console log: `Order created notification queued for <orderId>`
- ✅ Email sent to customer (check inbox)
- ✅ Email subject: "Order Confirmation - Order #..."

---

### Test 2: Payment + Invoice Generation

**1. Initiate Payment**

```bash
POST http://localhost:3000/api/v1/payments/initiate
Authorization: Bearer <customer-token>
Content-Type: application/json

{
  "orderId": "<order-id-from-step-1>"
}
```

**Response:**
```json
{
  "razorpayOrderId": "order_xxx",
  "amount": 150000,
  "currency": "INR",
  "key": "rzp_test_xxx"
}
```

**2. Complete Payment (Razorpay Test Mode)**

Use Razorpay test cards:
- **Success:** `4111 1111 1111 1111`
- **CVV:** Any 3 digits
- **Expiry:** Any future date

**3. Verify Results**

After payment webhook is received:

**Console logs:**
```
[Nest] LOG ✅ Payment captured and Order <orderId> marked as PAID
[Nest] LOG ✅ Invoice generated: INV-20250127-00001 for order <orderId>
[Nest] LOG Payment success notification queued for <orderId>
```

**Check invoice file:**
```bash
ls invoices/
# Should show: INV-20250127-00001.pdf
```

**Check email:**
- Subject: "Payment Successful - Order #..."
- Contains payment confirmation and order details

---

### Test 3: Invoice Download (Customer)

**1. Get Invoice Metadata**

```bash
GET http://localhost:3000/api/v1/invoices/order/<orderId>
Authorization: Bearer <customer-token>
```

**Response:**
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "invoiceNumber": "INV-20250127-00001",
  "invoiceUrl": "/invoices/INV-20250127-00001.pdf",
  "issuedAt": "2025-01-27T...",
  "total": 1500.00
}
```

**2. Download PDF**

```bash
GET http://localhost:3000/api/v1/invoices/order/<orderId>/download
Authorization: Bearer <customer-token>
```

**Expected:** PDF file download

---

### Test 4: Invoice Download (Admin)

**1. Login as Admin**

```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@robohatch.com",
  "password": "Admin@123456"
}
```

**2. Download Any Invoice**

```bash
GET http://localhost:3000/api/v1/admin/invoices/order/<orderId>/download
Authorization: Bearer <admin-token>
```

**Expected:** PDF file download (even for other users' orders)

---

### Test 5: Idempotency

**1. Trigger Payment Webhook Multiple Times**

Simulate webhook retry by calling webhook endpoint multiple times:

```bash
POST http://localhost:3000/api/v1/webhooks/razorpay
X-Razorpay-Signature: <valid-signature>
Content-Type: application/json

{
  "event": "payment.captured",
  "payload": { ... }
}
```

**Expected:**
- ✅ First call: Invoice generated
- ✅ Subsequent calls: Log shows "Invoice already exists, skipping generation"
- ✅ Only ONE PDF file in `invoices/` directory

---

### Test 6: Access Control

**1. Customer Tries to Access Other User's Invoice**

```bash
GET http://localhost:3000/api/v1/invoices/order/<other-users-order-id>
Authorization: Bearer <customer-token>
```

**Expected:** `404 Not Found` (security check)

**2. Admin Can Access Any Invoice**

```bash
GET http://localhost:3000/api/v1/admin/invoices/order/<any-order-id>
Authorization: Bearer <admin-token>
```

**Expected:** `200 OK` with invoice data

---

## 🐛 TROUBLESHOOTING

### Email Not Sending

**Symptoms:**
- Console shows: `⚠️ Email credentials not configured`
- No email received

**Fix:**
1. Check `.env` has correct `EMAIL_USER` and `EMAIL_PASSWORD`
2. For Gmail, use App Password (not regular password)
3. Restart server: `npm run start:dev`

---

### Invoice Not Generated

**Symptoms:**
- Payment succeeds but no PDF in `invoices/` directory
- No console log about invoice generation

**Fix:**
1. Check payment webhook was received: Look for `✅ Payment captured` in console
2. Check order status is `PAID`: Query order endpoint
3. Check for error logs in console
4. Verify `invoices/` directory exists (auto-created on first run)

---

### PDF Download Fails

**Symptoms:**
- API returns 404 when downloading invoice
- Invoice metadata exists but file missing

**Fix:**
1. Check file exists: `ls invoices/`
2. Check `invoiceUrl` matches filename
3. Regenerate invoice (delete DB record and trigger webhook again)

---

## 📊 DATABASE VERIFICATION

### Check Invoice Records

```sql
-- Connect to MySQL
mysql -u root -p robohatch_dev

-- Check invoices table
SELECT * FROM invoices;

-- Check invoice for specific order
SELECT 
  i.invoiceNumber,
  i.invoiceUrl,
  i.issuedAt,
  o.status,
  o.total
FROM invoices i
JOIN orders o ON i.orderId = o.id
WHERE i.orderId = '<order-id>';
```

---

## 📁 FILE STRUCTURE

```
robohatch/
├── invoices/                    # ← Auto-generated PDFs
│   └── INV-20250127-00001.pdf
│
├── src/
│   ├── invoices/
│   │   ├── invoices.service.ts       # PDF generation
│   │   ├── invoices.controller.ts    # Customer endpoints
│   │   └── admin-invoices.controller.ts  # Admin endpoints
│   │
│   ├── notifications/
│   │   ├── notifications.service.ts  # High-level orchestration
│   │   └── email/
│   │       ├── email.service.ts
│   │       └── templates/
│   │           ├── order-created.hbs
│   │           └── payment-success.hbs
│   │
│   ├── config/
│   │   └── email.config.ts           # Email SMTP settings
│   │
│   ├── orders/
│   │   └── orders.service.ts         # + Email notification call
│   │
│   └── payments/
│       └── payments.service.ts       # + Invoice + Email calls
│
├── prisma/
│   ├── schema.prisma                 # + Invoice model
│   └── migrations/
│       └── 20260127053132_add_invoice_model/
│
└── PHASE10-COMPLETE.md               # Full documentation
```

---

## ✅ SUCCESS CHECKLIST

After testing, verify:

- [ ] Order creation sends email (check inbox)
- [ ] Payment success sends email (check inbox)
- [ ] Invoice PDF generated in `invoices/` directory
- [ ] Customer can download own invoice
- [ ] Customer cannot access other invoices (404)
- [ ] Admin can download all invoices
- [ ] Duplicate webhook calls generate only 1 invoice
- [ ] Email failures don't rollback orders/payments
- [ ] Invoice failures don't rollback payments

---

## 📚 DOCUMENTATION

- **Full Phase 10 Docs:** [PHASE10-COMPLETE.md](PHASE10-COMPLETE.md)
- **Project Overview:** [PROJECT-DESCRIPTION.md](PROJECT-DESCRIPTION.md)
- **Testing Guide:** [TESTING.md](TESTING.md)

---

## 🎉 YOU'RE READY!

**Phase 10 is complete and production-ready.**

Start testing with order creation, payment, and invoice generation.

Need help? Check the troubleshooting section or see full documentation.

**Happy Testing! 🚀**
