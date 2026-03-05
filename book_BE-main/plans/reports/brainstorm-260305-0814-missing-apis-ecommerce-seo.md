# Brainstorm: Missing APIs & SEO Strategy

**Date:** 2026-03-05 | **Project:** Web Bán Sách (book_BE-main)

## Problem Statement

Project thiếu nhiều API quan trọng cho một e-commerce chuẩn. User muốn:
- Thêm API còn thiếu (user profile, product discovery, coupon, địa chỉ)
- SEO tốt cho website bán sách
- Giải quyết vấn đề ảnh base64 trong DB

## Constraints

- Timeline: MVP 1-2 tuần
- Stack: Spring Boot 3.3.4 + MySQL + React SPA
- SEO approach: React Helmet (hiện tại) → Next.js (tương lai)
- Image: Cloudinary (đề xuất) thay base64

## Evaluated Approaches

### SEO: React Helmet → Next.js Migration Path
- Phase 1: React Helmet + `/api/seo/sach/{id}` meta endpoint + Sitemap XML
- Phase 2: Migrate frontend sang Next.js (backend API giữ nguyên)
- **Verdict:** Hợp lý cho MVP, backend API tương thích cả 2 approach

### Image Storage: Cloudinary vs AWS S3 vs MinIO
- **Cloudinary:** Free 25GB, auto optimize WebP, CDN built-in, Java SDK đơn giản → **Chọn cho MVP**
- **AWS S3:** Production grade, phức tạp hơn, có phí từ đầu
- **MinIO:** Self-hosted, không có CDN, khó maintain

## Agreed Solution

### API cần thêm theo priority:

#### 🔴 Critical (Tuần 1)
1. `GET /api/the-loai` — Danh sách thể loại (menu navigation)
2. `GET /api/don-hang/{id}` — Chi tiết đơn hàng
3. `GET/PUT /api/nguoi-dung/ho-so` — User profile
4. `POST /tai-khoan/quen-mat-khau` + `POST /tai-khoan/dat-lai-mat-khau` — Password reset
5. `PUT /tai-khoan/doi-mat-khau` — Đổi mật khẩu
6. `GET/POST/DELETE /api/yeu-thich/{maSach}` — Wishlist (entity đã có)
7. `POST /api/admin/sach/{id}/hinh-anh` — Upload ảnh via Cloudinary

#### 🟡 High (Tuần 2)
8. `GET /api/sach/ban-chay` — Sách bán chạy
9. `GET /api/sach/moi-nhat` — Sách mới nhất
10. `GET /api/sach/{id}/lien-quan` — Sách liên quan
11. `GET /api/dia-chi` + `POST` + `DELETE` — Địa chỉ giao hàng (entity mới)
12. `POST /api/coupon/kiem-tra` + Admin CRUD — Mã giảm giá (entity mới)
13. `GET /api/admin/thong-ke` — Dashboard thống kê

#### 🟢 SEO (Tuần 2)
14. Thêm field `slug` vào entity `Sach`
15. `GET /api/sach/slug/{slug}` — Lấy sách theo slug
16. `GET /sitemap.xml` — Sitemap XML
17. `GET /api/seo/sach/{id}` — Meta tags endpoint (title, description, og:image, JSON-LD)

### Image Migration Plan
- Thêm Cloudinary Java SDK (`cloudinary-http44`)
- Entity `HinhAnh.duongDan` giữ VARCHAR, ảnh cũ base64 vẫn work
- API mới upload multipart → Cloudinary → lưu URL
- Migrate dần ảnh cũ

## New Entities Needed
- `DiaChiGiaoHang` (địa chỉ giao hàng của user): id, nguoiDung, hoTen, soDienThoai, diaChiDayDu, macDinh
- `Coupon` (mã giảm giá): id, ma, loai (PERCENT/FIXED), giaTriGiam, giaTriToiThieu, hanSuDung, soLuongToiDa, isActive

## Success Criteria
- User có thể: xem/sửa profile, reset password, quản lý wishlist, dùng mã giảm giá
- Admin có thể: upload ảnh sách qua Cloudinary, tạo/quản lý coupon, xem thống kê
- SEO: sitemap.xml hoạt động, URL sách có slug, meta tags được set đúng
- Ảnh: không còn base64 mới, load time giảm

## Next Steps
- Implement theo roadmap tuần 1 → tuần 2
- Backend: Spring Boot API mới + Cloudinary SDK
- Frontend: React Helmet consume `/api/seo/sach/{id}`
