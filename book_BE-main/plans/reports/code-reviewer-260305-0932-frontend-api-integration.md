# Code Review: Frontend API Integration

**Date:** 2026-03-05
**Reviewer:** code-reviewer
**Scope:** 30+ files across API layer, models, and UI components
**Focus:** Correctness, security, edge cases, missing functionality

---

## Overall Assessment

The integration layer is well-structured with consistent patterns: dedicated API modules, TypeScript models, and a reusable `authRequest` wrapper. However, there are **2 critical bugs** (coupon update URL mismatch, profile double-parse), **3 high-priority issues** (XSS, order body mismatch, expired JWT handling), and several medium-priority gaps.

---

## Critical Issues

### C1. Coupon Update URL Mismatch -- Will 404

**File:** `e:\BT\Stack1\book_fe-master\src\api\CouponApi.ts` line 27
**Backend:** `PUT /api/admin/coupon/{id}` (CouponAdminController.java:34)
**Frontend sends:** `PUT /api/admin/coupon` (no ID in path)

```typescript
// CURRENT (broken)
export async function capNhatCoupon(coupon: CouponModel) {
  return authRequest(`${BASE}/api/admin/coupon`, {
    method: 'PUT',
    body: JSON.stringify(coupon),
  });
}

// FIX
export async function capNhatCoupon(coupon: CouponModel) {
  return authRequest(`${BASE}/api/admin/coupon/${coupon.maCoupon}`, {
    method: 'PUT',
    body: JSON.stringify(coupon),
  });
}
```

**Impact:** All coupon update operations will fail with 404 or 405.

### C2. HoSoNguoiDung Double-Parses JSON -- Will Crash

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\user\HoSoNguoiDung.tsx` lines 38-39

`authRequest()` already calls `JSON.parse(text)` and returns the parsed object. But `HoSoNguoiDung` chains `.then((res: Response) => res.json())` as if it receives a raw `Response`. This will crash with `res.json is not a function`.

```typescript
// CURRENT (broken)
getHoSo()
  .then((res: Response) => res.json())
  .then((data: any) => { ... })

// FIX
getHoSo()
  .then((data: any) => {
    setHoDem(data.hoDem || '');
    setTen(data.ten || '');
    setEmail(data.email || '');
    setSoDienThoai(data.soDienThoai || '');
    setGioiTinh(data.gioiTinh || 'M');
  })
```

Same issue with `capNhatHoSo` at line 54: `if (!res.ok) throw new Error()` -- the return value from `authRequest` is already parsed JSON, not a `Response` object, so `res.ok` will be `undefined`.

```typescript
// CURRENT (broken)
const res = await capNhatHoSo({ hoDem, ten, soDienThoai, gioiTinh });
if (!res.ok) throw new Error();

// FIX - authRequest already throws on !response.ok, so just call it
await capNhatHoSo({ hoDem, ten, soDienThoai, gioiTinh });
toast.success('Cap nhat ho so thanh cong!');
```

And `doiMatKhau` at line 71-72: same pattern -- `res.ok` will be `undefined`, so the success path will always throw an error despite the operation succeeding.

---

## High Priority

### H1. XSS via dangerouslySetInnerHTML

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\products\ChiTietSanPham.tsx` line 208

```tsx
dangerouslySetInnerHTML={{ __html: sach.moTa || "Mo ta khong co san" }}
```

The `moTa` field comes from the database and could contain malicious scripts injected via admin book editing. If an admin account is compromised or XSS is injected via book description, any user viewing the detail page will execute the payload.

**Fix:** Use a sanitization library like `DOMPurify`:
```typescript
import DOMPurify from 'dompurify';
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sach.moTa || "") }}
```

### H2. Order Creation Request Body Mismatch

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\products\ThanhToan.tsx` lines 102-109
**Backend:** `POST /api/don-hang/them` expects `@RequestBody List<Sach>` (full Sach entities)
**Frontend sends:** `[{ maSach: number, soLuong: number }]` (minimal DTOs)

The backend expects `List<Sach>` but receives objects with only `maSach` and `soLuong` fields. The `soLuong` field on `Sach` entity may work by coincidence (if Spring deserializes partial objects), but fields like `tenSach`, `giaBan` etc. will be null, potentially causing NPEs in `orderService.saveOrUpdate()`.

**Impact:** Order creation may silently create corrupt orders or fail with server errors.

### H3. Wishlist State Not Synced on SachProps Cards

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\products\components\SachProps.tsx`

The `daYeuThich` state initializes as `false` and never fetches actual wishlist status. So all book cards show un-hearted state even if books are in the wishlist. Contrast with `ChiTietSanPham.tsx` which correctly fetches and checks.

**Fix:** Either pass wishlist IDs as a prop from parent, or fetch wishlist once in a context/provider and share across components.

### H4. RequireAuth Does Not Validate JWT Expiry

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\utils\RequireAuth.tsx`

Only checks `if (!jwt)` -- a token that exists but is expired will pass the guard, and the API call will fail with 401. User sees a confusing error instead of being redirected to login.

**Fix:** Decode the JWT and check `exp` claim:
```typescript
export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) return <Navigate to="/dang-nhap" />;
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('jwt');
      return <Navigate to="/dang-nhap" />;
    }
  } catch {
    localStorage.removeItem('jwt');
    return <Navigate to="/dang-nhap" />;
  }
  return children;
};
```

---

## Medium Priority

### M1. Checkout Does Not Send Selected Address or Coupon to Backend

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\products\ThanhToan.tsx` lines 99-126

The `handleDatHang` function collects `diaChiDaChon` and `maCoupon` but never sends them to the backend order creation endpoint. The user selects an address and applies a coupon, but neither affects the actual order.

```typescript
// Current: only sends maSach + soLuong
const orderItems = gioHang.map(item => ({ maSach: item.maSach, soLuong: item.soLuong }));
// Missing: diaChiDaChon, maCoupon not included
```

### M2. Hardcoded `http://localhost:8080` Across All API Files

Every API file hardcodes `http://localhost:8080`. This will break in any non-local environment (staging, production, Docker). Should use an environment variable:

```typescript
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';
```

**Affected files:** `TheLoaiApi.ts`, `NguoiDungApi.ts`, `YeuThichApi.ts`, `DiaChiApi.ts`, `CouponApi.ts`, `AdminApi.ts`, `SachApi.ts`, `ThanhToan.tsx`, `DangNhap.tsx`, and 10+ more.

### M3. Token Logged to Console in Production

**File:** `e:\BT\Stack1\book_fe-master\src\api\SachApi.ts` line 150

```typescript
console.log('Token:', token);
console.log('Request Headers:', { 'Authorization': `Bearer ${token}`, ... });
```

JWT tokens logged to console are visible to browser extensions and anyone with DevTools access.

### M4. `authRequest` Content-Type Always Set to JSON -- Breaks File Uploads

**File:** `e:\BT\Stack1\book_fe-master\src\api\Request.ts` lines 15-18

```typescript
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...((options.headers as Record<string, string>) || {}),
};
```

When `AdminApi.ts:uploadHinhAnhSach` bypasses `authRequest` and uses raw `fetch`, this is correctly avoided. But if someone refactors to use `authRequest` for file uploads, it will break because FormData needs the browser to auto-set Content-Type with boundary.

This is currently not a bug but a design fragility worth noting.

### M5. Checkout Allows Order With No Address Selected

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\products\ThanhToan.tsx`

`handleDatHang` does not validate that `diaChiDaChon` is not null before submitting. If user has no addresses, the "Confirm" button is still enabled.

### M6. SachRow Hardcoded to 4 Items Despite API Fetching 8

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\homepage\components\SachRow.tsx` line 19

```typescript
{danhSach.slice(0, 4).map(sach => (...))}
```

`getSachBanChay` and `getSachMoiNhat` default to `limit=8` but `SachRow` slices to 4. The 4 extra items are fetched but discarded. Either reduce the API limit or display all items.

### M7. Missing `/yeu-thich` Route in App.tsx

**File:** `e:\BT\Stack1\book_fe-master\src\App.tsx`

Navbar links to `/yeu-thich` (line 249 of Navbar) but no route for `/yeu-thich` exists in `App.tsx`. Users clicking "Yeu thich" in the dropdown will see a blank page.

### M8. Admin Route Path Inconsistency

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\admin\layouts\AdminLayout.tsx`

Some routes use leading `/` and some don't:
- `path="dashboard"` (relative, correct)
- `path="/danh-sach-sach"` (absolute, bypasses parent `/quan-ly/*`)
- `path="quan-ly-coupon"` (relative, correct)

The absolute paths (`/danh-sach-sach`, `/them-sach`, etc.) will NOT be matched when the parent route is `/quan-ly/*` because React Router v6 treats them as root-level routes. These pages will never render.

**Fix:** Remove leading `/` from all child routes:
```typescript
<Route path="danh-sach-sach" element={<DanhSachSach />} />
<Route path="them-sach" element={<SachForm_Admin />} />
<Route path="cap-nhat-sach/:maSach" element={<CapNhatSach />} />
```

---

## Low Priority

### L1. Unused React Import

**File:** `e:\BT\Stack1\book_fe-master\src\api\SachApi.ts` line 1

```typescript
import React from "react";
```

React is not used in this pure API utility file.

### L2. `SanPhamGioHang` Interface Duplicated

Defined in both `ThanhToan.tsx` (line 12) and `CartItemsTable.tsx` (line 4). Should be extracted to a shared model file.

### L3. No Error State Display in ThongKeDashboard

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\admin\components\dashboard\ThongKeDashboard.tsx`

If `getThongKe()` fails, `thongKe` remains `null` and the dashboard renders with all `0` values. No error message is shown to the admin.

### L4. Navbar JWT Decode Without Try-Catch

**File:** `e:\BT\Stack1\book_fe-master\src\layouts\header-footer\Navbar.tsx` line 57

```typescript
const decodedJwt = JSON.parse(atob(jwt.split(".")[1]));
```

Same in `AdminSidebar.tsx` line 13. If a malformed JWT is stored in localStorage, this will throw and crash the entire app.

---

## Positive Observations

1. **Clean `authRequest` wrapper** -- consistent JWT injection, proper handling of 204 No Content responses, error text extraction
2. **Good loading states** -- skeleton placeholders in `ChiTietSanPham` and `SachProps` provide visual feedback
3. **Proper cart sync** -- `window.dispatchEvent(new Event('cartUpdated'))` keeps Navbar badge in sync
4. **Well-typed models** -- `TheLoaiModel`, `DiaChiModel`, `CouponModel`, `ThongKeModel` with appropriate optional fields
5. **Modular checkout** -- `CartItemsTable` and `CheckoutSidebar` extracted as clean presentational components
6. **Coupon validation flow** -- client-side check + server validation with clear user feedback
7. **Password reset flow** -- complete chain: forgot -> email -> reset with token, proper error handling

---

## Summary Table

| # | Severity | Issue | File |
|---|----------|-------|------|
| C1 | CRITICAL | Coupon update URL missing ID -- all updates 404 | CouponApi.ts:27 |
| C2 | CRITICAL | HoSoNguoiDung double-parses JSON -- crashes on load | HoSoNguoiDung.tsx:38 |
| H1 | HIGH | XSS via dangerouslySetInnerHTML on book moTa | ChiTietSanPham.tsx:208 |
| H2 | HIGH | Order body mismatch (DTOs vs List\<Sach\>) | ThanhToan.tsx:102 |
| H3 | HIGH | Wishlist state not synced on card components | SachProps.tsx |
| H4 | HIGH | RequireAuth ignores JWT expiry | RequireAuth.tsx |
| M1 | MEDIUM | Address/coupon not sent in order request | ThanhToan.tsx:99 |
| M2 | MEDIUM | Hardcoded localhost:8080 everywhere | All API files |
| M3 | MEDIUM | JWT token logged to console | SachApi.ts:150 |
| M4 | MEDIUM | authRequest always sets Content-Type: JSON | Request.ts:15 |
| M5 | MEDIUM | Order submittable without address | ThanhToan.tsx |
| M6 | MEDIUM | API fetches 8 items, UI shows 4 | SachRow.tsx:19 |
| M7 | MEDIUM | Missing /yeu-thich route | App.tsx |
| M8 | MEDIUM | Admin child routes with absolute paths won't match | AdminLayout.tsx |
| L1 | LOW | Unused React import in API file | SachApi.ts:1 |
| L2 | LOW | Duplicated SanPhamGioHang interface | ThanhToan.tsx, CartItemsTable.tsx |
| L3 | LOW | No error state in dashboard | ThongKeDashboard.tsx |
| L4 | LOW | JWT decode without try-catch in navbar | Navbar.tsx:57, AdminSidebar.tsx:13 |

---

## Recommended Actions (Priority Order)

1. **Fix C1 & C2 immediately** -- these are runtime crashes blocking core functionality
2. **Fix M8** -- admin routes with absolute paths are broken in React Router v6
3. **Fix M7** -- add `/yeu-thich` route or it's a dead link
4. **Sanitize H1** -- install DOMPurify, sanitize `moTa` before rendering
5. **Address H2** -- verify backend `saveOrUpdate` handles partial Sach objects, or adjust request body
6. **Fix H4** -- add JWT expiry check in RequireAuth
7. **Remove M3** -- delete console.log of tokens before any deployment
8. **Plan M2** -- centralize API base URL via env variable

---

## Unresolved Questions

1. Does the backend `saveOrUpdate(List<Sach>)` work with partial Sach objects (only `maSach` + `soLuong`)? Need to verify the service implementation to confirm H2 severity.
2. Is there a separate `/yeu-thich` page component that was not listed in the changed files? If so, M7 may just need a route addition.
3. The `DonHangController.submitOrder` sends `amount` as `int` -- will this handle amounts > 2.1 billion VND correctly?
