# Code Review: Missing E-commerce APIs + Cloudinary + SEO Implementation

**Date:** 2026-03-05
**Reviewer:** code-reviewer
**Branch:** master (commits 3ba85fe..HEAD)

---

## Scope

- **Files reviewed:** 45+ Java files across entity, dao, controller, services, security, config, util packages
- **LOC (new/modified):** ~1500+
- **Focus:** Compilation issues, security vulnerabilities, type mismatches, authorization gaps, critical bugs

---

## Overall Assessment

Solid breadth of features across 8 phases. Architecture follows existing codebase patterns (Spring Data REST + JPA). Most endpoints are functional. However, there are **3 critical security issues**, **several compile-risk issues**, and **multiple medium-severity bugs** that need attention before production.

---

## Critical Issues

### CRIT-1: Password Leaked in `NguoiDung.toString()` [SECURITY]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\entity\NguoiDung.java:78`

The `toString()` method includes `matKhau` (password hash). Any accidental logging of the entity (common in Spring error handlers, debug logs) will dump the BCrypt hash to log files.

```java
// Line 78 - LEAKED
", matKhau='" + matKhau + '\'' +
```

**Fix:** Remove `matKhau` from `toString()`. Also remove `maKichHoat`, `resetPasswordToken`.

---

### CRIT-2: Missing `@JsonIgnore` on `danhSachSachYeuThich` Causes Infinite Recursion / Data Leak [SECURITY]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\entity\NguoiDung.java:55-56`

```java
@OneToMany(mappedBy = "nguoiDung", fetch = FetchType.LAZY, ...)
private List<SachYeuThich> danhSachSachYeuThich;  // MISSING @JsonIgnore
```

Every API returning `NguoiDung` (profile GET, order details, etc.) will attempt to serialize the wishlist -> each SachYeuThich references back to NguoiDung -> infinite recursion or LazyInitializationException. All other `@OneToMany` fields have `@JsonIgnore`; this one was missed.

**Fix:** Add `@JsonIgnore` annotation before line 55.

---

### CRIT-3: `DiaChiController` Does Not Check for Anonymous Users [SECURITY]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\controller\DiaChiController.java:85-91`

```java
private NguoiDung getCurrentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || authentication.getName() == null) {
        return null;
    }
    return nguoiDungRepository.findByTenDangNhap(authentication.getName());
}
```

Unlike `YeuThichController` which checks `"anonymousUser".equals(auth.getName())`, this controller does not. For anonymous requests, `authentication.getName()` returns `"anonymousUser"` (not null) when using Spring Security. The query `findByTenDangNhap("anonymousUser")` will return null, so it will hit the 401 branch -- but only because there is no user with that username. If someone registers username "anonymousUser", they bypass auth.

**Fix:** Add `!auth.isAuthenticated() || "anonymousUser".equals(authentication.getName())` check, matching `YeuThichController` pattern.

---

### CRIT-4: `them-don-hang-moi` Endpoint is PUBLIC but Creates Orders [SECURITY]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\security\Endpoints.java:17`
**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\security\SecurityConfiguration.java:82`

```java
// Endpoints.java line 17 - PUBLIC GET
"/api/don-hang/them-don-hang-moi",
// SecurityConfiguration.java line 82 - PUBLIC POST
.requestMatchers(HttpMethod.POST, "/api/don-hang/them-don-hang-moi").permitAll()
```

The order creation endpoint `POST /api/don-hang/them-don-hang-moi` is `permitAll()`. Any unauthenticated request can create orders. This is also listed in PUBLIC_GET_ENDPOINS even though it's a POST.

The controller code at `DonHangController.java:209-236` also allows creating orders where `nguoiDung` can be null (no auth check), meaning orders without an owner can be created.

**Fix:** Remove from `PUBLIC_GET_ENDPOINS` and `PUBLIC_POST_ENDPOINS`. Add to `AUTH_POST_ENDPOINTS` or add explicit authentication check in the controller.

---

## High Priority Issues

### HIGH-1: LazyInitializationException in `findLienQuan` [BUG]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\admin\SachServiceImpl.java:175`

```java
if (sach == null || sach.getListTheLoai() == null || sach.getListTheLoai().isEmpty()) {
```

`sach.getListTheLoai()` is `LAZY` and accessed outside of a transaction. This will throw `LazyInitializationException` in production.

**Fix:** Either:
- Add `@Transactional(readOnly = true)` on the `findLienQuan` method
- Or use a JPQL query that fetches categories in a single query

---

### HIGH-2: Duplicate Method `kichHoatTaiKHoan` / `kichHoatTaiKhoan` in `TaiKhoanService` [BUG]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\TaiKhoanService.java:66-101`

Two nearly identical methods:
- `kichHoatTaiKHoan` (line 66) - old, with capital K-H
- `kichHoatTaiKhoan` (line 86) - new, with lowercase h

The controller calls `kichHoatTaiKhoan` (lowercase). The old method is dead code. Not a compile error but confusion risk and code smell.

**Fix:** Remove the old `kichHoatTaiKHoan` method.

---

### HIGH-3: `UserService` Field in `TaiKhoanController` Not @Autowired [COMPILE-RISK]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\controller\TaiKhoanController.java:31`

```java
private UserService userService;  // No @Autowired, will be null
```

Field is declared but not annotated with `@Autowired`. It's also never used, so this is dead code but indicates incomplete cleanup.

**Fix:** Remove the unused field.

---

### HIGH-4: `AuthenticationManager` Field Named with Capital Letter [CODE SMELL]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\controller\TaiKhoanController.java:29`

```java
private AuthenticationManager AuthenticationManager;
```

Field name starts with uppercase, violating Java naming conventions. This could cause confusion with the type name. Will still compile but is a significant code smell.

**Fix:** Rename to `authenticationManager`.

---

### HIGH-5: Rate Limiting in `TaiKhoanController` is In-Memory Only [SECURITY]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\controller\TaiKhoanController.java:37`

The `loginAttempts` `ConcurrentHashMap` is stored in the controller instance. Issues:
1. Resets on server restart
2. No cleanup mechanism -- unbounded memory growth (DoS vector)
3. Does not work in multi-instance/clustered deployments

**Fix (short-term):** Add a scheduled cleanup method that removes entries older than `LOCK_TIME_MS`. For production: use Redis or database-backed rate limiting.

---

### HIGH-6: `SachUserController` Has Admin Mutation Endpoints (insert/update/delete/active/unactive) [AUTHORIZATION]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\controller\SachUserController.java:42-67`

The `SachUserController` (mapped to `/api/sach`) has `POST insert`, `POST active`, `POST unactive`, `PUT update`, `DELETE delete` endpoints. These appear to be admin operations but are on the user-facing path `/api/sach/`.

The security config at line 81 has `.requestMatchers(HttpMethod.GET, "/api/sach**").permitAll()` which only covers GET. The POST/PUT/DELETE methods on `/api/sach/insert`, `/api/sach/active/**` etc. are not listed in any endpoint group -- they will be denied by Spring Security's default deny-all, but this is fragile and should be explicit.

**Fix:** Either remove duplicate admin endpoints from `SachUserController` or explicitly secure them. The admin controller at `/api/admin/sach` already provides these operations.

---

### HIGH-7: Entity ID Type Mismatch: `int` IDs vs `Long` Repository [COMPILE/RUNTIME]

Multiple entities use `private int maSach`, `private int maNguoiDung`, etc., but repositories use `JpaRepository<Sach, Long>`, `JpaRepository<NguoiDung, Long>`. This works due to Java autoboxing but creates friction:

- `DiaChiGiaoHang.maDiaChi` is `int`, repo is `JpaRepository<DiaChiGiaoHang, Long>` -- requires `(long) maDiaChi` casts everywhere
- `Coupon.maCoupon` is `int`, repo is `JpaRepository<Coupon, Long>` -- same issue

Not a compile blocker (autoboxing handles it), but fragile and inconsistent.

---

## Medium Priority Issues

### MED-1: `NguoiDung.toString()` Triggers LazyInitializationException

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\entity\NguoiDung.java:86-89`

The `toString()` method references `danhSachSuDanhGia`, `danhSachSachYeuThich`, `danhSachQuyen`, `danhSachDonhang` -- all LAZY collections. Any call to `toString()` outside a Hibernate session will throw.

**Fix:** Remove lazy collection references from `toString()` or override with only safe fields.

---

### MED-2: `CloudinaryConfig.cloudinary()` Returns Null Bean

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\config\CloudinaryConfig.java:14-19`

When `cloudinaryUrl` is empty, `cloudinary()` returns `null`. This causes issues because `CloudinaryService` has `@Autowired(required = false)` for the `Cloudinary` bean, but `CloudinaryService` itself is always created (it has `@Service`). This works but is fragile -- Spring will inject null for the Cloudinary bean, and the `isConfigured()` check handles it. Acceptable for now.

---

### MED-3: `e.printStackTrace()` Used Extensively Instead of Proper Logging

**Files:** 15 occurrences across `DiaChiController`, `CouponAdminController`, `CouponController`, `DonHangController`

Using `e.printStackTrace()` writes to stderr, not to the application's logging framework. In production, these may not be captured.

**Fix:** Replace with `log.error("message", e)` using SLF4J Logger.

---

### MED-4: Inconsistent `@CrossOrigin` Usage

Some controllers have `@CrossOrigin(origins = "http://localhost:3000/")`, others don't (e.g., `DiaChiController`, `CouponController`, `SitemapController`, `DonHangController`). The global CORS configuration in `SecurityConfiguration.java:86-96` covers `http://localhost:3000`, making per-controller `@CrossOrigin` redundant. However, the inconsistency is confusing and the per-controller annotations have a trailing `/` that may not match the global config.

**Fix:** Remove all per-controller `@CrossOrigin` annotations since global CORS is configured. Or ensure consistency.

---

### MED-5: `DonHangController.findAll` Authority Check is Broken

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\controller\DonHangController.java:59`

```java
if(authentication.getAuthorities().contains("ADMIN") || authentication.getAuthorities().contains("USER")){
```

`getAuthorities()` returns `Collection<GrantedAuthority>`, not `Collection<String>`. Comparing with String "ADMIN" will never match. This means the predicate is never added and ALL orders are returned to any authenticated user.

**Fix:** Use `authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ADMIN"))` or use `hasAuthority` checks.

---

### MED-6: `SlugUtil.toSlug()` Does Not Handle Vietnamese "d" Before NFD

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\util\SlugUtil.java:9-10`

```java
String slug = Normalizer.normalize(input, Normalizer.Form.NFD)
    .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
    .replaceAll("đ", "d").replaceAll("Đ", "D")
```

The NFD normalization step is applied first, then diacritical marks are stripped. The replacement of "d" and "D" is applied after NFD. Since "d" (U+0111) does NOT decompose under NFD, the ordering is actually fine. However, a more robust approach would handle "d" BEFORE normalization. Current code works for Vietnamese but order is important to document.

---

### MED-7: No Input Validation on New Password Length

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\TaiKhoanService.java:104,138`

`doiMatKhau` and `datLaiMatKhau` accept any `matKhauMoi` without validating minimum length. Users can set single-character passwords.

**Fix:** Add password strength validation (min 8 chars, etc.).

---

### MED-8: Coupon Usage Counter Never Incremented

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\CouponServiceImpl.java:21-75`

The `kiemTra` method validates the coupon but never calls `coupon.setDaSuDung(coupon.getDaSuDung() + 1)` nor saves the updated coupon. The `daSuDung` counter will always remain 0, so `soLuongToiDa` limit is never enforced.

**Fix:** Increment `daSuDung` and save when coupon is actually applied to an order (not at validation time, but at order confirmation time). Current architecture lacks this integration point.

---

### MED-9: `main()` Method in `TaiKhoanService` [CODE SMELL]

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\TaiKhoanService.java:168-180`

A `public static void main()` method exists in a Spring service class. This appears to be leftover test/utility code that should be removed.

---

## Low Priority Issues

### LOW-1: `SachServiceImpl` Exceeds 200 Lines

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\admin\SachServiceImpl.java` (220 lines)

Per project code standards, files should be kept under 200 lines for maintainability.

---

### LOW-2: N+1 Query in `loadHinhAnh`

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\admin\SachServiceImpl.java:211-218`

Each book triggers a separate query for images. For 10 books, this is 10 extra queries.

**Fix:** Use a single `IN` query or `JOIN FETCH` in the original query.

---

### LOW-3: `findByResetPasswordToken` in `NguoiDungRepository` is Unused

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\dao\NguoiDungRepository.java:18`

Method is defined but never called. The password reset flow uses `findByEmail` + token comparison instead.

---

### LOW-4: Hardcoded Email Sender Address

**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\services\TaiKhoanService.java:63,165`
**File:** `E:\BT\Stack1\book_BE-main\src\main\java\com\example\book_be\controller\DonHangController.java:148`

`"tienvovan917@gmail.com"` is hardcoded as sender email. Should be externalized to `application.properties`.

---

## Edge Cases Found by Scout

1. **Concurrent default address setting:** Two simultaneous requests to set different addresses as default could leave multiple defaults (no DB-level constraint, only application-level `resetMacDinh`)
2. **Slug collision race condition:** Two books saved simultaneously with the same name could both pass `existsBySlug` check before either saves, resulting in a unique constraint violation
3. **Coupon validation-use gap:** Coupon is validated in `kiemTra` but usage count is never incremented, meaning unlimited uses are possible
4. **Order detail email LazyInitializationException:** `DonHangController.GetMapping` (vnpay-payment) accesses `donHang.getNguoiDung().getHoDem()` and `donHang.getNgayTao()` -- these should be fine since the entity was just loaded, but `chiTietDonHang.getSach().getTenSach()` could fail if `Sach` is not eagerly fetched in the specification query

---

## Positive Observations

1. **Good authorization architecture:** `Endpoints.java` separates PUBLIC / AUTH / ADMIN cleanly
2. **Ownership checks in DiaChiService:** Update and delete operations properly verify the address belongs to the current user
3. **Graceful Cloudinary degradation:** `@Autowired(required = false)` + `isConfigured()` check prevents crashes when Cloudinary is not configured
4. **Password reset token expiry:** 10-minute expiry on reset tokens is a good security practice
5. **Coupon validation is thorough:** Checks active flag, expiry, usage count, minimum order value
6. **Slug auto-generation:** Handles duplicate slugs by appending book ID

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Add `@JsonIgnore` to `NguoiDung.danhSachSachYeuThich` -- prevents serialization crash and data leak
2. **[CRITICAL]** Remove `matKhau` from `NguoiDung.toString()` -- prevents password hash logging
3. **[CRITICAL]** Secure `/api/don-hang/them-don-hang-moi` -- require authentication
4. **[CRITICAL]** Fix `DiaChiController.getCurrentUser()` -- add `anonymousUser` check
5. **[HIGH]** Fix `DonHangController.findAll` authority check -- `contains("ADMIN")` on `GrantedAuthority` collection never matches
6. **[HIGH]** Add `@Transactional` to `SachServiceImpl.findLienQuan` -- prevents LazyInitializationException
7. **[HIGH]** Remove duplicate `kichHoatTaiKHoan` method and unused `userService` field from `TaiKhoanController`
8. **[HIGH]** Add rate-limiter cleanup to prevent memory leak
9. **[MEDIUM]** Implement coupon usage increment at order confirmation time
10. **[MEDIUM]** Add password strength validation
11. **[MEDIUM]** Replace `e.printStackTrace()` with SLF4J logging
12. **[MEDIUM]** Remove `main()` method from `TaiKhoanService`

---

## Metrics

| Metric | Value |
|--------|-------|
| Critical Issues | 4 |
| High Priority | 7 |
| Medium Priority | 9 |
| Low Priority | 4 |
| `e.printStackTrace()` occurrences | 15 |
| Missing `@CrossOrigin` consistency | 4 controllers |
| Test Coverage | Not measurable (no test files found) |

---

## Unresolved Questions

1. Is the `them-don-hang-moi` endpoint intentionally public? (for guest checkout?) If yes, add rate limiting at minimum.
2. Should `SachUserController` retain mutation endpoints (insert/active/unactive/update/delete) or are those meant to be admin-only via `SachController`?
3. Is the `DonHangController.findAll` authority check intentionally broken (to return all orders to any authenticated user)?
4. Is there a plan for database migration scripts for the new entities (`dia_chi_giao_hang`, `coupon`) or is `ddl-auto=update` the intended strategy?
