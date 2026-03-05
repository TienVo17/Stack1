# Code Review Report - Full Codebase Scan
**Date:** 2026-03-04
**Scope:** Full codebase - Backend (Spring Boot) + Frontend (React TypeScript)
**Reviewer:** code-reviewer agent

---

## Scope

- **Backend files reviewed:** 55 Java files (security, controllers, services, entities, config)
- **Frontend files reviewed:** 20+ TSX/TS files (auth, cart, admin, API layer)
- **Focus:** Security, business logic correctness, type safety, data integrity

---

## Overall Assessment

This is a student-grade bookstore app with **multiple critical security holes** that would make it dangerous to deploy publicly. The core Spring Security + JWT plumbing is there but is undermined at almost every layer by missing authorization checks, hardcoded secrets, and broken access control logic. The frontend has trust-in-client-side vulnerabilities and inconsistent auth token key usage. Several business operations (order creation, payment callback) have no server-side validation whatsoever.

---

## CRITICAL Issues

### C1 - Hardcoded credentials in version-controlled files

**Files:**
- `src/main/java/com/example/book_be/services/JWT/JwtService.java` line 21
- `src/main/java/com/example/book_be/config/VnPayConfig.java` lines 16-17
- `src/main/resources/application.properties` lines 3, 12

**Problem:**
```java
// JwtService.java
public static final String SECRET = "U29tZVZlcnlMb25nU2VjdXJlS2V5VGhhdFNhdGlzZmllczMyQnl0ZXM=";

// VnPayConfig.java
public static String vnp_TmnCode = "B3C4EVLT";
public static String vnp_HashSecret = "UX60XJXZBFIZXCN1QSSW7M6ZBLM0D0KK";

// application.properties
spring.mail.username=tienvovan917@gmail.com
spring.mail.password=ffnz ybcb xcql cytk
```

**Why it matters:** Anyone who clones this repository gets the JWT signing secret, VNPay merchant credentials, and Gmail app password. With the JWT secret, an attacker can forge valid JWT tokens for any user (including admin). With VNPay credentials they can fraudulently create payment transactions. This is a full account takeover + payment fraud vector.

**Fix:** Move all secrets to environment variables or a secrets manager. Use `${JWT_SECRET}`, `${VNPAY_HASH_SECRET}`, `${MAIL_PASSWORD}` in config and inject at deploy time. Add `.env`, `application.properties` to `.gitignore` immediately and rotate all exposed credentials now.

---

### C2 - Admin endpoints exposed without authentication

**File:** `src/main/java/com/example/book_be/security/SecurityConfiguration.java` lines 55-73

**Problem:**
```java
.requestMatchers(HttpMethod.POST, "/api/admin/sach/insert").permitAll()
.requestMatchers(HttpMethod.PUT, "/api/admin/sach/update/**").permitAll()
.requestMatchers(HttpMethod.POST, "/api/admin/user/phan-quyen").permitAll()   // <-- assigns roles!
.requestMatchers(HttpMethod.POST, "/api/admin/sach/active/**").permitAll()
.requestMatchers(HttpMethod.POST, "/api/admin/sach/unactive/**").permitAll()
.requestMatchers(HttpMethod.POST, "/api/admin/danh-gia/active/**").permitAll()
.requestMatchers(HttpMethod.POST, "/api/admin/danh-gia/unactive/**").permitAll()
```

**Why it matters:** Any unauthenticated user on the internet can:
- Create/update/delete books (`/api/admin/sach/insert`, `/api/admin/sach/update/**`)
- **Assign admin roles to any user** (`/api/admin/user/phan-quyen`) - this is the most critical. Anyone can make themselves admin.
- Activate/deactivate any book or review

This completely voids the entire Spring Security configuration. The `@PreAuthorize("hasRole('ADMIN') or hasRole('STAFF')")` on `UserController` (line 17) is bypassed because the `/phan-quyen` endpoint is `permitAll()` in SecurityConfiguration.

**Fix:** Remove all these `permitAll()` overrides for admin endpoints. They should require `hasAuthority("ADMIN")`.

---

### C3 - Order creation: Anyone can place orders as any user (no ownership check)

**File:** `src/main/java/com/example/book_be/controller/DonHangController.java` lines 183-210

**Problem:**
```java
@PostMapping("/them-don-hang-moi")
public DonHang themDonHangMoi(...) {
    // Gán giá trị mặc định cho NguoiDung
    NguoiDung defaultNguoiDung = new NguoiDung();
    defaultNguoiDung.setMaNguoiDung(1); // ID mặc định - hardcoded to user ID=1!
    donHang.setNguoiDung(defaultNguoiDung);
    ...
    // Sets random maDonHang - collision risk
    int randomMaDonHang = 1000 + random.nextInt(9000);
    donHang.setMaDonHang(randomMaDonHang);
}
```
This endpoint is `permitAll()` (line 73 in SecurityConfiguration). It:
- Requires no authentication
- Assigns all orders to hardcoded user ID=1 (probably the admin account)
- Sets a manually random ID (1000-9999) which can collide with DB auto-generated IDs and will fail or corrupt data
- Has no validation on hoTen, soDienThoai, diaChiNhanHang

**Why it matters:** A DDoS / data spam attack can flood the order table. Real orders are tied to a dummy user. The random ID assignment bypasses the DB auto-increment and can cause primary key conflicts.

**Fix:** This endpoint appears to be an unfinished "guest checkout" feature. Either complete it properly (with a guest account mechanism) or remove it. Never hardcode user IDs.

---

### C4 - VNPay payment callback: No order ownership validation

**File:** `src/main/java/com/example/book_be/controller/DonHangController.java` lines 90-128

**Problem:**
```java
@GetMapping("/vnpay-payment")
public String GetMapping(HttpServletRequest request, Model model) {
    // ...
    DonHang donHang = donHangRepository.findById(Long.valueOf(orderInfo)).orElse(null);
    // donHang can be null here - NPE if orderInfo is not a valid order ID
    if (paymentStatus == 1) {
        donHang.setTrangThaiThanhToan(1);  // NullPointerException crash
        donHangRepository.save(donHang);
        // sends email to order owner
    }
    return paymentStatus == 1 ? "ordersuccess" : "orderfail";
}
```

**Why it matters:**
1. If `orderInfo` is tampered (it comes from VNPay URL params but `orderInfo` was set by the frontend to `donHang.maDonHang`), an attacker can mark any arbitrary order as paid by replaying a successful payment callback with a different `orderInfo`.
2. `donHang` can be null if `orderInfo` is not a valid ID, causing NullPointerException crash on line 107.
3. This endpoint is `permitAll()` (line 61) - completely unauthenticated.

**Fix:** Validate that the order ID in the callback matches the VNPay transaction. Add null check on `donHang`. Cross-reference `vnp_TxnRef` with a stored transaction reference.

---

### C5 - Delivery status update: No authentication, no authorization

**File:** `src/main/java/com/example/book_be/controller/DonHangController.java` lines 130-137

**Problem:**
```java
@PostMapping("/cap-nhat-trang-thai-giao-hang/{maDonHang}")
public void submidOrder(@PathVariable Long maDonHang, HttpServletRequest request) {
    DonHang donHang = donHangRepository.findById(maDonHang).orElse(null);
    donHang.setTrangThaiGiaoHang(2);    // NPE if not found
    donHang.setTrangThaiThanhToan(1);   // marks as paid too!
    donHangRepository.save(donHang);
}
```
This endpoint is `permitAll()` (line 63 in SecurityConfiguration). Anyone can call this URL with any order ID to:
- Mark any order as delivered AND paid
- Crash the server if `maDonHang` doesn't exist (NullPointerException)

**Fix:** Require `ADMIN` or `STAFF` authority. Add null check. Do not change payment status here.

---

### C6 - JWT token key mismatch: Token stored under 'jwt' but admin guard reads 'token'

**Files:**
- `src/layouts/user/DangNhap.tsx` line 27: `localStorage.setItem("jwt", data.jwt)`
- `src/layouts/admin/layouts/RequireAdmin.tsx` line 18: `const token = localStorage.getItem('token')`

**Problem:** Login stores the JWT as key `"jwt"` but the admin route guard reads key `"token"`. This means `RequireAdmin` always gets `null` for the token and always redirects to `/dang-nhap`, making the admin panel completely inaccessible after login.

**Fix:** Use a single consistent key (`"jwt"`) everywhere. Update `RequireAdmin.tsx` line 18 to `localStorage.getItem('jwt')`.

---

### C7 - No rate limiting / brute force protection on login endpoint

**File:** `src/main/java/com/example/book_be/controller/TaiKhoanController.java` lines 43-59

**Problem:** The login endpoint `/tai-khoan/dang-nhap` has no rate limiting. An attacker can try unlimited username/password combinations.

**Why it matters:** BCrypt is slow per hash but with a botnet, millions of attempts per day are feasible against common passwords.

**Fix:** Add Spring Security's built-in account locking or use Bucket4j for rate limiting. At minimum, add account lockout after 5 failed attempts.

---

## HIGH Priority Issues

### H1 - NullPointerException risks in service layer (no null checks after orElse(null))

**Files:**
- `SachServiceImpl.java` lines 111-113: `sach.setIsActive(1)` - if `findById` returns null, NPE
- `SachServiceImpl.java` lines 119-121: same for `unactive`
- `DanhGiaServiceImpl.java` lines 40-42: `db.setDiemXepHang(...)` - if `findById` returns null, NPE
- `DanhGiaServiceImpl.java` lines 48-50: same for `deleteReview`
- `CartServiceImpl.java` line 104: `gioHang.get().setSoLuong(soLuong)` - if cart item not found, NPE
- `OrderServiceImpl.java` line 45: `finalNguoiDung.getMaNguoiDung()` - if user not found in SecurityContext, NPE
- `DonHangController.java` line 55: `findByTenDangNhap` can return null, then NPE on line 61

**Pattern:** The codebase uses `.orElse(null)` then immediately calls methods on the result without null checks. This is a crash waiting to happen in production.

**Fix:** Use `.orElseThrow(() -> new ResourceNotFoundException(...))` or add explicit null checks with proper HTTP error responses (404 Not Found).

---

### H2 - Order total price calculated client-side, not validated server-side

**Files:**
- `src/layouts/products/ThanhToan.tsx` lines 62-88: sends `{maSach, soLuong}` to backend
- `src/main/java/com/example/book_be/services/cart/OrderServiceImpl.java` lines 58-61

**Problem:** The backend does recalculate `tongTienSanPham` from DB prices (line 60), which is correct. BUT:
1. The `submitOrder` endpoint (DonHangController line 81) accepts `amount` as a GET parameter from the frontend: `?amount=donHang.tongTien`. This `amount` is passed directly to VNPay without server-side revalidation from the DB order total.
2. A user can modify the URL to pass `amount=1` and pay 1 VND for any order.

**Fix:** In `DonHangController.submitOrder`, retrieve the `DonHang` from DB by `orderInfo` (order ID), use `donHang.getTongTien()` as the amount to pass to VNPay, not the client-supplied `amount` parameter.

---

### H3 - Cart endpoints require no authentication (any user ID can be used)

**File:** `src/main/java/com/example/book_be/security/Endpoints.java` lines 27-32 + SecurityConfiguration lines 49-50

**Problem:**
```java
PUBLIC_PUT_ENDPOINS = {"/gio-hang/**"};
PUBLIC_DELETE_ENDPOINS = {"/gio-hang/**"};
```
Cart add/update/delete require no authentication. `CartServiceImpl.save()` accepts `maNguoiDung` from the JSON request body (line 41) - a user can pass any other user's ID and modify their cart.

**Fix:** Require authentication for cart operations. Get `maNguoiDung` from the authenticated SecurityContext, not from the request body.

---

### H4 - `findAll` orders endpoint: broken authority check

**File:** `src/main/java/com/example/book_be/controller/DonHangController.java` lines 60-62

**Problem:**
```java
if (authentication.getAuthorities().contains("ADMIN") || authentication.getAuthorities().contains("USER")) {
```
`getAuthorities()` returns `Collection<? extends GrantedAuthority>`, not `Collection<String>`. `.contains("ADMIN")` compares a `String` to `GrantedAuthority` objects - this will **always be false**, so the predicate is never added. This means:
- Unauthenticated users (who can access this `permitAll()` endpoint) get ALL orders from all users
- The filter intended to scope results to the current user never fires

**Fix:** Use `authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ADMIN"))` or use Spring Security's `@PreAuthorize`.

---

### H5 - `daKichHoat` defaults to `true` in entity, bypasses email verification

**File:** `src/main/java/com/example/book_be/entity/NguoiDung.java` line 36

**Problem:**
```java
@Column(name = "da_kich_hoat", nullable = false)
private Boolean daKichHoat = true;  // defaults to ACTIVE
```
The registration service sets it to `false` (line 37 in TaiKhoanService), but if another code path creates a NguoiDung without going through TaiKhoanService (e.g., the guest order endpoint on line 205-207 in DonHangController), the account would be created as already activated.

Also: `UserServiceImpl.loadUserByUsername()` (line 46) does NOT check if `daKichHoat` is true before allowing login. Unactivated accounts can still log in.

**Fix:** Set entity default to `false`. Add `daKichHoat` check in `loadUserByUsername` and throw `DisabledException` if false.

---

### H6 - `DatHangNhanh.tsx` sends guest order to the wrong endpoint

**File:** `src/layouts/products/DatHangNhanh.tsx` line 26

**Problem:**
```tsx
const response = await fetch('http://localhost:8080/tai-khoan/dang-ky', {  // WRONG URL
    method: 'POST',
    body: JSON.stringify({ thongTinNguoiMua: formData, donHang: gioHang })
});
```
The "quick order" (guest checkout) form POSTs to `/tai-khoan/dang-ky` (the **user registration** endpoint), not an order endpoint. This is completely broken - it will try to register a new user with the order data shape and fail or create garbage data.

**Fix:** This feature is incomplete. It should POST to a proper guest order endpoint.

---

### H7 - `ProtectedRoute.tsx` logic is inverted

**File:** `src/layouts/utils/ProtectedRoute.tsx` lines 4-10

**Problem:**
```tsx
export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const jwt = localStorage.getItem('jwt');
    if (jwt) {
        return <Navigate to="/" />;   // redirects AWAY if logged in!
    }
    return children;
};
```
The logic is backwards. This route redirects **logged-in** users away and **allows unauthenticated** users through. It should be the opposite: redirect unauthenticated users to `/dang-nhap`. The name "ProtectedRoute" strongly implies it should protect content from unauthenticated access.

**Fix:** Invert the condition: `if (!jwt) return <Navigate to="/dang-nhap" />`.

---

### H8 - No input validation on any entity before persistence

**Files:** All controllers accepting `@RequestBody` entities

**Problem:** No `@NotNull`, `@NotBlank`, `@Size`, `@Email` validation annotations on entity fields. The `@Validated` on `TaiKhoanController.dangKyNguoiDung` (line 32) does nothing because `NguoiDung` has no Bean Validation constraints. Registration sends data directly to DB with zero validation - book titles, prices, quantities can be empty strings or negative numbers.

**Fix:** Add `jakarta.validation.constraints.*` annotations to entity fields. Add `@Valid` (not `@Validated`) on controller parameters.

---

## MEDIUM Priority Issues

### M1 - Duplicate method in `TaiKhoanService`

**File:** `src/main/java/com/example/book_be/services/TaiKhoanService.java` lines 65-100

**Problem:** `kichHoatTaiKHoan` (line 65) and `kichHoatTaiKhoan` (line 85) are nearly identical methods. The controller calls `kichHoatTaiKhoan` (lowercase h). The uppercase version is dead code.

**Fix:** Delete `kichHoatTaiKHoan` (line 65-83). DRY violation.

---

### M2 - `main()` method left in production service class

**File:** `src/main/java/com/example/book_be/services/TaiKhoanService.java` lines 102-114

**Problem:**
```java
public static void main(String[] args) {
    BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    String rawPassword = "12345678@";
    String encodedPassword = passwordEncoder.encode(rawPassword);
    System.out.println("Encoded Password: " + encodedPassword);
}
```
A debug utility `main()` method with a plaintext test password is left in a production `@Service` class. This is a code smell and leaks what appears to be a test password used somewhere.

**Fix:** Delete this method. Use a separate test class or a CLI tool for this purpose.

---

### M3 - N+1 query problem in `SachServiceImpl.findAll`

**File:** `src/main/java/com/example/book_be/services/admin/SachServiceImpl.java` lines 47-52

**Problem:**
```java
sachPage.getContent().forEach(sach -> {
    List<HinhAnh> hinhAnhList = hinhAnhRepository.findAll(...); // 1 query per book!
    sach.setListHinhAnh(hinhAnhList);
});
```
For a page of 10 books, this runs 11 SQL queries (1 for books + 10 for images). At scale, this is a serious performance bottleneck.

**Fix:** Add a `findBySachMaSachIn(List<Integer> ids)` method to `HinhAnhRepository` and fetch all images in one query, then group them by book ID in Java.

---

### M4 - `update()` in `SachServiceImpl` uses `objectMapper.convertValue` incorrectly

**File:** `src/main/java/com/example/book_be/services/admin/SachServiceImpl.java` lines 73-96

**Problem:**
```java
Sach sach = sachRepository.findById(Long.valueOf(bo.getMaSach())).orElse(null);
// ... fetches from DB, then immediately overwrites with the full request body
sach = objectMapper.convertValue(bo, Sach.class);
// now 'sach' is a detached object, not the managed entity
// ... then:
sachRepository.save(sach);  // saves a new detached entity, may lose JPA relationships
```
The fetched `sach` is overwritten with a Jackson-converted copy of `bo`, which is a disconnected POJO. The original managed entity is discarded. Relationships not included in the request body (like `nhaCungCap`) will be set to null on save.

**Fix:** Update individual fields from `bo` onto the managed `sach` entity rather than replacing it.

---

### M5 - `delete()` and `findById()` methods in services return `null` (unimplemented)

**Files:**
- `SachServiceImpl.java` lines 99-107
- `AdminUserServiceImpl.java` lines 40-57

**Problem:**
```java
@Override
public Sach delete(Long id) { return null; }

@Override
public Sach findById(Long id) { return null; }
```
These are called by controllers (`SachController.delete` line 66, `SachController.findById` line 72). The controller will return HTTP 200 with a null body - no error, no action. Silent failures are extremely hard to debug.

**Fix:** Implement these methods or throw `UnsupportedOperationException` if truly not needed.

---

### M6 - Raw types used throughout VNPay integration

**File:** `src/main/java/com/example/book_be/services/VNPayService.java` lines 50, 85; `VnPayConfig.java` line 58

**Problem:**
```java
List fieldNames = new ArrayList(vnp_Params.keySet());  // raw List
Map fields = new HashMap();  // raw Map
Iterator itr = fieldNames.iterator();  // raw Iterator
```
Raw types lose compile-time type safety and generate unchecked cast warnings. This is Java 1.4-style code.

**Fix:** Use generics: `List<String>`, `Map<String, String>`, `Iterator<String>`.

---

### M7 - Email template uses string concatenation (XSS in email)

**File:** `src/main/java/com/example/book_be/controller/DonHangController.java` lines 139-181

**Problem:**
```java
chiTienDonHang += "<tr>" +
    "<td>..." + chiTietDonHang.getSach().getTenSach() + "</td>" + ...
```
`tenSach` (book name) is concatenated directly into HTML email without escaping. If a book name contains `<script>` or HTML tags (e.g., set by an admin), it would be rendered in the email client. Email-borne XSS is possible.

**Fix:** Use a proper templating engine (Thymeleaf, FreeMarker) or HTML-escape values with `StringEscapeUtils.escapeHtml4()`.

---

### M8 - CORS hardcoded to localhost:3000 only

**Files:**
- `SecurityConfiguration.java` line 80
- All controllers with `@CrossOrigin(origins = "http://localhost:3000/")`

**Problem:** When deployed to production, CORS will block all frontend requests unless this is changed. There are also redundant `@CrossOrigin` annotations on individual controllers when CORS is already configured globally in `SecurityConfiguration`.

**Fix:** Move CORS origin to `application.properties` as `app.cors.allowed-origins`. Remove redundant `@CrossOrigin` controller annotations.

---

### M9 - `UserApi.ts` disables TypeScript with `@ts-ignore`

**File:** `src/api/UserApi.ts` line 13

**Problem:**
```ts
// @ts-ignore
export async function findAll(trangHienTai: number): Promise<KetQuaInterface> {
```
A `@ts-ignore` suppresses all TypeScript errors on the next line. This hides real type errors without fixing them.

**Fix:** Identify what error the `@ts-ignore` is suppressing (run `tsc` without it), and fix the actual type issue.

---

### M10 - `VNPayService.orderReturn` double-encodes parameter names

**File:** `src/main/java/com/example/book_be/services/VNPayService.java` lines 86-92

**Problem:**
```java
fieldName = URLEncoder.encode((String) params.nextElement(), StandardCharsets.US_ASCII.toString());
fieldValue = URLEncoder.encode(request.getParameter(fieldName), StandardCharsets.US_ASCII.toString());
```
`fieldName` is URL-encoded, then used as the key to `request.getParameter(fieldName)`. But `getParameter()` expects the raw (decoded) parameter name, not the encoded version. So `request.getParameter("vnp_Amount")` becomes `request.getParameter("vnp_Amount")` (OK here since no special chars), but this will fail for any parameter name with special characters. Worse, the encoded name is used in the HMAC signature computation, which may cause signature verification to fail inconsistently.

**Fix:** Keep `fieldName` raw (no encoding). Only encode when building the hash string.

---

## LOW Priority Issues

### L1 - `System.out.println` used for logging throughout backend

**Files:** `JwtService.java` line 102, `DonHangController.java` line 103, others

**Problem:** Production code uses `System.out.println` instead of a proper logging framework (SLF4J/Logback is already included with Spring Boot).

**Fix:** Replace with `private static final Logger log = LoggerFactory.getLogger(ClassName.class)` and use `log.debug(...)`, `log.info(...)`.

---

### L2 - `console.log` left in production frontend code

**Files:** `UserApi.ts` line 20, `ThanhToan.tsx` line 71, `ThanhToan.tsx` line 82, others

**Problem:** Debug `console.log` statements expose internal data structures and API responses in browser developer tools.

**Fix:** Remove all `console.log` statements before production build, or use a proper logging library with log-level control.

---

### L3 - JWT token expiry is 30 minutes with no refresh mechanism

**File:** `src/main/java/com/example/book_be/services/JWT/JwtService.java` line 59

**Problem:** JWT expires in 30 minutes. There is no refresh token endpoint. Users are silently logged out mid-session. The frontend shows "Bạn đã hết phiên" (session expired) alert which is a poor UX.

**Fix:** Implement a refresh token endpoint, or increase expiry time and add token rotation on sensitive operations.

---

### L4 - `SachYeuThich` (wishlist) exposed without `@JsonIgnore` on `NguoiDung`

**File:** `src/main/java/com/example/book_be/entity/NguoiDung.java` line 44-45

**Problem:**
```java
@OneToMany(mappedBy = "nguoiDung", fetch = FetchType.LAZY, ...)
private List<SachYeuThich> danhSachSachYeuThich;  // No @JsonIgnore!
```
Unlike `danhSachSuDanhGia` which has `@JsonIgnore`, `danhSachSachYeuThich` does not. When a `NguoiDung` is serialized to JSON (e.g., in the admin user list endpoint), it may trigger lazy loading and include the user's full wishlist in the response, which is unintended data exposure.

**Fix:** Add `@JsonIgnore` to `danhSachSachYeuThich`.

---

### L5 - Registration sends `maKichHoat: ""` from frontend instead of leaving it to server

**File:** `src/layouts/user/DangKyNguoiDung.tsx` line 43

**Problem:**
```tsx
body: JSON.stringify({
    ...
    daKichHoat: 0, maKichHoat: "",  // sending client-controlled activation fields
})
```
The client sends `daKichHoat` and `maKichHoat` directly. The server overrides these values, so this works now, but it's a fragile design. If the server validation changes, a malicious client could send `daKichHoat: true` and skip email verification (the server checks this, but it's not a safe pattern).

**Fix:** Do not send `daKichHoat` or `maKichHoat` from client. Use a dedicated DTO instead of the raw entity for registration, and set these fields only on the server.

---

### L6 - `ThanhToan.tsx` parses `localStorage` twice unnecessarily

**File:** `src/layouts/products/ThanhToan.tsx` lines 21-91

**Problem:** `localStorage.getItem('gioHang')` and `JSON.parse` are called twice in the same `useEffect` - once in `loadGioHangWithImages` and once for the order POST. The order POST also fires immediately on page load without waiting for user confirmation.

**Fix:** Parse once, store in a variable. Move the order POST to a user action (button click), not on page load. Creating an order just because the checkout page loaded is wrong.

---

### L7 - `VnPayConfig.vnp_Returnurl` points to localhost

**File:** `src/main/java/com/example/book_be/config/VnPayConfig.java` line 15

```java
public static String vnp_Returnurl = "http://localhost:3000/xu-ly-kq-thanh-toan";
```
VNPay sandbox callback URL is hardcoded to localhost. This will fail in any deployed environment and is also an additional hardcoded config concern.

**Fix:** Move to environment variable.

---

## Edge Cases Found

1. **Order collision:** `themDonHangMoi` sets `maDonHang` to a random 4-digit number (1000-9999). Since `maDonHang` is `@GeneratedValue(strategy = IDENTITY)`, manually setting it may conflict with auto-increment, or JPA may ignore the set value. Either way the behavior is undefined.

2. **Empty cart checkout:** `ThanhToan.tsx` fires the order API even when the cart is empty (the `storedData` check on line 51 only checks if `localStorage.gioHang` key exists, not if the array is non-empty).

3. **Concurrent cart updates:** `CartServiceImpl.save()` reads the user's cart, modifies in memory, then saves. With concurrent requests, the last write wins and cart items can be lost.

4. **JWT extraction on malformed tokens:** `Jwtfilter.doFilterInternal` calls `jwtService.extractUsername(token)` on line 36, which calls `ExtractAllClaims` which can throw `io.jsonwebtoken.JwtException`. This exception is not caught in the filter, causing a 500 response instead of 401 for malformed tokens.

5. **Book price uses `double` for money:** `Sach.giaBan` and `Sach.giaNiemYet` are `double`. Floating-point arithmetic for currency is notoriously imprecise (e.g., 0.1 + 0.2 != 0.3). Use `BigDecimal` for all monetary values.

---

## Positive Observations

- BCrypt password hashing is used correctly
- JWT filter correctly uses `OncePerRequestFilter`
- Email sending failure is properly caught and does not fail registration
- `SachServiceImpl.findAll` correctly filters inactive books for non-admin users
- Frontend has reasonable loading state management
- VNPay HMAC-SHA512 signature verification is implemented (even if the parameter encoding is buggy)
- Lombok `@Data` reduces boilerplate appropriately

---

## Recommended Actions (Prioritized)

1. **IMMEDIATE:** Rotate all exposed credentials (Gmail app password, VNPay hash secret, JWT secret). Remove them from git history using `git filter-branch` or BFG Repo Cleaner. Add to `.gitignore`.
2. **IMMEDIATE:** Remove `permitAll()` from all admin endpoints in `SecurityConfiguration`. Especially `/api/admin/user/phan-quyen`.
3. **IMMEDIATE:** Fix `ProtectedRoute.tsx` - the logic is inverted.
4. **IMMEDIATE:** Fix `RequireAdmin.tsx` - reads wrong localStorage key (`token` vs `jwt`).
5. **HIGH:** Add null checks after all `.orElse(null)` calls or switch to `.orElseThrow()`.
6. **HIGH:** Validate payment amount server-side in `submitOrder` endpoint.
7. **HIGH:** Add authentication requirement to cart and order status update endpoints.
8. **HIGH:** Fix broken authority check in `DonHangController.findAll` (String vs GrantedAuthority comparison).
9. **HIGH:** Add `daKichHoat` check in `UserServiceImpl.loadUserByUsername`.
10. **MEDIUM:** Fix `DatHangNhanh.tsx` wrong API endpoint.
11. **MEDIUM:** Fix N+1 query in `SachServiceImpl.findAll`.
12. **MEDIUM:** Replace raw types in VNPay integration with generics.
13. **MEDIUM:** Fix `SachServiceImpl.update` - use managed entity instead of `objectMapper.convertValue`.
14. **MEDIUM:** Move all config values to environment variables / `application.properties` with externalized config.
15. **LOW:** Replace `System.out.println` with SLF4J logger. Remove `console.log` from frontend.
16. **LOW:** Use `BigDecimal` for all monetary fields.

---

## Metrics

| Metric | Value |
|--------|-------|
| Critical issues | 7 |
| High priority issues | 8 |
| Medium priority issues | 10 |
| Low priority issues | 7 |
| Hardcoded secrets found | 4 (JWT secret, VNPay merchant code, VNPay hash secret, Gmail app password) |
| Unimplemented methods silently returning null | 6 |
| NPE crash points identified | 8+ |

---

## Unresolved Questions

1. Is `themDonHangMoi` (guest order) an intentional incomplete feature or dead code? If intentional, it needs a full redesign.
2. What is `Test.tsx` in the user layouts? Is it dead code left from development?
3. Is there a plan to add refresh token support, or is 30-minute JWT expiry intentional?
4. The `VnPayConfig` points to sandbox URLs - is there a production VNPay configuration planned, and if so, how will secrets be managed?
5. `spring.jpa.hibernate.ddl-auto=update` is still active - this is dangerous in production as schema migrations can silently alter tables. Is there a Flyway/Liquibase migration plan?
