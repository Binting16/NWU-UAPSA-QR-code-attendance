# Future Work & Enhancement Roadmap

This document tracks upcoming milestones, architectural evolutions, and long-term feature requests for the **NWU UAPSA QR Code Attendance** system.

---

## 1. Light Mode / Dark Mode Theme Support

### Rationale
Attendance checking often occurs in varying lighting conditions: outdoors under bright sunlight (requiring high-contrast light mode) or in auditoriums/evening events (where dark mode reduces glare and saves mobile battery life).

### Architectural Plan
1. **CSS Custom Properties (Variables):**
   - Refactor root theme variables in `src/styles/theme.css`:
     - `--bg-primary`, `--bg-surface`, `--bg-card`, `--bg-tint`
     - `--text-primary`, `--text-muted`, `--text-inverse`
     - `--border-subtle`, `--border-strong`
     - `--status-success-bg`, `--status-success-fg`, `--status-danger-bg`, `--status-danger-fg`, `--status-warn-bg`, `--status-warn-fg`
2. **Theme Switching Engine:**
   - Supported options: `Auto (System Preference)`, `Light`, and `Dark`.
   - Media query listener: `(prefers-color-scheme: dark)`.
   - Attribute-based scoping: `html[data-theme="dark"]` and `html[data-theme="light"]`.
   - State persistence in `localStorage` under `qrAttendance_theme`.
3. **Camera Viewfinder Optimization:**
   - In dark mode, ensure scanner viewfinder contrast borders (accent bracket lines `#E8A33D`) remain vibrant against `#0B1320`.
   - QR code preview contrast adjustments for lower-end camera sensors in dimly lit halls.

---

## 2. Multi-Department & Multi-College Support

### Rationale
NWU-UAPSA (United Architects of the Philippines Student Auxiliary) may collaborate with other student organizations, or the university may adopt this system across Architecture, Engineering, Business, and Arts & Sciences.

### Multi-Tenant Data Hierarchy
```
University / Campus
 └── College / Department (e.g., College of Architecture, College of Engineering)
      └── Organization / Chapter (e.g., UAPSA, CEA Student Council)
           └── Groups / Batches / Sections (e.g., Year 1 - Section A, Year 2 - Section B)
                └── Students (ID, Full Name, Year Level)
```

### Implementation Strategy
1. **Google Sheets Multi-Tenant Structure:**
   - Option A (Single Sheet with Prefixes): Group names prefixed by Dept code: `[ARCH] Batch 2026`, `[ENG] Mech 3A`.
   - Option B (Folder-level multi-sheets): Each department maintains their own Sheet ID, and the application allows switching "Workspaces" from the settings or admin panel.
2. **Role & Permission Isolation:**
   - Department-specific invite codes (`ARCH-SECRETARY-2026`, `ENG-SECRETARY-2026`).
   - Reps can only scan and log attendance for their assigned college/department groups.
   - Central Administrator dashboard for college-wide events (e.g., University Foundation Week, Intramurals).
3. **Cross-Department Unified Reports:**
   - Export multi-department workbooks with separate sheets per department.
   - University-wide absentee and attendance percentage roll-up analytics.

---

## 3. Cloud Database Migration Path (Firebase / Supabase)

### Rationale & Trade-offs
| Attribute | Google Sheets + Apps Script (Current) | Supabase / Firebase (Future Target) |
| :--- | :--- | :--- |
| **Hosting Cost** | $0 (Free, Google ecosystem) | $0 Free tier (Supabase pauses after inactivity) |
| **Concurrency Limit** | Apps Script lock wait: ~15s (best for < 10 concurrent scanners) | Hundreds of concurrent writes per second |
| **Authentication** | Invite codes / Apps Script secret verification | Industry-standard JWT, Google OAuth, RBAC |
| **Offline Sync** | Custom pending queue in `localStorage` | Built-in offline caches / real-time subscriptions |
| **Data Visibility** | Instant spreadsheet view for faculty | Requires custom admin dashboard or data export |

### Migration Architecture (Two-Tier / Hybrid Model)
```
               [ Mobile & Web Clients (Lit SPA) ]
                                |
             +------------------+------------------+
             |                                     |
     [ Primary Database ]                  [ Real-time Sync Target ]
    Supabase (PostgreSQL)                     Google Sheets
     - Realtime Attendance                 - Read-only Faculty View
     - Row Level Security (RLS)            - Scheduled / Webhook Sync
     - Auth (Google / Student Email)       - Executive Reports
```

1. **Authentication:**
   - Transition from shared invite codes to Supabase Auth or Firebase Auth supporting `@nwu.edu.ph` institutional Google accounts.
2. **Database Schema (PostgreSQL):**
   - `events` (id, title, date, period, created_by, status)
   - `students` (id, student_number, full_name, college_id, year_level)
   - `groups` (id, name, college_id)
   - `group_memberships` (group_id, student_id)
   - `attendance_logs` (id, event_id, student_id, mode, recorded_at, recorded_by_user_id)
3. **One-Way Google Sheets Mirror:**
   - Retain Google Sheets export via a background serverless edge function that writes daily attendance logs to the organization's shared Google Drive spreadsheet.
