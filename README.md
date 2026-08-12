# NWU UAPSA QR Code Attendance

A QR-code attendance scanner and roster manager that runs as a website, an installable Android app, or a desktop-friendly page for laptops — with **no backend server**. Everything is scanned, logged, and exported straight from the browser, and all data stays on the device it's used on.

Built for schools/orgs that need to track attendance across multiple sections or year levels at once (e.g. `BSARCH1A`, `BSARCH1B`, `BSARCH2A`, ...), without importing everyone into one giant undifferentiated list.

**Note: HTML version is still in development for further updates. I'm an independent developer and an architecture student with a lot of architectural plates (endless tbh) so please bear with me.
---

## Features

### 📷 Scanning
- Live camera-based QR scanning (rear camera by default on phones, with a switch-camera option).
- **USB barcode/QR scanner support** — plug in a physical scanner gun (common at check-in desks) and it works as keyboard input, no camera needed.
- Audio + vibration feedback on every scan, with a color-coded result banner (success / duplicate / unrecognized ID).
- Duplicate protection — scanning the same person twice for the same Time In (or Time Out) tells you it's already logged instead of silently overwriting it.

### 🗂️ Groups (multiple rosters, not one big list)
- Import as many separate rosters ("groups") as you need — one per section, class, or year level.
- Each import asks for a group name (pre-filled from the file name, e.g. importing `BSARCH1A.xlsx` suggests `BSARCH1A`), and you can add new names into an *existing* group instead of creating a duplicate.
- Groups show as tabs above the attendance table — tap a tab to view that group's log, and delete a group entirely with the small **×** on its tab.
- **Scanning auto-detects the right group.** You don't need to switch tabs before scanning — it searches every group for the ID, logs it in the correct one, and the matching tab pops into view automatically. Scan a mixed line of students from different sections without touching the UI in between.
- If a scanned ID isn't in *any* group yet, you're prompted to add them and choose which group they belong to.

### 🕐 Time tracking
- **Time In / Time Out** toggle — pick which one the next scan records.
- **AM / PM session toggle** — keeps a fully separate log (with its own Time In/Out) for morning and afternoon sessions on the same day, so a full day naturally produces 4 timestamps per student: AM In, AM Out, PM In, PM Out.
- Manually add or edit a student, rename entries, or delete individual date columns you no longer need.

### 📤 Exporting
- **Excel (.xlsx)** — one workbook, **one tab per group** (`BSARCH1A`, `BSARCH1B`, `BSARCH2A`, ...), color-coded Time In/Out cells, ready to send as-is.
- **CSV** — exports the group you're currently viewing (CSV can't hold multiple tabs).
- **Google Drive upload** (web/browser version) — connect a Google account and upload the workbook straight to a Drive folder.
- On the Android app, exporting opens the native **Share** sheet instead (Drive, Gmail, WhatsApp, etc.) since Google sign-in doesn't work inside embedded app browsers.

### 📱 Runs anywhere
- **As a website** — open the HTML file in any modern browser.
- **As an Android app** — wrapped in a small native shell (camera permission handling, file picker, native sharing) so it installs and runs like a real app, works fully offline once installed.
- **As a laptop/desktop page** — same file, with a responsive two-column layout on wider screens and the USB scanner input for a proper check-in-desk setup.
- Works fully offline — the QR-scanning and spreadsheet libraries are bundled locally instead of pulled from a CDN, so flaky venue WiFi (or a school network that blocks certain CDNs) won't break it.

---

## How to use it

### 1. Import your first group
Tap **Import**, pick a roster file (`.xlsx`, `.xls`, or `.csv` — column A = name, column B = student ID), and name the group when prompted. Repeat for each additional section.

### 2. Set today's session
In the **Session** card: type an event/export name, adjust the log's column label if needed (defaults to today's date), and pick **AM** or **PM**.

### 3. Pick Time In or Time Out
In the **Scanner** card, choose which one the next scans should record.

### 4. Scan
Tap **Start Scanning** and point the camera at a QR code — or, on a laptop with a physical scanner, click into the **USB barcode/QR scanner** field and start scanning; it fills the field and submits automatically. Recognized students get logged instantly with a confirmation banner; unrecognized IDs prompt you to add them (and pick a group).

### 5. Check the log
The **Attendance Log** table shows Name, Student ID, and one In/Out pair per date column, for whichever group's tab is open. Use the search box to jump to a specific student. Manage entries with the ✎ (rename) and 🗑 (delete) icons on each row, or the **×** on a group's tab to delete that whole group.

### 6. Export
- **CSV** → current group only.
- **Excel** → everything, one tab per group.
- **Drive**/**Share** → sends the Excel file straight out (upload to Drive on the web version, or the native share sheet on Android).

---

## Data & privacy

Everything is stored locally (browser `localStorage` / the app's own storage on Android) — there's no server, no account required to use the core app, and nothing leaves the device unless you explicitly export or share a file. Clearing your browser data (or uninstalling the Android app) removes it, so export regularly if you need to keep records.

## Tech stack

Single-file HTML/CSS/vanilla JavaScript — no build step, no framework. Uses [html5-qrcode](https://github.com/mebjas/html5-qrcode) for camera scanning and [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style) for styled Excel export. The Android build is a thin native (Kotlin) WebView shell around the same HTML file.
