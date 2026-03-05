---
title: "Phase 05 - Checkout Improvements"
description: "Add coupon input and shipping address selection to checkout page"
status: pending
priority: P2
effort: 2h
---

# Phase 05 - Checkout Improvements

## Context Links
- [Plan Overview](./plan.md) | [Phase 01 - API Layer](./phase-01-api-layer.md)
- ThanhToan: `e:\BT\Stack1\book_fe-master\src\layouts\products\ThanhToan.tsx`
- DiaChiApi, CouponApi: created in Phase 01

## Overview
Add coupon code input with discount calculation and shipping address selection/management to the checkout page. Currently ThanhToan.tsx has no coupon or address features.

## Key Insights (Critical)
- **ThanhToan.tsx auto-submits the order on mount** (lines 62-88). The `useEffect` calls `POST /api/don-hang/them` immediately when the page loads. This means:
  - Coupon and address must be captured BEFORE the order is submitted
  - The current flow needs restructuring: show cart summary first, let user apply coupon + select address, THEN submit order
- Current flow: load cart from localStorage -> immediately POST order -> show VNPay button
- VNPay payment uses `donHang.tongTien` and `donHang.maDonHang` from the order response

## Architecture Change

The checkout page needs a **two-step flow**:

**Step 1 - Review (before order submission):**
- Show cart items (already works)
- Shipping address selector
- Coupon input + apply button
- Total calculation with discount
- "Xac nhan dat hang" button

**Step 2 - Payment (after order created):**
- Show order confirmation
- VNPay payment button (existing logic)

This is a significant refactor of ThanhToan.tsx. The order submission must move from `useEffect` to an explicit button click handler.

## Files to Modify

### 1. `src/layouts/products/ThanhToan.tsx` (Major Refactor)

**Remove:** Auto-order-creation from useEffect (lines 48-91)
**Add:** Address selection, coupon input, explicit order submission

**New component state:**
```tsx
// Existing
const [gioHang, setGioHang] = useState<SanPhamGioHang[]>([]);
const [donHang, setDonHang] = useState<any>(null);

// New
const [danhSachDiaChi, setDanhSachDiaChi] = useState<DiaChiModel[]>([]);
const [diaChiDaChon, setDiaChiDaChon] = useState<number | null>(null);
const [maCoupon, setMaCoupon] = useState('');
const [couponResult, setCouponResult] = useState<KetQuaKiemTraCoupon | null>(null);
const [dangTao, setDangTao] = useState(false);
const [buocHienTai, setBuocHienTai] = useState<'review' | 'payment'>('review');
```

**New imports:**
```tsx
import { getDanhSachDiaChi, themDiaChi } from '../../api/DiaChiApi';
import { kiemTraCoupon } from '../../api/CouponApi';
import { DiaChiModel } from '../../models/DiaChiModel';
import { KetQuaKiemTraCoupon } from '../../models/CouponModel';
import { toast } from 'react-toastify';
```

**Refactored useEffect (only loads cart + addresses, no order creation):**
```tsx
useEffect(() => {
  // Load cart with images (keep existing loadGioHangWithImages logic)
  loadGioHangWithImages();

  // Load saved addresses
  getDanhSachDiaChi()
    .then(list => {
      setDanhSachDiaChi(list);
      if (list.length > 0) setDiaChiDaChon(list[0].maDiaChi!);
    })
    .catch(console.error);
}, []);
```

**Coupon handler:**
```tsx
const handleApCoupon = async () => {
  if (!maCoupon.trim()) return;
  try {
    const tongTien = gioHang.reduce(
      (t, item) => t + item.sachDto.giaBan * item.soLuong, 0
    );
    const result = await kiemTraCoupon(maCoupon, tongTien);
    setCouponResult(result);
    if (result.hopLe) {
      toast.success(`Giam ${result.soTienGiam.toLocaleString()} d`);
    } else {
      toast.error(result.thongBao);
    }
  } catch {
    toast.error('Khong the kiem tra coupon');
  }
};
```

**Order submission handler (moved from useEffect):**
```tsx
const handleDatHang = async () => {
  if (!diaChiDaChon && danhSachDiaChi.length > 0) {
    toast.error('Vui long chon dia chi giao hang');
    return;
  }
  setDangTao(true);
  try {
    const orderItems = gioHang.map(item => ({
      maSach: item.maSach,
      soLuong: item.soLuong,
    }));
    const response = await fetch('http://localhost:8080/api/don-hang/them', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
      },
      body: JSON.stringify(orderItems),
    });
    if (response.status === 401) {
      toast.error('Phien dang nhap het han');
      navigate('/dang-nhap');
      return;
    }
    const data = await response.json();
    setDonHang(data);
    setBuocHienTai('payment');
  } catch (err) {
    toast.error('Loi khi tao don hang');
  } finally {
    setDangTao(false);
  }
};
```

**JSX structure (two-step):**
```tsx
return (
  <div className="container py-5">
    {buocHienTai === 'review' ? (
      <div className="row">
        {/* Left: Cart items table (existing, keep as-is) */}
        <div className="col-md-8">
          {/* existing table code */}
        </div>

        {/* Right: Sidebar with address + coupon + total */}
        <div className="col-md-4">
          {/* Address selection card */}
          <div className="card mb-3">
            <div className="card-header">Dia chi giao hang</div>
            <div className="card-body">
              {danhSachDiaChi.map(dc => (
                <div key={dc.maDiaChi} className="form-check mb-2">
                  <input type="radio" name="diaChi"
                    checked={diaChiDaChon === dc.maDiaChi}
                    onChange={() => setDiaChiDaChon(dc.maDiaChi!)}
                    className="form-check-input" />
                  <label className="form-check-label">
                    {dc.hoTen} - {dc.soDienThoai}<br/>
                    <small>{dc.diaChiDayDu}</small>
                  </label>
                </div>
              ))}
              {danhSachDiaChi.length === 0 && (
                <p className="text-muted">Chua co dia chi nao</p>
              )}
            </div>
          </div>

          {/* Coupon input card */}
          <div className="card mb-3">
            <div className="card-header">Ma giam gia</div>
            <div className="card-body">
              <div className="input-group">
                <input type="text" className="form-control"
                  value={maCoupon}
                  onChange={e => setMaCoupon(e.target.value)}
                  placeholder="Nhap ma coupon" />
                <button className="btn btn-outline-primary"
                  onClick={handleApCoupon}>Ap dung</button>
              </div>
              {couponResult?.hopLe && (
                <div className="text-success mt-2">
                  Giam: {couponResult.soTienGiam.toLocaleString()} d
                </div>
              )}
            </div>
          </div>

          {/* Total + submit */}
          <div className="card">
            <div className="card-body">
              <div>Tam tinh: {tongTien.toLocaleString()} d</div>
              {discount > 0 && <div>Giam gia: -{discount.toLocaleString()} d</div>}
              <hr/>
              <div className="h5">Tong: {(tongTien - discount).toLocaleString()} d</div>
              <button className="btn-modern-primary w-100 mt-3"
                onClick={handleDatHang} disabled={dangTao}>
                {dangTao ? 'Dang xu ly...' : 'Xac nhan dat hang'}
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : (
      /* Payment step: show VNPay button (existing logic) */
      <div className="text-center">
        <h4>Don hang da tao thanh cong!</h4>
        <button className="btn bg-dark text-white mt-3"
          onClick={() => { /* existing VNPay redirect logic */ }}>
          Thanh toan VNPAY
        </button>
      </div>
    )}
  </div>
);
```

## Implementation Steps
1. Refactor ThanhToan.tsx: remove auto-order from useEffect
2. Add address loading + selection UI
3. Add coupon input + validation UI
4. Move order creation to button handler
5. Implement two-step flow (review -> payment)
6. Calculate totals with coupon discount
7. Test: full checkout flow with address + coupon + VNPay

## Todo List
- [ ] Remove auto-order-creation from useEffect
- [ ] Add address selection section
- [ ] Add coupon input with apply button
- [ ] Move order creation to explicit button click
- [ ] Calculate and display discount
- [ ] Implement review/payment two-step flow
- [ ] Keep VNPay payment working
- [ ] Test full checkout flow

## Success Criteria
- Checkout shows cart review with address and coupon options BEFORE order creation
- Coupon apply shows discount amount or error message
- Address radio selection works
- Order only created on "Xac nhan dat hang" click
- VNPay payment still works after order creation
- Empty address list shows message, checkout still works without address

## Risk Assessment
- **Major:** Removing auto-order from useEffect is a behavioral change. If backend expects a specific flow, test carefully
- If coupon API returns different shape than `KetQuaKiemTraCoupon`, adjust model
- Address list empty on first checkout -- user needs a way to add address (link to profile or inline form)
- VNPay redirect depends on `donHang.tongTien` -- if coupon changes total, backend must also apply discount to order total
