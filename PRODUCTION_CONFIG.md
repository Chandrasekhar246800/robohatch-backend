# RoboHatch Production Configuration

**Last Updated:** January 28, 2026

---

## 🌐 Production URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://robohatch.in |
| **Backend API** | (To be deployed) |
| **Email** | founder@robohatch.in (Titan Mail - GoDaddy) |

---

## 📧 Email Configuration (Titan Mail)

RoboHatch uses **Titan Mail** purchased from GoDaddy for all transactional emails.

### SMTP Settings

```env
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=founder@robohatch.in
SMTP_PASSWORD=your_titan_mail_password
SMTP_FROM_EMAIL=founder@robohatch.in
SMTP_FROM_NAME=RoboHatch
```

### Email Features

✅ **Password Reset** - Sends secure reset tokens  
✅ **Order Confirmation** - Sent after order creation  
✅ **Payment Success** - Sent after successful payment  
✅ **Shipment Tracking** - Sent when order is shipped  

### Titan Mail Documentation

- **Provider:** GoDaddy Titan Email
- **Control Panel:** https://manage.titan.email/
- **SMTP Documentation:** https://www.titan.email/help/smtp-settings/

---

## 🔒 CORS Configuration

The backend is configured to accept requests from the production frontend.

### Allowed Origins

```env
ALLOWED_ORIGINS=https://robohatch.in,https://www.robohatch.in
```

### Configuration Location

File: [src/platform/cors.config.ts](src/platform/cors.config.ts)

**Development Mode:**
- Allows all origins (`*`) for local testing
- Credentials enabled
- Permissive headers

**Production Mode:**
- Strict whitelist (robohatch.in)
- Rejects unknown origins
- Secure cookie/auth handling

---

## 🚀 Deployment Checklist

Before deploying to production:

### 1. Environment Variables

Update `.env` with production values:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="mysql://user:pass@host:3306/robohatch_prod"

# JWT Secrets (CHANGE THESE!)
JWT_ACCESS_SECRET=<generate-with-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-32>

# Razorpay (LIVE keys)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<your_live_key_secret>
RAZORPAY_WEBHOOK_SECRET=<your_webhook_secret>

# Email (Titan Mail)
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_USER=founder@robohatch.in
SMTP_PASSWORD=<your_titan_password>
SMTP_FROM_EMAIL=founder@robohatch.in

# AWS S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your_access_key>
AWS_SECRET_ACCESS_KEY=<your_secret_key>
AWS_S3_BUCKET=robohatch-files-prod

# CORS
ALLOWED_ORIGINS=https://robohatch.in,https://www.robohatch.in

# OAuth (Optional)
GOOGLE_CLIENT_ID=<your_google_client_id>
MICROSOFT_CLIENT_ID=<your_microsoft_client_id>
```

### 2. Database Migration

```bash
# Run all pending migrations
npx prisma migrate deploy

# Seed initial data (admin user)
npm run seed
```

### 3. Build Application

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

### 4. Configure Razorpay Webhook

Set webhook URL in Razorpay Dashboard:
```
https://api.robohatch.in/api/v1/webhooks/razorpay
```

Events to enable:
- `payment.captured`
- `payment.failed`
- `refund.processed`

### 5. SSL/TLS Certificate

Ensure HTTPS is enabled:
- Use Let's Encrypt (free) or AWS Certificate Manager
- Configure reverse proxy (nginx/Apache)
- Force HTTPS redirect

### 6. Monitoring & Logging

- Set up application monitoring (PM2, AWS CloudWatch)
- Configure error tracking (Sentry)
- Enable audit logs
- Set up database backups

---

## 🔐 Security Hardening

### Before Production Launch:

✅ Change all default secrets (JWT, database password)  
✅ Use Razorpay LIVE keys (not test keys)  
✅ Enable HTTPS/SSL certificate  
✅ Configure firewall (allow only 80/443)  
✅ Set `NODE_ENV=production`  
✅ Disable database public access  
✅ Enable rate limiting (already configured)  
✅ Review CORS allowed origins  
✅ Set up backup strategy  
✅ Configure monitoring alerts  

---

## 📊 Health Checks

### Endpoints

| Endpoint | Purpose | Access |
|----------|---------|--------|
| `GET /api/v1/health` | Legacy health check | Public |
| `GET /api/v1/health/live` | Kubernetes liveness probe | Public |
| `GET /api/v1/health/ready` | Kubernetes readiness probe (checks DB, Razorpay, SMTP, S3) | Public |

### Example Response (Ready)

```json
{
  "status": "ready",
  "checks": {
    "database": { "healthy": true },
    "razorpay": { "healthy": true },
    "smtp": { "healthy": true },
    "s3": { "healthy": true }
  },
  "timestamp": "2026-01-28T12:00:00.000Z",
  "environment": "production"
}
```

---

## 🌍 AWS S3 File Storage

### Bucket Configuration

- **Region:** ap-south-1 (Mumbai)
- **Bucket Name:** robohatch-files-prod
- **Access:** Private (signed URLs only)

### File Types Stored

- 3D model files (STL, OBJ)
- Product images
- Invoice PDFs
- User-uploaded content

### Security

- ✅ All files private by default
- ✅ Signed URLs with 5-minute expiry
- ✅ GET-only permissions
- ✅ Audit logging enabled

---

## 📱 Frontend Integration

The frontend at **https://robohatch.in** should:

### API Base URL

```javascript
const API_BASE_URL = 'https://api.robohatch.in/api/v1';
```

### Required Headers

```javascript
// Authenticated requests
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}

// Order creation (idempotency)
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Idempotency-Key': `order-${userId}-${timestamp}`,
  'Content-Type': 'application/json'
}
```

### CORS Credentials

```javascript
// Enable credentials for cookies/auth
fetch(API_URL, {
  credentials: 'include',
  // ... other options
});
```

---

## 🔄 CI/CD Pipeline Suggestion

### GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      - run: npx prisma generate
      
      # Deploy to your server (AWS/DigitalOcean/etc.)
      - run: npm run deploy
```

---

## 📞 Support & Contacts

| Role | Email |
|------|-------|
| **Founder** | founder@robohatch.in |
| **Technical** | founder@robohatch.in |
| **Support** | founder@robohatch.in |

---

## 🎯 Next Steps

1. ✅ Frontend hosted at robohatch.in
2. ✅ Email configured (Titan Mail - GoDaddy)
3. ✅ CORS configured for production frontend
4. ⏳ Deploy backend to production server
5. ⏳ Configure Razorpay webhook URL
6. ⏳ Set up AWS S3 bucket
7. ⏳ Run database migrations
8. ⏳ Update DNS records (if needed)
9. ⏳ Configure SSL certificate
10. ⏳ Test end-to-end flow

---

**Status:** Ready for production deployment 🚀

**Security Score:** 9.8/10 (from SECURITY_AUDIT_FINAL.md)

**API Inventory:** See [API_INVENTORY.md](API_INVENTORY.md)
