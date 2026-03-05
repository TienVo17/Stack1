# Phase 08: Security Configuration Update

## Context Links
- [Plan Overview](plan.md)
- All phase files (02-07) define endpoints that need security registration
- Existing: `src/main/java/com/example/book_be/security/SecurityConfiguration.java`
- Existing: `src/main/java/com/example/book_be/security/Endpoints.java`

## Overview
- **Priority:** P1 - Critical
- **Status:** pending
- **Effort:** 3h
- **Blocked by:** ALL phases (02-07)
- **Type:** SEQUENTIAL - must be last

Register tat ca endpoint moi vao SecurityConfiguration va Endpoints.java. Dam bao CORS, authentication, authorization dung cho moi endpoint.

## Key Insights
- Endpoints.java chua static String arrays cho PUBLIC/ADMIN GET/POST/PUT/DELETE
- SecurityConfiguration.java dung authorizeHttpRequests voi mix cua Endpoints arrays va inline .requestMatchers
- Hien tai co van de: nhieu endpoints duoc define inline trong SecurityConfiguration thay vi trong Endpoints.java
- CORS hien chi cho `http://localhost:3000` - giu nguyen cho MVP
- Mot so endpoint moi la authenticated (khong phai public, khong phai admin) - can them authenticated matchers

## Requirements

### Functional
- F1: Tat ca public endpoints moi accessible khong can JWT
- F2: Tat ca authenticated endpoints yeu cau valid JWT
- F3: Tat ca admin endpoints yeu cau role ADMIN
- F4: CORS cho phep tat ca HTTP methods can thiet

### Non-functional
- NF1: Khong break existing endpoint security
- NF2: Pattern matching phai chinh xac, khong qua rong

## Architecture

### Endpoint Classification

#### PUBLIC (permitAll)
| Endpoint | Method | Source Phase |
|----------|--------|-------------|
| `/api/the-loai` | GET | Phase 03 |
| `/api/sach/ban-chay` | GET | Phase 03 |
| `/api/sach/moi-nhat` | GET | Phase 03 |
| `/api/sach/*/lien-quan` | GET | Phase 03 |
| `/api/sach/slug/*` | GET | Phase 03 |
| `/tai-khoan/quen-mat-khau` | POST | Phase 02 |
| `/tai-khoan/dat-lai-mat-khau` | POST | Phase 02 |
| `/sitemap.xml` | GET | Phase 06 |
| `/api/seo/**` | GET | Phase 06 |

#### AUTHENTICATED (.authenticated())
| Endpoint | Method | Source Phase |
|----------|--------|-------------|
| `/api/nguoi-dung/ho-so` | GET | Phase 02 |
| `/api/nguoi-dung/cap-nhat-ho-so` | PUT | Phase 02 |
| `/tai-khoan/doi-mat-khau` | PUT | Phase 02 |
| `/api/don-hang/{id}` | GET | Phase 03 |
| `/api/yeu-thich/**` | GET/POST/DELETE | Phase 03 |
| `/api/dia-chi/**` | GET/POST/PUT/DELETE | Phase 05 |
| `/api/coupon/kiem-tra` | POST | Phase 05 |

#### ADMIN (hasAuthority("ADMIN"))
| Endpoint | Method | Source Phase |
|----------|--------|-------------|
| `/api/admin/sach/*/hinh-anh` | POST | Phase 04 |
| `/api/admin/coupon/**` | GET/POST/PUT/DELETE | Phase 05 |
| `/api/admin/thong-ke` | GET | Phase 07 |

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `src/main/java/com/example/book_be/security/Endpoints.java` | Them endpoints moi vao arrays |
| `src/main/java/com/example/book_be/security/SecurityConfiguration.java` | Register authenticated endpoints |

## Implementation Steps

### Step 1: Update Endpoints.java - PUBLIC_GET_ENDPOINS
Them vao array:
```java
public static final String[] PUBLIC_GET_ENDPOINS = {
    // ... existing ...
    "/api/the-loai",
    "/api/sach/ban-chay",
    "/api/sach/moi-nhat",
    "/api/sach/*/lien-quan",
    "/api/sach/slug/**",
    "/sitemap.xml",
    "/api/seo/**",
};
```

### Step 2: Update Endpoints.java - PUBLIC_POST_ENDPOINS
Them vao array:
```java
public static final String[] PUBLIC_POST_ENDPOINS = {
    // ... existing ...
    "/tai-khoan/quen-mat-khau",
    "/tai-khoan/dat-lai-mat-khau",
};
```

### Step 3: Add AUTHENTICATED endpoint arrays to Endpoints.java
Them moi static arrays:
```java
// AUTHENTICATED (user da dang nhap)
public static final String[] AUTH_GET_ENDPOINTS = {
    "/api/nguoi-dung/ho-so",
    "/api/don-hang/**",
    "/api/yeu-thich",
    "/api/yeu-thich/**",
    "/api/dia-chi",
    "/api/dia-chi/**",
};

public static final String[] AUTH_POST_ENDPOINTS = {
    "/api/yeu-thich/**",
    "/api/dia-chi",
    "/api/coupon/kiem-tra",
};

public static final String[] AUTH_PUT_ENDPOINTS = {
    "/api/nguoi-dung/cap-nhat-ho-so",
    "/tai-khoan/doi-mat-khau",
    "/api/dia-chi/**",
};

public static final String[] AUTH_DELETE_ENDPOINTS = {
    "/api/yeu-thich/**",
    "/api/dia-chi/**",
};
```

### Step 4: Update Endpoints.java - ADMIN arrays
```java
public static final String[] ADMIN_GET_ENDPOINS = {
    // ... existing ...
    "/api/admin/thong-ke",
    "/api/admin/coupon",
    "/api/admin/coupon/**",
};

public static final String[] ADMIN_POST_ENDPOINS = {
    // ... existing ...
    "/api/admin/sach/*/hinh-anh",
    "/api/admin/coupon",
};

public static final String[] ADMIN_PUT_ENDPOINS = {
    // ... existing ...
    "/api/admin/coupon/**",
};

public static final String[] ADMIN_DELETE_ENDPOINS = {
    // ... existing ...
    "/api/admin/coupon/**",
};
```

### Step 5: Update SecurityConfiguration.java
Them authenticated matchers vao filter chain:
```java
http.authorizeHttpRequests(
    config -> config
        // ... existing matchers ...

        // Authenticated endpoints (user)
        .requestMatchers(HttpMethod.GET, Endpoints.AUTH_GET_ENDPOINTS).authenticated()
        .requestMatchers(HttpMethod.POST, Endpoints.AUTH_POST_ENDPOINTS).authenticated()
        .requestMatchers(HttpMethod.PUT, Endpoints.AUTH_PUT_ENDPOINTS).authenticated()
        .requestMatchers(HttpMethod.DELETE, Endpoints.AUTH_DELETE_ENDPOINTS).authenticated()

        // Admin endpoints (use arrays instead of inline)
        .requestMatchers(HttpMethod.POST, Endpoints.ADMIN_POST_ENDPOINS).hasAuthority("ADMIN")
        .requestMatchers(HttpMethod.GET, Endpoints.ADMIN_GET_ENDPOINS).hasAuthority("ADMIN")
        .requestMatchers(HttpMethod.PUT, Endpoints.ADMIN_PUT_ENDPOINS).hasAuthority("ADMIN")
        .requestMatchers(HttpMethod.DELETE, Endpoints.ADMIN_DELETE_ENDPOINS).hasAuthority("ADMIN")
);
```

### Step 6: Verify CORS config
Hien tai CORS cho phep GET, POST, PUT, DELETE, OPTIONS - du cho tat ca endpoints moi. Khong can thay doi.

### Step 7: Verify endpoint ordering
Spring Security match theo thu tu dau tien. Dam bao:
1. Public endpoints truoc
2. Admin endpoints truoc authenticated (cu the hon)
3. Authenticated endpoints cuoi

### Step 8: Compile & test
```bash
# Test public endpoints (no auth)
curl http://localhost:8080/api/the-loai
curl http://localhost:8080/sitemap.xml

# Test authenticated endpoints (require JWT)
curl -H "Authorization: Bearer {jwt}" http://localhost:8080/api/nguoi-dung/ho-so
curl http://localhost:8080/api/nguoi-dung/ho-so  # expect 401/403

# Test admin endpoints
curl -H "Authorization: Bearer {admin-jwt}" http://localhost:8080/api/admin/thong-ke
curl -H "Authorization: Bearer {user-jwt}" http://localhost:8080/api/admin/thong-ke  # expect 403
```

## Todo List
- [ ] Them public GET endpoints moi vao Endpoints.java
- [ ] Them public POST endpoints moi vao Endpoints.java
- [ ] Tao AUTH_GET/POST/PUT/DELETE_ENDPOINTS arrays trong Endpoints.java
- [ ] Them admin endpoints moi vao ADMIN arrays
- [ ] Update SecurityConfiguration.java voi authenticated matchers
- [ ] Verify endpoint ordering trong filter chain
- [ ] Chay mvn compile thanh cong
- [ ] Test public endpoints khong can auth
- [ ] Test authenticated endpoints can JWT
- [ ] Test admin endpoints can ADMIN role
- [ ] Test existing endpoints van hoat dong

## Success Criteria
- Tat ca public endpoints accessible khong can JWT
- Tat ca authenticated endpoints return 401/403 khi khong co JWT
- Tat ca admin endpoints return 403 khi user khong co ADMIN role
- Existing endpoints khong bi anh huong
- CORS van hoat dong cho localhost:3000

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Pattern overlap giua public va authenticated | Wrong authorization | Test carefully, order matters |
| Wildcard pattern qua rong (/**) | Security hole | Dung cu the patterns |
| Break existing endpoints | Regression | Test tat ca existing endpoints |
| Missing endpoint registration | 403 cho valid requests | Checklist verification |

## Security Considerations
- KHONG dung permitAll cho endpoint can auth
- KHONG dung wildcard qua rong cho admin endpoints
- Verify moi endpoint co dung authorization level
- Endpoint ordering: specific truoc, broad sau
- Don hang endpoint: authenticated nhung con can owner check trong controller

## Next Steps
- Sau khi Phase 08 complete, toan bo implementation done
- Integration testing: test tat ca 16+ endpoints end-to-end
- Frontend integration: update API calls
