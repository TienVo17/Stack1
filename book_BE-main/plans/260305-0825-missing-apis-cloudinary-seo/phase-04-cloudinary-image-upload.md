# Phase 04: Cloudinary Image Upload

## Context Links
- [Plan Overview](plan.md)
- [Phase 01 - Foundation](phase-01-foundation-entities-cloudinary.md)
- Existing: `src/main/java/com/example/book_be/controller/admin/SachController.java`
- Existing: `src/main/java/com/example/book_be/dao/HinhAnhRepository.java`
- Existing: `src/main/java/com/example/book_be/entity/HinhAnh.java`

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 4h
- **Blocked by:** Phase 01
- **Parallel with:** Phases 02, 03, 05, 06, 07

Tao CloudinaryService va endpoint upload anh multipart cho admin. Anh cu base64 van hoat dong (backward compat).

## Key Insights
- HinhAnh.urlHinh hien la LONGTEXT chua base64 string
- SachServiceImpl.save() luu anh tu `listImageStr` (List<String>) - day la base64 strings
- Endpoint upload moi se la multipart/form-data, tra ve URL Cloudinary
- Cloudinary Java SDK: `cloudinary.uploader().upload(file, options)` tra ve Map chua "secure_url"
- Phase 01 tao CloudinaryConfig bean - phase nay tao service su dung bean do
- HinhAnh entity giu nguyen structure, chi luu URL thay vi base64

## Requirements

### Functional
- F1: Admin upload anh sach qua multipart/form-data
- F2: Anh duoc upload len Cloudinary, tra ve URL
- F3: URL Cloudinary duoc luu vao HinhAnh.urlHinh
- F4: Anh cu base64 van hien thi binh thuong (khong migration)
- F5: Ho tro upload nhieu anh cung luc (MultipartFile[])

### Non-functional
- NF1: Max file size: 5MB per image
- NF2: Chi accept image types: jpg, png, webp, gif
- NF3: Cloudinary folder: "web-ban-sach/books/"
- NF4: Fail gracefully khi Cloudinary khong config

## Architecture

### Upload Flow
```
Admin Client
    ↓ POST multipart/form-data
/api/admin/sach/{id}/hinh-anh
    ↓
SachController (admin)
    ↓
CloudinaryService.upload(file)
    ↓ Cloudinary SDK
Cloudinary CDN → returns secure_url
    ↓
HinhAnhRepository.save(url)
    ↓
Response: HinhAnh entity with URL
```

### Backward Compatibility
```
Existing flow (base64):
  Frontend → base64 string → SachServiceImpl.save() → HinhAnh.urlHinh = base64

New flow (Cloudinary):
  Frontend → MultipartFile → CloudinaryService → HinhAnh.urlHinh = "https://res.cloudinary.com/..."

Both work because urlHinh is just a String field.
Frontend can detect: if urlHinh starts with "http" → <img src=url>
                      if urlHinh starts with "data:" → <img src=base64>
```

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `src/main/java/com/example/book_be/controller/admin/SachController.java` | Them endpoint upload hinh anh |

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/main/java/com/example/book_be/services/CloudinaryService.java` | Cloudinary upload service |

## Implementation Steps

### Step 1: Read existing admin SachController
Xem existing pattern de them endpoint phu hop.

### Step 2: Create CloudinaryService
```java
@Service
public class CloudinaryService {
    private final Cloudinary cloudinary;

    @Autowired(required = false)
    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String upload(MultipartFile file) throws IOException {
        if (cloudinary == null) {
            throw new IllegalStateException("Cloudinary chua duoc cau hinh. Set CLOUDINARY_URL env var.");
        }
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Chi chap nhan file anh");
        }
        // Upload
        Map<String, Object> options = new HashMap<>();
        options.put("folder", "web-ban-sach/books");
        options.put("resource_type", "image");
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), options);
        return (String) uploadResult.get("secure_url");
    }

    public void delete(String publicId) throws IOException {
        if (cloudinary == null) return;
        cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
    }

    public boolean isConfigured() {
        return cloudinary != null;
    }
}
```

### Step 3: Add upload endpoint to admin SachController
```java
@Autowired
private CloudinaryService cloudinaryService;

@Autowired
private HinhAnhRepository hinhAnhRepository;

@Autowired
private SachRepository sachRepository;

@PostMapping("/{id}/hinh-anh")
public ResponseEntity<?> uploadHinhAnh(
        @PathVariable Long id,
        @RequestParam("files") MultipartFile[] files) {
    // Check Cloudinary config
    if (!cloudinaryService.isConfigured()) {
        return ResponseEntity.status(500).body("Cloudinary chua duoc cau hinh");
    }
    // Find sach
    Sach sach = sachRepository.findById(id).orElse(null);
    if (sach == null) {
        return ResponseEntity.badRequest().body("Sach khong ton tai");
    }
    List<HinhAnh> savedImages = new ArrayList<>();
    for (MultipartFile file : files) {
        try {
            // Validate size
            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("File " + file.getOriginalFilename()
                    + " vuot qua 5MB");
            }
            String url = cloudinaryService.upload(file);
            HinhAnh hinhAnh = new HinhAnh();
            hinhAnh.setTenHinhAnh(file.getOriginalFilename());
            hinhAnh.setUrlHinh(url);
            hinhAnh.setIcon(false);
            hinhAnh.setSach(sach);
            savedImages.add(hinhAnhRepository.save(hinhAnh));
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Loi upload anh: " + e.getMessage());
        }
    }
    return ResponseEntity.ok(savedImages);
}
```

### Step 4: Configure max file size in application.properties
```properties
# File upload
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=25MB
```

### Step 5: Compile & test
Run `mvn compile`. Test upload voi curl:
```bash
curl -X POST http://localhost:8080/api/admin/sach/1/hinh-anh \
  -H "Authorization: Bearer {jwt}" \
  -F "files=@test-image.jpg"
```

## Todo List
- [ ] Tao CloudinaryService.java
- [ ] Them upload endpoint vao admin SachController
- [ ] Them multipart config vao application.properties
- [ ] Chay mvn compile thanh cong
- [ ] Test upload voi Cloudinary

## Success Criteria
- POST /api/admin/sach/{id}/hinh-anh upload thanh cong, tra ve HinhAnh voi URL Cloudinary
- URL bat dau voi `https://res.cloudinary.com/`
- Anh cu base64 van hien thi binh thuong
- File > 5MB bi reject
- Non-image file bi reject
- App khong crash khi CLOUDINARY_URL chua set

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Cloudinary free tier het quota | Upload fail | Monitor usage, fallback message |
| Large file upload timeout | 504 Gateway Timeout | Max 5MB limit, async upload neu can |
| CLOUDINARY_URL khong set | NPE | isConfigured() check, @Autowired(required=false) |
| Cloudinary SDK version conflict | Compile error | Pin version 1.36.0 |

## Security Considerations
- Endpoint chi cho ADMIN (hasAuthority("ADMIN"))
- Validate file type server-side (khong tin content-type tu client)
- Limit file size 5MB
- CLOUDINARY_URL la secret - doc tu env var
- Cloudinary upload co built-in malware scanning

## Next Steps
- Phase 08: Register `/api/admin/sach/*/hinh-anh` → hasAuthority("ADMIN") POST
- Future: Migration script chuyen anh cu base64 → Cloudinary (khong trong scope MVP)
