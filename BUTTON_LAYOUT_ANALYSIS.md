# Button Layout Analysis - Materi Pages

## GURU/MATERI.tsx Issues

### 1. BAB Section Header - Action Buttons (Lines 1246-1265)

**Current Layout:**

```tsx
// Line 1246
<div className="flex gap-2">
  // Line 1248-1253: "Tambah Sub-bab" button
  <button
    onClick={() => openAddSubBabModal(bab)}
    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
  >
    <FaPlus size={12} />
    Tambah Sub-bab
  </button>
  // Line 1255-1259: "Edit" button (icon only)
  <button
    onClick={() => openEditBabModal(bab)}
    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
  >
    <FaEdit />
  </button>
  // Line 1261-1265: "Delete" button (icon only)
  <button
    onClick={() => handleDeleteBab(bab.id_bab, bab.judul_bab)}
    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
  >
    <FaTrash />
  </button>
</div>
```

**Issues:**

- ❌ **Fixed gap-2**: No responsive adjustment for mobile (should be gap-1 or smaller on mobile)
- ❌ **Fixed padding px-3 py-1**: Too tight on mobile devices
- ❌ **No flex-wrap**: Long text "Tambah Sub-bab" will overflow on narrow screens
- ❌ **No responsive text-size**: `text-sm` may be too small on mobile
- ❌ **No whitespace handling**: Button text could wrap awkwardly without proper constraints

**Responsive Gaps:**

- Desktop (md+): gap-2 ✓
- Mobile: gap-1 or gap-1.5 needed
- No `sm:` breakpoint for gap or padding

---

### 2. Sub-bab Action Buttons (Lines 1294-1310)

**Current Layout:**

```tsx
// Line 1294
<div
  className="flex gap-2"
  onClick={(e) => e.stopPropagation()}
>
  // Line 1297-1300: "Edit" button
  <button
    onClick={() => openEditSubBabModal(subBab)}
    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
  >
    <FaEdit />
  </button>
  // Line 1302-1306: "Delete" button
  <button
    onClick={() => handleDeleteSubBab(subBab.id_sub_bab, subBab.judul_sub_bab)}
    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
  >
    <FaTrash />
  </button>
</div>
```

**Issues:**

- ❌ **Fixed gap-2**: Same issue as BAB section
- ❌ **Fixed padding px-3 py-1**: Inconsistent with other responsive buttons in the app
- ❌ **Icon-only buttons**: No `sm:` variants for label visibility on mobile
- ❌ **Inconsistent with header buttons pattern**: Uses hard-coded colors instead of mana-btn system

---

### 3. Header Buttons - "Progres" and "Tambah BAB" (Lines 1192-1210)

**Current Layout:**

```tsx
// Line 1192: Progres button
<button
  onClick={handleViewMateriProgress}
  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
>
  <FaChartBar size={12} />
  Progres
</button>

// Line 1210: Tambah BAB button
<button
  onClick={() => {
    console.log('🖱️ Tambah BAB button clicked');
    // ...
    setShowAddBabModal(true);
  }}
  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
>
  <FaPlus />
  Tambah BAB
</button>
```

**Status:** ✅ These buttons are responsive (sm: breakpoint) and properly sized

- Uses `px-3 sm:px-4` and `py-1.5 sm:py-2`
- Gap-2 is appropriate for header spacing

**Issue Context:**

- Container wrapper should be checked for alignment

---

## SISWA/MATERI.tsx Issues

### 1. Sub-bab Header Row - Multiple Buttons (Lines 705-740)

**Current Layout:**

```tsx
// Line 705-706: Main container (responsive flex direction)
<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  // Left side: Title section
  <div className="flex items-center gap-3">
    {konten.type === 'dokumen' && <FaFileAlt className="text-blue-400" />}
    {konten.type === 'video' && <FaVideo className="text-red-400" />}
    {konten.type === 'tautan' && <FaLink className="text-green-400" />}
    <p className="text-xl font-bold text-white">{subBab.judul_sub_bab}</p>
  </div>
  // Line 713-740: Right side button group
  <div className="flex items-center gap-2">
    // Line 715-730: "Tandai Selesai" button
    <button
      type="button"
      onClick={() => toggleSelesai(subBab.id_sub_bab)}
      className={`mana-btn inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${selesai ? 'mana-btn--success' : 'mana-btn--primary'}`}
    >
      <FaCheck />
      {selesai ? 'Sudah Selesai' : 'Tandai Selesai'}
    </button>
    // Confetti animation... // Line 733-739: Collapse/Expand chevron button
    <button
      type="button"
      onClick={() => toggleSubBabCard(subBab.id_sub_bab)}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-200 transition hover:border-[#0080FF]/60 hover:text-white"
      aria-label={isCollapsed ? 'Buka card sub-bab' : 'Tutup card sub-bab'}
    >
      {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
    </button>
  </div>
</div>
```

**Issues:**

- ⚠️ **Container gap-3 changes on mobile**:
  - Mobile: `flex-col gap-3` (vertical stacking, good spacing)
  - Desktop: `flex-row gap-3` (side-by-side)
  - **Gap-3 is adequate** ✓

- ❌ **Button group gap-2 too tight**:
  - The inner `gap-2` between "Tandai Selesai" and chevron button is too small
  - On mobile, buttons may feel cramped
  - Should be `gap-2 sm:gap-3`

- ❌ **Fixed button widths for chevron**:
  - Chevron uses `h-10 w-10` (fixed 40px)
  - "Tandai Selesai" has responsive padding
  - Creates visual misalignment on mobile

- ⚠️ **Text responsiveness**:
  - Uses `px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm` ✓
  - Button text "Tandai Selesai" is long and might wrap on very small screens

---

### 2. Download/Open Button Group (Lines 869-881)

**Current Layout:**

```tsx
// Line 869: Button group container
<div className="mt-3 flex gap-3">
  // Line 871-878: Download button
  <button
    type="button"
    onClick={() => handleDownloadFile(konten.url, `${subBab.judul_sub_bab}.file`)}
    className="mana-btn mana-btn--success inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold"
  >
    <FaDownload /> Download
  </button>
  // Line 879-887: Open in new tab link button
  <a
    href={konten.url}
    target="_blank"
    rel="noopener noreferrer"
    className="mana-btn mana-btn--primary inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold"
  >
    <FaExternalLinkAlt /> Buka di Tab Baru
  </a>
</div>
```

**Issues:**

- ❌ **No flex: 1 for width control**:
  - Buttons are `inline-flex`, not `flex` with equal width distribution
  - On mobile, buttons sit side-by-side without growing to fill space
  - Text "Buka di Tab Baru" is long and may wrap or overflow

- ❌ **gap-3 might be too large on mobile**:
  - Desktop: gap-3 is good for spacing
  - Mobile: gap-3 (12px) + padding leaves little space for text
  - Should be responsive: `gap-2 sm:gap-3`

- ⚠️ **Container width constraints**:
  - Parent appears to be inside content area with padding
  - No `w-full` or explicit width on buttons
  - Buttons don't grow responsively on mobile

- ⚠️ **Responsive text size**:
  - Uses `text-xs sm:text-sm` ✓
  - But with gap-3 and px-3, mobile wrapping is likely

---

## Summary of Layout Problems

### Common Issues Across Both Pages:

| Issue                                                | Severity  | Pages       | Lines                |
| ---------------------------------------------------- | --------- | ----------- | -------------------- |
| Fixed gap sizes (gap-2) with no sm: breakpoint       | 🔴 High   | guru        | 1246, 1294           |
| Fixed padding (px-3 py-1) on small buttons           | 🔴 High   | guru        | 1249-1262, 1299-1305 |
| `inline-flex` buttons not growing to fill space      | 🔴 High   | siswa       | 869-881              |
| gap-3 too large relative to mobile padding           | 🟡 Medium | siswa       | 869                  |
| Button text wrapping on small screens                | 🟡 Medium | guru, siswa | Multiple             |
| Inconsistent button styling (hard-coded vs mana-btn) | 🟡 Medium | guru        | 1249-1262, 1299-1305 |
| Fixed chevron button size (h-10 w-10)                | 🟡 Medium | siswa       | 738                  |

### Responsive Gaps Summary:

**Need sm: breakpoint variants:**

- `gap-2` → `gap-1 sm:gap-2` (buttons on very small screens)
- `gap-3` → `gap-2 sm:gap-3` (large button groups on mobile)

**Padding patterns (Current):**

- Header buttons: `px-3 sm:px-4 py-1.5 sm:py-2` ✅ Good pattern
- BAB/Sub-bab buttons: `px-3 py-1` ❌ No responsive variant
- Download buttons: `px-3 sm:px-4 py-1.5 sm:py-2` ✅ Good pattern

### Layout Recommendations:

1. **Guru BAB section**: Add flex wrap or convert to responsive grid
2. **Guru sub-bab buttons**: Add sm: breakpoints for gap and padding
3. **Siswa button groups**: Use `w-full` or `flex: 1` for responsive width
4. **All small buttons**: Add `sm:` variants for gaps and padding
