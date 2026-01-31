# Railway Environment Variables Setup

## Critical Variables (Required Immediately)

Add these in Railway Dashboard → Your Project → Variables tab:

```bash
# Database (AWS RDS MySQL)
DATABASE_URL=mysql://admin:Admin246800864200@robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com:3306/robohatch_db

# Node Environment
NODE_ENV=production

# JWT Secrets (GENERATE NEW ONES FOR PRODUCTION!)
JWT_ACCESS_SECRET=6a1513058ac79364d14a0df9ad889a9bcbb2539ea4c8464b38f5dcb4b3fe4372
JWT_REFRESH_SECRET=6078285c4411e31d4fb5a35f892cf18cdd2057b52e9b744270f54471be296111
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Admin Credentials (for database seeding)
ADMIN_EMAIL=admin@robohatch.com
ADMIN_PASSWORD=Admin@2468642

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=sivaramakrishnarankireddy@gmail.com
EMAIL_PASSWORD=avktuxjurxdpwzah
EMAIL_FROM_NAME=RoboHatch
EMAIL_FROM_ADDRESS=noreply@robohatch.com

# Port (Railway auto-assigns, but setting default)
PORT=3000
```

## Optional Variables (Can be added later)

These are optional due to our recent fixes, but needed for full functionality:

### Razorpay Payment Gateway (Phase 7)
```bash
RAZORPAY_KEY_ID=your_actual_razorpay_key_id
RAZORPAY_KEY_SECRET=your_actual_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

**How to get:** 
1. Sign up at https://razorpay.com/
2. Go to Settings → API Keys
3. Generate Test/Live keys

### AWS S3 File Storage
```bash
AWS_REGION=ap-south-1
AWS_S3_BUCKET=robohatch-production-files
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

**How to get:**
1. Create S3 bucket: https://s3.console.aws.amazon.com/s3/
2. Create IAM user: https://console.aws.amazon.com/iam/
3. Attach policy: AmazonS3FullAccess
4. Generate access keys

## Security Recommendations

### 1. Generate New JWT Secrets for Production
```bash
# Run locally to generate new secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Enable 2FA on Critical Services
- AWS Console
- Razorpay Dashboard
- Railway Dashboard
- GitHub Repository

### 3. Restrict AWS RDS Security Group
Currently open to 0.0.0.0/0 (all IPs). After Railway deployment:
1. Get Railway's static IP from dashboard
2. Update AWS RDS security group to only allow Railway IP

### 4. Use Railway's Secret Management
- Never commit secrets to git (already handled with .gitignore)
- Use Railway's built-in secret redaction in logs
- Rotate secrets every 90 days

## Deployment Checklist

- [ ] Add all critical environment variables to Railway
- [ ] Verify DATABASE_URL connects to AWS RDS
- [ ] Check Railway logs for successful startup
- [ ] Test health endpoint: `https://your-app.railway.app/api/v1/health`
- [ ] Verify Prisma schema sync in logs
- [ ] Test authentication endpoints (register/login)
- [ ] Add Razorpay credentials when ready to test payments
- [ ] Add AWS credentials when ready to test file uploads
- [ ] Update frontend API_BASE_URL to Railway deployment URL
- [ ] Configure CORS if frontend deployed separately

## Common Issues & Solutions

### Issue: "P3005: The database schema is not in sync"
**Solution:** Already handled with `railway.json` using `prisma db push --accept-data-loss`

### Issue: "Foreign key constraint error"
**Solution:** Already handled with `relationMode = "prisma"` in schema.prisma

### Issue: "RAZORPAY_KEY_ID is required"
**Solution:** Already fixed - credentials are optional now

### Issue: Database connection timeout
**Solution:** Verify AWS RDS security group allows Railway IP (0.0.0.0/0:3306)

### Issue: TypeScript compilation errors
**Solution:** Already fixed - all 147+ errors resolved in recent commits

## Railway Dashboard Quick Links

1. **Environment Variables:** Project → Variables
2. **Deployment Logs:** Project → Deployments → Latest → Logs
3. **Metrics:** Project → Metrics
4. **Settings:** Project → Settings

## Testing After Deployment

```bash
# Health check
curl https://your-app.railway.app/api/v1/health

# Register user
curl -X POST https://your-app.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@1234","name":"Test User"}'

# Login
curl -X POST https://your-app.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@1234"}'
```

## Next Steps After Deployment

1. **Verify Core Functionality**
   - Authentication works
   - Database queries succeed
   - CORS allows frontend requests

2. **Add Payment Integration** (when ready)
   - Get Razorpay credentials
   - Add to Railway environment variables
   - Test payment flow

3. **Add File Upload** (when ready)
   - Create S3 bucket
   - Configure IAM user
   - Add AWS credentials
   - Test file upload

4. **Monitor & Scale**
   - Watch Railway metrics
   - Set up error tracking (Sentry)
   - Configure auto-scaling if needed

## Current Deployment Status

✅ All TypeScript errors fixed (147+ errors resolved)  
✅ Prisma schema complete with relations  
✅ relationMode = "prisma" configured  
✅ Environment variables made optional  
✅ Railway auto-deploys from GitHub main branch  
✅ nixpacks.toml forces Node.js 20  
✅ railway.json uses prisma db push  

🔄 **Action Required:** Add environment variables to Railway dashboard  
⏳ **Pending:** Test deployed app at Railway URL  
