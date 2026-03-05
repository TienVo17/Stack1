---
title: "Phase 06 - Admin Features"
description: "Dashboard stats page, coupon management CRUD, and Cloudinary upload verification"
status: pending
priority: P2
effort: 2h
---

# Phase 06 - Admin Features

## Context Links
- [Plan Overview](./plan.md) | [Phase 01 - API Layer](./phase-01-api-layer.md)
- AdminLayout: `e:\BT\Stack1\book_fe-master\src\layouts\admin\layouts\AdminLayout.tsx`
- AdminSidebar: `e:\BT\Stack1\book_fe-master\src\layouts\admin\components\AdminSidebar.tsx`
- UploadFile: `e:\BT\Stack1\book_fe-master\src\layouts\admin\components\UploadFile.tsx`
- AdminApi, CouponApi: created in Phase 01

## Overview
Add admin dashboard with stats, coupon CRUD management page, and verify/fix image upload to use the new Cloudinary endpoint.

## Key Insights
- AdminLayout uses nested routes under `/quan-ly/*`
- Dashboard route is commented out in both AdminLayout.tsx (line 17) and AdminSidebar.tsx (lines 113-118)
- UploadFile.tsx converts images to base64/WebP client-side -- new API uses multipart `POST /api/admin/sach/{id}/hinh-anh` with raw file
- Sidebar shows menu items conditionally: some only for `isAdmin` (not `isStaff`)
- AdminSidebar has no "Dashboard" or "Coupon" menu items currently

## Files to Create

### 1. `src/layouts/admin/components/dashboard/ThongKeDashboard.tsx`

Dashboard stats page showing key metrics and top-selling books.

```tsx
// Structure:
// - useEffect: call getThongKe() on mount
// - Display stat cards in a grid: tongDoanhThu, donHangHomNay, doanhThuHomNay, tongDonHang
// - Alert badge for soBinhLuanChoXet
// - Table: topSachBanChay list

import React, { useState, useEffect } from 'react';
import { getThongKe } from '../../../../api/AdminApi';
import { ThongKeModel } from '../../../../models/ThongKeModel';
```

**Layout (~120 lines):**
```tsx
// Stat cards row (4 cards):
<div className="row mb-4">
  <div className="col-md-3">
    <div className="card bg-primary text-white">
      <div className="card-body">
        <h6>Tong doanh thu</h6>
        <h3>{thongKe.tongDoanhThu.toLocaleString()} d</h3>
      </div>
    </div>
  </div>
  {/* Similar cards for: donHangHomNay, doanhThuHomNay, tongDonHang */}
</div>

// Pending reviews alert:
{thongKe.soBinhLuanChoXet > 0 && (
  <div className="alert alert-warning">
    Co {thongKe.soBinhLuanChoXet} binh luan cho duyet
  </div>
)}

// Top sellers table:
<div className="card">
  <div className="card-header">Top sach ban chay</div>
  <table className="table">
    <thead><tr><th>#</th><th>Ten sach</th><th>So luong ban</th></tr></thead>
    <tbody>
      {thongKe.topSachBanChay.map((s, i) => (
        <tr key={i}><td>{i+1}</td><td>{s.tenSach}</td><td>{s.soLuongBan}</td></tr>
      ))}
    </tbody>
  </table>
</div>
```

### 2. `src/layouts/admin/components/coupon/QuanLyCoupon.tsx`

CRUD table for coupon management.

```tsx
// Structure:
// - useEffect: getAllCoupons() on mount
// - Table with columns: ma, moTa, phanTramGiam, soLuong, ngayBatDau, ngayKetThuc, actions
// - Add/Edit modal (or inline form)
// - Delete with confirmation

import React, { useState, useEffect } from 'react';
import { getAllCoupons, themCoupon, capNhatCoupon, xoaCoupon } from '../../../../api/CouponApi';
import { CouponModel } from '../../../../models/CouponModel';
import { toast } from 'react-toastify';
```

**Layout (~150 lines, consider splitting if over 200):**

**Table section:**
```tsx
<div className="card">
  <div className="card-header d-flex justify-content-between">
    <h5>Quan ly coupon</h5>
    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
      <i className="fas fa-plus me-1"></i>Them coupon
    </button>
  </div>
  <table className="table table-hover">
    <thead>
      <tr>
        <th>Ma</th><th>Mo ta</th><th>% Giam</th>
        <th>So luong</th><th>Bat dau</th><th>Ket thuc</th><th></th>
      </tr>
    </thead>
    <tbody>
      {coupons.map(c => (
        <tr key={c.maCoupon}>
          <td><code>{c.ma}</code></td>
          <td>{c.moTa}</td>
          <td>{c.phanTramGiam}%</td>
          <td>{c.soLuong}</td>
          <td>{c.ngayBatDau}</td>
          <td>{c.ngayKetThuc}</td>
          <td>
            <button className="btn btn-sm btn-outline-primary me-1"
              onClick={() => handleEdit(c)}>
              <i className="fas fa-edit"></i>
            </button>
            <button className="btn btn-sm btn-outline-danger"
              onClick={() => handleDelete(c.maCoupon!)}>
              <i className="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Inline form (toggle visibility with `showForm` state):**
```tsx
// Simple form below the "Them coupon" button area:
// Fields: ma, moTa, phanTramGiam, soTienGiamToiDa, giaTriDonToiThieu, soLuong, ngayBatDau, ngayKetThuc
// Submit: isEditing ? capNhatCoupon(form) : themCoupon(form)
// On success: reload list, close form, toast
```

**If file exceeds 200 lines,** split form into `CouponForm.tsx` in same directory.

## Files to Modify

### 1. `src/layouts/admin/layouts/AdminLayout.tsx`

**Add routes for dashboard and coupon:**
```tsx
// New imports:
import ThongKeDashboard from '../components/dashboard/ThongKeDashboard';
import QuanLyCoupon from '../components/coupon/QuanLyCoupon';

// Add routes (uncomment/replace dashboard, add coupon):
<Route path="dashboard" element={<ThongKeDashboard />} />
<Route path="quan-ly-coupon" element={<QuanLyCoupon />} />
```

### 2. `src/layouts/admin/components/AdminSidebar.tsx`

**Uncomment Dashboard link (lines 113-118) and add Coupon menu item:**

```tsx
// Uncomment Dashboard:
<li className="nav-item">
  <NavLink to="/quan-ly/dashboard" className="nav-link text-white">
    <i className="fas fa-tachometer-alt me-2"></i>
    Dashboard
  </NavLink>
</li>

// Add Coupon menu item (after binh luan section, admin-only):
{userInfo?.isAdmin && (
  <li className="nav-item">
    <NavLink to="/quan-ly/quan-ly-coupon" className="nav-link text-white">
      <i className="fas fa-ticket-alt me-2"></i>
      Quan ly coupon
    </NavLink>
  </li>
)}
```

### 3. `src/layouts/admin/components/UploadFile.tsx` (Verify/Update)

**Current behavior:** Converts file to base64 client-side, passes base64 string to parent via callback. The parent (SachForm) includes the base64 in the book JSON body.

**New API:** `POST /api/admin/sach/{id}/hinh-anh` accepts multipart form data with raw file.

**Decision:** Keep existing UploadFile.tsx for the book creation flow (base64 embedded in book JSON). The new Cloudinary endpoint can be used for adding images to existing books. No change needed if existing flow works. Only add a separate upload option if the base64 approach is being deprecated.

**Recommendation:** Leave UploadFile.tsx as-is for now. If backend removes base64 support, refactor to use `uploadHinhAnhSach()` from AdminApi. Add a TODO comment at the top of the file.

## Related Code Files
| File | Action | Purpose |
|------|--------|---------|
| `admin/components/dashboard/ThongKeDashboard.tsx` | CREATE | Stats dashboard |
| `admin/components/coupon/QuanLyCoupon.tsx` | CREATE | Coupon CRUD |
| `admin/layouts/AdminLayout.tsx` | MODIFY | Add new routes |
| `admin/components/AdminSidebar.tsx` | MODIFY | Add menu items |
| `admin/components/UploadFile.tsx` | REVIEW | Add TODO comment only |

## Implementation Steps
1. Create `ThongKeDashboard.tsx` with stats cards + top sellers table
2. Create `QuanLyCoupon.tsx` with CRUD table + inline form
3. Update `AdminLayout.tsx` with new routes
4. Update `AdminSidebar.tsx` with dashboard + coupon links
5. Review `UploadFile.tsx`, add TODO if needed
6. Test: dashboard loads stats, coupon CRUD works

## Todo List
- [ ] Create ThongKeDashboard.tsx
- [ ] Create QuanLyCoupon.tsx
- [ ] Add dashboard + coupon routes to AdminLayout.tsx
- [ ] Uncomment dashboard + add coupon in AdminSidebar.tsx
- [ ] Review UploadFile.tsx, add TODO comment
- [ ] Test dashboard stats display
- [ ] Test coupon add/edit/delete

## Success Criteria
- Dashboard shows 4 stat cards with real data
- Pending reviews alert visible when count > 0
- Top sellers table populated
- Coupon table lists all coupons
- Add/edit/delete coupon works with toast feedback
- Dashboard and coupon pages accessible from sidebar

## Risk Assessment
- ThongKeModel shape must match API response -- verify field names
- CouponModel fields might differ from backend -- test with real API
- Coupon form date fields need `type="date"` input -- format must match backend expectation
