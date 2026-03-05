---
title: "Phase 02 - Homepage Improvements"
description: "Dynamic category navbar and best-sellers/new-books sections on homepage"
status: pending
priority: P1
effort: 1.5h
---

# Phase 02 - Homepage Improvements

## Context Links
- [Plan Overview](./plan.md) | [Phase 01 - API Layer](./phase-01-api-layer.md)
- Navbar: `e:\BT\Stack1\book_fe-master\src\layouts\header-footer\Navbar.tsx`
- HomePage: `e:\BT\Stack1\book_fe-master\src\layouts\homepage\HomePage.tsx`
- Carousel: `e:\BT\Stack1\book_fe-master\src\layouts\homepage\components\Carousel.tsx`

## Overview
Replace hardcoded "The loai 1,2,3" in Navbar with dynamic categories from API. Add best-sellers and new-arrivals book rows to the homepage below the carousel.

## Key Insights
- Navbar currently has 3 hardcoded `<NavLink>` items for categories (lines 136-151)
- Carousel is fully static (3 banner images) -- keep banners static, add book sections below
- HomePage renders: `<Banner />` + `<Carousel />` + `<DanhSachSanPham />`
- Categories should link to homepage with category filter (existing `maTheLoai` param in DanhSachSanPham)

## Files to Modify

### 1. `src/layouts/header-footer/Navbar.tsx`

**What changes:**
- Import `getAllTheLoai` from `TheLoaiApi`
- Import `TheLoaiModel` from models
- Add `useState<TheLoaiModel[]>` + `useEffect` to fetch categories on mount
- Replace hardcoded dropdown items (lines 136-151) with `.map()` over fetched categories
- Each category links to `/?maTheLoai={maTheLoai}` (or use search params)

**Replacement for lines 135-151:**
```tsx
const [theLoaiList, setTheLoaiList] = useState<TheLoaiModel[]>([]);

useEffect(() => {
  getAllTheLoai()
    .then(setTheLoaiList)
    .catch(err => console.error('Failed to load categories:', err));
}, []);

// In JSX, replace the hardcoded <ul> contents:
<ul className="dropdown-menu dropdown-modern" aria-labelledby="navbarDropdown1">
  {theLoaiList.map(tl => (
    <li key={tl.maTheLoai}>
      <NavLink className="dropdown-item" to={`/?maTheLoai=${tl.maTheLoai}`}>
        {tl.tenTheLoai} ({tl.soLuongSach})
      </NavLink>
    </li>
  ))}
  {theLoaiList.length === 0 && (
    <li><span className="dropdown-item text-muted">Dang tai...</span></li>
  )}
</ul>
```

**Note on category URL strategy:** Use query params `/?maTheLoai=X`. HomePage already parses `maTheLoai` from `useParams()`, but it reads from route params. Two options:
- **Option A (simpler):** Use `useSearchParams` in HomePage to read `maTheLoai` from query string
- **Option B:** Keep route-based approach, add route `/:maTheLoai` in App.tsx

Recommend **Option A** -- less routing changes, same DanhSachSanPham behavior.

### 2. `src/layouts/homepage/HomePage.tsx`

**What changes:**
- Switch from `useParams` to `useSearchParams` for `maTheLoai`
- Add best-sellers and new-arrivals sections between Carousel and DanhSachSanPham
- Import `getSachBanChay`, `getSachMoiNhat` from SachApi

**Updated component structure:**
```tsx
function HomePage({ tuKhoaTimKiem }: HomePageProps) {
  const [searchParams] = useSearchParams();
  const maTheLoai = parseInt(searchParams.get('maTheLoai') || '0') || 0;

  const [sachBanChay, setSachBanChay] = useState<SachModel[]>([]);
  const [sachMoiNhat, setSachMoiNhat] = useState<SachModel[]>([]);

  useEffect(() => {
    getSachBanChay(8).then(setSachBanChay).catch(console.error);
    getSachMoiNhat(8).then(setSachMoiNhat).catch(console.error);
  }, []);

  return (
    <div>
      <Banner />
      <Carousel />
      {/* Best sellers row */}
      <SachRow title="Sach ban chay" danhSach={sachBanChay} />
      {/* New arrivals row */}
      <SachRow title="Sach moi nhat" danhSach={sachMoiNhat} />
      <DanhSachSanPham tuKhoaTimKiem={tuKhoaTimKiem} maTheLoai={maTheLoai} />
    </div>
  );
}
```

### 3. New component: `src/layouts/homepage/components/SachRow.tsx`

Small reusable horizontal book row (reuses existing `SachProps` card):
```tsx
import SachModel from '../../../models/SachModel';
import SachProps from '../../products/components/SachProps';

interface SachRowProps {
  title: string;
  danhSach: SachModel[];
}

function SachRow({ title, danhSach }: SachRowProps) {
  if (danhSach.length === 0) return null;

  return (
    <div className="container py-4">
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="row">
        {danhSach.slice(0, 4).map(sach => (
          <SachProps key={sach.maSach} sach={sach} />
        ))}
      </div>
    </div>
  );
}

export default SachRow;
```

## Implementation Steps
1. Modify `Navbar.tsx`: add imports, state, useEffect for categories, replace hardcoded dropdown
2. Create `SachRow.tsx` component
3. Modify `HomePage.tsx`: switch to `useSearchParams`, add best-sellers/new-arrivals sections
4. Test: verify categories load in dropdown, clicking a category filters the product list
5. Test: verify best-sellers and new-arrivals rows render on homepage

## Todo List
- [ ] Update Navbar.tsx with dynamic categories
- [ ] Create SachRow.tsx component
- [ ] Update HomePage.tsx with useSearchParams + book rows
- [ ] Verify category click filters products correctly
- [ ] Verify best-seller / new-arrivals rows render

## Success Criteria
- Navbar dropdown shows real categories from API with book counts
- Clicking a category filters homepage product list
- Best-sellers and new-arrivals rows appear below carousel
- Loading/empty states handled gracefully

## Risk Assessment
- If `GET /api/the-loai` returns unexpected shape, dropdown will be empty -- add console.error logging
- `useSearchParams` requires react-router-dom v6 (already installed)
- If `getSachBanChay` returns paginated response instead of array, need to unwrap `.content`
