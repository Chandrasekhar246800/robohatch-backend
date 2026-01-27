# ✅ PHASE 10 — NOTIFICATIONS & INVOICES (COMPLETE)

**Status:** ✅ **IMPLEMENTED & TESTED**  
**Date Completed:** January 27, 2025  
**Migration:** `20260127053132_add_invoice_model`

---

## 📋 OVERVIEW

Phase 10 implements a production-ready **Notifications & Invoices** system with the following features:

- **Email Notifications** (fire-and-forget, async)
  - Order creation confirmation
  - Payment success notification
  
- **Invoice Generation** (PDF, read-only snapshots)
  - Auto-generated after payment confirmation
  - Unique invoice numbers (format: `INV-YYYYMMDD-XXXXX`)
  - Stored as PDF files with database metadata
  
- **Access Control**
  - Customers can only view their own invoices
  - Admins can view all invoices

---

## 🎯 KEY PRINCIPLES

### 1. **Fire-and-Forget Notifications**
- Email sending is **asynchronous** and **non-blocking**
- Failures do **NOT** rollback order/payment transactions
- All errors are logged but never thrown

### 2. **Read-Only Invoice Snapshots**
- Invoices use **ORDER SNAPSHOTS** (OrderItems, OrderAddress)
- Prices are **NEVER recalculated**
- Uses `Order.total`, `OrderItem.lineTotal` directly

### 3. **Idempotent Invoice Generation**
- Invoice created **ONLY ONCE** per order
- `orderId` has **UNIQUE constraint** in database
- Duplicate generation attempts are silently skipped

### 4. **Zero Impact on Core Flows**
- Invoice generation failures do NOT affect payment processing
- Email failures do NOT affect order creation
- All side-effects are isolated with try-catch

---

## 📦 DATABASE SCHEMA

### Invoice Model
```prisma
model Invoice {
  id            String   @id @default(uuid())
  orderId       String   @unique // One invoice per order
  invoiceNumber String   @unique // e.g., INV-20250127-00001
  invoiceUrl    String   // e.g., /invoices/INV-20250127-00001.pdf
  issuedAt      DateTime @default(now())
  
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([invoiceNumber])
  @@map("invoices")
}
```

**Key Constraints:**
- `orderId` is **UNIQUE** → prevents duplicate invoices
- `invoiceNumber` is **UNIQUE** → human-readable identifier
- Cascade delete → invoice deleted when order is deleted

---

## 🏗️ ARCHITECTURE

### **Modules Created**

#### 1. **NotificationsModule**
- **Location:** `src/notifications/`
- **Dependencies:** `EmailService`
- **Purpose:** High-level notification orchestration

**Files:**
```
src/notifications/
├── notifications.module.ts
├── notifications.service.ts
└── email/
    ├── email.service.ts
    └── templates/
        ├── order-created.hbs
        └── payment-success.hbs
```

#### 2. **InvoicesModule**
- **Location:** `src/invoices/`
- **Dependencies:** `PrismaService`, `PDFKit`
- **Purpose:** PDF generation and storage

**Files:**
```
src/invoices/
├── invoices.module.ts
├── invoices.service.ts
├── invoices.controller.ts (customer)
└── admin-invoices.controller.ts (admin)
```

#### 3. **Configuration**
- **Location:** `src/config/email.config.ts`
- **Environment Variables:**
  ```env
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_SECURE=false
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASSWORD=your-app-password
  EMAIL_FROM_NAME=RoboHatch
  EMAIL_FROM_ADDRESS=noreply@robohatch.com
  ```

---

## 🔄 INTEGRATION POINTS

### 1. **Order Creation Flow** (orders.service.ts)

```typescript
// After order is created in transaction
this.notificationsService.notifyOrderCreated({
  email: order.user.email,
  orderId: order.id,
  total: parseFloat(order.total.toString()),
  orderDate: order.createdAt,
});
```

**Trigger:** Immediately after order creation  
**Email:** `order-created.hbs` template  
**Variables:** `{{ orderId }}`, `{{ total }}`, `{{ orderDate }}`

---

### 2. **Payment Webhook Flow** (payments.service.ts)

```typescript
// After payment is captured and order marked as PAID
this.invoicesService.generateInvoice(payment.orderId);

this.notificationsService.notifyPaymentSuccess({
  email: payment.order.user.email,
  orderId: payment.orderId,
  total: Number(payment.order.total),
  paymentDate: new Date(),
});
```

**Trigger:** `payment.captured` Razorpay webhook  
**Actions:**
1. Generate PDF invoice (idempotent)
2. Send payment success email

**Email:** `payment-success.hbs` template  
**Variables:** `{{ orderId }}`, `{{ total }}`, `{{ paymentDate }}`

---

## 📧 EMAIL TEMPLATES

### Template Engine: Handlebars

**Location:** `src/notifications/email/templates/`

#### 1. **order-created.hbs**
- **Subject:** "Order Confirmation - Order #{{ orderId }}"
- **Design:** Green theme (#4CAF50), RoboHatch branding
- **Variables:**
  - `{{ orderId }}` - Order ID
  - `{{ total }}` - Order total (₹)
  - `{{ orderDate }}` - Order creation date

#### 2. **payment-success.hbs**
- **Subject:** "Payment Successful - Order #{{ orderId }}"
- **Design:** Blue theme (#2196F3), success badge
- **Variables:**
  - `{{ orderId }}` - Order ID
  - `{{ total }}` - Payment amount (₹)
  - `{{ paymentDate }}` - Payment confirmation date

**Features:**
- Responsive HTML design
- Inline CSS (email client compatibility)
- Professional styling with RoboHatch branding
- PAID status badge for payment success

---

## 📄 INVOICE GENERATION

### PDF Generation (PDFKit)

**Service:** `InvoicesService`  
**Method:** `generateInvoice(orderId: string)`

**Process:**
1. Check if invoice already exists (idempotency)
2. Fetch order with ALL snapshots:
   - `Order` (total, subtotal, status)
   - `OrderItems` (productName, materialName, quantity, prices)
   - `OrderAddress` (shipping details)
   - `User` (email, profile)
3. Generate unique invoice number: `INV-YYYYMMDD-XXXXX`
4. Create PDF with:
   - Header (RoboHatch branding)
   - Invoice metadata (number, date, order ID)
   - Customer details (bill-to, ship-to)
   - Line items table (product, material, qty, price)
   - Totals (subtotal, total)
   - Payment status (PAID badge)
5. Save PDF to `invoices/` directory
6. Store metadata in database

**Invoice Number Format:**
```
INV-20250127-00001
    ↑        ↑
    Date     Sequential
```

**File Storage:**
- Directory: `./invoices/` (created automatically)
- Filename: `{invoiceNumber}.pdf`
- Database URL: `/invoices/{invoiceNumber}.pdf`

---

## 🔒 ACCESS CONTROL

### Customer Endpoints (CUSTOMER + ADMIN roles)

#### GET `/api/v1/invoices/order/:orderId`
**Description:** Get invoice metadata by order ID  
**Auth:** JWT + Roles Guard  
**Security:** User can only access their own invoices

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

#### GET `/api/v1/invoices/order/:orderId/download`
**Description:** Download invoice PDF  
**Auth:** JWT + Roles Guard  
**Security:** User can only download their own invoices

**Response:** PDF file stream

---

### Admin Endpoints (ADMIN role only)

#### GET `/api/v1/admin/invoices/order/:orderId`
**Description:** Get invoice metadata (any order)  
**Auth:** JWT + Roles Guard (ADMIN)  
**Security:** No user ownership check

#### GET `/api/v1/admin/invoices/order/:orderId/download`
**Description:** Download invoice PDF (any order)  
**Auth:** JWT + Roles Guard (ADMIN)

---

## 🛡️ ERROR HANDLING

### Email Service

```typescript
// Fire-and-forget pattern
this.emailService
  .sendOrderCreatedEmail(data)
  .catch((error) => {
    this.logger.error(
      `Failed to send order created email for ${data.orderId}: ${error.message}`,
    );
  });
```

**Behavior:**
- Errors are logged to console
- No exceptions thrown to caller
- Order/payment flows are unaffected

---

### Invoice Service

```typescript
try {
  await this.generateInvoice(orderId);
} catch (error) {
  this.logger.error(
    `❌ Failed to generate invoice for order ${orderId}: ${error.message}`,
  );
  // Do not throw - invoice generation must not affect payment processing
}
```

**Behavior:**
- Errors are logged to console
- No exceptions thrown to caller
- Payment webhook processing continues

---

## 🧪 TESTING WORKFLOW

### 1. **Setup Email Configuration**

Add to `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=RoboHatch
EMAIL_FROM_ADDRESS=noreply@robohatch.com
```

> **Note:** For Gmail, use [App Passwords](https://support.google.com/accounts/answer/185833)

---

### 2. **Test Order Creation**

```bash
POST http://localhost:3000/api/v1/orders
Authorization: Bearer <customer-token>
Idempotency-Key: unique-order-key-123

{
  "addressId": "address-uuid"
}
```

**Expected:**
1. Order created successfully
2. Email sent to customer with order confirmation
3. Console log: `Order created notification queued for {orderId}`

---

### 3. **Test Payment Flow**

```bash
# 1. Initiate payment
POST http://localhost:3000/api/v1/payments/initiate
Authorization: Bearer <customer-token>

{
  "orderId": "order-uuid"
}

# 2. Simulate payment (use Razorpay test mode)
# 3. Razorpay sends webhook → payment.captured

# Expected:
# - Payment status: CAPTURED
# - Order status: PAID
# - Invoice PDF generated: ./invoices/INV-YYYYMMDD-XXXXX.pdf
# - Email sent to customer with payment confirmation
```

---

### 4. **Test Invoice Download**

```bash
# Customer endpoint
GET http://localhost:3000/api/v1/invoices/order/:orderId/download
Authorization: Bearer <customer-token>

# Admin endpoint
GET http://localhost:3000/api/v1/admin/invoices/order/:orderId/download
Authorization: Bearer <admin-token>
```

**Expected:** PDF file download

---

## 📊 MIGRATION

**Migration Name:** `20260127053132_add_invoice_model`

**SQL Changes:**
```sql
CREATE TABLE `invoices` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `invoiceNumber` VARCHAR(191) NOT NULL,
  `invoiceUrl` VARCHAR(191) NOT NULL,
  `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  UNIQUE INDEX `invoices_orderId_key`(`orderId`),
  UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
  INDEX `invoices_invoiceNumber_idx`(`invoiceNumber`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `invoices` 
  ADD CONSTRAINT `invoices_orderId_fkey` 
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

**Apply:**
```bash
npx prisma migrate dev --name add_invoice_model
```

---

## 📦 DEPENDENCIES

### New Packages Installed

```json
{
  "dependencies": {
    "nodemailer": "^6.9.8",
    "handlebars": "^4.7.8",
    "pdfkit": "^0.15.0"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14",
    "@types/pdfkit": "^0.13.5"
  }
}
```

**Install:**
```bash
npm install nodemailer handlebars pdfkit
npm install -D @types/nodemailer @types/pdfkit
```

---

## 🔧 CONFIGURATION FILES

### App Module
- **File:** `src/app.module.ts`
- **Changes:** Added `NotificationsModule`, `InvoicesModule`, `emailConfig`

### Payments Module
- **File:** `src/payments/payments.module.ts`
- **Changes:** Imported `InvoicesModule`, `NotificationsModule`

### Orders Module
- **File:** `src/orders/orders.module.ts`
- **Changes:** Imported `NotificationsModule`

---

## 🚀 DEPLOYMENT CHECKLIST

- [x] Prisma schema updated with Invoice model
- [x] Migration generated and applied
- [x] Email configuration added to `.env`
- [x] SMTP credentials configured (Gmail App Password)
- [x] `invoices/` directory exists (auto-created by service)
- [x] Email templates compiled and loaded
- [x] Build succeeds with 0 errors
- [x] Integration points added to orders and payments services
- [x] Access control implemented (customer + admin)

---

## 📝 ADMIN CREDENTIALS

```
Email: admin@robohatch.com
Password: Admin@123456
```

---

## 🎉 SUCCESS CRITERIA

✅ **Order Creation:**
- Order created successfully
- Email sent to customer (order-created template)
- No transaction rollback on email failure

✅ **Payment Webhook:**
- Payment marked as CAPTURED
- Order marked as PAID
- Invoice PDF generated in `./invoices/`
- Email sent to customer (payment-success template)
- No transaction rollback on invoice/email failure

✅ **Invoice Access:**
- Customer can download own invoice
- Customer cannot access other invoices (404)
- Admin can download all invoices

✅ **Idempotency:**
- Same order generates only 1 invoice (even if webhook retries)
- Invoice number is unique across all orders

✅ **Error Handling:**
- Email failures logged, not thrown
- Invoice failures logged, not thrown
- Core flows (order creation, payment) unaffected by notification errors

---

## 🔍 TROUBLESHOOTING

### Email Not Sending

**Check:**
1. `.env` has correct SMTP credentials
2. Gmail App Password is used (not regular password)
3. Console shows: `✅ Email transporter initialized`
4. No error logs in console

**Test SMTP manually:**
```bash
# Install test tool
npm install -g nodemailer-test

# Test connection
nodemailer-test smtp.gmail.com:587 your-email@gmail.com
```

---

### Invoice Not Generated

**Check:**
1. Payment webhook received (check console logs)
2. Order status is `PAID`
3. `./invoices/` directory exists (auto-created)
4. Console shows: `✅ Invoice generated: INV-...`

**Regenerate manually:**
```typescript
// In NestJS console or test
await invoicesService.generateInvoice('order-uuid');
```

---

### Invoice Already Exists Error

**This is expected behavior!**
- Invoices are **idempotent**
- If webhook retries, invoice generation is skipped
- Console log: `Invoice already exists for order {orderId}, skipping generation`

---

## 🎯 NEXT STEPS (Future Enhancements)

### Phase 11 (Potential)
- [ ] SMS notifications (Twilio)
- [ ] Push notifications (Firebase)
- [ ] Invoice email attachment (instead of download link)
- [ ] Invoice history endpoint (list all invoices for a user)
- [ ] Invoice regeneration (admin only, for corrections)
- [ ] Custom invoice templates per customer
- [ ] Multi-currency support in invoices

---

## ✅ PHASE 10 COMPLETE!

**Key Achievements:**
- Fire-and-forget email notifications
- Read-only PDF invoices with snapshots
- Idempotent invoice generation
- Zero impact on core business flows
- Production-ready error handling
- Full access control (customer + admin)

**Build Status:** ✅ **PASSING** (0 errors)  
**Migration Status:** ✅ **APPLIED**  
**Ready for Production:** ✅ **YES**

---

**Need Help?** Check `PROJECT-DESCRIPTION.md` for full system overview.
