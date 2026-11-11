# NWU UAPSA QR Code Attendance

A modular, robust, and scalable QR-code attendance scanner and roster manager built for schools and student organizations. Runs as a high-performance static website on GitHub Pages with **zero backend servers required**. Everything is scanned, logged, and exported directly from the browser, with optional real-time two-way synchronization to Google Sheets.

Live Deployment: [https://binting16.github.io/](https://binting16.github.io/)

---

## Architecture Overview (v2.0 Modular Edition)

The project has been modularized into standard W3C Web Components powered by **Lit 3** (~5 KB bundle) with client-side hash routing (`#/scanner`, `#/roster`, `#/events`, `#/admin`, `#/settings`).

```
NWU-UAPSA-QR-code-attendance/
├── index.html                    # Lightweight HTML entry point (73 lines)
├── README.md                     # Documentation & usage manual
├── FUTURE_WORK.md                # Roadmap (Dark mode, Multi-college, Cloud DB)
├── google-apps-script/
│   └── Code.gs                   # Google Sheets Relay Backend (v2.0 with Auth & Config)
├── src/
│   ├── app-root.js               # Main Lit application shell
│   ├── router.js                 # Hash-based router (#/scanner, #/roster, etc.)
│   ├── config.js                 # Configuration constants & presets
│   ├── state/
│   │   └── store.js              # Central reactive observable store
│   ├── services/
│   │   ├── sheets-api.js         # Google Apps Script HTTP client
│   │   ├── auth-service.js       # Role manager (Admin vs Scanner)
│   │   ├── sync-queue.js         # Offline retry queue & auto-reconnect
│   │   ├── audio-service.js      # Web Audio beeps & haptic vibration
│   │   └── export-service.js     # Styled Excel (.xlsx) export engine
│   ├── components/
│   │   ├── ui-topbar.js          # Brand header, active event pill, sync badge
│   │   ├── ui-navigation.js      # Responsive bottom/top navigation bar
│   │   ├── ui-toast.js           # Ephemeral notification toasts
│   │   └── ui-modal.js           # Accessible dialog backdrop
│   ├── views/
│   │   ├── view-scanner.js       # Live camera viewfinder & manual/USB scan
│   │   ├── view-roster.js        # Matrix log, search, absent tallies, cell editor
│   │   ├── view-events.js        # Standardized premade event & session picker
│   │   ├── view-admin.js         # Secretary console, invite codes, roster import
│   │   └── view-settings.js      # Sheets connection, layout options, backup
│   └── styles/
│       ├── theme.css             # Root CSS custom properties & typography
│       └── shared-styles.js      # Reusable Lit component styles
└── lib/                          # Vendored offline client libraries
    ├── lit-core.min.js           # Lit 3 Core framework
    ├── html5-qrcode.min.js       # Camera QR scanning engine
    └── xlsx.bundle.js            # Styled Excel generation engine
```

---

## Key Features

### 1. 🛡️ Dual-Tier Role Authorization
- **Secretary (Admin):** Full control over roster imports, event preset creation, column deletion, cell clearing, and invite code generation.
- **Scanner (Representative):** High-throughput scanning and roster auditing. Scanners are restricted to logging into active premade events and cannot create or delete columns.
- **Server Enforcement:** Google Apps Script relay (`Code.gs`) enforces permissions; unauthorized requests attempting to delete columns or tamper with rosters are rejected.

### 2. 📅 Standardized Premade Events (Clean Columns)
- Resolves messy column naming: Admins configure standardized event titles, dates, periods (AM/PM), and required modes (`Time In`, `Time Out`).
- Scanners simply pick from the active event dropdown. The app automatically ensures uniform column headers across every group and spreadsheet tab.

### 3. 📱 Responsive Multi-Page Navigation
- **Mobile (< 768px):** Fixed thumb-friendly bottom navigation bar, full-screen camera viewfinder, and high-visibility flash result panel.
- **Desktop (≥ 768px):** Wide two-column workstation layout with zero page-level scrolling and sticky internal table headers.
- **Hash-based Routing:** `#/scanner`, `#/roster`, `#/events`, `#/admin`, `#/settings` for 100% reliable GitHub Pages page reloads.

### 4. ☁️ Google Sheets Two-Way Synchronization
- Synchronizes with a shared Google Sheet via a serverless Google Apps Script relay.
- Multi-device concurrent scanning with built-in script lock protection.
- Offline-first: if internet connection drops mid-scan, records log locally instantly and automatically replay when connection restores.
- Color-coded cells match exported Excel files (Emerald headers, Green Time In, Red Time Out).

### 5. 📤 Styled Excel Export
- One-click export to `.xlsx` with one worksheet tab per group.
- Merged title banners for events spanning multiple sessions.
- Dedicated per-student **Absent** counter.
- Native Android bridge support (`AndroidBridge.saveAndShareFile`).

---

## Setup & Deployment Guide

### Deploying to GitHub Pages
1. Push this repository to GitHub.
2. In your repository on GitHub: **Settings → Pages**.
3. Under **Build and deployment → Branch**, choose `main` and root `/`.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.

### Connecting a Google Sheet
1. Open or create a Google Sheet for your attendance.
2. Click **Extensions → Apps Script**.
3. Delete any default code, paste the entire contents of `google-apps-script/Code.gs`, and click **Save**.
4. Click **Deploy → New deployment**.
5. Select type **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
6. Click **Deploy**, authorize permissions, and copy the **Web app URL** (ends in `/exec`).
7. Open the web app → **Settings** → paste the URL into **Google Sheets Sync** → tap **Save Link**.

---

## Tech Stack
- **Framework:** [Lit 3](https://lit.dev/) Web Components (ES Modules, zero-build setup).
- **Scanning:** [html5-qrcode](https://github.com/mebjas/html5-qrcode).
- **Spreadsheets:** [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style).
- **Backend Relay:** Google Apps Script.
- **Hosting:** GitHub Pages.
