---
title: "Frontend API Integration"
description: "Connect React TypeScript frontend to new backend APIs for categories, profile, wishlist, coupons, addresses, and admin features"
status: completed
priority: P1
effort: 12h
branch: master
tags: [frontend, api-integration, react, typescript]
created: 2026-03-05
---

# Frontend API Integration Plan

## Objective
Wire the React TypeScript frontend to all newly implemented backend endpoints. Fill 13 identified feature gaps covering public, authenticated, and admin API integrations.

## Key Conventions (from codebase analysis)
- **Fetch pattern**: native `fetch()`, no axios. Base URL `http://localhost:8080` hardcoded per file
- **Auth**: `localStorage.getItem('jwt')` sent as `Authorization: Bearer {token}`
- **State**: `useState` + `useEffect`, no global store
- **Models**: Class-based with constructor (e.g., `SachModel`)
- **Notifications**: `react-toastify` via `toast.success()` / `toast.error()`
- **Routing**: react-router-dom v6, nested routes under `/*` and `/quan-ly/*`
- **File naming**: PascalCase for components, PascalCase for API files
- **CSS**: CSS variables (`var(--color-primary)`), Bootstrap 5 classes + custom classes

## Dependency Graph

```
Phase 01 (API Layer) ──> Phase 02 (Homepage)
                    ──> Phase 03 (User features)
                    ──> Phase 04 (Product detail)
                    ──> Phase 05 (Checkout)
                    ──> Phase 06 (Admin)
Phase 07 (Routing) ──> depends on Phase 03, Phase 05, Phase 06 components existing
```

## Phases

| Phase | Name | Effort | Status | Dependencies | Files |
|-------|------|--------|--------|-------------|-------|
| 01 | [API Layer](./phase-01-api-layer.md) | 1.5h | completed | none | 6 new API files, 4 new models |
| 02 | [Homepage Improvements](./phase-02-homepage-improvements.md) | 1.5h | completed | Phase 01 | Navbar.tsx, HomePage.tsx, SachRow.tsx |
| 03 | [User Features](./phase-03-user-features.md) | 3h | completed | Phase 01 | 4 new pages, DangNhap.tsx |
| 04 | [Product Detail Improvements](./phase-04-product-detail-improvements.md) | 2h | completed | Phase 01 | ChiTietSanPham.tsx, SachProps.tsx |
| 05 | [Checkout Improvements](./phase-05-checkout-improvements.md) | 2h | completed | Phase 01 | ThanhToan.tsx, CartItemsTable.tsx, CheckoutSidebar.tsx |
| 06 | [Admin Features](./phase-06-admin-features.md) | 2h | completed | Phase 01 | AdminLayout.tsx, AdminSidebar.tsx, ThongKeDashboard.tsx, QuanLyCoupon.tsx |
| 07 | [Routing Updates](./phase-07-routing-updates.md) | 0.5h | completed | Phase 03, 06 | App.tsx |

## Risk Assessment
- **getBookById** currently calls old Spring Data REST `/sach/{id}` -- may need migrating to `/api/sach/{id}` if old endpoint removed
- **HinhAnhApi** also uses Spring Data REST `/sach/{id}/listHinhAnh` -- may break if removed
- ThanhToan.tsx auto-creates order on mount (side-effect in useEffect) -- coupon/address integration must account for this timing
