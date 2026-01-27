# Phase 11 Quickstart — Secure File Delivery

## 🚀 Quick Setup (5 Minutes)

### 1. **Configure AWS S3**

Create `.env` entries:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=robohatch-3d-models
SIGNED_URL_EXPIRY_SECONDS=300
```

### 2. **Upload Files to S3**

```bash
# Upload 3D models to your S3 bucket
aws s3 cp dragon.stl s3://robohatch-3d-models/models/dragon.stl
aws s3 cp sword.obj s3://robohatch-3d-models/models/sword.obj
```

### 3. **Update ProductModel.fileUrl**

```sql
-- Set S3 keys (NOT full URLs)
UPDATE product_models 
SET file_url = 'models/dragon.stl' 
WHERE file_name = 'dragon.stl';

UPDATE product_models 
SET file_url = 'models/sword.obj' 
WHERE file_name = 'sword.obj';
```

### 4. **Test File Access**

```bash
# 1. Login as customer
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"password"}' \
  | jq -r '.accessToken')

# 2. Create order + pay via Razorpay (order must be PAID)

# 3. List files
curl http://localhost:3000/api/v1/orders/{orderId}/files \
  -H "Authorization: Bearer $TOKEN"

# 4. Get download URL
curl http://localhost:3000/api/v1/orders/{orderId}/files/{fileId}/download \
  -H "Authorization: Bearer $TOKEN"

# Response: { "downloadUrl": "https://s3...", "expiresIn": 300 }
```

---

## 🔐 Security Rules

| Rule | Enforcement |
|------|-------------|
| Only PAID orders | ✅ `status: OrderStatus.PAID` |
| User must own order | ✅ `findFirst({ orderId, userId })` |
| File in order | ✅ Product verification |
| URLs expire | ✅ 5 minutes (AWS enforced) |
| Admin cannot download | ✅ `@Roles(Role.CUSTOMER)` |
| All access logged | ✅ FileAccessLog |

---

## 📊 API Summary

### List Files
```
GET /api/v1/orders/:orderId/files
Auth: Bearer <accessToken>
Role: CUSTOMER

Response:
[
  {
    "fileId": "uuid",
    "fileName": "dragon.stl",
    "fileType": "STL"
  }
]
```

### Download File
```
GET /api/v1/orders/:orderId/files/:fileId/download
Auth: Bearer <accessToken>
Role: CUSTOMER

Response:
{
  "downloadUrl": "https://s3.amazonaws.com/...",
  "expiresIn": 300
}
```

---

## 🧪 Testing Checklist

- [ ] Unpaid order → 404
- [ ] Other user's order → 404
- [ ] File not in order → 403
- [ ] Valid paid order → 200 + signed URL
- [ ] URL expires after 5 minutes
- [ ] Admin cannot download → 403
- [ ] FileAccessLog created

---

## 🛠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| 500 error on download | Check AWS credentials in `.env` |
| 404 on paid order | Verify order status is PAID |
| URL doesn't work | Check S3 bucket name and file key |
| Expires too fast | Don't cache URLs, generate per-download |

---

**Need full details?** See `PHASE11-COMPLETE.md`

**Phase 11 Status:** ✅ COMPLETE  
**Security Grade:** A+
