# Phase 07: Admin Dashboard Statistics

## Context Links
- [Plan Overview](plan.md)
- [Phase 01 - Foundation](phase-01-foundation-entities-cloudinary.md)
- Existing: `src/main/java/com/example/book_be/dao/DonHangRepository.java`
- Existing: `src/main/java/com/example/book_be/dao/NguoiDungRepository.java`
- Existing: `src/main/java/com/example/book_be/dao/SachRepository.java`

## Overview
- **Priority:** P2 - High
- **Status:** pending
- **Effort:** 3h
- **Blocked by:** Phase 01
- **Parallel with:** Phases 02, 03, 04, 05, 06

Them endpoint thong ke dashboard cho admin: tong don hang, doanh thu, top sach, so user, don hang cho xu ly.

## Key Insights
- DonHang entity co: tongTien (double), ngayTao (Date), trangThaiGiaoHang (Integer), trangThaiThanhToan (Integer)
- ChiTietDonHang co: soLuong, giaBan, sach FK
- NguoiDungRepository da co JpaRepository methods (count)
- DonHangRepository da co JpaRepository + JpaSpecificationExecutor
- Trang thai giao hang: 0=cho xu ly, 1=da thanh toan, 2=da giao
- Can JPQL aggregate queries cho doanh thu va top sach

## Requirements

### Functional
- F1: GET /api/admin/thong-ke - Tra ve tong hop thong ke
  - totalOrders: tong so don hang
  - totalRevenue: tong doanh thu (sum tongTien noi trangThaiThanhToan=1)
  - todayOrders: so don hang hom nay
  - todayRevenue: doanh thu hom nay
  - topBooks: top 5 sach ban chay [{maSach, tenSach, soLuongBan}]
  - totalUsers: tong so nguoi dung
  - pendingOrders: so don hang cho xu ly (trangThaiGiaoHang=0)

### Non-functional
- NF1: Response time < 500ms
- NF2: Endpoint chi cho ADMIN

## Architecture

### Query Strategy
```
GET /api/admin/thong-ke → ThongKeController → ThongKeService
    ↓
ThongKeService:
  - donHangRepository.count() → totalOrders
  - donHangRepository.sumTongTien() → totalRevenue (custom @Query)
  - donHangRepository.countByNgayTao(today) → todayOrders
  - donHangRepository.sumTongTienByNgayTao(today) → todayRevenue
  - chiTietDonHangRepository.findTopBooks(limit) → topBooks (custom @Query)
  - nguoiDungRepository.count() → totalUsers
  - donHangRepository.countByTrangThaiGiaoHang(0) → pendingOrders
```

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `src/main/java/com/example/book_be/dao/DonHangRepository.java` | Them aggregate queries |
| `src/main/java/com/example/book_be/dao/ChiTietDonHangRepository.java` | Them top books query |

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/main/java/com/example/book_be/controller/admin/ThongKeController.java` | Admin stats endpoint |
| `src/main/java/com/example/book_be/services/ThongKeService.java` | Stats service interface |
| `src/main/java/com/example/book_be/services/ThongKeServiceImpl.java` | Stats service impl |

## Implementation Steps

### Step 1: Add aggregate queries to DonHangRepository
```java
@Query("SELECT COALESCE(SUM(d.tongTien), 0) FROM DonHang d WHERE d.trangThaiThanhToan = 1")
double sumDoanhThu();

@Query("SELECT COUNT(d) FROM DonHang d WHERE FUNCTION('DATE', d.ngayTao) = CURRENT_DATE")
long countDonHangHomNay();

@Query("SELECT COALESCE(SUM(d.tongTien), 0) FROM DonHang d " +
       "WHERE d.trangThaiThanhToan = 1 AND FUNCTION('DATE', d.ngayTao) = CURRENT_DATE")
double sumDoanhThuHomNay();

long countByTrangThaiGiaoHang(Integer trangThaiGiaoHang);
```

### Step 2: Add top books query to ChiTietDonHangRepository
```java
// Existing file: ChiTietDonHangRepository.java
@Query("SELECT ct.sach.maSach, ct.sach.tenSach, SUM(ct.soLuong) as tongBan " +
       "FROM ChiTietDonHang ct GROUP BY ct.sach.maSach, ct.sach.tenSach " +
       "ORDER BY tongBan DESC")
List<Object[]> findTopBanChay(Pageable pageable);
```

### Step 3: Create ThongKeService interface
```java
public interface ThongKeService {
    Map<String, Object> getThongKe();
}
```

### Step 4: Create ThongKeServiceImpl
```java
@Service
public class ThongKeServiceImpl implements ThongKeService {
    @Autowired
    private DonHangRepository donHangRepository;
    @Autowired
    private ChiTietDonHangRepository chiTietDonHangRepository;
    @Autowired
    private NguoiDungRepository nguoiDungRepository;

    @Override
    public Map<String, Object> getThongKe() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalOrders", donHangRepository.count());
        stats.put("totalRevenue", donHangRepository.sumDoanhThu());
        stats.put("todayOrders", donHangRepository.countDonHangHomNay());
        stats.put("todayRevenue", donHangRepository.sumDoanhThuHomNay());
        stats.put("totalUsers", nguoiDungRepository.count());
        stats.put("pendingOrders", donHangRepository.countByTrangThaiGiaoHang(0));

        // Top 5 sach ban chay
        Pageable top5 = PageRequest.of(0, 5);
        List<Object[]> topBooksRaw = chiTietDonHangRepository.findTopBanChay(top5);
        List<Map<String, Object>> topBooks = topBooksRaw.stream().map(row -> {
            Map<String, Object> book = new LinkedHashMap<>();
            book.put("maSach", row[0]);
            book.put("tenSach", row[1]);
            book.put("soLuongBan", row[2]);
            return book;
        }).collect(Collectors.toList());
        stats.put("topBooks", topBooks);

        return stats;
    }
}
```

### Step 5: Create ThongKeController
```java
@RestController
@RequestMapping("/api/admin/thong-ke")
public class ThongKeController {
    @Autowired
    private ThongKeService thongKeService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getThongKe() {
        return ResponseEntity.ok(thongKeService.getThongKe());
    }
}
```

### Step 6: Compile & test
```bash
curl -H "Authorization: Bearer {admin-jwt}" http://localhost:8080/api/admin/thong-ke
```

## Todo List
- [ ] Them aggregate queries vao DonHangRepository
- [ ] Them findTopBanChay vao ChiTietDonHangRepository
- [ ] Tao ThongKeService interface
- [ ] Tao ThongKeServiceImpl
- [ ] Tao ThongKeController
- [ ] Chay mvn compile thanh cong
- [ ] Test endpoint voi admin JWT

## Success Criteria
- GET /api/admin/thong-ke tra ve JSON voi tat ca stats
- totalOrders = so luong don hang trong DB
- totalRevenue = sum tongTien cua don hang da thanh toan
- todayOrders/todayRevenue chinh xac cho ngay hien tai
- topBooks co toi da 5 items, sorted by soLuongBan DESC
- pendingOrders = count don hang co trangThaiGiaoHang=0
- Non-admin user bi 403

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| JPQL FUNCTION('DATE', ...) khong work voi MySQL | Query fail | Test, fallback: native query |
| Aggregate query slow voi nhieu data | Timeout | Index on ngayTao, trangThaiThanhToan |
| Division by zero / null values | NPE | COALESCE in JPQL |

## Security Considerations
- Endpoint chi cho ADMIN (hasAuthority("ADMIN"))
- Thong ke doanh thu la sensitive data - khong cho user thuong xem
- Khong expose chi tiet don hang, chi aggregate numbers

## Next Steps
- Phase 08: Register `/api/admin/thong-ke` → hasAuthority("ADMIN") (GET)
- Future: Them chart data (doanh thu theo thang, tuan), export Excel
