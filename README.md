# NWU UAPSA QR Code Attendance

A QR-code attendance scanner and roster manager that runs as a website — with **no backend server required**. Everything is scanned, logged, and exported straight from the browser, and all data stays on the device it's used on, unless you opt in to live Google Sheets sync.

Built for schools/orgs that need to track attendance across multiple sections, classes, or teams at once — including with several people scanning simultaneously into a shared file.

---

## Features

### 📷 Scanning
- Live camera-based QR scanning, with a camera picker if the device has more than one.
- Manual entry fallback with a Submit button — type a Student ID by hand if a code won't scan.
- The same field doubles as input for a USB barcode/QR scanner gun (types the code and submits automatically).
- Audio + vibration feedback, with a color-coded result banner (success / duplicate / unrecognized).
- Duplicate protection — re-scanning the same Time In/Out for someone tells you it's already logged instead of silently overwriting it.

### 🗂️ Groups (multiple independent rosters)
- Import as many separate rosters ("groups") as needed — one per section, class, or team.
- **Multi-tab auto-import** — a spreadsheet with several worksheet tabs gets split into one correctly-named group per tab automatically.
- **Choose your file's column layout on import**: Name+Student Number, Student Number+Name, Student Number+Last+First+Middle Initial, or Last+First+Middle Initial+Student Number. Split names are combined into the app's standard "Last, First M.I." format automatically.
- Single-sheet imports ask for a group name (pre-filled from the file name), and can merge into an existing group instead of duplicating it.
- Groups appear as tabs above the table; delete one with the **×** on its tab.
- **Scanning auto-detects the right group** — searches every group for the ID and switches the visible tab to match, no manual switching needed.
- Unrecognized IDs prompt you to add the student and pick (or create on the spot) a group.
- **Global search** — searching isn't limited to whichever group's tab is open. If a match turns up in a *different* group, it shows up in an "Also found in other groups" list right under the search box; tap it to jump straight there with the search still applied.

### ☁️ Google Sheets sync (optional, for multiple people scanning at once)
- Connect the app to a shared Google Sheet via a small relay script (Apps Script) you deploy once — nobody scanning needs a Google account or to sign in. Full setup steps, including the complete script to copy, are built right into the app (Settings → the "How do I get this URL?" guide) — no separate document needed.
- Every worksheet tab in that Sheet becomes a group, exactly like a multi-tab import — and it works both ways: scans write straight back into the real Sheet.
- Cells in the live Sheet are color-coded to match the local Excel export (emerald headers, green Time In / red Time Out) the moment they're written.
- **Scanning works with no group restriction by default** — auto-detects across every connected group, syncing correctly regardless. An explicit, off-by-default checkbox lets you *optionally* restrict one device to a single group, for cases with several people scanning into the same sheet at once and wanting to split the load.
- Manual **Refresh** button, or automatic sync every 30 seconds.
- Works offline-first: if the connection drops mid-scan, the entry logs locally instantly and queues for automatic retry once you're back online — nothing is lost, and failed syncs show a visible warning instead of failing silently.
- Clearing a logged time (see below) also clears it on the real Sheet, not just locally.
- Deleting a date column on a synced group deletes it from the real Sheet too; deleting a *group* from the app only stops tracking it on that device — it never touches the actual Sheet.

### 🕐 Time tracking
- Time In / Time Out toggle — pick which one the next scan records.
- AM / PM session toggle — separate columns with their own Time In/Out for morning vs. afternoon.
- **Only the column you actually use gets created.** Logging just a Time In for a session doesn't pre-create an empty Time Out column (or vice versa) — the second column only appears once you actually log that mode too. Applies to the table, the Excel export, and the live Google Sheet alike.
- Manually add/rename/delete students, or delete a whole date column.
- **Click any filled time cell to clear it** — with a confirmation popup showing exactly what's being removed, synced to Google Sheets automatically if that group is connected.
- **Per-student Absent counter** — a dedicated column counts how many time cells are still empty for that student, flagged visibly once it's above zero. Updates live as you scan, and is included in the Excel export too.

### 📤 Exporting
- Excel (.xlsx) export — one workbook, one tab per group, color-coded Time In/Out cells, plus the Absent count per student.
- **Per-date event title row** — each date's own columns are labeled with whatever "Export file name" was active when that date was recorded, so a sheet spanning multiple events shows the right name over each one.

### 🎨 Display & customization
- Custom app name, editable from Settings (updates the header live).
- Name/Student ID column width presets (Compact/Normal/Wide) — free up space for date columns; long names truncate with a hover tooltip showing the full text.
- Emerald green theme throughout the UI and exported Excel headers, plus a small credit line under the app title.

### 💻 Layout
- **Session** sits in its own row across the top; **Scanner** and **Attendance Log** sit side by side below it, with the log getting the larger share of the screen so the camera preview is never squeezed to make room for the table.
- On wide screens (1440px+, covers 1920×1080), the whole page fits in one view with no page-level scrolling — the side panel and the table scroll independently within their own space if they ever need to.
- Fully responsive down to phone-sized screens too, where everything just stacks normally.

### 🔌 Runs anywhere, works offline
- Open it as a plain website, or host it (e.g. GitHub Pages) for a fixed link anyone can use.
- QR-scanning and Excel-export libraries are bundled locally instead of pulled from a CDN, so flaky WiFi or networks that block certain CDNs won't break it. If those local files are ever missing, it automatically falls back to loading them from a CDN instead of failing outright.

---

## How to use it

[![Watch the video](https://img.youtube.com/vi/e8GSEoz8zQw/0.jpg)](https://youtu.be/e8GSEoz8zQw)

### 1. Import your first group
Tap **Import**, pick a roster file, and choose its column layout if it's not the default Name/Student Number order.
- Multiple worksheet tabs → confirm once, each tab becomes its own group automatically.
- Single sheet → name the group (pre-filled from the file name).

### 2. Set today's session
In the **Session** row: type an event/export name, adjust the log's column label if needed (defaults to today's date), and pick **AM** or **PM**.

### 3. Pick Time In or Time Out
In the **Scanner** card, choose which one the next scans should record.

### 4. Scan
Tap **Start Scanning** and point the camera at a QR code — or type/scan an ID into the manual entry field. Recognized students get logged instantly, with the matching group tab popping into view automatically. Unrecognized IDs prompt you to add them.

### 5. (Optional) Connect a shared Google Sheet
Open **⚙ Settings**, expand **"How do I get this URL?"** under Google Sheets sync, and follow the steps to deploy the relay script (the full code is right there to copy). Paste the resulting URL and tap **Connect** — every tab in that Sheet becomes a group here.

### 6. Check the log
The **Attendance Log** table shows Name, Student ID, one In/Out pair per date column actually in use, and an **Absent** count per student. Search to jump to a specific student — matches from other groups show up separately and are one tap away. Tap any filled time cell to clear a mistake, or use the ✎ / 🗑 icons to manage entries.

### 7. Export
Tap **Excel** — one file, one tab per group, ready to send as-is.

---

## Data & privacy

Everything is stored locally (browser `localStorage`) by default — no server, no account required, and nothing leaves the device unless you explicitly export a file or opt in to Google Sheets sync. If you do connect a Sheet, only the groups you've connected sync anywhere; unconnected groups stay fully local. Clearing your browser data removes everything on that device, so export regularly if you need to keep records.

## Tech stack

Single-file HTML/CSS/vanilla JavaScript — no build step, no framework. Uses [html5-qrcode](https://github.com/mebjas/html5-qrcode) for camera scanning and [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style) for styled Excel export. The optional Google Sheets sync runs on a small Google Apps Script relay you deploy yourself for free.
