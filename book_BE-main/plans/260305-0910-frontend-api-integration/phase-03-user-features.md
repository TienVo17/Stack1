---
title: "Phase 03 - User Features"
description: "Profile page, password change, forgot password flow"
status: pending
priority: P1
effort: 3h
---

# Phase 03 - User Features

## Context Links
- [Plan Overview](./plan.md) | [Phase 01 - API Layer](./phase-01-api-layer.md)
- DangNhap: `e:\BT\Stack1\book_fe-master\src\layouts\user\DangNhap.tsx`
- NguoiDungModel: `e:\BT\Stack1\book_fe-master\src\models\NguoiDungModel.ts`
- User pages dir: `e:\BT\Stack1\book_fe-master\src\layouts\user\`

## Overview
Create profile page (view/edit), password change section, forgot-password flow (request + reset). Currently Navbar links to `/profile` but no route or component exists. "Quen mat khau?" button on login page has empty `onClick`.

## Key Insights
- JWT payload contains `sub` (username), `isAdmin`, `isStaff` -- decoded via `atob(jwt.split('.')[1])`
- NguoiDungModel has: hoDem, ten, tenDangNhap, gioiTinh, email, soDienThoai, ngaySinh, avatar, diaChiGiaoHang
- Existing auth pages use `auth-container`, `auth-card`, `auth-input` CSS classes
- ProtectedRoute currently redirects TO "/" if jwt EXISTS (reverse guard for login/register pages)
- Need a RequireAuth guard (opposite of ProtectedRoute) for profile page

## Files to Create

### 1. `src/layouts/user/HoSoNguoiDung.tsx` (Profile Page)

Two sections: profile info form + password change form.

```tsx
// Structure:
// - useEffect: call getHoSo() on mount, populate form state
// - Form fields: hoDem, ten, email (readonly), soDienThoai, gioiTinh, ngaySinh
// - Submit: call capNhatHoSo(formData), toast success/error
// - Password section: matKhauCu, matKhauMoi, xacNhanMatKhau
// - Password submit: validate match, call doiMatKhau(), toast result

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getHoSo, capNhatHoSo, doiMatKhau } from '../../api/NguoiDungApi';
```

**Profile info section (~80 lines):**
- Container with `auth-container` style (reuse existing pattern)
- On mount: `getHoSo()` -> fill `hoSo` state
- Editable fields: hoDem, ten, soDienThoai, gioiTinh (radio), ngaySinh (date input)
- Read-only: email, tenDangNhap
- Save button: `capNhatHoSo(hoSo)` -> toast

**Password change section (~50 lines):**
- Separate card/form within same page
- Fields: matKhauCu, matKhauMoi, xacNhanMatKhau
- Validation: matKhauMoi === xacNhanMatKhau
- Submit: `doiMatKhau(matKhauCu, matKhauMoi)` -> toast
- Clear fields on success

**Key UI details:**
- Use existing CSS classes: `auth-card`, `auth-input`, `btn-modern-primary`
- Include loading states with spinner (same pattern as DangNhap.tsx)
- Redirect to `/dang-nhap` if no JWT

### 2. `src/layouts/user/QuenMatKhau.tsx` (Forgot Password Request)

Simple form: email input -> calls `quenMatKhau(email)` -> shows success message.

```tsx
// Structure:
// - email state + isLoading + message state
// - onSubmit: quenMatKhau(email) -> show "Check your email" message
// - Link back to /dang-nhap
// - Reuse auth-container / auth-card pattern
```

**UI elements (~60 lines):**
- Icon: `fa-envelope` in gradient circle (same pattern as DangNhap)
- Title: "Quen mat khau"
- Subtitle: "Nhap email de nhan lien ket dat lai mat khau"
- Email input field
- Submit button with loading spinner
- Success state: swap form for confirmation message with `fa-check-circle`
- "Quay lai dang nhap" link

### 3. `src/layouts/user/DatLaiMatKhau.tsx` (Reset Password)

Form with token from URL params + new password fields.

```tsx
// Structure:
// - Read token from URL: useParams() -> { token }
// - Fields: matKhauMoi, xacNhanMatKhau
// - Submit: datLaiMatKhau(token, matKhauMoi)
// - On success: toast + navigate to /dang-nhap
```

**UI elements (~70 lines):**
- Icon: `fa-lock` in gradient circle
- Title: "Dat lai mat khau"
- Two password fields + validation
- Submit button
- Error state if token invalid (API returns error)
- On success: navigate to `/dang-nhap` with toast

### 4. `src/layouts/utils/RequireAuth.tsx` (Auth Guard)

Opposite of existing ProtectedRoute -- redirects to login if NOT authenticated.

```tsx
import { Navigate } from 'react-router-dom';

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    return <Navigate to="/dang-nhap" />;
  }
  return children;
};
```

## Files to Modify

### 1. `src/layouts/user/DangNhap.tsx`

**Change:** Wire "Quen mat khau?" button to navigate to `/quen-mat-khau`

```tsx
// Line 98-104: Change onClick from empty function to navigate
// Before:
onClick={() => {}}
// After:
onClick={() => navigate('/quen-mat-khau')}
```

## Related Code Files
| File | Action | Purpose |
|------|--------|---------|
| `src/layouts/user/HoSoNguoiDung.tsx` | CREATE | Profile view/edit + password change |
| `src/layouts/user/QuenMatKhau.tsx` | CREATE | Forgot password email request |
| `src/layouts/user/DatLaiMatKhau.tsx` | CREATE | Reset password with token |
| `src/layouts/utils/RequireAuth.tsx` | CREATE | Auth guard for protected pages |
| `src/layouts/user/DangNhap.tsx` | MODIFY | Wire forgot password link |

## Implementation Steps
1. Create `RequireAuth.tsx` utility
2. Create `HoSoNguoiDung.tsx` -- profile form + password change
3. Create `QuenMatKhau.tsx` -- forgot password request
4. Create `DatLaiMatKhau.tsx` -- reset password with token
5. Modify `DangNhap.tsx` -- wire forgot password button
6. (Routes registered in Phase 07)

## Todo List
- [ ] Create RequireAuth.tsx
- [ ] Create HoSoNguoiDung.tsx with profile form
- [ ] Add password change section to HoSoNguoiDung.tsx
- [ ] Create QuenMatKhau.tsx
- [ ] Create DatLaiMatKhau.tsx
- [ ] Modify DangNhap.tsx forgot password onClick
- [ ] Verify all components compile

## Success Criteria
- Profile page loads user data from API, allows editing and saving
- Password change validates confirmation match, calls API, shows toast
- Forgot password sends email request, shows confirmation
- Reset password page reads token from URL, submits new password
- All pages redirect appropriately when not authenticated
- Existing CSS patterns reused (no new CSS needed)

## Security Considerations
- RequireAuth guard protects profile page
- Password change requires current password (server validates)
- Reset token is one-time use (server enforces)
- JWT checked on every authenticated API call via `authRequest()`
