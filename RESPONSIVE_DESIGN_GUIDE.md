# Responsive Design Implementation Guide

## Overview

This guide documents the responsive design improvements applied to the LMS WeBoost application for mobile (320px+), tablet (640px+), and desktop (1024px+) devices.

## Core Responsive Patterns Applied

### 1. Main Container & Padding

**Pattern:**

```tsx
{/* Container */}
<div className="pt-24 sm:pt-28 md:pt-32 pb-12 px-3 sm:px-6 max-w-7xl mx-auto">
```

**Breakpoints:**

- Mobile (< 640px): `pt-24 pb-12 px-3` - compact padding
- Tablet (640px+): `sm:pt-28 sm:px-6` - medium padding
- Desktop (1024px+): `md:pt-32` - full padding

---

### 2. Responsive Typography

**Pattern:**

```tsx
{
  /* Headings */
}
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Title</h1>;

{
  /* Body Text */
}
<p className="text-xs sm:text-sm md:text-base text-gray-400">Subtitle</p>;

{
  /* Labels */
}
<label className="text-sm sm:text-base mb-1 sm:mb-2">Label</label>;
```

**Sizes:**

- Main headings: `text-2xl → sm:text-3xl → md:text-4xl`
- Section titles: `text-base → sm:text-lg → md:text-xl`
- Body text: `text-xs → sm:text-sm → md:text-base`
- Form labels: `text-sm → sm:text-base`

---

### 3. Responsive Spacing

**Pattern:**

```tsx
{/* Margins */}
<div className="mb-3 sm:mb-4 md:mb-6 gap-2 sm:gap-3 md:gap-4">

{/* Form Fields */}
<input className="px-3 sm:px-4 py-2 sm:py-3" />
```

**Values:**

- Padding: `p-3 sm:p-4 md:p-6` or `px-3 sm:px-4 py-2 sm:py-3`
- Margin: `mb-3 sm:mb-4` or `gap-2 sm:gap-3`
- Button padding: `px-3 sm:px-4 py-2 sm:py-3`

---

### 4. Flexible Layouts (Stacking)

**Pattern:**

```tsx
{/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3 sm:gap-4">

{/* Filter Bar */}
<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
```

**Behavior:**

- Default: vertical stack (`flex-col`)
- Tablet+: horizontal layout (`sm:flex-row`)
- Gap adjusts: `gap-2 sm:gap-3`

---

### 5. Responsive Modal Sizing

**Pattern:**

```tsx
<div className="fixed inset-0 bg-black/70 p-3 sm:p-4 z-50">
  <div className="max-w-sm sm:max-w-md md:max-w-lg w-full p-4 sm:p-6">
```

**Max-widths:**

- Mobile: `max-w-sm` (384px)
- Tablet: `sm:max-w-md` (448px)
- Desktop: `md:max-w-lg` (512px)
- Extra padding: `p-4 sm:p-6`

---

### 6. Responsive Table/Grid Columns

**Pattern:**

```tsx
{/* Table Headers - Hide non-critical columns on mobile */}
<th className="text-xs sm:text-sm font-semibold hidden md:table-cell">Email</th>
<th className="text-xs sm:text-sm font-semibold hidden lg:table-cell">Password</th>
<th className="text-xs sm:text-sm font-semibold hidden sm:table-cell">NIP</th>

{/* Grid */}
<div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

**Visibility:**

- All screens: Critical columns (Name, Actions)
- `sm:` (640px+): NIP, other secondary info
- `md:` (768px+): Email, seldom-used fields
- `lg:` (1024px+): Rare fields, extended details

---

### 7. Responsive Icons & Buttons

**Pattern:**

```tsx
{/* Icon sizes */}
<FaIcon className="text-lg sm:text-2xl" />

{/* Button sizing */}
<button className="p-1 sm:p-2 text-sm sm:text-base">
  <Icon /> Text
</button>

{/* Full-width on mobile */}
<button className="w-full sm:w-auto">
```

---

## File-Specific Implementations

### ✅ COMPLETED

#### admin/kelola-guru.tsx

- ✅ Container with `pt-24 sm:pt-28 md:pt-32 px-3 sm:px-6`
- ✅ Header text: `text-2xl sm:text-3xl md:text-4xl`
- ✅ Filter bar: `flex-col sm:flex-row gap-2 sm:gap-3`
- ✅ Table: Hidden columns at breakpoints
- ✅ Modals: `max-w-sm sm:max-w-md md:max-w-lg`
- ✅ Form fields: `px-3 sm:px-4 py-2 sm:py-3`
- ✅ Buttons: `px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base`

#### admin/kelola-siswa.tsx (PARTIAL)

- ✅ Container updated
- ✅ Breadcrumb updated
- ⏳ Remaining sections (filter, table, modals) - IN PROGRESS

---

## Remaining Pages to Update

### HIGH PRIORITY (Critical for mobile usability)

```
1. admin/kelola-siswa.tsx (similar to kelola-guru - 95% same pattern)
2. admin/kelola-elemen.tsx (similar to kelola-guru - 90% same pattern)
3. guru/materi.tsx (complex form - needs modal & field updates)
4. guru/profil.tsx (simpler form - straightforward updates)
5. admin/profil.tsx (simpler form - straightforward updates)
```

### MEDIUM PRIORITY

```
6. siswa/profil.tsx
7. admin/admin-hasil-asesmen.tsx
8. admin/kelola-kelas.tsx
9. guru/asesmen.tsx
10. guru/pbl.tsx
11. guru/materi/[id].tsx
12. siswa/asesmen.tsx
13. siswa/materi.tsx
14. siswa/pbl.tsx
```

---

## Quick Update Checklist

For each page, apply these replacements in order:

### Step 1: Update Main Container

```tsx
// FROM:
<div className="relative pt-32 pb-12 px-6 max-w-7xl mx-auto">

// TO:
<div className="relative pt-24 sm:pt-28 md:pt-32 pb-12 px-3 sm:px-6 max-w-7xl mx-auto">
```

### Step 2: Update Header

```tsx
// FROM:
<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
  <h1 className="text-3xl md:text-4xl font-bold">Title</h1>
  <p className="text-sm md:text-base">Subtitle</p>
</div>

// TO:
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Title</h1>
  <p className="text-xs sm:text-sm md:text-base">Subtitle</p>
</div>
```

### Step 3: Update Filter/Search Bars

```tsx
// FROM:
<div className="mb-4 flex flex-col md:flex-row gap-3">

// TO:
<div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
  <input className="px-3 sm:px-4 py-2 text-sm sm:text-base" />
  <select className="px-3 sm:px-4 py-2 text-sm sm:text-base w-full sm:w-auto" />
</div>
```

### Step 4: Update Modals

```tsx
// FROM:
<div className="fixed inset-0...p-4">
  <div className="bg-gray-900...p-6 max-w-md w-full">

// TO:
<div className="fixed inset-0...p-3 sm:p-4">
  <div className="bg-gray-900 ...p-4 sm:p-6 max-w-sm sm:max-w-md md:max-w-lg w-full">
```

### Step 5: Update Form Fields

```tsx
// FROM:
<label className="block text-white mb-2">Label</label>
<input className="w-full px-4 py-3 bg-gray-800...text-white" />

// TO:
<label className="block text-white text-sm sm:text-base mb-1 sm:mb-2">Label</label>
<input className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800...text-white text-sm sm:text-base" />
```

### Step 6: Update Buttons

```tsx
// FROM:
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg">Save</button>

// TO:
<button className="px-3 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white text-sm sm:text-base rounded-lg">Save</button>
```

### Step 7: Update Footer

```tsx
// FROM:
<footer className="py-8 px-6 border-t...">
  <p className="text-sm">© 2026...</p>
</footer>

// TO:
<footer className="py-6 sm:py-8 px-3 sm:px-6 border-t...">
  <p className="text-xs sm:text-sm">© 2026...</p>
</footer>
```

---

## Testing Checklist

After applying responsive updates:

- [ ] **Mobile (320px):** Text readable, no overflow, proper stacking
- [ ] **Tablet (768px):** Layouts shift to columns, adequate spacing
- [ ] **Desktop (1024px+):** Full layout with all columns visible
- [ ] **Touch targets:** Buttons/inputs at least 44px tall (py-2 sm:py-3 minimum)
- [ ] **Typography:** Headings scale smoothly, body text readable at all sizes
- [ ] **Modals:** Center properly, no content cutoff on any device
- [ ] **Tables:** Hide columns on mobile,show on tablet+

---

## Browser Testing

```bash
# Test responsive layouts (Chrome DevTools)
- iPhone XS (375px)
- iPad (768px)
- iPad Pro (1024px)
- Desktop (1920px)

# Test font sizing
- Zoom to 200% - ensure readable
- Test with browser zoom +/- functionality
```

---

## Performance Notes

- No additional CSS files needed - using Tailwind only
- No JavaScript changes required
- Mobile-first approach reduces CSS download size for mobile users
- Responsive design improves SEO (mobile-friendly = better search ranking)

---

## Resources

- **Tailwind Responsive:** https://tailwindcss.com/docs/responsive-design
- **Mobile-First Design:** https://www.w3schools.com/css/css_rwd_intro.asp
- **Touch Target Sizing:** https://www.w3.org/TR/WCAG20/#visual-audio-contrast

---

## Updated By

GitHub Copilot - Responsive Design Initiative
Date: March 26, 2026
