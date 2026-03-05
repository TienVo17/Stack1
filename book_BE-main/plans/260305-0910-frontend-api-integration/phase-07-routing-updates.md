---
title: "Phase 07 - Routing Updates"
description: "Register all new routes in App.tsx and AdminLayout.tsx"
status: pending
priority: P1
effort: 0.5h
---

# Phase 07 - Routing Updates

## Context Links
- [Plan Overview](./plan.md)
- [Phase 03 - User Features](./phase-03-user-features.md)
- [Phase 06 - Admin Features](./phase-06-admin-features.md)
- App.tsx: `e:\BT\Stack1\book_fe-master\src\App.tsx`

## Overview
Register all new page components as routes in App.tsx. Phase 06 already handles AdminLayout.tsx routing. This phase focuses on public/authenticated routes.

## Key Insights
- App.tsx has two route groups: `/quan-ly/*` (admin) and `/*` (everything else with Navbar+Footer)
- No `/profile` route exists despite Navbar linking to it
- No forgot/reset password routes exist
- RequireAuth guard created in Phase 03 protects authenticated pages
- ProtectedRoute (existing) redirects away from login/register if already logged in

## Files to Modify

### 1. `src/App.tsx`

**New imports:**
```tsx
import HoSoNguoiDung from './layouts/user/HoSoNguoiDung';
import QuenMatKhau from './layouts/user/QuenMatKhau';
import DatLaiMatKhau from './layouts/user/DatLaiMatKhau';
import { RequireAuth } from './layouts/utils/RequireAuth';
```

**New routes inside the `<Routes>` block under `/*` (after line 55, before `</Routes>`):**
```tsx
{/* Profile - requires authentication */}
<Route path="/profile" element={
  <RequireAuth>
    <HoSoNguoiDung />
  </RequireAuth>
} />

{/* Forgot password - public */}
<Route path="/quen-mat-khau" element={<QuenMatKhau />} />

{/* Reset password with token - public */}
<Route path="/dat-lai-mat-khau/:token" element={<DatLaiMatKhau />} />
```

**Complete route list after changes:**
```
/                          -> HomePage
/about                     -> About
/sach/:maSach              -> ChiTietSanPham
/dang-ky                   -> DangKyNguoiDung
/thanh-toan                -> ThanhToan
/xu-ly-kq-thanh-toan       -> KetQuaThanhToan
/order                     -> DonHangUser
/kich-hoat/:email/:maKichHoat -> KichHoatTaiKhoan
/dang-nhap                 -> DangNhap
/test                      -> Test
/gio-hang                  -> GioHang
/dat-hang-nhanh            -> DatHangNhanh
/profile                   -> HoSoNguoiDung (NEW, RequireAuth)
/quen-mat-khau             -> QuenMatKhau (NEW)
/dat-lai-mat-khau/:token   -> DatLaiMatKhau (NEW)

/quan-ly/dashboard         -> ThongKeDashboard (added in Phase 06)
/quan-ly/quan-ly-coupon    -> QuanLyCoupon (added in Phase 06)
```

## Implementation Steps
1. Add imports for 3 new page components + RequireAuth
2. Add 3 new `<Route>` elements inside the public routes block
3. Verify no route conflicts or duplicate paths
4. Run `npm run build` to confirm compilation

## Todo List
- [ ] Import HoSoNguoiDung, QuenMatKhau, DatLaiMatKhau, RequireAuth
- [ ] Add /profile route with RequireAuth wrapper
- [ ] Add /quen-mat-khau route
- [ ] Add /dat-lai-mat-khau/:token route
- [ ] Verify TypeScript build passes
- [ ] Test navigation: Navbar profile link -> profile page
- [ ] Test navigation: login forgot password -> quen-mat-khau page

## Success Criteria
- All new pages reachable via their URLs
- Profile page redirects to login when not authenticated
- Forgot/reset password pages accessible without authentication
- No broken imports or route conflicts
- Existing routes unaffected

## Security Considerations
- `/profile` wrapped in RequireAuth -- unauthenticated users redirected to `/dang-nhap`
- `/quen-mat-khau` and `/dat-lai-mat-khau/:token` intentionally public (need to be accessible without login)
- Admin routes already protected by existing `AdminRoute` wrapper
