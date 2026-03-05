# Phase 01: Foundation - Entities, Cloudinary Config, Dependencies

## Context Links
- [Plan Overview](plan.md)
- [Brainstorm Report](../reports/brainstorm-260305-0814-missing-apis-ecommerce-seo.md)
- Entity dir: `src/main/java/com/example/book_be/entity/`
- Config dir: `src/main/java/com/example/book_be/config/`

## Overview
- **Priority:** P1 - Critical (blocks all other phases)
- **Status:** pending
- **Effort:** 4h
- **Type:** SEQUENTIAL - must complete before Phases 02-07

Foundation phase: add new entities, modify existing entities, add Cloudinary dependency and config bean. JPA `ddl-auto=update` tu dong tao/alter tables.

## Key Insights
- Project dung `spring.jpa.hibernate.ddl-auto=update` nen entity changes tu dong reflect vao DB
- Entity pattern: `@Data @Entity @Table`, GenerationType.IDENTITY, column name mapping bang `@Column(name=...)`
- Existing NguoiDung da co `diaChiGiaoHang` (String) - entity moi DiaChiGiaoHang la bang rieng cho nhieu dia chi
- HinhAnh.urlHinh hien la LONGTEXT chua base64 - van giu nguyen, Cloudinary URL cung la String

## Requirements

### Functional
- F1: Entity Sach them field `slug` (unique, indexed, nullable cho data cu)
- F2: Entity NguoiDung them `resetPasswordToken` va `resetPasswordTokenExpiry`
- F3: Entity moi DiaChiGiaoHang voi FK toi NguoiDung
- F4: Entity moi Coupon voi enum loai giam gia
- F5: Cloudinary bean config doc tu env var CLOUDINARY_URL
- F6: pom.xml them cloudinary-http44 dependency

### Non-functional
- NF1: Slug phai unique de dam bao URL khong trung
- NF2: Coupon.ma phai unique
- NF3: Cloudinary config fail-safe khi CLOUDINARY_URL chua set

## Architecture

### Entity Relationships
```
NguoiDung (1) ──── (*) DiaChiGiaoHang
Coupon (standalone - no FK)
Sach.slug (new column, unique index)
NguoiDung.resetPasswordToken (new column)
NguoiDung.resetPasswordTokenExpiry (new column)
```

### Cloudinary Config Flow
```
application.properties → CLOUDINARY_URL env var
    ↓
CloudinaryConfig.java → @Bean Cloudinary
    ↓
CloudinaryService (Phase 04) → inject Cloudinary bean
```

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `pom.xml` | Them `cloudinary-http44` dependency |
| `src/main/java/com/example/book_be/entity/Sach.java` | Them field `slug` |
| `src/main/java/com/example/book_be/entity/NguoiDung.java` | Them 2 fields: resetPasswordToken, resetPasswordTokenExpiry |
| `src/main/resources/application.properties` | Them CLOUDINARY_URL env var |

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/main/java/com/example/book_be/entity/DiaChiGiaoHang.java` | Entity dia chi giao hang |
| `src/main/java/com/example/book_be/entity/Coupon.java` | Entity ma giam gia |
| `src/main/java/com/example/book_be/config/CloudinaryConfig.java` | Cloudinary bean configuration |
| `src/main/java/com/example/book_be/dao/DiaChiGiaoHangRepository.java` | JPA repository |
| `src/main/java/com/example/book_be/dao/CouponRepository.java` | JPA repository |
| `src/main/java/com/example/book_be/util/SlugUtil.java` | Slug generation utility |

## Implementation Steps

### Step 1: Add Cloudinary dependency to pom.xml
Them vao `<dependencies>` section:
```xml
<dependency>
    <groupId>com.cloudinary</groupId>
    <artifactId>cloudinary-http44</artifactId>
    <version>1.36.0</version>
</dependency>
```

### Step 2: Add CLOUDINARY_URL to application.properties
```properties
# Cloudinary
cloudinary.url=${CLOUDINARY_URL:}
```

### Step 3: Modify entity Sach.java - add slug field
Them sau field `ISBN`:
```java
@Column(name = "slug", unique = true, length = 512)
private String slug;
```

### Step 4: Modify entity NguoiDung.java - add reset password fields
Them sau field `maKichHoat`:
```java
@Column(name = "reset_password_token")
private String resetPasswordToken;

@Column(name = "reset_password_token_expiry")
@Temporal(TemporalType.TIMESTAMP)
private Date resetPasswordTokenExpiry;
```

### Step 5: Create entity DiaChiGiaoHang.java
```java
@Data
@Entity
@Table(name = "dia_chi_giao_hang")
public class DiaChiGiaoHang {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_dia_chi")
    private int maDiaChi;

    @ManyToOne(cascade = {CascadeType.DETACH, CascadeType.MERGE, CascadeType.REFRESH, CascadeType.PERSIST})
    @JoinColumn(name = "ma_nguoi_dung", nullable = false)
    @JsonIgnore
    private NguoiDung nguoiDung;

    @Column(name = "ho_ten", length = 256)
    private String hoTen;

    @Column(name = "so_dien_thoai", length = 20)
    private String soDienThoai;

    @Column(name = "dia_chi_day_du", length = 512)
    private String diaChiDayDu;

    @Column(name = "mac_dinh")
    private Boolean macDinh = false;
}
```

### Step 6: Create entity Coupon.java
```java
@Data
@Entity
@Table(name = "coupon")
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ma_coupon")
    private int maCoupon;

    @Column(name = "ma", unique = true, nullable = false, length = 50)
    private String ma;

    @Column(name = "loai")
    @Enumerated(EnumType.STRING)
    private LoaiGiamGia loai; // PERCENT hoac FIXED

    @Column(name = "gia_tri_giam")
    private double giaTriGiam;

    @Column(name = "gia_tri_toi_thieu")
    private double giaTriToiThieu; // don hang toi thieu de ap dung

    @Column(name = "han_su_dung")
    @Temporal(TemporalType.TIMESTAMP)
    private Date hanSuDung;

    @Column(name = "so_luong_toi_da")
    private int soLuongToiDa;

    @Column(name = "da_su_dung")
    private int daSuDung = 0;

    @Column(name = "is_active")
    private Boolean isActive = true;
}
```
Tao enum `LoaiGiamGia.java` trong package entity:
```java
public enum LoaiGiamGia {
    PERCENT, FIXED
}
```

### Step 7: Create CloudinaryConfig.java
```java
@Configuration
public class CloudinaryConfig {
    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinary() {
        if (cloudinaryUrl == null || cloudinaryUrl.isEmpty()) {
            // Return null bean - CloudinaryService se check
            return null;
        }
        return new Cloudinary(cloudinaryUrl);
    }
}
```

### Step 8: Create repositories
- `DiaChiGiaoHangRepository extends JpaRepository<DiaChiGiaoHang, Long>, JpaSpecificationExecutor`
  - Them: `List<DiaChiGiaoHang> findByNguoiDung_MaNguoiDung(int maNguoiDung);`
- `CouponRepository extends JpaRepository<Coupon, Long>`
  - Them: `Optional<Coupon> findByMa(String ma);`
  - Them: `boolean existsByMa(String ma);`

### Step 9: Create SlugUtil.java
```java
public class SlugUtil {
    public static String toSlug(String input) {
        if (input == null) return null;
        String slug = Normalizer.normalize(input, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
            .replaceAll("đ", "d").replaceAll("Đ", "D")
            .toLowerCase().trim()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("[\\s]+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
        return slug;
    }
}
```

### Step 10: Add @OneToMany for DiaChiGiaoHang in NguoiDung
```java
@JsonIgnore
@OneToMany(mappedBy = "nguoiDung", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
private List<DiaChiGiaoHang> danhSachDiaChi;
```

### Step 11: Compile & verify
Run `mvn compile` de check entity changes khong bi loi.

## Todo List
- [ ] Them cloudinary-http44 dependency vao pom.xml
- [ ] Them CLOUDINARY_URL vao application.properties
- [ ] Them field slug vao Sach.java
- [ ] Them resetPasswordToken, resetPasswordTokenExpiry vao NguoiDung.java
- [ ] Them @OneToMany danhSachDiaChi vao NguoiDung.java
- [ ] Tao DiaChiGiaoHang.java entity
- [ ] Tao Coupon.java entity
- [ ] Tao LoaiGiamGia.java enum
- [ ] Tao CloudinaryConfig.java
- [ ] Tao DiaChiGiaoHangRepository.java
- [ ] Tao CouponRepository.java
- [ ] Tao SlugUtil.java
- [ ] Chay mvn compile thanh cong

## Success Criteria
- `mvn compile` pass khong loi
- App start len, JPA tu dong tao tables: dia_chi_giao_hang, coupon
- Columns moi (slug, reset_password_token, reset_password_token_expiry) xuat hien trong DB
- Cloudinary bean duoc tao (hoac null neu CLOUDINARY_URL khong set)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| CLOUDINARY_URL chua set | App crash khi start | Return null bean, CloudinaryService check null |
| Slug conflict voi data cu | Unique constraint violation | Slug nullable, generate khi save moi |
| Entity field name conflict | Compile error | Column name mapping tuong minh |

## Security Considerations
- CLOUDINARY_URL la secret - doc tu env var, KHONG hardcode
- resetPasswordToken la sensitive data - khong expose ra API response

## Next Steps
- Sau khi Phase 01 complete, tat ca Phase 02-07 co the bat dau song song
- Moi phase co file ownership rieng, khong conflict
