---
title: "Phase 01 - API Layer"
description: "Create new API service files and models for all missing backend integrations"
status: pending
priority: P1
effort: 1.5h
---

# Phase 01 - API Layer

## Context Links
- [Plan Overview](./plan.md)
- Frontend API dir: `e:\BT\Stack1\book_fe-master\src\api\`
- Frontend models dir: `e:\BT\Stack1\book_fe-master\src\models\`
- Existing pattern reference: `SachApi.ts`, `DanhGiaAPI.ts`

## Overview
Create API service files and TypeScript models for all new backend endpoints. Every subsequent phase depends on this.

## Key Insights
- Existing code uses raw `fetch()` with `http://localhost:8080` hardcoded
- Auth calls use `localStorage.getItem('jwt')` for Bearer token
- `my_request()` in `Request.ts` only does GET without auth -- only useful for public GETs
- Authenticated calls use inline fetch with headers (see `capNhatSach()` in SachApi.ts)
- Models use class-based pattern with constructors (not interfaces)

## Architecture

### Helper pattern to reduce boilerplate
Create a small authenticated fetch wrapper in `Request.ts` alongside existing `my_request()`:

```typescript
// Add to Request.ts
export async function authRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }
  return response.json();
}
```

## Files to Create

### 1. `src/models/TheLoaiModel.ts`
```typescript
export interface TheLoaiModel {
  maTheLoai: number;
  tenTheLoai: string;
  soLuongSach: number;
}
```
Use interface (simpler, sufficient) -- no constructor needed since API returns plain JSON.

### 2. `src/models/DiaChiModel.ts`
```typescript
export interface DiaChiModel {
  maDiaChi?: number;
  hoTen: string;
  soDienThoai: string;
  diaChiDayDu: string;
}
```

### 3. `src/models/CouponModel.ts`
```typescript
export interface CouponModel {
  maCoupon?: number;
  ma: string;
  moTa?: string;
  phanTramGiam?: number;
  soTienGiamToiDa?: number;
  giaTriDonToiThieu?: number;
  soLuong?: number;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  isActive?: boolean;
}

export interface KetQuaKiemTraCoupon {
  hopLe: boolean;
  soTienGiam: number;
  thongBao: string;
}
```

### 4. `src/models/ThongKeModel.ts`
```typescript
export interface ThongKeModel {
  tongDoanhThu: number;
  donHangHomNay: number;
  doanhThuHomNay: number;
  tongDonHang: number;
  soBinhLuanChoXet: number;
  topSachBanChay: Array<{ tenSach: string; soLuongBan: number }>;
}
```

### 5. `src/api/TheLoaiApi.ts`
```typescript
import { my_request } from './Request';
import { TheLoaiModel } from '../models/TheLoaiModel';

const BASE = 'http://localhost:8080';

export async function getAllTheLoai(): Promise<TheLoaiModel[]> {
  return my_request(`${BASE}/api/the-loai`);
}
```

### 6. `src/api/NguoiDungApi.ts`
```typescript
import { authRequest } from './Request';

const BASE = 'http://localhost:8080';

export async function getHoSo() {
  return authRequest(`${BASE}/api/nguoi-dung/ho-so`);
}

export async function capNhatHoSo(data: any) {
  return authRequest(`${BASE}/api/nguoi-dung/cap-nhat-ho-so`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function doiMatKhau(matKhauCu: string, matKhauMoi: string) {
  return authRequest(`${BASE}/tai-khoan/doi-mat-khau`, {
    method: 'PUT',
    body: JSON.stringify({ matKhauCu, matKhauMoi }),
  });
}

export async function quenMatKhau(email: string) {
  const res = await fetch(`${BASE}/tai-khoan/quen-mat-khau`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function datLaiMatKhau(token: string, matKhauMoi: string) {
  const res = await fetch(`${BASE}/tai-khoan/dat-lai-mat-khau`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, matKhauMoi }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

### 7. `src/api/YeuThichApi.ts`
```typescript
import { authRequest } from './Request';

const BASE = 'http://localhost:8080';

export async function getDanhSachYeuThich() {
  return authRequest(`${BASE}/api/yeu-thich`);
}

export async function themYeuThich(maSach: number) {
  return authRequest(`${BASE}/api/yeu-thich/${maSach}`, { method: 'POST' });
}

export async function xoaYeuThich(maSach: number) {
  return authRequest(`${BASE}/api/yeu-thich/${maSach}`, { method: 'DELETE' });
}
```

### 8. `src/api/DiaChiApi.ts`
```typescript
import { authRequest } from './Request';
import { DiaChiModel } from '../models/DiaChiModel';

const BASE = 'http://localhost:8080';

export async function getDanhSachDiaChi(): Promise<DiaChiModel[]> {
  return authRequest(`${BASE}/api/dia-chi`);
}

export async function themDiaChi(diaChi: DiaChiModel) {
  return authRequest(`${BASE}/api/dia-chi`, {
    method: 'POST',
    body: JSON.stringify(diaChi),
  });
}

export async function capNhatDiaChi(id: number, diaChi: DiaChiModel) {
  return authRequest(`${BASE}/api/dia-chi/${id}`, {
    method: 'PUT',
    body: JSON.stringify(diaChi),
  });
}

export async function xoaDiaChi(id: number) {
  return authRequest(`${BASE}/api/dia-chi/${id}`, { method: 'DELETE' });
}
```

### 9. `src/api/CouponApi.ts`
```typescript
import { authRequest } from './Request';
import { CouponModel, KetQuaKiemTraCoupon } from '../models/CouponModel';

const BASE = 'http://localhost:8080';

// User-facing
export async function kiemTraCoupon(ma: string, tongGioHang: number): Promise<KetQuaKiemTraCoupon> {
  return authRequest(`${BASE}/api/coupon/kiem-tra`, {
    method: 'POST',
    body: JSON.stringify({ ma, tongGioHang }),
  });
}

// Admin CRUD
export async function getAllCoupons(): Promise<CouponModel[]> {
  return authRequest(`${BASE}/api/admin/coupon`);
}

export async function themCoupon(coupon: CouponModel) {
  return authRequest(`${BASE}/api/admin/coupon`, {
    method: 'POST',
    body: JSON.stringify(coupon),
  });
}

export async function capNhatCoupon(coupon: CouponModel) {
  return authRequest(`${BASE}/api/admin/coupon`, {
    method: 'PUT',
    body: JSON.stringify(coupon),
  });
}

export async function xoaCoupon(id: number) {
  return authRequest(`${BASE}/api/admin/coupon/${id}`, { method: 'DELETE' });
}
```

### 10. Add to existing `src/api/SachApi.ts`
```typescript
// Add these new exports:
export async function getSachBanChay(limit: number = 8): Promise<SachModel[]> {
  return my_request(`http://localhost:8080/api/sach/ban-chay?limit=${limit}`);
}

export async function getSachMoiNhat(limit: number = 8): Promise<SachModel[]> {
  return my_request(`http://localhost:8080/api/sach/moi-nhat?limit=${limit}`);
}

export async function getSachLienQuan(maSach: number, limit: number = 6): Promise<SachModel[]> {
  return my_request(`http://localhost:8080/api/sach/${maSach}/lien-quan?limit=${limit}`);
}
```

### 11. `src/api/AdminApi.ts`
```typescript
import { authRequest } from './Request';
import { ThongKeModel } from '../models/ThongKeModel';

const BASE = 'http://localhost:8080';

export async function getThongKe(): Promise<ThongKeModel> {
  return authRequest(`${BASE}/api/admin/thong-ke`);
}

export async function uploadHinhAnhSach(maSach: number, file: File) {
  const token = localStorage.getItem('jwt');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE}/api/admin/sach/${maSach}/hinh-anh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
```

## Files to Modify
| File | Change |
|------|--------|
| `src/api/Request.ts` | Add `authRequest()` helper |
| `src/api/SachApi.ts` | Add 3 new exports (ban-chay, moi-nhat, lien-quan) |

## Implementation Steps
1. Add `authRequest()` to `Request.ts`
2. Create 4 model files: `TheLoaiModel.ts`, `DiaChiModel.ts`, `CouponModel.ts`, `ThongKeModel.ts`
3. Create 5 API files: `TheLoaiApi.ts`, `NguoiDungApi.ts`, `YeuThichApi.ts`, `DiaChiApi.ts`, `CouponApi.ts`, `AdminApi.ts`
4. Add 3 functions to `SachApi.ts`
5. Run `npm run build` to verify no TypeScript errors

## Todo List
- [ ] Add `authRequest()` to Request.ts
- [ ] Create TheLoaiModel.ts
- [ ] Create DiaChiModel.ts
- [ ] Create CouponModel.ts
- [ ] Create ThongKeModel.ts
- [ ] Create TheLoaiApi.ts
- [ ] Create NguoiDungApi.ts
- [ ] Create YeuThichApi.ts
- [ ] Create DiaChiApi.ts
- [ ] Create CouponApi.ts
- [ ] Create AdminApi.ts
- [ ] Add getSachBanChay, getSachMoiNhat, getSachLienQuan to SachApi.ts
- [ ] Verify TypeScript build passes

## Success Criteria
- All new API files compile without errors
- `authRequest()` correctly attaches JWT from localStorage
- Each API function matches the backend endpoint contract exactly
