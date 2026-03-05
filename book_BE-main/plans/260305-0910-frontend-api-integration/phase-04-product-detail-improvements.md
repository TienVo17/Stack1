---
title: "Phase 04 - Product Detail Improvements"
description: "Related books section and wishlist toggle on product detail and product cards"
status: pending
priority: P2
effort: 2h
---

# Phase 04 - Product Detail Improvements

## Context Links
- [Plan Overview](./plan.md) | [Phase 01 - API Layer](./phase-01-api-layer.md)
- ChiTietSanPham: `e:\BT\Stack1\book_fe-master\src\layouts\products\ChiTietSanPham.tsx`
- SachProps: `e:\BT\Stack1\book_fe-master\src\layouts\products\components\SachProps.tsx`
- YeuThichApi: created in Phase 01

## Overview
Add a "related books" section below reviews on the product detail page. Wire the existing heart icon button on product cards to the wishlist API.

## Key Insights
- SachProps.tsx already has a heart button (line 83-89) but `onClick` only calls `e.preventDefault()` -- does nothing
- ChiTietSanPham.tsx has no related books section -- ends with `<DanhGiaSanPham />`
- Product cards reuse `SachProps` component everywhere, so wishlist wiring in SachProps benefits all pages
- Need to know which books are already wishlisted to show filled/outline heart

## Files to Modify

### 1. `src/layouts/products/ChiTietSanPham.tsx`

**Add related books section after reviews (line 228-229):**

```tsx
// New imports:
import { getSachLienQuan } from '../../api/SachApi';
import SachProps from './components/SachProps';

// New state inside component:
const [sachLienQuan, setSachLienQuan] = useState<SachModel[]>([]);

// In existing useEffect (or new one), after book loads:
useEffect(() => {
  if (maSachNumber > 0) {
    getSachLienQuan(maSachNumber, 6)
      .then(setSachLienQuan)
      .catch(console.error);
  }
}, [maSachNumber]);

// New JSX after the DanhGiaSanPham div (line ~229):
{sachLienQuan.length > 0 && (
  <div className="mt-4 animate-fade-in-up">
    <div className="section-header">
      <h2>Sach lien quan</h2>
    </div>
    <div className="row">
      {sachLienQuan.map(s => (
        <SachProps key={s.maSach} sach={s} />
      ))}
    </div>
  </div>
)}
```

**Also add wishlist button next to "Them vao gio hang" (line ~197-206):**

```tsx
// New import:
import { themYeuThich, xoaYeuThich, getDanhSachYeuThich } from '../../api/YeuThichApi';

// New state:
const [daYeuThich, setDaYeuThich] = useState(false);

// Check wishlist status on mount (only if logged in):
useEffect(() => {
  const jwt = localStorage.getItem('jwt');
  if (jwt && maSachNumber > 0) {
    getDanhSachYeuThich()
      .then((list: any[]) => {
        const found = list.some((item: any) => item.maSach === maSachNumber);
        setDaYeuThich(found);
      })
      .catch(console.error);
  }
}, [maSachNumber]);

// Toggle handler:
const toggleYeuThich = async () => {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    toast.info('Vui long dang nhap de yeu thich');
    return;
  }
  try {
    if (daYeuThich) {
      await xoaYeuThich(maSachNumber);
      setDaYeuThich(false);
      toast.success('Da xoa khoi yeu thich');
    } else {
      await themYeuThich(maSachNumber);
      setDaYeuThich(true);
      toast.success('Da them vao yeu thich');
    }
  } catch (err) {
    toast.error('Co loi xay ra');
  }
};

// Add button in the actions flex div (after "Them vao gio hang"):
<button
  className={`btn-modern-outline`}
  onClick={toggleYeuThich}
  style={{ padding: '0.7rem 1.5rem' }}
>
  <i className={`fas fa-heart ${daYeuThich ? 'text-danger' : ''}`}></i>
  {daYeuThich ? 'Da yeu thich' : 'Yeu thich'}
</button>
```

### 2. `src/layouts/products/components/SachProps.tsx`

**Wire the heart button to wishlist API (lines 83-89):**

Current state: heart button does `e.preventDefault()`. Change to toggle wishlist.

```tsx
// New imports:
import { useState, useEffect } from 'react';
import { themYeuThich, xoaYeuThich } from '../../../api/YeuThichApi';
import { toast } from 'react-toastify';

// Add to SachProps component (inside, before return):
const [daYeuThich, setDaYeuThich] = useState(false);

const handleToggleYeuThich = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    toast.info('Vui long dang nhap de yeu thich');
    return;
  }
  try {
    if (daYeuThich) {
      await xoaYeuThich(maSach);
      setDaYeuThich(false);
    } else {
      await themYeuThich(maSach);
      setDaYeuThich(true);
    }
  } catch {
    toast.error('Co loi xay ra');
  }
};

// Replace heart button (lines 83-89):
<button
  className="btn-icon"
  aria-label="Yeu thich"
  onClick={handleToggleYeuThich}
>
  <i className={`fas fa-heart ${daYeuThich ? 'text-danger' : ''}`}></i>
</button>
```

**Note on initial wishlist state for cards:** Loading wishlist status per-card (N+1 API calls) is expensive. Two options:
- **Option A (recommended):** Accept that cards show unfilled heart by default. User clicks to toggle. On detail page we load the real status.
- **Option B:** Load full wishlist once in a parent component, pass `daYeuThich` as prop. More complex, requires lifting state.

Recommend **Option A** for KISS. The detail page shows accurate state. Cards are fire-and-forget toggles.

## Related Code Files
| File | Action | Lines Affected |
|------|--------|---------------|
| `ChiTietSanPham.tsx` | MODIFY | Add imports, state, useEffect, JSX section |
| `SachProps.tsx` | MODIFY | Replace heart button onClick, add toggle logic |

## Implementation Steps
1. Add related books to `ChiTietSanPham.tsx` (imports + state + useEffect + JSX)
2. Add wishlist toggle to `ChiTietSanPham.tsx` (state + handler + button)
3. Wire heart button in `SachProps.tsx` (handler + visual toggle)
4. Test: related books appear below reviews
5. Test: heart toggles on click, toast shows, API called

## Todo List
- [ ] Add related books section to ChiTietSanPham.tsx
- [ ] Add wishlist button to ChiTietSanPham.tsx detail view
- [ ] Wire heart icon in SachProps.tsx to wishlist API
- [ ] Verify related books load correctly
- [ ] Verify wishlist toggle works (add/remove)

## Success Criteria
- Related books section shows up to 6 books from same category
- Wishlist heart toggles visually (red fill when liked)
- Unauthenticated users see info toast instead of error
- No N+1 query problem on product list pages

## Risk Assessment
- `getSachLienQuan` response shape must match SachModel -- verify API returns flat array vs paginated
- If wishlist API returns 409 (already exists), catch and set state accordingly
- Heart state on cards is optimistic (not pre-loaded) -- acceptable tradeoff
