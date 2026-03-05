# Phase 03: Product & Catalog APIs

## Context Links
- [Plan Overview](plan.md)
- [Phase 01 - Foundation](phase-01-foundation-entities-cloudinary.md)
- Existing: `src/main/java/com/example/book_be/controller/SachUserController.java`
- Existing: `src/main/java/com/example/book_be/controller/DonHangController.java`
- Existing: `src/main/java/com/example/book_be/services/admin/SachService.java`
- Existing: `src/main/java/com/example/book_be/dao/SachRepository.java`
- Existing: `src/main/java/com/example/book_be/dao/TheLoaiRepository.java`
- Existing: `src/main/java/com/example/book_be/dao/SachYeuThichRepository.java`

## Overview
- **Priority:** P1 - Critical
- **Status:** pending
- **Effort:** 8h
- **Blocked by:** Phase 01
- **Parallel with:** Phases 02, 04, 05, 06, 07

Them 9 endpoints: danh sach the loai, chi tiet don hang, wishlist CRUD, sach ban chay, moi nhat, lien quan, tim theo slug.

## Key Insights
- TheLoai entity da co listSach (ManyToMany) - co the count books per category
- SachYeuThich entity da co - chi can them API, khong can entity moi
- SachYeuThichRepository hien chi co JpaRepository methods, chua co custom query
- SachServiceImpl da co findAll voi JpaSpecificationExecutor - reuse pattern cho ban-chay, moi-nhat
- DonHangController da co findAll nhung chua co findById
- SachRepository co `@RepositoryRestResource(path = "sach")` - Spring Data REST auto-expose; API moi them vao SachUserController
- Sach entity chua co field soLuongDaBan - dung ChiTietDonHang count hoac them field

## Requirements

### Functional
- F1: GET /api/the-loai - Tra ve tat ca the loai voi so luong sach
- F2: GET /api/don-hang/{id} - Chi tiet don hang voi danh sach ChiTietDonHang (chi owner xem duoc)
- F3: GET /api/yeu-thich - Danh sach sach yeu thich cua user
- F4: POST /api/yeu-thich/{maSach} - Them sach vao wishlist
- F5: DELETE /api/yeu-thich/{maSach} - Xoa sach khoi wishlist
- F6: GET /api/sach/ban-chay?limit=10 - Top sach ban chay
- F7: GET /api/sach/moi-nhat?limit=10 - Sach moi nhat (isActive=1, sort by maSach DESC)
- F8: GET /api/sach/{id}/lien-quan?limit=6 - Sach cung the loai, loai tru sach hien tai
- F9: GET /api/sach/slug/{slug} - Tim sach theo slug (cho SEO URL)

### Non-functional
- NF1: Best sellers query phai performant (avoid N+1)
- NF2: Don hang chi cho owner xem (authorization check)
- NF3: Wishlist khong cho them trung (check exists truoc)

## Architecture

### The Loai API Flow
```
GET /api/the-loai → TheLoaiController → TheLoaiRepository.findAll()
    → Map to DTO {maTheLoai, tenTheLoai, soLuongSach}
```

### Wishlist Flow
```
GET/POST/DELETE /api/yeu-thich → YeuThichController
    → SachYeuThichRepository (custom queries by nguoiDung + sach)
    → SecurityContextHolder for current user
```

### Best Sellers Query Strategy
```
Option A: @Query("SELECT s FROM Sach s JOIN s.listChiTietDonHang ct
           WHERE s.isActive = 1 GROUP BY s ORDER BY COUNT(ct) DESC")
Option B: Native query voi SUM(ct.so_luong) de chinh xac hon
→ Chon Option B: SUM(so_luong) chinh xac hon COUNT
```

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `src/main/java/com/example/book_be/controller/SachUserController.java` | Them: ban-chay, moi-nhat, lien-quan, slug endpoints |
| `src/main/java/com/example/book_be/controller/DonHangController.java` | Them: GET /{id} endpoint |
| `src/main/java/com/example/book_be/services/admin/SachService.java` | Them: findBanChay, findMoiNhat, findLienQuan, findBySlug methods |
| `src/main/java/com/example/book_be/services/admin/SachServiceImpl.java` | Implement new methods |
| `src/main/java/com/example/book_be/dao/SachRepository.java` | Them: JPQL query cho ban-chay, findBySlug |
| `src/main/java/com/example/book_be/dao/SachYeuThichRepository.java` | Them: findByNguoiDung, deleteByNguoiDungAndSach, existsByNguoiDungAndSach |

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/main/java/com/example/book_be/controller/TheLoaiController.java` | Category listing endpoint |
| `src/main/java/com/example/book_be/controller/YeuThichController.java` | Wishlist CRUD endpoints |

## Implementation Steps

### Step 1: Add custom queries to SachYeuThichRepository
```java
@RepositoryRestResource(path = "sach-yeu-thich")
public interface SachYeuThichRepository extends JpaRepository<SachYeuThich, Long> {
    List<SachYeuThich> findByNguoiDung_MaNguoiDung(int maNguoiDung);
    boolean existsByNguoiDung_MaNguoiDungAndSach_MaSach(int maNguoiDung, int maSach);
    void deleteByNguoiDung_MaNguoiDungAndSach_MaSach(int maNguoiDung, int maSach);
}
```

### Step 2: Add queries to SachRepository
```java
// Sach ban chay - order by tong so luong ban
@Query("SELECT s FROM Sach s JOIN s.listChiTietDonHang ct " +
       "WHERE s.isActive = 1 GROUP BY s ORDER BY SUM(ct.soLuong) DESC")
List<Sach> findBanChay(Pageable pageable);

// Sach moi nhat
List<Sach> findByIsActiveOrderByMaSachDesc(Integer isActive, Pageable pageable);

// Tim theo slug
Sach findBySlug(String slug);

// Sach cung the loai
@Query("SELECT s FROM Sach s JOIN s.listTheLoai t " +
       "WHERE t.maTheLoai IN :maTheLoais AND s.maSach != :maSach AND s.isActive = 1")
List<Sach> findLienQuan(@Param("maTheLoais") List<Integer> maTheLoais,
                        @Param("maSach") int maSach, Pageable pageable);
```

### Step 3: Add methods to SachService interface
```java
List<Sach> findBanChay(int limit);
List<Sach> findMoiNhat(int limit);
List<Sach> findLienQuan(int maSach, int limit);
Sach findBySlug(String slug);
```

### Step 4: Implement in SachServiceImpl
```java
@Override
public List<Sach> findBanChay(int limit) {
    Pageable pageable = PageRequest.of(0, limit);
    List<Sach> result = sachRepository.findBanChay(pageable);
    result.forEach(this::loadHinhAnh);
    return result;
}

@Override
public List<Sach> findMoiNhat(int limit) {
    Pageable pageable = PageRequest.of(0, limit);
    List<Sach> result = sachRepository.findByIsActiveOrderByMaSachDesc(1, pageable);
    result.forEach(this::loadHinhAnh);
    return result;
}

@Override
public List<Sach> findLienQuan(int maSach, int limit) {
    Sach sach = sachRepository.findById((long) maSach).orElse(null);
    if (sach == null) return List.of();
    List<Integer> theLoaiIds = sach.getListTheLoai().stream()
        .map(TheLoai::getMaTheLoai).collect(Collectors.toList());
    if (theLoaiIds.isEmpty()) return List.of();
    Pageable pageable = PageRequest.of(0, limit);
    List<Sach> result = sachRepository.findLienQuan(theLoaiIds, maSach, pageable);
    result.forEach(this::loadHinhAnh);
    return result;
}

@Override
public Sach findBySlug(String slug) {
    Sach sach = sachRepository.findBySlug(slug);
    if (sach != null) loadHinhAnh(sach);
    return sach;
}

// Helper: extract existing image loading logic
private void loadHinhAnh(Sach sach) {
    List<HinhAnh> hinhAnhList = hinhAnhRepository.findAll((root, query, builder) ->
        builder.equal(root.get("sach").get("maSach"), sach.getMaSach()));
    sach.setListHinhAnh(hinhAnhList);
}
```

### Step 5: Add endpoints to SachUserController
```java
@GetMapping("/ban-chay")
public ResponseEntity<List<Sach>> findBanChay(
        @RequestParam(value = "limit", defaultValue = "10") int limit) {
    return ResponseEntity.ok(sachService.findBanChay(limit));
}

@GetMapping("/moi-nhat")
public ResponseEntity<List<Sach>> findMoiNhat(
        @RequestParam(value = "limit", defaultValue = "10") int limit) {
    return ResponseEntity.ok(sachService.findMoiNhat(limit));
}

@GetMapping("/{id}/lien-quan")
public ResponseEntity<List<Sach>> findLienQuan(
        @PathVariable int id,
        @RequestParam(value = "limit", defaultValue = "6") int limit) {
    return ResponseEntity.ok(sachService.findLienQuan(id, limit));
}

@GetMapping("/slug/{slug}")
public ResponseEntity<?> findBySlug(@PathVariable String slug) {
    Sach sach = sachService.findBySlug(slug);
    if (sach == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok(sach);
}
```
**Luu y:** Endpoint `/slug/{slug}` phai dat TRUOC `/{id}` de tranh conflict path matching. Hoac dung regex: `@GetMapping("/{id:\\d+}")` cho numeric ID.

### Step 6: Create TheLoaiController
```java
@RestController
@RequestMapping("/api/the-loai")
public class TheLoaiController {
    @Autowired
    private TheLoaiRepository theLoaiRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> findAll() {
        List<TheLoai> theLoais = theLoaiRepository.findAll();
        List<Map<String, Object>> result = theLoais.stream().map(tl -> {
            Map<String, Object> map = new HashMap<>();
            map.put("maTheLoai", tl.getMaTheLoai());
            map.put("tenTheLoai", tl.getTenTheLoai());
            map.put("soLuongSach", tl.getListSach() != null ? tl.getListSach().size() : 0);
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
```
**Luu y:** TheLoai.listSach la LAZY fetch. Dung `@Transactional` hoac JPQL query voi COUNT de tranh LazyInitializationException. Uu tien dung `@Query`:
```java
// Trong TheLoaiRepository:
@Query("SELECT t.maTheLoai, t.tenTheLoai, COUNT(s) FROM TheLoai t LEFT JOIN t.listSach s GROUP BY t")
List<Object[]> findAllWithBookCount();
```

### Step 7: Create YeuThichController
```java
@RestController
@RequestMapping("/api/yeu-thich")
public class YeuThichController {
    @Autowired
    private SachYeuThichRepository sachYeuThichRepository;
    @Autowired
    private SachRepository sachRepository;
    @Autowired
    private NguoiDungRepository nguoiDungRepository;

    @GetMapping
    public ResponseEntity<?> getDanhSachYeuThich() {
        NguoiDung user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401).body("Chua dang nhap");
        List<SachYeuThich> list = sachYeuThichRepository
            .findByNguoiDung_MaNguoiDung(user.getMaNguoiDung());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{maSach}")
    public ResponseEntity<?> themYeuThich(@PathVariable int maSach) {
        NguoiDung user = getCurrentUser();
        if (sachYeuThichRepository.existsByNguoiDung_MaNguoiDungAndSach_MaSach(
                user.getMaNguoiDung(), maSach)) {
            return ResponseEntity.badRequest().body("Da co trong danh sach yeu thich");
        }
        Sach sach = sachRepository.findById((long) maSach).orElse(null);
        if (sach == null) return ResponseEntity.badRequest().body("Sach khong ton tai");
        SachYeuThich yeuThich = new SachYeuThich();
        yeuThich.setNguoiDung(user);
        yeuThich.setSach(sach);
        sachYeuThichRepository.save(yeuThich);
        return ResponseEntity.ok("Them thanh cong");
    }

    @DeleteMapping("/{maSach}")
    @Transactional
    public ResponseEntity<?> xoaYeuThich(@PathVariable int maSach) {
        NguoiDung user = getCurrentUser();
        sachYeuThichRepository.deleteByNguoiDung_MaNguoiDungAndSach_MaSach(
            user.getMaNguoiDung(), maSach);
        return ResponseEntity.ok("Xoa thanh cong");
    }

    private NguoiDung getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return nguoiDungRepository.findByTenDangNhap(auth.getName());
    }
}
```

### Step 8: Add GET /{id} to DonHangController
```java
@GetMapping("/{id}")
public ResponseEntity<?> findById(@PathVariable Long id) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    NguoiDung nguoiDung = nguoiDungRepository.findByTenDangNhap(auth.getName());
    DonHang donHang = donHangRepository.findById(id).orElse(null);
    if (donHang == null) return ResponseEntity.notFound().build();
    // Check owner
    if (donHang.getNguoiDung().getMaNguoiDung() != nguoiDung.getMaNguoiDung()) {
        return ResponseEntity.status(403).body("Khong co quyen xem don hang nay");
    }
    // Load chi tiet
    List<ChiTietDonHang> chiTietList = chiTietDonHangRepository.findAll(
        (root, query, builder) -> builder.equal(
            root.get("donHang").get("maDonHang"), donHang.getMaDonHang()));
    Map<String, Object> result = new HashMap<>();
    result.put("donHang", donHang);
    result.put("chiTietDonHang", chiTietList);
    return ResponseEntity.ok(result);
}
```

### Step 9: Resolve path conflict in SachUserController
Doi `@GetMapping("{id}")` thanh `@GetMapping("/{id:\\d+}")` de tranh conflict voi `/slug/{slug}` va `/ban-chay`.

### Step 10: Compile & test
Run `mvn compile`, test thu endpoints.

## Todo List
- [ ] Them custom queries vao SachYeuThichRepository
- [ ] Them queries vao SachRepository (ban-chay, slug, lien-quan)
- [ ] Them findAllWithBookCount vao TheLoaiRepository
- [ ] Them methods vao SachService interface
- [ ] Implement methods trong SachServiceImpl + extract loadHinhAnh helper
- [ ] Them ban-chay, moi-nhat, lien-quan, slug endpoints vao SachUserController
- [ ] Fix path conflict: `{id}` → `{id:\\d+}`
- [ ] Tao TheLoaiController
- [ ] Tao YeuThichController
- [ ] Them GET /{id} vao DonHangController
- [ ] Chay mvn compile thanh cong
- [ ] Test endpoints bang Postman

## Success Criteria
- GET /api/the-loai tra ve list the loai voi soLuongSach
- GET /api/sach/ban-chay?limit=5 tra ve top 5 sach ban chay
- GET /api/sach/moi-nhat?limit=10 tra ve 10 sach moi nhat (isActive=1)
- GET /api/sach/{id}/lien-quan tra ve sach cung the loai
- GET /api/sach/slug/{slug} tra ve sach hoac 404
- GET /api/yeu-thich tra ve wishlist cua user
- POST /api/yeu-thich/{maSach} them sach vao wishlist (khong trung)
- DELETE /api/yeu-thich/{maSach} xoa sach khoi wishlist
- GET /api/don-hang/{id} tra ve chi tiet don hang (chi owner)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| LazyInitializationException khi load TheLoai.listSach | API loi 500 | Dung @Query voi COUNT thay vi load list |
| Path conflict giua /{id} va /slug/{slug} | Wrong route matching | Regex pattern: `{id:\\d+}` |
| N+1 query khi load hinh anh | Performance | Extract loadHinhAnh helper, consider JOIN FETCH |
| Ban chay query slow voi nhieu data | Performance | Index tren chi_tiet_don_hang(ma_sach), LIMIT |

## Security Considerations
- Don hang chi owner xem duoc (check nguoiDung match)
- Wishlist endpoints can authenticated
- Sach/The loai endpoints la public
- Path traversal khong anh huong vi Spring MVC param binding

## Next Steps
- Phase 08: Register endpoints moi vao SecurityConfiguration
  - `/api/the-loai` → permitAll (GET)
  - `/api/sach/ban-chay`, `/api/sach/moi-nhat`, `/api/sach/*/lien-quan`, `/api/sach/slug/*` → permitAll (GET)
  - `/api/yeu-thich/**` → authenticated (GET/POST/DELETE)
  - `/api/don-hang/{id}` → authenticated (GET)
