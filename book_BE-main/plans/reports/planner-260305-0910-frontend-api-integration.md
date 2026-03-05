# Planner Report: Frontend API Integration

**Date:** 2026-03-05
**Plan:** `E:\BT\Stack1\book_BE-main\plans\260305-0910-frontend-api-integration\`

## Summary
Comprehensive 7-phase plan to connect the React TypeScript frontend to 13 missing backend API integrations spanning categories, user profile, wishlist, coupons, addresses, and admin features.

## Codebase Analysis
- Frontend uses native `fetch()` (no axios), `useState`/`useEffect` (no state lib), JWT in localStorage
- Base URL `http://localhost:8080` hardcoded per API file
- Models are class-based with constructors; new models use interfaces (simpler, sufficient)
- Existing patterns: `my_request()` for public GET, inline fetch with Bearer token for auth calls
- Critical finding: ThanhToan.tsx auto-creates order on mount -- Phase 05 must refactor to two-step flow

## Phase Summary

| # | Phase | Effort | New Files | Modified Files |
|---|-------|--------|-----------|---------------|
| 01 | API Layer | 1.5h | 10 (6 API + 4 model) | 2 (Request.ts, SachApi.ts) |
| 02 | Homepage | 1.5h | 1 (SachRow.tsx) | 2 (Navbar.tsx, HomePage.tsx) |
| 03 | User Features | 3h | 4 (3 pages + RequireAuth) | 1 (DangNhap.tsx) |
| 04 | Product Detail | 2h | 0 | 2 (ChiTietSanPham.tsx, SachProps.tsx) |
| 05 | Checkout | 2h | 0 | 1 (ThanhToan.tsx - major refactor) |
| 06 | Admin | 2h | 2 (Dashboard, Coupon) | 2 (AdminLayout.tsx, AdminSidebar.tsx) |
| 07 | Routing | 0.5h | 0 | 1 (App.tsx) |

**Total: ~12.5h | 17 new files | 11 file modifications**

## Key Design Decisions
1. **authRequest() helper** in Request.ts to DRY authenticated fetch calls
2. **Interface-based models** (not classes) for new types -- simpler, sufficient for JSON mapping
3. **useSearchParams** for category filtering instead of route params -- fewer routing changes
4. **Optimistic wishlist** on product cards (no pre-load) vs accurate state on detail page
5. **Two-step checkout** flow to allow coupon/address before order creation
6. **UploadFile.tsx left as-is** -- base64 flow works, Cloudinary endpoint available but not forced

## Risks
- ThanhToan.tsx refactor is the highest-risk change (behavioral change to order flow)
- API response shapes must be verified against actual backend -- models based on endpoint documentation
- `getSachBanChay`/`getSachMoiNhat` may return paginated vs flat array -- needs runtime check
