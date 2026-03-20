# Prisma Soft Delete PRO - คู่มือการใช้งาน

## 📚 Features

- ✅ **Soft Delete อัตโนมัติ** - ลบโดยไม่ลบถาวร
- ✅ **withDeleted()** - ดึงข้อมูลรวมที่ถูกลบด้วย
- ✅ **onlyDeleted()** - ดึงเฉพาะที่ถูกลบ
- ✅ **restore()** - กลับคืนข้อมูลที่ถูกลบ
- ✅ **forceDelete()** - ลบถาวร

## 🚀 API Endpoints

### CRUD ปกติ (Auto Soft Delete)
```bash
# ดึงทั้งหมด (ไม่รวมที่ถูกลบ)
GET /api/admins

# ดึงตาม ID
GET /api/admins/:id

# สร้างใหม่
POST /api/admins
Body: { "name": "John", "email": "john@example.com", "password": "secret" }

# อัปเดต
PUT /api/admins/:id
Body: { "name": "John Updated" }

# ลบ (Soft Delete)
DELETE /api/admins/:id
```

### Soft Delete PRO Features
```bash
# ดึงทั้งหมดรวมที่ถูกลบ
GET /api/admins/with-deleted/all

# ดึงเฉพาะที่ถูกลบ
GET /api/admins/only-deleted/all

# ดึงข้อมูลที่ถูกลบตาม ID
GET /api/admins/only-deleted/:id

# นับจำนวนที่ถูกลบ
GET /api/admins/deleted/count

# กลับคืนข้อมูล (Restore)
POST /api/admins/:id/restore

# กลับคืนตาม email
POST /api/admins/restore-by-email
Body: { "email": "test@example.com" }

# ลบถาวร (Force Delete)
DELETE /api/admins/:id/force

# ลบข้อมูลเก่าที่ soft delete มา 30+ วัน
DELETE /api/admins/force-delete-old/cleanup
```

## 💻 ตัวอย่างการใช้งานในโค้ด

### ใน Service
```typescript
// Soft delete (ลบปกติ)
await this.prisma.admin.delete({ where: { id: 1 } });

// ดึงรวมที่ถูกลบ
const all = await this.prisma.withDeleted('admin').findMany();

// ดึงเฉพาะที่ถูกลบ
const deleted = await this.prisma.onlyDeleted('admin').findMany();

// กลับคืนข้อมูล
await this.prisma.restore('admin', 1);

// ลบถาวร
await this.prisma.forceDelete('admin', 1);
```

## 🧪 ทดสอบ API

```bash
# 1. สร้าง admin
curl -X POST http://localhost:8001/api/admins \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Admin","email":"test@example.com","password":"password123"}'

# 2. ดึงทั้งหมด
curl http://localhost:8001/api/admins

# 3. Soft delete
curl -X DELETE http://localhost:8001/api/admins/1

# 4. ดูว่ายังมีไหม (ไม่มี เพราะถูก soft delete)
curl http://localhost:8001/api/admins

# 5. ดูรวมที่ถูกลบ (จะเห็น)
curl http://localhost:8001/api/admins/with-deleted/all

# 6. กลับคืนข้อมูล
curl -X POST http://localhost:8001/api/admins/1/restore

# 7. ดูอีกครั้ง (กลับมาแล้ว)
curl http://localhost:8001/api/admins

# 8. ลบถาวร
curl -X DELETE http://localhost:8001/api/admins/1/force
```

## 📋 โครงสร้างฐานข้อมูล

```sql
CREATE TABLE "admins" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "verifyToken" VARCHAR(255),
    "status" SMALLINT NOT NULL DEFAULT 0,
    "remember_token" VARCHAR(100),
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6)  -- Soft delete column
);
```

## ⚙️ การตั้งค่า

Soft delete middleware จะทำงานอัตโนมัติเมื่อ:
- `DELETE` → เซ็ต `deletedAt = NOW()`
- `SELECT` → กรองเฉพาะ `deletedAt IS NULL`

ดูที่ `src/prisma.service.ts` สำหรับ configuration
