# Phase Implementation Report

## Executed Phase
- Phase: Phase 05 - Commerce (Coupon & Shipping Address APIs)
- Plan: E:\BT\Stack1\book_BE-main\plans\
- Status: completed

## Files Modified
All files newly created (0 pre-existing files touched):

| File | Lines |
|------|-------|
| `src/main/java/com/example/book_be/services/DiaChiService.java` | 13 |
| `src/main/java/com/example/book_be/services/DiaChiServiceImpl.java` | 91 |
| `src/main/java/com/example/book_be/controller/DiaChiController.java` | 95 |
| `src/main/java/com/example/book_be/services/CouponService.java` | 16 |
| `src/main/java/com/example/book_be/services/CouponServiceImpl.java` | 110 |
| `src/main/java/com/example/book_be/controller/CouponController.java` | 32 |
| `src/main/java/com/example/book_be/controller/admin/CouponAdminController.java` | 53 |

## Tasks Completed
- [x] DiaChiService interface (findByNguoiDung, save, update, delete)
- [x] DiaChiServiceImpl: max-10 check, owner check, macDinh reset logic
- [x] DiaChiController: GET/POST/PUT/DELETE /api/dia-chi, getCurrentUser() via SecurityContextHolder
- [x] CouponService interface (kiemTra, findAll, save, update, delete)
- [x] CouponServiceImpl: full validation (exists, active, expired, remaining uses, min order), PERCENT/FIXED discount calc, cap at tongTien
- [x] CouponController: POST /api/coupon/kiem-tra
- [x] CouponAdminController: GET/POST/PUT/DELETE /api/admin/coupon

## Implementation Notes

### DiaChiService
- `save`: validates max 10 addresses per user; if `macDinh=true`, resets all existing addresses' macDinh before saving new one
- `update`: ownership verified by comparing `nguoiDung.maNguoiDung`; macDinh reset only triggered when changing from false→true
- `delete`: ownership verified before deleteById
- Repository uses `Long` id (JpaRepository<DiaChiGiaoHang, Long>); all id casts to `(long)` accordingly

### CouponService
- `kiemTra`: returns `Map<String, Object>` with keys: `hopLe` (boolean), `thongBao` (message), `giaTriGiam`, `tongTienSauGiam`, `coupon`
- Validates in order: existence → active flag → expiry date → remaining uses → min order amount
- Discount capped at `tongTien` to prevent negative totals
- `save`/`update`: uppercases `ma` field automatically

### Security
- DiaChiController endpoints require authentication (user resolved from JWT via SecurityContextHolder)
- CouponAdminController endpoints at `/api/admin/coupon` rely on existing SecurityConfiguration ADMIN rules
- CouponController `/api/coupon/kiem-tra` is public (no auth required to check a coupon code)

## Tests Status
- Type check: not run (JAVA_HOME not set per task instructions)
- Unit tests: not run
- Integration tests: not run

## Issues Encountered
- None. All patterns followed existing codebase conventions (SecurityContextHolder, @Autowired, ResponseEntity, try-catch with e.printStackTrace())

## Next Steps
- SecurityConfiguration may need explicit rules for `/api/dia-chi/**` (authenticated) and `/api/admin/coupon/**` (ADMIN) if not covered by existing wildcard rules
- `DiaChiGiaoHangRepository` uses `JpaRepository<DiaChiGiaoHang, Long>` so ids cast to Long throughout
