---
title: "Missing E-commerce APIs + Cloudinary + SEO"
description: "Add 16 missing APIs, Cloudinary image upload, SEO foundation to Web Ban Sach backend"
status: completed
priority: P1
effort: 40h
branch: master
tags: [backend, api, feature, database]
created: 2026-03-05
---

# Plan: Missing E-commerce APIs + Cloudinary + SEO

## Tong Quan

Project Web Ban Sach thieu nhieu API quan trong cho e-commerce chuan. Plan nay them 16+ API endpoints moi, 2 entity moi (DiaChiGiaoHang, Coupon), tich hop Cloudinary cho upload anh, va SEO foundation (sitemap, meta tags, slug).

## Tech Stack Hien Tai

- Spring Boot 3.3.4, Java 17, MySQL 8.0
- JPA/Hibernate, Spring Security + JWT, Lombok
- Package: `com.example.book_be`
- 14 entities, ~10 controllers, ~18 services

## Dependency Matrix

```
Phase 01 (Foundation) ─ SEQUENTIAL, blocks all
    |
    ├── Phase 02 (Auth & Profile)     ─┐
    ├── Phase 03 (Product & Catalog)  ─┤
    ├── Phase 04 (Cloudinary Upload)  ─┤ PARALLEL
    ├── Phase 05 (Commerce: Coupon+Addr) ─┤
    ├── Phase 06 (SEO)                ─┤
    └── Phase 07 (Admin Stats)        ─┘
                    |
              Phase 08 (Security Config) ─ SEQUENTIAL, last
```

## Phase Summary

| Phase | File | Status | Effort | Description |
|-------|------|--------|--------|-------------|
| 01 | [phase-01](phase-01-foundation-entities-cloudinary.md) | completed | 4h | Foundation: entities, Cloudinary config, pom.xml |
| 02 | [phase-02](phase-02-auth-user-profile-apis.md) | completed | 6h | Auth: profile, password reset/change |
| 03 | [phase-03](phase-03-product-catalog-apis.md) | completed | 8h | Products: category, wishlist, best sellers, related |
| 04 | [phase-04](phase-04-cloudinary-image-upload.md) | completed | 4h | Cloudinary: multipart upload for book images |
| 05 | [phase-05](phase-05-commerce-coupon-address-apis.md) | completed | 6h | Commerce: shipping address CRUD, coupon validation |
| 06 | [phase-06](phase-06-seo-sitemap-meta.md) | completed | 4h | SEO: sitemap.xml, meta tags, slug lookup |
| 07 | [phase-07](phase-07-admin-stats.md) | completed | 3h | Admin: dashboard statistics endpoint |
| 08 | [phase-08](phase-08-security-config-update.md) | completed | 3h | Security: register all new endpoints |

**Total estimated effort: ~38h**

## New Endpoints Summary (16+ APIs)

### Public (no auth)
- `GET /api/the-loai` - Danh sach the loai
- `GET /api/sach/ban-chay` - Sach ban chay
- `GET /api/sach/moi-nhat` - Sach moi nhat
- `GET /api/sach/{id}/lien-quan` - Sach lien quan
- `GET /api/sach/slug/{slug}` - Tim sach theo slug
- `POST /tai-khoan/quen-mat-khau` - Gui email reset password
- `POST /tai-khoan/dat-lai-mat-khau` - Reset password bang token
- `GET /sitemap.xml` - Sitemap XML
- `GET /api/seo/sach/{id}` - Meta tags JSON

### Authenticated
- `GET /api/nguoi-dung/ho-so` - Xem profile
- `PUT /api/nguoi-dung/cap-nhat-ho-so` - Cap nhat profile
- `PUT /tai-khoan/doi-mat-khau` - Doi mat khau
- `GET /api/don-hang/{id}` - Chi tiet don hang
- `GET/POST/DELETE /api/yeu-thich` - Wishlist
- `GET/POST/PUT/DELETE /api/dia-chi` - Dia chi giao hang
- `POST /api/coupon/kiem-tra` - Kiem tra ma giam gia

### Admin
- `POST /api/admin/sach/{id}/hinh-anh` - Upload anh Cloudinary
- `GET/POST/PUT/DELETE /api/admin/coupon` - CRUD coupon
- `GET /api/admin/thong-ke` - Dashboard stats

## New Entities

1. **DiaChiGiaoHang** - Dia chi giao hang cua user (id, nguoiDung FK, hoTen, soDienThoai, diaChiDayDu, macDinh)
2. **Coupon** - Ma giam gia (id, ma, loai enum, giaTriGiam, giaTriToiThieu, hanSuDung, soLuongToiDa, daSuDung, isActive)

## New Dependencies (pom.xml)

- `com.cloudinary:cloudinary-http44:1.36.0`

## Key Decisions

- Cloudinary cho image upload (free 25GB, CDN built-in)
- Anh cu base64 van work (backward compat), anh moi upload qua Cloudinary
- Slug generated tu tenSach bang utility method
- SEO Phase 1: React Helmet + API meta tags (chua can Next.js)
- Password reset token = UUID, 10 min expiry

## Parallel Execution Strategy

Phases 02-07 co the chay song song vi file ownership khong overlap:
- Phase 02: TaiKhoanController, TaiKhoanService, NguoiDungController (new)
- Phase 03: SachUserController, TheLoaiController (new), DonHangController
- Phase 04: admin/SachController, CloudinaryService (new)
- Phase 05: DiaChiController (new), CouponController (new)
- Phase 06: SeoController (new), SitemapController (new)
- Phase 07: ThongKeController (new)

Phase 08 (SecurityConfiguration) phai chay cuoi cung sau khi tat ca endpoints da duoc define.
