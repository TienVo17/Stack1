# Phase 02: Auth & User Profile APIs

## Context Links
- [Plan Overview](plan.md)
- [Phase 01 - Foundation](phase-01-foundation-entities-cloudinary.md)
- Existing: `src/main/java/com/example/book_be/controller/TaiKhoanController.java`
- Existing: `src/main/java/com/example/book_be/services/TaiKhoanService.java`
- Existing: `src/main/java/com/example/book_be/entity/NguoiDung.java`

## Overview
- **Priority:** P1 - Critical
- **Status:** pending
- **Effort:** 6h
- **Blocked by:** Phase 01
- **Parallel with:** Phases 03, 04, 05, 06, 07

Them 5 endpoints: xem/cap nhat profile, doi mat khau, quen mat khau, dat lai mat khau.

## Key Insights
- TaiKhoanController hien chi co dang-ky, dang-nhap, kich-hoat
- TaiKhoanService da co EmailService injected, co the reuse cho reset password email
- NguoiDung entity da co cac field profile (hoDem, ten, gioiTinh, email, soDienThoai, diaChiMuaHang)
- SecurityContextHolder dang duoc dung trong DonHangController de lay current user - reuse pattern nay
- Password dang duoc hash bang BCryptPasswordEncoder (bean da co trong SecurityConfiguration)
- Phase 01 se them resetPasswordToken + resetPasswordTokenExpiry vao NguoiDung

## Requirements

### Functional
- F1: User xem profile cua minh (GET /api/nguoi-dung/ho-so)
- F2: User cap nhat ten, SDT, dia chi, gioi tinh (PUT /api/nguoi-dung/cap-nhat-ho-so)
- F3: User doi mat khau - verify old password truoc (PUT /tai-khoan/doi-mat-khau)
- F4: Guest gui email reset password (POST /tai-khoan/quen-mat-khau) - GUI UUID token, 10 min expiry
- F5: Guest reset password bang token (POST /tai-khoan/dat-lai-mat-khau)

### Non-functional
- NF1: Profile response KHONG tra ve matKhau, maKichHoat, resetPasswordToken
- NF2: Reset token 10 phut expiry
- NF3: Password change phai verify old password truoc
- NF4: Rate limit cho quen-mat-khau (chong spam email)

## Architecture

### API Flow
```
Client → TaiKhoanController (password ops)
       → NguoiDungController (profile ops)
            ↓
       TaiKhoanService (password logic)
       NguoiDungService (profile logic)
            ↓
       NguoiDungRepository
            ↓
       EmailService (reset password email)
```

### Password Reset Flow
```
1. POST /tai-khoan/quen-mat-khau {email}
   → Generate UUID token → Save to NguoiDung → Send email with token
   → Response: "Email da duoc gui"

2. POST /tai-khoan/dat-lai-mat-khau {email, token, matKhauMoi}
   → Find user by email → Check token match → Check token not expired
   → BCrypt encode matKhauMoi → Save → Clear token
   → Response: "Dat lai mat khau thanh cong"
```

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `src/main/java/com/example/book_be/controller/TaiKhoanController.java` | Them 3 endpoints: doi-mat-khau, quen-mat-khau, dat-lai-mat-khau |
| `src/main/java/com/example/book_be/services/TaiKhoanService.java` | Them methods: doiMatKhau, quenMatKhau, datLaiMatKhau |
| `src/main/java/com/example/book_be/dao/NguoiDungRepository.java` | Them: findByResetPasswordToken(String token) |

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/main/java/com/example/book_be/controller/NguoiDungController.java` | Profile endpoints (GET/PUT ho-so) |
| `src/main/java/com/example/book_be/services/NguoiDungService.java` | Profile service interface |
| `src/main/java/com/example/book_be/services/NguoiDungServiceImpl.java` | Profile service implementation |

## Implementation Steps

### Step 1: Add findByResetPasswordToken to NguoiDungRepository
```java
NguoiDung findByResetPasswordToken(String resetPasswordToken);
```

### Step 2: Create NguoiDungService interface
```java
public interface NguoiDungService {
    NguoiDung getHoSo(String tenDangNhap);
    NguoiDung capNhatHoSo(String tenDangNhap, NguoiDung updates);
}
```

### Step 3: Create NguoiDungServiceImpl
```java
@Service
public class NguoiDungServiceImpl implements NguoiDungService {
    @Autowired
    private NguoiDungRepository nguoiDungRepository;

    @Override
    public NguoiDung getHoSo(String tenDangNhap) {
        return nguoiDungRepository.findByTenDangNhap(tenDangNhap);
    }

    @Override
    public NguoiDung capNhatHoSo(String tenDangNhap, NguoiDung updates) {
        NguoiDung nguoiDung = nguoiDungRepository.findByTenDangNhap(tenDangNhap);
        if (nguoiDung == null) throw new RuntimeException("User khong ton tai");
        // Chi update cac field cho phep
        if (updates.getHoDem() != null) nguoiDung.setHoDem(updates.getHoDem());
        if (updates.getTen() != null) nguoiDung.setTen(updates.getTen());
        if (updates.getSoDienThoai() != null) nguoiDung.setSoDienThoai(updates.getSoDienThoai());
        if (updates.getDiaChiMuaHang() != null) nguoiDung.setDiaChiMuaHang(updates.getDiaChiMuaHang());
        if (updates.getDiaChiGiaoHang() != null) nguoiDung.setDiaChiGiaoHang(updates.getDiaChiGiaoHang());
        nguoiDung.setGioiTinh(updates.getGioiTinh());
        return nguoiDungRepository.save(nguoiDung);
    }
}
```

### Step 4: Create NguoiDungController
```java
@RestController
@RequestMapping("/api/nguoi-dung")
public class NguoiDungController {
    @Autowired
    private NguoiDungService nguoiDungService;

    @GetMapping("/ho-so")
    public ResponseEntity<?> getHoSo() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        NguoiDung user = nguoiDungService.getHoSo(auth.getName());
        if (user == null) return ResponseEntity.badRequest().body("User khong ton tai");
        // Tra ve DTO hoac clear sensitive fields
        user.setMatKhau(null);
        user.setMaKichHoat(null);
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/cap-nhat-ho-so")
    public ResponseEntity<?> capNhatHoSo(@RequestBody NguoiDung updates) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        NguoiDung user = nguoiDungService.capNhatHoSo(auth.getName(), updates);
        user.setMatKhau(null);
        user.setMaKichHoat(null);
        return ResponseEntity.ok(user);
    }
}
```

### Step 5: Add password methods to TaiKhoanService
```java
// Doi mat khau (authenticated)
public ResponseEntity<?> doiMatKhau(String tenDangNhap, String matKhauCu, String matKhauMoi) {
    NguoiDung user = nguoiDungRepository.findByTenDangNhap(tenDangNhap);
    if (user == null) return ResponseEntity.badRequest().body(new ThongBao("User khong ton tai"));
    if (!bCryptPasswordEncoder.matches(matKhauCu, user.getMatKhau())) {
        return ResponseEntity.badRequest().body(new ThongBao("Mat khau cu khong chinh xac"));
    }
    user.setMatKhau(bCryptPasswordEncoder.encode(matKhauMoi));
    nguoiDungRepository.save(user);
    return ResponseEntity.ok("Doi mat khau thanh cong");
}

// Quen mat khau (public)
public ResponseEntity<?> quenMatKhau(String email) {
    NguoiDung user = nguoiDungRepository.findByEmail(email);
    if (user == null) return ResponseEntity.badRequest().body(new ThongBao("Email khong ton tai"));
    String token = UUID.randomUUID().toString();
    user.setResetPasswordToken(token);
    user.setResetPasswordTokenExpiry(new Date(System.currentTimeMillis() + 10 * 60 * 1000)); // 10 min
    nguoiDungRepository.save(user);
    guiEmailResetPassword(email, token);
    return ResponseEntity.ok("Email dat lai mat khau da duoc gui");
}

// Dat lai mat khau (public)
public ResponseEntity<?> datLaiMatKhau(String email, String token, String matKhauMoi) {
    NguoiDung user = nguoiDungRepository.findByEmail(email);
    if (user == null) return ResponseEntity.badRequest().body(new ThongBao("Email khong ton tai"));
    if (user.getResetPasswordToken() == null || !user.getResetPasswordToken().equals(token)) {
        return ResponseEntity.badRequest().body(new ThongBao("Token khong hop le"));
    }
    if (user.getResetPasswordTokenExpiry().before(new Date())) {
        return ResponseEntity.badRequest().body(new ThongBao("Token da het han"));
    }
    user.setMatKhau(bCryptPasswordEncoder.encode(matKhauMoi));
    user.setResetPasswordToken(null);
    user.setResetPasswordTokenExpiry(null);
    nguoiDungRepository.save(user);
    return ResponseEntity.ok("Dat lai mat khau thanh cong");
}
```

### Step 6: Add password endpoints to TaiKhoanController
```java
@PutMapping("/doi-mat-khau")
public ResponseEntity<?> doiMatKhau(@RequestBody Map<String, String> body) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return taiKhoanService.doiMatKhau(auth.getName(), body.get("matKhauCu"), body.get("matKhauMoi"));
}

@PostMapping("/quen-mat-khau")
public ResponseEntity<?> quenMatKhau(@RequestBody Map<String, String> body) {
    return taiKhoanService.quenMatKhau(body.get("email"));
}

@PostMapping("/dat-lai-mat-khau")
public ResponseEntity<?> datLaiMatKhau(@RequestBody Map<String, String> body) {
    return taiKhoanService.datLaiMatKhau(body.get("email"), body.get("token"), body.get("matKhauMoi"));
}
```

### Step 7: Add guiEmailResetPassword private method to TaiKhoanService
```java
private void guiEmailResetPassword(String email, String token) {
    String subject = "Dat lai mat khau - WebBanSach";
    String url = Endpoints.front_end_host + "/dat-lai-mat-khau?email=" + email + "&token=" + token;
    String text = "<html><body>"
        + "<h2>Dat lai mat khau</h2>"
        + "<p>Click vao link duoi day de dat lai mat khau (het han sau 10 phut):</p>"
        + "<a href='" + url + "'>" + url + "</a>"
        + "</body></html>";
    emailService.sendEmail("tienvovan917@gmail.com", email, subject, text);
}
```

## Todo List
- [ ] Them findByResetPasswordToken vao NguoiDungRepository
- [ ] Tao NguoiDungService interface
- [ ] Tao NguoiDungServiceImpl
- [ ] Tao NguoiDungController voi GET/PUT ho-so
- [ ] Them doiMatKhau method vao TaiKhoanService
- [ ] Them quenMatKhau method vao TaiKhoanService
- [ ] Them datLaiMatKhau method vao TaiKhoanService
- [ ] Them guiEmailResetPassword vao TaiKhoanService
- [ ] Them 3 endpoints vao TaiKhoanController
- [ ] Chay mvn compile thanh cong
- [ ] Test thu API bang Postman/curl

## Success Criteria
- GET /api/nguoi-dung/ho-so tra ve user profile (khong co matKhau)
- PUT /api/nguoi-dung/cap-nhat-ho-so cap nhat duoc ten, SDT, dia chi
- PUT /tai-khoan/doi-mat-khau tra ve success khi old password dung
- POST /tai-khoan/quen-mat-khau gui duoc email voi reset link
- POST /tai-khoan/dat-lai-mat-khau reset duoc password khi token hop le
- Token expired sau 10 phut tra ve loi

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Email service fail | User khong nhan duoc reset email | Try-catch, log error, return success anyway (khong leak info) |
| Token brute force | Account takeover | UUID 128-bit, 10 min expiry, 1 active token per user |
| Profile update overwrite | Data loss | Chi update non-null fields |

## Security Considerations
- KHONG tra ve matKhau, maKichHoat, resetPasswordToken trong profile response
- BCrypt cho password hashing (da co san)
- Verify old password truoc khi cho doi mat khau
- Reset token het han sau 10 phut
- KHONG confirm email ton tai khi quen mat khau (tranh enumeration) - can xem xet tra ve generic message
- Password reset endpoint la public, can validate token chinh xac

## Next Steps
- Phase 08: Register endpoints moi vao SecurityConfiguration
  - `/api/nguoi-dung/ho-so` → authenticated
  - `/api/nguoi-dung/cap-nhat-ho-so` → authenticated
  - `/tai-khoan/doi-mat-khau` → authenticated
  - `/tai-khoan/quen-mat-khau` → permitAll
  - `/tai-khoan/dat-lai-mat-khau` → permitAll
