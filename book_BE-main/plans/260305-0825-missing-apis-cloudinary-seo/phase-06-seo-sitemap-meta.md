# Phase 06: SEO - Sitemap, Meta Tags, Slug

## Context Links
- [Plan Overview](plan.md)
- [Phase 01 - Foundation](phase-01-foundation-entities-cloudinary.md) (slug field in Sach entity)
- [Phase 03](phase-03-product-catalog-apis.md) (GET /api/sach/slug/{slug})
- Existing: `src/main/java/com/example/book_be/entity/Sach.java`
- Existing: `src/main/java/com/example/book_be/dao/SachRepository.java`

## Overview
- **Priority:** P2 - High
- **Status:** pending
- **Effort:** 4h
- **Blocked by:** Phase 01
- **Parallel with:** Phases 02, 03, 04, 05, 07

SEO foundation: sitemap.xml, meta tags JSON endpoint, slug auto-generation. Phase 1 cua SEO strategy (React Helmet). Backend API tuong thich ca React Helmet lan future Next.js migration.

## Key Insights
- Slug field da duoc them o Phase 01 (Sach.slug unique)
- SlugUtil da duoc tao o Phase 01
- Phase 03 da them GET /api/sach/slug/{slug}
- React SPA can meta tags tu API → React Helmet consume /api/seo/sach/{id}
- Sitemap XML: Google Bot co the crawl, indexing sach va the loai
- JSON-LD (Schema.org Book type) giup Google hieu content
- Can auto-generate slug cho sach cu khi save/update (khong dung migration script)

## Requirements

### Functional
- F1: GET /sitemap.xml - Sitemap chua tat ca sach active + the loai
- F2: GET /api/seo/sach/{id} - Meta tags JSON (title, description, canonical, ogImage, jsonLd)
- F3: Auto-generate slug khi save/update sach (SachServiceImpl)
- F4: Slug unique - neu trung, append "-1", "-2", etc.

### Non-functional
- NF1: sitemap.xml response Content-Type: application/xml
- NF2: Meta tags response nhanh (< 100ms)
- NF3: Slug format: lowercase, no diacritics, hyphen separated

## Architecture

### Sitemap XML Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://localhost:3000/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>http://localhost:3000/sach/slug-ten-sach</loc>
    <lastmod>2026-03-05</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:3000/the-loai/1</loc>
    <priority>0.6</priority>
  </url>
</urlset>
```

### Meta Tags JSON Response
```json
{
  "title": "Ten Sach - Web Ban Sach",
  "description": "Mo ta ngan gon cua sach (max 160 chars)",
  "canonical": "http://localhost:3000/sach/slug-ten-sach",
  "ogImage": "url hinh anh dau tien",
  "ogType": "product",
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": "Ten Sach",
    "author": "Ten Tac Gia",
    "isbn": "...",
    "description": "...",
    "image": "...",
    "offers": {
      "@type": "Offer",
      "price": 150000,
      "priceCurrency": "VND",
      "availability": "https://schema.org/InStock"
    }
  }
}
```

### Slug Auto-Generation Flow
```
SachServiceImpl.save(sach) / update(sach)
    ↓
if (sach.slug == null || sach.slug.isEmpty())
    ↓
slug = SlugUtil.toSlug(sach.tenSach)
    ↓
if (sachRepository.existsBySlug(slug))
    → slug = slug + "-" + maSach
    ↓
sach.setSlug(slug)
```

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `src/main/java/com/example/book_be/services/admin/SachServiceImpl.java` | Auto-generate slug khi save/update |
| `src/main/java/com/example/book_be/dao/SachRepository.java` | Them: existsBySlug, findAllByIsActive |

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/main/java/com/example/book_be/controller/SitemapController.java` | Sitemap XML endpoint |
| `src/main/java/com/example/book_be/controller/SeoController.java` | Meta tags endpoint |
| `src/main/java/com/example/book_be/services/SeoService.java` | SEO service interface |
| `src/main/java/com/example/book_be/services/SeoServiceImpl.java` | SEO service implementation |

## Implementation Steps

### Step 1: Add queries to SachRepository
```java
boolean existsBySlug(String slug);
List<Sach> findAllByIsActive(Integer isActive);
Sach findBySlug(String slug); // da them o Phase 03
```

### Step 2: Auto-generate slug in SachServiceImpl
Modify `save()` va `update()`:
```java
private void generateSlugIfMissing(Sach sach) {
    if (sach.getSlug() == null || sach.getSlug().isEmpty()) {
        String slug = SlugUtil.toSlug(sach.getTenSach());
        if (sachRepository.existsBySlug(slug)) {
            slug = slug + "-" + sach.getMaSach();
        }
        sach.setSlug(slug);
    }
}
```
Call `generateSlugIfMissing(sach)` truoc `sachRepository.save(sach)`.

### Step 3: Create SeoService interface & impl
```java
// SeoService.java
public interface SeoService {
    Map<String, Object> getMetaTags(int maSach);
    String generateSitemap();
}

// SeoServiceImpl.java
@Service
public class SeoServiceImpl implements SeoService {
    @Autowired
    private SachRepository sachRepository;
    @Autowired
    private HinhAnhRepository hinhAnhRepository;
    @Autowired
    private TheLoaiRepository theLoaiRepository;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    public Map<String, Object> getMetaTags(int maSach) {
        Sach sach = sachRepository.findById((long) maSach).orElse(null);
        if (sach == null) return null;

        // Load first image
        List<HinhAnh> images = hinhAnhRepository.findAll((root, query, builder) ->
            builder.equal(root.get("sach").get("maSach"), maSach));
        String ogImage = "";
        if (!images.isEmpty()) {
            String url = images.get(0).getUrlHinh();
            // Neu la URL Cloudinary, dung truc tiep; neu base64, bo qua
            if (url != null && url.startsWith("http")) ogImage = url;
        }

        String slug = sach.getSlug() != null ? sach.getSlug() : String.valueOf(maSach);
        String canonical = frontendUrl + "/sach/" + slug;
        String description = sach.getMoTa() != null
            ? sach.getMoTa().substring(0, Math.min(sach.getMoTa().length(), 160))
            : sach.getTenSach();

        Map<String, Object> result = new HashMap<>();
        result.put("title", sach.getTenSach() + " - Web Ban Sach");
        result.put("description", description);
        result.put("canonical", canonical);
        result.put("ogImage", ogImage);
        result.put("ogType", "product");

        // JSON-LD (Schema.org Book)
        Map<String, Object> jsonLd = new LinkedHashMap<>();
        jsonLd.put("@context", "https://schema.org");
        jsonLd.put("@type", "Book");
        jsonLd.put("name", sach.getTenSach());
        jsonLd.put("author", sach.getTenTacGia());
        jsonLd.put("isbn", sach.getISBN());
        jsonLd.put("description", sach.getMoTa());
        jsonLd.put("image", ogImage);
        Map<String, Object> offers = new LinkedHashMap<>();
        offers.put("@type", "Offer");
        offers.put("price", sach.getGiaBan());
        offers.put("priceCurrency", "VND");
        offers.put("availability", sach.getSoLuong() > 0
            ? "https://schema.org/InStock" : "https://schema.org/OutOfStock");
        jsonLd.put("offers", offers);
        result.put("jsonLd", jsonLd);

        return result;
    }

    @Override
    public String generateSitemap() {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // Homepage
        sb.append("  <url>\n    <loc>").append(frontendUrl).append("/</loc>\n");
        sb.append("    <priority>1.0</priority>\n  </url>\n");

        // Books
        List<Sach> sachList = sachRepository.findAllByIsActive(1);
        for (Sach sach : sachList) {
            String slug = sach.getSlug() != null ? sach.getSlug() : String.valueOf(sach.getMaSach());
            sb.append("  <url>\n    <loc>").append(frontendUrl).append("/sach/").append(slug).append("</loc>\n");
            sb.append("    <priority>0.8</priority>\n  </url>\n");
        }

        // Categories
        List<TheLoai> theLoais = theLoaiRepository.findAll();
        for (TheLoai tl : theLoais) {
            sb.append("  <url>\n    <loc>").append(frontendUrl).append("/the-loai/")
              .append(tl.getMaTheLoai()).append("</loc>\n");
            sb.append("    <priority>0.6</priority>\n  </url>\n");
        }

        sb.append("</urlset>");
        return sb.toString();
    }
}
```

### Step 4: Create SitemapController
```java
@RestController
public class SitemapController {
    @Autowired
    private SeoService seoService;

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        return ResponseEntity.ok(seoService.generateSitemap());
    }
}
```

### Step 5: Create SeoController
```java
@RestController
@RequestMapping("/api/seo")
public class SeoController {
    @Autowired
    private SeoService seoService;

    @GetMapping("/sach/{id}")
    public ResponseEntity<?> getMetaTags(@PathVariable int id) {
        Map<String, Object> meta = seoService.getMetaTags(id);
        if (meta == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(meta);
    }
}
```

### Step 6: Add app.frontend-url to application.properties
```properties
# Frontend URL (for SEO canonical links)
app.frontend-url=${FRONTEND_URL:http://localhost:3000}
```

### Step 7: Compile & test
```bash
curl http://localhost:8080/sitemap.xml
curl http://localhost:8080/api/seo/sach/1
```

## Todo List
- [ ] Them existsBySlug, findAllByIsActive vao SachRepository
- [ ] Them generateSlugIfMissing vao SachServiceImpl
- [ ] Tao SeoService interface
- [ ] Tao SeoServiceImpl (meta tags + sitemap)
- [ ] Tao SitemapController
- [ ] Tao SeoController
- [ ] Them app.frontend-url vao application.properties
- [ ] Chay mvn compile thanh cong
- [ ] Test sitemap.xml
- [ ] Test meta tags endpoint

## Success Criteria
- GET /sitemap.xml tra ve XML hop le voi tat ca sach active
- GET /api/seo/sach/{id} tra ve {title, description, canonical, ogImage, jsonLd}
- jsonLd chua Schema.org Book type
- Sach moi khi save tu dong co slug
- Sach cu khi update duoc generate slug neu chua co

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Slug trung khi 2 sach ten giong nhau | Unique constraint violation | Append "-{maSach}" khi trung |
| Sitemap qua lon (> 50MB) | Google reject | Unlikely voi bookstore, future: sitemap index |
| Vietnamese slug loi diacritics | URL chua dau | SlugUtil handle Normalizer.NFD + remove combining marks |
| ogImage la base64 (khong phai URL) | Social media khong hien | Check startsWith("http") |

## Security Considerations
- Sitemap va meta tags la public endpoints
- Khong expose sensitive data (gia von, so luong ton, etc.) trong meta tags
- Frontend URL doc tu env var de khong hardcode

## Next Steps
- Phase 08: Register endpoints
  - `/sitemap.xml` → permitAll (GET)
  - `/api/seo/**` → permitAll (GET)
- Frontend: Tich hop React Helmet consume /api/seo/sach/{id}
- Future: Next.js migration, server-side rendering
