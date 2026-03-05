# Phase 05: Commerce - Coupon & Shipping Address APIs

## Context Links
- [Plan Overview](plan.md)
- [Phase 01 - Foundation](phase-01-foundation-entities-cloudinary.md)
- Phase 01 tao: DiaChiGiaoHang entity, Coupon entity, repositories

## Overview
- **Priority:** P2 - High
- **Status:** pending
- **Effort:** 6h
- **Blocked by:** Phase 01
- **Parallel with:** Phases 02, 03, 04, 06, 07

Them CRUD dia chi giao hang va coupon validation/admin CRUD. Entities va repositories da duoc tao o Phase 01.

## Key Insights
- DiaChiGiaoHang entity da co (Phase 01): id, nguoiDung FK, hoTen, soDienThoai, diaChiDayDu, macDinh
- Coupon entity da co (Phase 01): id, ma, loai, giaTriGiam, giaTriToiThieu, hanSuDung, soLuongToiDa, daSuDung, isActive
- NguoiDung da co field `diaChiGiaoHang` (String) va `diaChiMuaHang` (String) - entity moi DiaChiGiaoHang cho phep nhieu dia chi
- Existing controller pattern: @RestController + @RequestMapping + @Autowired services
- Coupon kiem tra phai validate: ma dung, con han, con so luong, don hang dat toi thieu

## Requirements

### Functional - Dia Chi
- F1: GET /api/dia-chi - List dia chi cua user hien tai
- F2: POST /api/dia-chi - Them dia chi moi
- F3: PUT /api/dia-chi/{id} - Cap nhat dia chi (chi owner)
- F4: DELETE /api/dia-chi/{id} - Xoa dia chi (chi owner)
- F5: Khi them dia chi macDinh=true, cac dia chi khac macDinh=false

### Functional - Coupon
- F6: POST /api/coupon/kiem-tra - Validate coupon code, tra ve discount info
- F7: GET /api/admin/coupon - List tat ca coupons (admin)
- F8: POST /api/admin/coupon - Tao coupon moi (admin)
- F9: PUT /api/admin/coupon/{id} - Update coupon (admin)
- F10: DELETE /api/admin/coupon/{id} - Xoa coupon (admin)

### Non-functional
- NF1: User chi xem/sua/xoa dia chi cua minh
- NF2: Max 10 dia chi per user
- NF3: Coupon.ma unique, uppercase, alphanumeric

## Architecture

### Dia Chi Flow
```
Client (authenticated)
    ↓
/api/dia-chi/** → DiaChiController
    ↓
DiaChiService → DiaChiGiaoHangRepository
    ↓
SecurityContextHolder → verify owner
```

### Coupon Validation Flow
```
POST /api/coupon/kiem-tra { "ma": "GIAM20", "tongTien": 500000 }
    ↓
CouponService.kiemTra(ma, tongTien)
    ↓
Check: exists? → active? → het han? → con so luong? → toi thieu?
    ↓
Response: { "hopLe": true, "loai": "PERCENT", "giaTriGiam": 20, "tienGiam": 100000 }
```

## Related Code Files

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/main/java/com/example/book_be/controller/DiaChiController.java` | Dia chi CRUD endpoints |
| `src/main/java/com/example/book_be/controller/CouponController.java` | Coupon validation (user) |
| `src/main/java/com/example/book_be/controller/admin/CouponAdminController.java` | Coupon CRUD (admin) |
| `src/main/java/com/example/book_be/services/DiaChiService.java` | Dia chi service interface |
| `src/main/java/com/example/book_be/services/DiaChiServiceImpl.java` | Dia chi service impl |
| `src/main/java/com/example/book_be/services/CouponService.java` | Coupon service interface |
| `src/main/java/com/example/book_be/services/CouponServiceImpl.java` | Coupon service impl |

## Implementation Steps

### Step 1: Create DiaChiService interface
```java
public interface DiaChiService {
    List<DiaChiGiaoHang> findByNguoiDung(int maNguoiDung);
    DiaChiGiaoHang save(int maNguoiDung, DiaChiGiaoHang diaChi);
    DiaChiGiaoHang update(int maNguoiDung, int maDiaChi, DiaChiGiaoHang diaChi);
    void delete(int maNguoiDung, int maDiaChi);
}
```

### Step 2: Create DiaChiServiceImpl
```java
@Service
public class DiaChiServiceImpl implements DiaChiService {
    @Autowired
    private DiaChiGiaoHangRepository diaChiRepo;
    @Autowired
    private NguoiDungRepository nguoiDungRepo;

    @Override
    public List<DiaChiGiaoHang> findByNguoiDung(int maNguoiDung) {
        return diaChiRepo.findByNguoiDung_MaNguoiDung(maNguoiDung);
    }

    @Override
    public DiaChiGiaoHang save(int maNguoiDung, DiaChiGiaoHang diaChi) {
        // Check max 10 dia chi
        List<DiaChiGiaoHang> existing = diaChiRepo.findByNguoiDung_MaNguoiDung(maNguoiDung);
        if (existing.size() >= 10) {
            throw new RuntimeException("Toi da 10 dia chi");
        }
        NguoiDung user = nguoiDungRepo.findById((long) maNguoiDung).orElse(null);
        diaChi.setNguoiDung(user);
        // Neu macDinh = true, reset cac dia chi khac
        if (Boolean.TRUE.equals(diaChi.getMacDinh())) {
            existing.forEach(dc -> { dc.setMacDinh(false); diaChiRepo.save(dc); });
        }
        return diaChiRepo.save(diaChi);
    }

    @Override
    public DiaChiGiaoHang update(int maNguoiDung, int maDiaChi, DiaChiGiaoHang updates) {
        DiaChiGiaoHang diaChi = diaChiRepo.findById((long) maDiaChi).orElse(null);
        if (diaChi == null) throw new RuntimeException("Dia chi khong ton tai");
        if (diaChi.getNguoiDung().getMaNguoiDung() != maNguoiDung) {
            throw new RuntimeException("Khong co quyen");
        }
        if (updates.getHoTen() != null) diaChi.setHoTen(updates.getHoTen());
        if (updates.getSoDienThoai() != null) diaChi.setSoDienThoai(updates.getSoDienThoai());
        if (updates.getDiaChiDayDu() != null) diaChi.setDiaChiDayDu(updates.getDiaChiDayDu());
        if (Boolean.TRUE.equals(updates.getMacDinh())) {
            diaChiRepo.findByNguoiDung_MaNguoiDung(maNguoiDung).forEach(dc -> {
                dc.setMacDinh(false); diaChiRepo.save(dc);
            });
            diaChi.setMacDinh(true);
        }
        return diaChiRepo.save(diaChi);
    }

    @Override
    public void delete(int maNguoiDung, int maDiaChi) {
        DiaChiGiaoHang diaChi = diaChiRepo.findById((long) maDiaChi).orElse(null);
        if (diaChi == null) throw new RuntimeException("Dia chi khong ton tai");
        if (diaChi.getNguoiDung().getMaNguoiDung() != maNguoiDung) {
            throw new RuntimeException("Khong co quyen");
        }
        diaChiRepo.delete(diaChi);
    }
}
```

### Step 3: Create DiaChiController
```java
@RestController
@RequestMapping("/api/dia-chi")
public class DiaChiController {
    @Autowired
    private DiaChiService diaChiService;
    @Autowired
    private NguoiDungRepository nguoiDungRepository;

    @GetMapping
    public ResponseEntity<?> findAll() {
        NguoiDung user = getCurrentUser();
        return ResponseEntity.ok(diaChiService.findByNguoiDung(user.getMaNguoiDung()));
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody DiaChiGiaoHang diaChi) {
        NguoiDung user = getCurrentUser();
        try {
            return ResponseEntity.ok(diaChiService.save(user.getMaNguoiDung(), diaChi));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable int id, @RequestBody DiaChiGiaoHang diaChi) {
        NguoiDung user = getCurrentUser();
        try {
            return ResponseEntity.ok(diaChiService.update(user.getMaNguoiDung(), id, diaChi));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable int id) {
        NguoiDung user = getCurrentUser();
        try {
            diaChiService.delete(user.getMaNguoiDung(), id);
            return ResponseEntity.ok("Xoa thanh cong");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private NguoiDung getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return nguoiDungRepository.findByTenDangNhap(auth.getName());
    }
}
```

### Step 4: Create CouponService interface & impl
```java
// CouponService.java
public interface CouponService {
    Map<String, Object> kiemTra(String ma, double tongTien);
    List<Coupon> findAll();
    Coupon save(Coupon coupon);
    Coupon update(int id, Coupon coupon);
    void delete(int id);
}

// CouponServiceImpl.java
@Service
public class CouponServiceImpl implements CouponService {
    @Autowired
    private CouponRepository couponRepository;

    @Override
    public Map<String, Object> kiemTra(String ma, double tongTien) {
        Map<String, Object> result = new HashMap<>();
        Optional<Coupon> opt = couponRepository.findByMa(ma.toUpperCase());
        if (opt.isEmpty()) {
            result.put("hopLe", false);
            result.put("lyDo", "Ma giam gia khong ton tai");
            return result;
        }
        Coupon coupon = opt.get();
        if (!coupon.getIsActive()) {
            result.put("hopLe", false);
            result.put("lyDo", "Ma giam gia da bi vo hieu hoa");
            return result;
        }
        if (coupon.getHanSuDung() != null && coupon.getHanSuDung().before(new Date())) {
            result.put("hopLe", false);
            result.put("lyDo", "Ma giam gia da het han");
            return result;
        }
        if (coupon.getDaSuDung() >= coupon.getSoLuongToiDa()) {
            result.put("hopLe", false);
            result.put("lyDo", "Ma giam gia da het luot su dung");
            return result;
        }
        if (tongTien < coupon.getGiaTriToiThieu()) {
            result.put("hopLe", false);
            result.put("lyDo", "Don hang toi thieu " + coupon.getGiaTriToiThieu() + " de ap dung");
            return result;
        }
        // Tinh tien giam
        double tienGiam;
        if (coupon.getLoai() == LoaiGiamGia.PERCENT) {
            tienGiam = tongTien * coupon.getGiaTriGiam() / 100;
        } else {
            tienGiam = coupon.getGiaTriGiam();
        }
        tienGiam = Math.min(tienGiam, tongTien); // khong giam qua tong tien

        result.put("hopLe", true);
        result.put("loai", coupon.getLoai());
        result.put("giaTriGiam", coupon.getGiaTriGiam());
        result.put("tienGiam", tienGiam);
        result.put("maCoupon", coupon.getMaCoupon());
        return result;
    }

    @Override
    public List<Coupon> findAll() {
        return couponRepository.findAll();
    }

    @Override
    public Coupon save(Coupon coupon) {
        coupon.setMa(coupon.getMa().toUpperCase());
        return couponRepository.save(coupon);
    }

    @Override
    public Coupon update(int id, Coupon updates) {
        Coupon coupon = couponRepository.findById((long) id).orElse(null);
        if (coupon == null) throw new RuntimeException("Coupon khong ton tai");
        if (updates.getMa() != null) coupon.setMa(updates.getMa().toUpperCase());
        if (updates.getLoai() != null) coupon.setLoai(updates.getLoai());
        coupon.setGiaTriGiam(updates.getGiaTriGiam());
        coupon.setGiaTriToiThieu(updates.getGiaTriToiThieu());
        if (updates.getHanSuDung() != null) coupon.setHanSuDung(updates.getHanSuDung());
        coupon.setSoLuongToiDa(updates.getSoLuongToiDa());
        coupon.setIsActive(updates.getIsActive());
        return couponRepository.save(coupon);
    }

    @Override
    public void delete(int id) {
        couponRepository.deleteById((long) id);
    }
}
```

### Step 5: Create CouponController (user)
```java
@RestController
@RequestMapping("/api/coupon")
public class CouponController {
    @Autowired
    private CouponService couponService;

    @PostMapping("/kiem-tra")
    public ResponseEntity<?> kiemTra(@RequestBody Map<String, Object> body) {
        String ma = (String) body.get("ma");
        double tongTien = Double.parseDouble(body.get("tongTien").toString());
        return ResponseEntity.ok(couponService.kiemTra(ma, tongTien));
    }
}
```

### Step 6: Create CouponAdminController
```java
@RestController
@RequestMapping("/api/admin/coupon")
public class CouponAdminController {
    @Autowired
    private CouponService couponService;

    @GetMapping
    public ResponseEntity<List<Coupon>> findAll() {
        return ResponseEntity.ok(couponService.findAll());
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody Coupon coupon) {
        try {
            return ResponseEntity.ok(couponService.save(coupon));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable int id, @RequestBody Coupon coupon) {
        try {
            return ResponseEntity.ok(couponService.update(id, coupon));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable int id) {
        couponService.delete(id);
        return ResponseEntity.ok("Xoa thanh cong");
    }
}
```

### Step 7: Compile & test

## Todo List
- [ ] Tao DiaChiService interface
- [ ] Tao DiaChiServiceImpl
- [ ] Tao DiaChiController
- [ ] Tao CouponService interface
- [ ] Tao CouponServiceImpl
- [ ] Tao CouponController (user)
- [ ] Tao CouponAdminController (admin)
- [ ] Chay mvn compile thanh cong
- [ ] Test dia chi CRUD
- [ ] Test coupon kiem tra
- [ ] Test admin coupon CRUD

## Success Criteria
- GET /api/dia-chi tra ve danh sach dia chi cua user
- POST /api/dia-chi them dia chi moi (max 10)
- PUT /api/dia-chi/{id} cap nhat dia chi (chi owner)
- DELETE /api/dia-chi/{id} xoa dia chi (chi owner)
- Khi set macDinh=true, cac dia chi khac bi reset
- POST /api/coupon/kiem-tra tra ve {hopLe, tienGiam} khi coupon hop le
- POST /api/coupon/kiem-tra tra ve {hopLe: false, lyDo} khi coupon khong hop le
- Admin CRUD coupon hoat dong dung

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| User access dia chi nguoi khac | Data breach | Check owner trong moi operation |
| Coupon brute force | Revenue loss | Rate limit, coupon code dai |
| Race condition tang daSuDung | Over-usage | Pessimistic lock hoac atomic update (future) |
| Coupon unique constraint violation | 500 error | Check existsByMa truoc khi save |

## Security Considerations
- Dia chi endpoints: authenticated, owner check moi request
- Coupon kiem tra: authenticated (can login moi kiem tra duoc)
- Admin coupon CRUD: hasAuthority("ADMIN")
- Khong expose coupon list cho user (chi validate)

## Next Steps
- Phase 08: Register endpoints
  - `/api/dia-chi/**` → authenticated (GET/POST/PUT/DELETE)
  - `/api/coupon/kiem-tra` → authenticated (POST)
  - `/api/admin/coupon/**` → hasAuthority("ADMIN")
- Future: Tich hop coupon vao don hang flow (apply discount khi checkout)
