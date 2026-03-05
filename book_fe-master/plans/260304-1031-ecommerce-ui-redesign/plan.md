# E-Commerce UI/UX Redesign Plan - BookStore 2026

## Overview
Full UI/UX redesign of BookStore e-commerce app with modern 2026 design patterns, smooth animations, and enhanced user experience. Keeping React + Bootstrap stack, enhanced with custom CSS.

## Design System

### Typography
- **Headings**: Rubik (300-700 weights)
- **Body**: Nunito Sans (300-700 weights)
- **Google Fonts**: `Rubik:wght@300;400;500;600;700|Nunito+Sans:wght@300;400;500;600;700`

### Color Palette
| Role | Color | Usage |
|------|-------|-------|
| Primary | `#3B82F6` | Buttons, links, active states |
| Primary Light | `#60A5FA` | Hover states, badges |
| CTA / Accent | `#F97316` | Buy now, promotions, sale badges |
| Background | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards, modals |
| Text Primary | `#1E293B` | Headings, body text |
| Text Secondary | `#64748B` | Captions, meta text |
| Success | `#10B981` | Stock available, order success |
| Danger | `#EF4444` | Errors, delete actions |
| Border | `#E2E8F0` | Card borders, dividers |

### Animation Tokens
| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `--anim-fast` | 150ms | ease-out | Hover, focus |
| `--anim-normal` | 250ms | ease-out | Card lift, modal |
| `--anim-slow` | 400ms | ease-out | Page transitions, reveal |
| `--anim-spring` | 300ms | cubic-bezier(0.34,1.56,0.64,1) | Bounce effects |

## Phases

### Phase 1: Global Foundation ✅ → [phase-01](phase-01-global-foundation.md)
- CSS variables, typography, global animations
- Utility animation classes
- Skeleton loading component
- Status: pending

### Phase 2: Navbar Redesign ✅ → [phase-02](phase-02-navbar-redesign.md)
- Modern sticky navbar with glassmorphism backdrop-filter
- Animated search bar expansion
- Smooth dropdown menus
- Cart badge animation (bounce on add)
- Status: pending

### Phase 3: Homepage Hero & Carousel → [phase-03](phase-03-homepage-hero.md)
- Gradient hero section with animated text
- CTA with hover glow effect
- Improved carousel with smooth crossfade
- Status: pending

### Phase 4: Product Cards → [phase-04](phase-04-product-cards.md)
- Card hover lift with shadow expansion
- Image zoom on hover
- Animated add-to-cart button
- Star rating animation
- Skeleton loading state
- Status: pending

### Phase 5: Product Detail Page → [phase-05](phase-05-product-detail.md)
- Enhanced image gallery
- Animated quantity controls
- Sticky buy section on scroll
- Review section improvements
- Status: pending

### Phase 6: Shopping Cart & Checkout → [phase-06](phase-06-cart-checkout.md)
- Animated item add/remove
- Smooth quantity transitions
- Progress stepper for checkout
- Status: pending

### Phase 7: Auth Pages → [phase-07](phase-07-auth-pages.md)
- Centered card design with gradient border
- Form field focus animations
- Input validation animations
- Status: pending

### Phase 8: Footer Redesign → [phase-08](phase-08-footer.md)
- Modern dark footer with columns
- Social icon hover animations
- Newsletter section improvement
- Status: pending

### Phase 9: Scroll Animations Hook → [phase-09](phase-09-scroll-animations.md)
- Custom `useScrollReveal` hook using IntersectionObserver
- Fade-in, slide-up, stagger animations on scroll
- prefers-reduced-motion support
- Status: pending

## Key Dependencies
- No new npm packages required (pure CSS + React)
- Bootstrap 5 remains as base framework
- Font Awesome icons remain

## Animation Strategy
All animations use CSS transitions/keyframes. No heavy JS animation libraries.
- Hover effects: `transform` + `box-shadow` (GPU-accelerated)
- Scroll reveals: IntersectionObserver + CSS classes
- Micro-interactions: CSS `@keyframes`
- Respect `prefers-reduced-motion: reduce`
