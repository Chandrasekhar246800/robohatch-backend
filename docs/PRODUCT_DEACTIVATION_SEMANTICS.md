# Product Deactivation Semantics (Phase 4 → Phase 5 Contract)

## Overview
This document defines what happens when a product or material is deactivated (`isActive = false`).

---

## 1. Product Deactivation

### Trigger
Admin executes: `DELETE /admin/products/:id`

### Immediate Effects
- Product's `isActive` flag set to `false` (soft delete)
- Product is **NOT** hard-deleted from database
- Related materials and models remain in database (cascade not triggered)

### Public API Impact
- `GET /products` - Product is **excluded** from results
- `GET /products/:id` - Returns `404 Not Found`
- Product details are hidden from all public views

### Admin API Impact
- Admin can still view product via `includeInactive = true`
- Admin can **reactivate** product by: `PATCH /admin/products/:id { isActive: true }`
- Admin can update inactive products

---

## 2. Material Deactivation

### Trigger
Admin executes: `DELETE /admin/products/materials/:materialId`

### Immediate Effects
- Material's `isActive` flag set to `false` (soft delete)
- Material remains in database

### Public API Impact
- Inactive materials are **excluded** from product listings
- `GET /products/:id` returns only `materials: [{ isActive: true }]`

### Admin API Impact
- Admin can reactivate material: `PATCH /admin/products/materials/:id { isActive: true }`

---

## 3. Phase 5 Cart Impact (CRITICAL)

### When Product is Deactivated

**RULE:** Existing cart items referencing inactive products are **INVALID**

**Implementation Required in Phase 5:**

```typescript
// At cart display
const cartItems = await prisma.cartItem.findMany({
  include: {
    product: true,
    material: true,
  }
});

// Filter out invalid items
const validItems = cartItems.filter(item => 
  item.product.isActive && item.material.isActive
);

// Notify user of removed items
const removedItems = cartItems.filter(item =>
  !item.product.isActive || !item.material.isActive
);
```

**Checkout Behavior:**
- ❌ Cannot proceed if cart contains inactive products
- ✅ Frontend should show warning: "Some items are no longer available"
- ✅ Auto-remove invalid items OR require manual removal

---

### When Material is Deactivated

**RULE:** Cart items referencing inactive materials are **INVALID**

**Implementation Required in Phase 5:**

```typescript
// Before checkout
const cartItem = await prisma.cartItem.findUnique({
  where: { id },
  include: { material: true }
});

if (!cartItem.material.isActive) {
  throw new BadRequestException('Selected material is no longer available');
}
```

**User Experience:**
1. Material becomes inactive
2. Cart shows warning: "Material no longer available for [Product Name]"
3. User must select different material or remove item

---

## 4. Order Impact (Phase 6+)

### Existing Orders

**RULE:** Past orders are **UNAFFECTED** by product deactivation

**Rationale:**
- Orders are historical records
- User already paid for specific product/material
- Deactivation applies to future purchases only

**Implementation:**
- Order model stores product name, material name, and price at time of purchase
- Orders do NOT reference Product/Material via foreign key (or use soft foreign key)

### Example Order Schema (Future)
```prisma
model Order {
  id            String   @id
  // Snapshot of product details at purchase time
  productName   String
  productPrice  Float
  materialName  String
  materialPrice Float
  // DO NOT use: productId, materialId (avoids cascade issues)
}
```

---

## 5. Reactivation Rules

### Product Reactivation
Admin can set `isActive = true` to restore product:
- Product reappears in public catalog
- Materials remain in previous state (inactive materials stay inactive)
- No automatic material reactivation

### Material Reactivation
Admin can set `isActive = true` to restore material:
- Material reappears in product options
- Only available if parent product is also active

---

## 6. Phase 5 Validation Checklist

Before checkout, validate:
- ✅ `product.isActive === true`
- ✅ `material.isActive === true`
- ✅ `material.productId === product.id` (material belongs to product)
- ✅ Price recalculated fresh (not cached from cart creation)

---

## 7. Database Constraints

### Why Soft Delete?
- **Audit trail:** Track what products existed
- **Data integrity:** Preserve references in analytics/reports
- **Reactivation:** Allow products to be brought back
- **Order history:** Past orders can still reference products

### Hard Delete (NOT USED)
- Would orphan order records
- Would break historical reports
- Cannot be undone

---

## Summary

| Entity | Deactivation Method | Cart Impact | Order Impact |
|--------|---------------------|-------------|--------------|
| Product | `isActive = false` | ❌ Invalid, must be removed | ✅ Unaffected |
| Material | `isActive = false` | ❌ Invalid, must be removed | ✅ Unaffected |
| ProductModel | Hard delete | N/A (not in cart) | N/A |

**Phase 5 Responsibility:** Implement cart validation to reject inactive products/materials at checkout.
