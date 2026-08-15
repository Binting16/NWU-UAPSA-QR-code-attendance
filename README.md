# NWU UAPSA QR Attendance

A QR-code attendance scanner and roster manager that runs as a website, an installable Android app, or a desktop-friendly page for laptops — with **no backend server**. Everything is scanned, logged, and exported straight from the browser, and all data stays on the device it's used on.

Built for schools/orgs that need to track attendance across multiple sections or year levels at once (e.g. `BSARCH1A`, `BSARCH1B`, `BSARCH2A`, ...), without importing everyone into one giant undifferentiated list.
---

## Features

### 📷 Scanning
- Live camera-based QR scanning (rear camera by default on phones, with a switch-camera option).
- **Manual entry fallback** — a dedicated field with a Submit button lets you type a Student ID by hand whenever a QR code won't scan (damaged, glare, etc.).
- **USB barcode/QR scanner support** — the same field doubles as input for a physical scanner gun (common at check-in desks): it types the code and submits automatically, no camera needed.
- Audio + vibration feedback on every scan, with a color-coded result banner (success / duplicate / unrecognized ID).
- Duplicate protection — scanning the same person twice for the same Time In (or Time Out) tells you it's already logged instead of silently overwriting it.

### 🗂️ Groups (multiple rosters, not one big list)
- Import as many separate rosters ("groups") as you need — one per section, class, or year level.
- **Multi-tab auto-import** — if the file you import has several worksheet tabs (e.g. one tab per section), it's detected automatically and creates one correctly-named group per tab in a single step.
- For single-sheet files, each import asks for a group name (pre-filled from the file name, e.g. importing `BSARCH1A.xlsx` suggests `BSARCH1A`), and you can add new names into an *existing* group instead of creating a duplicate.
- Groups show as tabs above the attendance table — tap a tab to view that group's log, and delete a group entirely with the small **×** on its tab.
- **Scanning auto-detects the right group.** You don't need to switch tabs before scanning — it searches every group for the ID, logs it in the correct one, and the matching tab pops into view automatically. Scan a mixed line of students from different sections without touching the UI in between.
- If a scanned or manually-entered ID isn't in *any* group yet, you're prompted to add them — including creating a brand-new group on the spot if none exist yet.

### 🕐 Time tracking
- **Time In / Time Out** toggle — pick which one the next scan records.
- **AM / PM session toggle** — keeps a fully separate log (with its own Time In/Out) for morning and afternoon sessions on the same day, so a full day naturally produces 4 timestamps per student: AM In, AM Out, PM In, PM Out.
- Manually add or edit a student, rename entries, or delete individual date columns you no longer need.
- **Fix a mis-scan in one tap** — click any filled Time In/Out cell in the table to clear just that entry, with a confirmation popup showing exactly what you're about to remove.

### 📤 Exporting
- **Excel (.xlsx)** only — one workbook, **one tab per group** (`BSARCH1A`, `BSARCH1B`, `BSARCH2A`, ...), color-coded Time In/Out cells, ready to send as-is.
- On the Android app, there's also a **Share** button that hands the file straight to Android's native share sheet (Drive, Gmail, WhatsApp, etc.) — this only appears when running inside the app.

### 🎨 Branding
- Set a custom app name from **Settings** — updates the header live.
- Color scheme matches an emerald green theme throughout the UI and the exported Excel headers.
- Custom app icon for the Android build (see setup guide for how to (re)apply it).

### 📱 Runs anywhere
- **As a website** — open the HTML file in any modern browser.
- **As an Android app** — wrapped in a small native shell (camera permission handling, file picker, native sharing) so it installs and runs like a real app, works fully offline once installed.
- **As a laptop/desktop page** — same file, with a responsive two-column layout on wider screens and the manual/USB-scanner input for a proper check-in-desk setup.
- Works fully offline — the QR-scanning and spreadsheet libraries are bundled locally instead of pulled from a CDN, so flaky venue WiFi (or a school network that blocks certain CDNs) won't break it. If those local files are ever missing, it automatically falls back to loading them from a CDN instead of failing outright.

---

## How to use it

[![Watch the video](https://img.youtube.com/vi/e8GSEoz8zQw/0.jpg)](https://youtu.be/e8GSEoz8zQw)


### 1. Import your first group
Tap **Import** and pick a roster file (`.xlsx`, `.xls`, or `.csv` — column A = name, column B = student ID).
- If the file has multiple worksheet tabs, you'll get a summary of every tab found — confirm once and each tab becomes its own group automatically.
- If it's a single sheet, you'll be asked to name the group (pre-filled from the file name).

### 2. Set today's session
In the **Session** card: type an event/export name, adjust the log's column label if needed (defaults to today's date), and pick **AM** or **PM**.

### 3. Pick Time In or Time Out
In the **Scanner** card, choose which one the next scans should record.

### 4. Scan
Tap **Start Scanning** and point the camera at a QR code — or type/scan an ID into the manual entry field and hit **Submit** (or Enter). Recognized students get logged instantly with a confirmation banner and the correct group tab pops into view; unrecognized IDs prompt you to add them (and pick or create a group).

### 5. Check the log
The **Attendance Log** table shows Name, Student ID, and one In/Out pair per date column, for whichever group's tab is open. Use the search box to jump to a specific student.
- **Fix a mistake:** tap any filled time cell to clear it (with a confirmation prompt).
- **Manage entries:** ✎ (rename) and 🗑 (delete) icons on each row.
- **Delete a whole group:** the **×** on its tab.

### 6. Export
Tap **Excel** — everything, one tab per group, in a single file. On the Android app, tap **Share** to send that same file through the native share sheet instead.

---

## Data & privacy

Everything is stored locally (browser `localStorage` / the app's own storage on Android) — there's no server, no account required, and nothing leaves the device unless you explicitly export or share a file. Clearing your browser data (or uninstalling the Android app) removes it, so export regularly if you need to keep records.

## Tech stack

Single-file HTML/CSS/vanilla JavaScript — no build step, no framework. Uses [html5-qrcode](https://github.com/mebjas/html5-qrcode) for camera scanning and [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style) for styled Excel export. The Android build is a thin native (Kotlin) WebView shell around the same HTML file.
