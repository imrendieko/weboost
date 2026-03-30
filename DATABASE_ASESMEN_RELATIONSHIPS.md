# Database Foreign Key Relationships - ASESMEN Table

## Overview

This document maps all database tables that have foreign key relationships or dependencies with the `asesmen` table in the LMS Weboost system.

---

## 1. Direct Foreign Key Relationships

### **asesmen** (Primary Table)

- **Columns with Foreign Keys:**
  - `guru_asesmen` → FK to `guru.id_guru` (References the teacher who created the assessment)
  - `id_elemen` → FK to `elemen.id_elemen` (References the learning element/module)

- **Primary Key:** `id_asesmen`
- **API Location:** `/src/pages/api/asesmen/`

---

## 2. Child Tables (Direct Dependencies)

### **soal_asesmen** (Assessment Questions)

- **Foreign Key Column:** `id_asesmen` (references `asesmen.id_asesmen`)
- **Relationship Type:** One-to-Many (1 asesmen → Many soal_asesmen)
- **Deletion Rule:** CASCADE - When `asesmen` is deleted, all related `soal_asesmen` are deleted
- **Related Columns:**
  - `id_tp` → FK to `tujuan_pembelajaran.id_tp` (Learning objective)
  - `tipe_soal` → ENUM ('pilihan_ganda', 'uraian', 'baris_kode')
  - `urutan_soal` → Question order
- **API Reference:** `/src/pages/api/asesmen/soal/`
- **Code Implementation:** [Line 111 in `/src/pages/api/asesmen/[id].ts`](src/pages/api/asesmen/[id].ts#L111)
  ```typescript
  await supabaseAdmin.from('soal_asesmen').delete().eq('id_asesmen', idAsesmen);
  ```

---

### **asesmen_attempt** (Student Assessment Attempts)

- **Foreign Key Column:** `id_asesmen` (references `asesmen.id_asesmen`)
- **Additional Foreign Key:** `id_siswa` (references `siswa.id_siswa`)
- **Relationship Type:** One-to-Many (1 asesmen → Many asesmen_attempt)
- **Deletion Rule:** Not explicitly cascaded in current code (⚠️ Consider adding cascade)
- **Related Columns:**
  - `status` → ENUM ('draft', 'in_progress', 'submitted')
  - `answers_json` → JSON object storing student answers
  - `skor_total` → Student's total score
  - `skor_maksimum` → Maximum possible score
  - `durasi_detik` → Time taken in seconds
  - `started_at` → When attempt started
  - `submitted_at` → When attempt was submitted
- **API Reference:** `/src/pages/api/siswa/asesmen/quiz/submit.ts`
- **Code Implementation:** [Line 30 in `/src/pages/api/siswa/asesmen/quiz/submit.ts`](src/pages/api/siswa/asesmen/quiz/submit.ts#L30)
  ```typescript
  const { data: existingAttempt } = await supabaseAdmin.from('asesmen_attempt').select('id_attempt,status').eq('id_asesmen', idAsesmen).eq('id_siswa', idSiswa);
  ```

---

### **pilihan_ganda** (Multiple Choice Options)

- **Indirect Relationship:** `id_soal` → FK to `soal_asesmen.id_soal`
- **Relationship Chain:** asesmen → soal_asesmen → pilihan_ganda
- **Relationship Type:** One-to-Many (1 soal → Many pilihan_ganda)
- **Deletion Rule:** CASCADE (deleted when soal_asesmen is deleted, which cascades from asesmen)
- **Related Columns:**
  - `opsi_pilgan` → Option letter (A, B, C, D, E)
  - `teks_pilgan` → Option text
  - `gambar_pilgan` → Optional image URL
  - `kunci_pilgan` → Boolean indicating correct answer
  - `urutan_pilgan` → Option order
- **API Reference:** Quiz endpoints in `/src/pages/api/siswa/asesmen/quiz/`

---

## 3. Analysis Tables (Analysis/Report Dependencies)

### **analisis_guru** (Teacher Assessment Analysis)

- **Foreign Key Column:** `nama_asesmen` (references `asesmen.id_asesmen`)
  - **Note:** Column name is `nama_asesmen` but contains `id_asesmen` value
- **Additional Foreign Key:** `tp_asesmen` (references `tujuan_pembelajaran.id_tp`)
- **Relationship Type:** One-to-Many (1 asesmen → Many analisis_guru)
- **Deletion Rule:** Manual deletion only (not cascaded)
  - **Currently Deleted:** When analysis is regenerated
- **Related Columns:**
  - `jumlah_siswa` → Number of students who submitted
  - `persentase_jawaban_benar` → Correct answer percentage
  - `saran_guru` → Teacher recommendations
  - `tp_asesmen` → Teaching point analysis
- **API Reference:** `/src/pages/api/asesmen/analisis-guru.ts`
- **Code Implementation:** [Line 75 in `/src/lib/generateAnalisisGuru.ts`](src/lib/generateAnalisisGuru.ts#L75)
  ```typescript
  await supabaseAdmin.from('analisis_guru').delete().eq('nama_asesmen', idAsesmen);
  ```

---

### **analisis_siswa** (Student Assessment Analysis)

- **Foreign Key Columns:**
  - `nama_asesmen` (references `asesmen.id_asesmen`) - **Note:** Column name contains `id_asesmen` value
  - `nama_siswa` (references `siswa.id_siswa`)
- **Additional Foreign Key:** `tp_asesmen` (references `tujuan_pembelajaran.id_tp`)
- **Relationship Type:** One-to-Many (1 asesmen → Many analisis_siswa)
- **Deletion Rule:** Manual deletion only (not cascaded)
  - **Currently Deleted:** When analysis is regenerated per student
- **Related Columns:**
  - `persentase_tp_siswa` → Percentage mastery per learning objective
  - `saran_siswa` → Personalized student recommendations
  - `tp_asesmen` → Teaching point analysis
- **API Reference:** `/src/lib/generateAnalisisSiswa.ts`
- **Code Implementation:** [Line 130 in `/src/lib/generateAnalisisSiswa.ts`](src/lib/generateAnalisisSiswa.ts#L130)
  ```typescript
  await supabaseAdmin.from('analisis_siswa').delete().eq('nama_asesmen', idAsesmen).eq('nama_siswa', idSiswa);
  ```

---

## 4. Parent Tables (Referenced By asesmen)

### **guru** (Teachers)

- **Referenced Column:** `id_guru`
- **Relationship:** asesmen.guru_asesmen → guru.id_guru
- **Relationship Type:** Many-to-One (Many asesmen can belong to 1 guru)
- **Deletion Rule:** When teacher is deleted, asesmen orphaned (FK set to null or RLS prevents access)
- **API Reference:** `/src/pages/api/guru/`

---

### **elemen** (Learning Elements/Modules)

- **Referenced Column:** `id_elemen`
- **Relationship:** asesmen.id_elemen → elemen.id_elemen
- **Relationship Type:** Many-to-One (Many asesmen can belong to 1 elemen)
- **Deletion Rule:** When elemen is deleted, all related asesmen should be deleted
- **API Reference:** `/src/pages/api/elemen/`

---

### **tujuan_pembelajaran** (Learning Objectives)

- **Indirect Relationship:** Referenced through `soal_asesmen.id_tp`
- **Relationship Chain:** asesmen → soal_asesmen → tujuan_pembelajaran
- **Relationship Type:** Many-to-Many (through soal_asesmen)
- **API Reference:** `/src/pages/api/elemen/[id].ts`

---

## 5. Summary Table

| Table               | Type       | FK Column    | References           | Cascading         | Status          |
| ------------------- | ---------- | ------------ | -------------------- | ----------------- | --------------- |
| soal_asesmen        | Child      | id_asesmen   | asesmen.id_asesmen   | ✅ YES            | **Implemented** |
| asesmen_attempt     | Child      | id_asesmen   | asesmen.id_asesmen   | ⚠️ NO             | **Missing**     |
| pilihan_ganda       | Grandchild | id_soal      | soal_asesmen.id_soal | ✅ YES (indirect) | **Implemented** |
| analisis_guru       | Child      | nama_asesmen | asesmen.id_asesmen   | ❌ Manual         | **Manual only** |
| analisis_siswa      | Child      | nama_asesmen | asesmen.id_asesmen   | ❌ Manual         | **Manual only** |
| guru                | Parent     | id_guru      | guru.id_guru         | N/A               | FK only         |
| elemen              | Parent     | id_elemen    | elemen.id_elemen     | N/A               | FK only         |
| tujuan_pembelajaran | Indirect   | id_tp        | via soal_asesmen     | N/A               | Reference only  |

---

## 6. Deletion Cascade Flow

### Current Implementation

```
DELETE asesmen (id_asesmen = X)
    ↓
DELETE soal_asesmen WHERE id_asesmen = X (EXPLICIT)
    ↓
(Cascade would delete pilihan_ganda if DB constraint is set)
    ↓
DELETE asesmen record
```

### Missing Cascade

```
ORPHANED RECORDS:
- asesmen_attempt WHERE id_asesmen = X (NOT DELETED)
- analisis_guru WHERE nama_asesmen = X (NOT DELETED - only when regenerating)
- analisis_siswa WHERE nama_asesmen = X (NOT DELETED - only when regenerating)
```

**Code Location:** [/src/pages/api/asesmen/[id].ts - DELETE method](src/pages/api/asesmen/[id].ts#L108-L115)

---

## 7. Row Level Security (RLS) Policies

### Current Status

- **Service Role Usage:** Uses `supabaseAdmin` (service role) for all asesmen operations
  - Bypasses RLS policies on server-side
  - Located in: `/src/lib/supabaseAdmin.ts`

### Affected RLS Policies

- asesmen table: RLS enabled/configured
- soal_asesmen table: RLS enabled/configured
- asesmen_attempt table: RLS enabled/configured
- analisis_guru table: RLS enabled/configured
- analisis_siswa table: RLS enabled/configured

**Note:** Client-side queries use regular `supabase` client which applies RLS. Server-side queries use `supabaseAdmin` which bypasses RLS.

---

## 8. Recommendations & Issues

### ⚠️ Critical Issues

1. **Missing CASCADE on asesmen_attempt**
   - **Issue:** When asesmen is deleted, `asesmen_attempt` records remain orphaned
   - **Impact:** Database bloat, potential data integrity issues
   - **Fix:** Add deletion in DELETE handler:
     ```typescript
     await supabaseAdmin.from('asesmen_attempt').delete().eq('id_asesmen', idAsesmen);
     ```

2. **Manual Deletion of Analysis Tables**
   - **Issue:** `analisis_guru` and `analisis_siswa` records not automatically deleted
   - **Impact:** Orphaned analysis records
   - **Fix:** Add cascade deletion:
     ```typescript
     await supabaseAdmin.from('analisis_guru').delete().eq('nama_asesmen', idAsesmen);
     await supabaseAdmin.from('analisis_siswa').delete().eq('nama_asesmen', idAsesmen);
     ```

### 📋 Data Integrity Checks

- **Verify Column Names:** `nama_asesmen` and `nama_siswa` appear to be misnomers
  - Should be `id_asesmen` and `id_siswa` for clarity
  - Current naming: Legacy column names retained for compatibility

---

## 9. Related Files & APIs

### API Endpoints

- **GET/PUT/DELETE asesmen:** `/api/asesmen/[id]`
- **GET/POST asesmen:** `/api/asesmen/`
- **GET/POST soal_asesmen:** `/api/asesmen/soal/`
- **Student attempts:** `/api/siswa/asesmen/quiz/submit`
- **Analysis generation:** `/api/asesmen/analisis-guru`, `/api/asesmen/analisis`
- **Progress tracking:** `/api/asesmen/progres/[id]`

### Type Definitions

- **Asesmen:** [/src/types/asesmen.d.ts](src/types/asesmen.d.ts)
- **SoalAsesmen:** Same file
- **PilihanGanda:** Same file

### Key Libraries

- **Database Client:** Supabase JS Client
- **Admin Client:** `supabaseAdmin` (service role with RLS bypass)

---

## 10. Complete Deletion Checklist

When deleting an asesmen record, ensure these are deleted in order:

- [ ] pilihan_ganda (via cascade from soal_asesmen)
- [ ] soal_asesmen
- [ ] asesmen_attempt ⚠️ Currently Missing
- [ ] analisis_guru ⚠️ Currently Missing
- [ ] analisis_siswa ⚠️ Currently Missing
- [ ] asesmen (main record)

---

**Document Generated:** 2024
**Database Type:** PostgreSQL (via Supabase)
**ORM/Querying:** Supabase JS Client (direct SQL-like API)
