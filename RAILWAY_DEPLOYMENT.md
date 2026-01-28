# Railway Deployment Guide for RoboHatch Backend

## 🚂 Railway Setup

Your backend is deployed on Railway at: **[Your Railway URL]**

### Current Issues

The app is **crash-looping** because it's missing critical environment variables. Follow these steps to fix it:

---

## 📋 Step-by-Step Fix

### 1. Add MySQL Database

1. Go to Railway Dashboard
2. Click **"New"** → **"Database"** → **"Add MySQL"**
3. Wait for database to provision
4. Railway will automatically create `DATABASE_URL` variable

### 2. Set Environment Variables

Go to your backend service → **Variables** tab and add:

#### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (automatically created by Railway MySQL)
# DATABASE_URL=mysql://user:password@host:port/database

# JWT Secrets (GENERATE NEW ONES!)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email (Titan Mail from GoDaddy)
EMAIL_HOST=smtp.titan.email
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=founder@robohatch.in
EMAIL_PASSWORD=your_titan_mail_password
EMAIL_FROM_NAME=RoboHatch
EMAIL_FROM_ADDRESS=founder@robohatch.in

# CORS (Your frontend)
ALLOWED_ORIGINS=https://robohatch.in,https://www.robohatch.in

# Admin Credentials (for seeding)
ADMIN_EMAIL=admin@robohatch.com
ADMIN_PASSWORD=Admin@123456
```

#### Optional Variables (Can add later)

```bash
# Razorpay (Payment Gateway)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# AWS S3 (File Storage)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# OAuth (Optional)
GOOGLE_CLIENT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_TENANT_ID=common
```

### 3. Generate JWT Secrets

Run locally to generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run twice to get two different secrets for ACCESS and REFRESH tokens.

### 4. Verify Build Settings

In Railway → Service Settings:

- **Build Command:** (leave empty, uses railway.json)
- **Start Command:** (leave empty, uses railway.json)
- **Root Directory:** `/`

Railway will automatically use the `railway.json` configuration.

### 5. Redeploy

After setting all environment variables:

1. Click **"Deploy"** button in Railway
2. OR push a new commit to trigger automatic deployment

---

## ✅ Verify Deployment

Once deployed successfully, test these endpoints:

### Health Check

```bash
curl https://your-railway-url.railway.app/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2026-01-28T..."
}
```

### Readiness Check

```bash
curl https://your-railway-url.railway.app/api/v1/health/ready
```

Expected response (degraded is OK without Razorpay/S3):
```json
{
  "status": "degraded",
  "checks": {
    "database": { "healthy": true },
    "razorpay": { "healthy": false, "message": "Razorpay credentials not configured" },
    "smtp": { "healthy": true },
    "s3": { "healthy": false, "message": "AWS S3 not configured" }
  }
}
```

### Login Test

```bash
curl -X POST https://your-railway-url.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@robohatch.com","password":"Admin@123456"}'
```

---

## 🔧 Database Migrations

Migrations run automatically on startup via:
```bash
npm run start:prod
# which runs: npx prisma migrate deploy && node dist/main
```

To manually run migrations (if needed):

```bash
# Using Railway CLI
railway run npx prisma migrate deploy

# Or SSH into container
railway shell
npx prisma migrate deploy
```

---

## 📊 Monitoring

### View Logs

Railway Dashboard → Your Service → **Deployments** tab → Click deployment → View logs

### Check App Status

Look for these success messages in logs:
```
[Nest] XX - LOG [NestFactory] Starting Nest application...
[Nest] XX - LOG [InstanceLoader] AppModule dependencies initialized
[Nest] XX - LOG [RoutesResolver] AuthController {/api/v1/auth}
[Nest] XX - LOG [RouterExplorer] Mapped {/api/v1/auth/register, POST} route
🚀 Application is running on: http://localhost:3000/api/v1
📊 Environment: production
```

### Common Errors

**"DATABASE_URL is not defined"**
- Solution: Add MySQL database in Railway

**"Nest can't resolve dependencies"**
- Solution: Check all imports and module configurations

**"Port already in use"**
- Solution: Railway automatically sets PORT variable, don't hardcode it

---

## 🌐 Connect Frontend

Update your frontend at **robohatch.in** to use:

```javascript
const API_BASE_URL = 'https://your-railway-url.railway.app/api/v1';
```

Or use custom domain (see below).

---

## 🎯 Add Custom Domain

1. Railway Dashboard → Service → **Settings** → **Domains**
2. Click **"Generate Domain"** for free Railway domain
3. Or click **"Custom Domain"** to add `api.robohatch.in`

### DNS Configuration for Custom Domain

Add these DNS records in GoDaddy:

```
Type: CNAME
Name: api
Value: your-railway-url.railway.app
TTL: 600
```

Then in Railway:
1. Add custom domain: `api.robohatch.in`
2. Wait for SSL certificate (automatic)

---

## 🔐 Production Checklist

Before going live:

- [ ] MySQL database added and connected
- [ ] All required environment variables set
- [ ] JWT secrets changed from defaults
- [ ] Email (Titan Mail) configured and tested
- [ ] CORS origins set to production frontend
- [ ] Health checks returning 200 OK
- [ ] Database migrations completed
- [ ] Razorpay credentials added (when ready)
- [ ] AWS S3 configured (when ready)
- [ ] Custom domain configured (optional)
- [ ] Test login/register endpoints
- [ ] Monitor logs for errors

---

## 🆘 Troubleshooting

### App keeps restarting

1. Check Railway logs for actual error
2. Verify DATABASE_URL is set
3. Ensure all required env vars are present
4. Check build completed successfully

### Database connection failed

1. Verify MySQL service is running
2. Check DATABASE_URL format: `mysql://user:pass@host:port/dbname`
3. Test connection from Railway shell

### Email not sending

1. Verify Titan Mail credentials
2. Check SMTP settings (port 587, TLS)
3. Test with `railway run node -e "..."` to send test email

---

## 📞 Support

If issues persist, check:
- Railway Dashboard logs
- Railway Status: https://railway.statuspage.io/
- NestJS Documentation: https://docs.nestjs.com/

**Current Status:** Waiting for environment variables to be configured ⏳
