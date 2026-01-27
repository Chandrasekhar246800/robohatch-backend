# Phase 13 — Quick Reference Guide

## 🚀 QUICK START

### Test Phase 13 Features

```bash
# 1. Start server
npm run start:dev

# 2. Test health checks
curl http://localhost:3000/api/v1/health/live
curl http://localhost:3000/api/v1/health/ready

# 3. Test rate limiting (should get 429 on 6th request)
for i in {1..6}; do curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'; echo "\n"; done

# 4. Check audit logs in database
npx prisma studio  # View audit_logs table
```

---

## 📊 AUDIT LOG ACTIONS

| Action | Trigger | Entity |
|--------|---------|--------|
| `LOGIN_SUCCESS` | User logs in successfully | User |
| `LOGIN_FAILURE` | Login fails (wrong password) | User |
| `LOGOUT` | User logs out | User |
| `REFRESH_TOKEN` | Token refreshed | User |
| `PAYMENT_INITIATED` | Payment started | Payment |
| `PAYMENT_CAPTURED` | Payment successful (webhook) | Payment |
| `PAYMENT_FAILED` | Payment failed | Payment |
| `WEBHOOK_SUCCESS` | Webhook processed | Webhook |
| `WEBHOOK_FAILURE` | Webhook failed | Webhook |
| `WEBHOOK_SIGNATURE_INVALID` | Bad webhook signature | Webhook |
| `SHIPMENT_CREATED` | Admin creates shipment | Shipment |
| `SHIPMENT_STATUS_CHANGED` | Shipment status updated | Shipment |
| `FILE_DOWNLOAD` | Customer downloads file | File |

---

## 🔒 RATE LIMITS

| Endpoint Pattern | Limit | TTL |
|------------------|-------|-----|
| `POST /auth/register` | 5 req/min | 60s |
| `POST /auth/login` | 5 req/min | 60s |
| `POST /auth/refresh` | 5 req/min | 60s |
| `POST /payments/initiate/:id` | 3 req/min | 60s |
| All other endpoints | 100 req/min | 60s |

**Response on rate limit:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## 🏥 HEALTH CHECK RESPONSES

### Live (Always 200)
```json
{
  "status": "ok",
  "timestamp": "2026-01-27T10:00:00.000Z"
}
```

### Ready (200 when healthy)
```json
{
  "status": "ready",
  "checks": {
    "database": { "healthy": true },
    "razorpay": { "healthy": true },
    "smtp": { "healthy": true },
    "s3": { "healthy": true }
  },
  "timestamp": "2026-01-27T10:00:00.000Z",
  "environment": "development"
}
```

### Ready (503 when degraded)
```json
{
  "statusCode": 503,
  "message": {
    "status": "degraded",
    "checks": {
      "database": { "healthy": false, "message": "Connection failed" }
    }
  }
}
```

---

## 🛡️ SECURITY HEADERS (Helmet)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Request-Id: <uuid>
```

---

## 🌐 CORS CONFIGURATION

### Development (.env)
```bash
NODE_ENV=development
# No ALLOWED_ORIGINS needed - accepts all origins
```

### Production (.env)
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://robohatch.com,https://admin.robohatch.com
```

**Error when origin not allowed:**
```json
{
  "statusCode": 403,
  "message": "Origin https://evil.com not allowed by CORS"
}
```

---

## 🔍 AUDIT LOG QUERIES (Prisma Studio)

### View all login failures
```sql
SELECT * FROM audit_logs
WHERE action = 'LOGIN_FAILURE'
ORDER BY createdAt DESC
LIMIT 100;
```

### View all actions by user
```sql
SELECT * FROM audit_logs
WHERE actorId = 'user-uuid'
ORDER BY createdAt DESC;
```

### View all payment events
```sql
SELECT * FROM audit_logs
WHERE entity = 'Payment'
ORDER BY createdAt DESC;
```

### View failed logins from specific IP (last hour)
```sql
SELECT * FROM audit_logs
WHERE action = 'LOGIN_FAILURE'
  AND ip = '203.0.113.45'
  AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY createdAt DESC;
```

---

## 📦 NEW DEPENDENCIES

```bash
npm install @nestjs/throttler helmet pino pino-http pino-pretty nestjs-pino --save
```

---

## 🧪 TESTING COMMANDS

### Test Rate Limiting (Auth)
```bash
# Should succeed 5 times, fail on 6th
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
done
```

### Test Rate Limiting (Payment)
```bash
# Should succeed 3 times, fail on 4th
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/v1/payments/initiate/order-id \
    -H "Authorization: Bearer $TOKEN" \
    -w "\nStatus: %{http_code}\n\n"
done
```

### Test Health Checks
```bash
# Liveness (always 200)
curl http://localhost:3000/api/v1/health/live

# Readiness (200 or 503)
curl http://localhost:3000/api/v1/health/ready
```

### Test CORS
```bash
# Should fail if origin not in ALLOWED_ORIGINS (production)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

---

## 🔧 TROUBLESHOOTING

### Issue: Rate limit too strict

**Solution:** Adjust in `src/platform/rate-limit.config.ts`
```typescript
{
  name: 'auth',
  ttl: 60000,
  limit: 10, // Increase from 5 to 10
}
```

### Issue: Health check fails in development

**Solution:** Ensure all dependencies configured in `.env`
```bash
DATABASE_URL=mysql://...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
SMTP_HOST=smtp.gmail.com
AWS_S3_BUCKET=robohatch-files
```

### Issue: CORS blocking requests

**Solution:** Add domain to `ALLOWED_ORIGINS`
```bash
ALLOWED_ORIGINS=https://robohatch.com,https://new-domain.com
```

### Issue: Audit logs not appearing

**Solution:** Check if Prisma client regenerated
```bash
npx prisma generate
npm run build
```

---

## 📊 MONITORING QUERIES

### Count login failures by IP (last 24 hours)
```sql
SELECT ip, COUNT(*) as failures
FROM audit_logs
WHERE action = 'LOGIN_FAILURE'
  AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY ip
ORDER BY failures DESC
LIMIT 10;
```

### Count payment events by user
```sql
SELECT actorId, action, COUNT(*) as count
FROM audit_logs
WHERE entity = 'Payment'
GROUP BY actorId, action
ORDER BY count DESC;
```

### Recent admin actions
```sql
SELECT actorId, action, entity, entityId, createdAt
FROM audit_logs
WHERE role = 'ADMIN'
ORDER BY createdAt DESC
LIMIT 50;
```

---

## 🚨 ALERT THRESHOLDS (Recommended)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Failed logins from same IP | >10 in 5 min | Block IP, alert security |
| Rate limit 429s | >100/hour | Investigate abuse |
| Health check failures | >5 consecutive | Alert ops team |
| Payment failures | >5% of attempts | Alert finance team |
| Webhook signature failures | >1/day | Verify Razorpay config |

---

## 🎯 PRODUCTION DEPLOYMENT CHECKLIST

- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` (comma-separated)
- [ ] Verify rate limits are appropriate
- [ ] Enable audit log retention policy (delete old logs)
- [ ] Configure monitoring alerts (429, health failures)
- [ ] Test health probes with Kubernetes/Docker
- [ ] Verify Helmet headers in production
- [ ] Document audit log retention policy
- [ ] Set up log aggregation (optional: Datadog, Splunk)

---

**Phase 13 Status:** ✅ COMPLETE  
**Build:** ✅ 0 Errors  
**Infrastructure:** ✅ Production-Ready
