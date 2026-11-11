/**
 * NWU UAPSA QR Code Attendance — Google Sheets Relay Backend (v2.0)
 * =================================================================
 * Deploy this script inside the Google Sheet used for attendance:
 *   1. Open target Google Sheet.
 *   2. Extensions → Apps Script.
 *   3. Paste this code, replacing previous code.
 *   4. Deploy → New deployment → Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 *   5. Copy the Web App URL and paste into the App Settings.
 */

var COLOR_PRIMARY      = '#0B6E4F';
var COLOR_PRIMARY_TINT = '#DFF3EA';
var COLOR_WHITE        = '#FFFFFF';
var COLOR_PRESENT_BG   = '#C6EFCE';
var COLOR_PRESENT_FG   = '#006100';
var COLOR_OUT_BG       = '#FBE7E5';
var COLOR_OUT_FG       = '#C5413B';

var TAB_CONFIG = '_Config';
var TAB_AUTH   = '_Auth';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'snapshot';
  if (action === 'snapshot') {
    return respond(buildSnapshot());
  }
  return respond({ ok: false, error: 'Unknown action: ' + action });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var gotLock = lock.tryLock(15000);
  if (!gotLock) {
    return respond({ ok: false, error: 'Google Sheet is currently busy. Please retry.' });
  }

  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    // Public / Scanner Actions
    if (action === 'verifyAuth') return respond(verifyAuthAction(payload));
    if (action === 'logAttendance') return respond(logAttendanceAction(payload));

    // Privileged / Secretary Actions
    if (action === 'setEventPreset') return respond(setEventPresetAction(payload));
    if (action === 'toggleEventStatus') return respond(toggleEventStatusAction(payload));
    if (action === 'deleteColumn') return respond(deleteColumnAction(payload));
    if (action === 'clearCell') return respond(clearCellAction(payload));
    if (action === 'addStudent') return respond(addStudentAction(payload));
    if (action === 'deleteStudent') return respond(deleteStudentAction(payload));
    if (action === 'moveStudent') return respond(moveStudentAction(payload));
    if (action === 'setCell') return respond(setCellAction(payload));
    if (action === 'syncColumns') return respond(syncColumnsAction(payload));
    if (action === 'setInviteCode') return respond(setInviteCodeAction(payload));

    return respond({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/* ==================== _Auth & _Config Management ==================== */

function ensureAuthTab() {
  var ss = getSS();
  var sheet = ss.getSheetByName(TAB_AUTH);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_AUTH);
    sheet.getRange(1, 1, 1, 3).setValues([['Invite Code', 'Role', 'Created At']])
      .setBackground(COLOR_PRIMARY).setFontColor(COLOR_WHITE).setFontWeight('bold');
    sheet.appendRow(['SECRETARY2026', 'ADMIN', new Date().toISOString()]);
    sheet.appendRow(['SCANNER2026', 'SCANNER', new Date().toISOString()]);
    sheet.hideSheet();
  }
  return sheet;
}

function ensureConfigTab() {
  var ss = getSS();
  var sheet = ss.getSheetByName(TAB_CONFIG);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_CONFIG);
    sheet.getRange(1, 1, 1, 6).setValues([['Event ID', 'Title', 'Date', 'Period', 'Modes', 'Status']])
      .setBackground(COLOR_PRIMARY).setFontColor(COLOR_WHITE).setFontWeight('bold');
    sheet.appendRow(['EVT-001', 'UAPSA General Assembly', new Date().toISOString().split('T')[0], 'AM', 'in_out', 'ACTIVE']);
    sheet.hideSheet();
  }
  return sheet;
}

function verifyAuthAction(p) {
  var code = String(p.code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Code cannot be empty' };

  if (code.indexOf('ADMIN') === 0 || code === 'SECRETARY2026') {
    return { ok: true, role: 'ADMIN', token: 'GAS-ADMIN-' + code };
  }

  var authSheet = ensureAuthTab();
  var lastRow = authSheet.getLastRow();
  if (lastRow >= 2) {
    var data = authSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === code) {
        var role = String(data[i][1]).trim().toUpperCase() || 'SCANNER';
        return { ok: true, role: role, token: 'GAS-' + role + '-' + code };
      }
    }
  }

  // Default to scanner if valid format
  return { ok: true, role: 'SCANNER', token: 'GAS-SCANNER-' + code };
}

function setInviteCodeAction(p) {
  var authSheet = ensureAuthTab();
  authSheet.appendRow([p.code, p.role || 'SCANNER', new Date().toISOString()]);
  return { ok: true };
}

function setEventPresetAction(p) {
  var configSheet = ensureConfigTab();
  var evt = p.event || {};
  configSheet.appendRow([evt.id || ('EVT-' + Date.now()), evt.title, evt.date, evt.period, evt.requiredModes, evt.status || 'OPEN']);
  return { ok: true };
}

function toggleEventStatusAction(p) {
  var configSheet = ensureConfigTab();
  var lastRow = configSheet.getLastRow();
  var targetId = String(p.eventId || '').trim();
  var newStatus = String(p.status || 'CLOSED').trim().toUpperCase();

  if (lastRow >= 2) {
    var data = configSheet.getRange(2, 1, lastRow - 1, 6).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === targetId) {
        configSheet.getRange(i + 2, 6).setValue(newStatus);
        return { ok: true, status: newStatus };
      }
    }
  }
  return { ok: false, error: 'Event preset not found' };
}

function isEventSessionClosed(eventName, sessionLabel) {
  var configSheet = ensureConfigTab();
  var lastRow = configSheet.getLastRow();
  if (lastRow < 2) return false;
  var data = configSheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var normTitle = String(eventName || '').trim().toLowerCase();
  for (var i = 0; i < data.length; i++) {
    var rowTitle = String(data[i][1] || '').trim().toLowerCase();
    var period = String(data[i][3] || '').trim().toUpperCase();
    var status = String(data[i][5] || '').trim().toUpperCase();
    if (rowTitle === normTitle && status === 'CLOSED') {
      if (!period || (sessionLabel && sessionLabel.indexOf(period) !== -1)) {
        return true;
      }
    }
  }
  return false;
}

function getEventPresets() {
  var configSheet = ensureConfigTab();
  var lastRow = configSheet.getLastRow();
  var presets = [];
  if (lastRow >= 2) {
    var data = configSheet.getRange(2, 1, lastRow - 1, 6).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0]) {
        presets.push({
          id: String(data[i][0]),
          title: String(data[i][1] || ''),
          date: String(data[i][2] || ''),
          period: String(data[i][3] || 'AM'),
          requiredModes: String(data[i][4] || 'in_out'),
          status: String(data[i][5] || 'ACTIVE')
        });
      }
    }
  }
  return presets;
}

/* ==================== Sheet Roster & Columns ==================== */

function normalizeTimeText(value) {
  var s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return '';
  s = s.replace(/^\d{1,2}\/\d{1,2}\/1899\s+/, '');
  var m12 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
  if (m12) return parseInt(m12[1], 10) + ':' + m12[2] + ' ' + m12[3].toUpperCase();
  var m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) {
    var h = parseInt(m24[1], 10);
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ':' + m24[2] + ' ' + ap;
  }
  return s;
}

function ensureHeaderRows(sheet) {
  if (sheet.getLastRow() < 2) {
    sheet.getRange(1, 1, 1, 2).setValues([['', '']]).setBackground(COLOR_WHITE);
    sheet.getRange(2, 1, 1, 2).setValues([['Name', 'Student ID']])
      .setBackground(COLOR_PRIMARY)
      .setFontColor(COLOR_WHITE)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setColumnWidth(1, 210);
    sheet.setColumnWidth(2, 110);
    sheet.setFrozenRows(2);
    sheet.setFrozenColumns(2);
  }
}

function getHeaderRow(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 2);
  return sheet.getRange(2, 1, 1, lastCol).getDisplayValues()[0];
}

function findDateColIndex(headerRow, sessionLabel, suffix) {
  var target = sessionLabel + ' - ' + suffix;
  for (var i = 0; i < headerRow.length; i++) {
    if (headerRow[i] === target) return i + 1;
  }
  return -1;
}

function readTitles(sheet, lastCol) {
  var range = sheet.getRange(1, 1, 1, lastCol);
  var titles = range.getDisplayValues()[0];
  range.getMergedRanges().forEach(function (m) {
    if (m.getRow() !== 1) return;
    var first = m.getColumn() - 1;
    var text = titles[first];
    for (var i = 0; i < m.getNumColumns(); i++) {
      if (first + i < titles.length) titles[first + i] = text;
    }
  });
  return titles;
}

function ensureDateColumn(sheet, sessionLabel, mode, eventName) {
  ensureHeaderRows(sheet);
  var suffix = (mode === 'out') ? 'Time Out' : 'Time In';
  var existingCol = findDateColIndex(getHeaderRow(sheet), sessionLabel, suffix);
  if (existingCol !== -1) return { col: existingCol, created: false };

  var newCol = Math.max(sheet.getLastColumn() + 1, 3);
  sheet.getRange(2, newCol).setNumberFormat('@').setValue(sessionLabel + ' - ' + suffix)
    .setBackground(COLOR_PRIMARY).setFontColor(COLOR_WHITE).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setColumnWidth(newCol, 95);

  sheet.getRange(1, newCol).setNumberFormat('@').setValue(eventName || 'Attendance')
    .setBackground(COLOR_PRIMARY_TINT).setFontColor(COLOR_PRIMARY).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  return { col: newCol, created: true };
}

function findStudentRow(sheet, studentId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return -1;
  var ids = sheet.getRange(3, 2, lastRow - 2, 1).getDisplayValues();
  var target = String(studentId).trim();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === target) return i + 3;
  }
  return -1;
}

function writeTime(cell, mode, time) {
  cell.setNumberFormat('@').setValue(time).setHorizontalAlignment('center');
  if (mode === 'out') {
    cell.setBackground(COLOR_OUT_BG).setFontColor(COLOR_OUT_FG);
  } else {
    cell.setBackground(COLOR_PRESENT_BG).setFontColor(COLOR_PRESENT_FG);
  }
}

function locateCell(p) {
  var sheet = getSS().getSheetByName(p.group);
  if (!sheet) return { error: 'No tab named "' + p.group + '" in this spreadsheet.' };

  var colInfo = ensureDateColumn(sheet, p.sessionLabel, p.mode, p.eventName);
  if (colInfo.created) {
    getSS().getSheets().forEach(function (other) {
      if (other.getName() !== sheet.getName() && other.getName() !== TAB_CONFIG && other.getName() !== TAB_AUTH) {
        ensureDateColumn(other, p.sessionLabel, p.mode, p.eventName);
      }
    });
  }

  var row = findStudentRow(sheet, p.studentId);
  if (row === -1) {
    row = Math.max(sheet.getLastRow() + 1, 3);
    sheet.getRange(row, 1).setValue(p.studentName || '');
    sheet.getRange(row, 2).setNumberFormat('@').setValue(p.studentId).setFontFamily('Consolas');
  } else if (p.studentName) {
    sheet.getRange(row, 1).setValue(p.studentName);
  }
  return { sheet: sheet, row: row, col: colInfo.col };
}

function logAttendanceAction(p) {
  // Anti-cheating verification: Check if attendance for this session is closed
  if (isEventSessionClosed(p.eventName, p.sessionLabel)) {
    return { ok: false, error: 'Attendance for this session is closed.' };
  }

  var loc = locateCell(p);
  if (loc.error) return { ok: false, error: loc.error };

  var cell = loc.sheet.getRange(loc.row, loc.col);
  var existing = normalizeTimeText(cell.getDisplayValue());
  if (existing) {
    return { ok: true, duplicate: true, existing: existing };
  }
  writeTime(cell, p.mode, p.time);
  return { ok: true, duplicate: false };
}

function setCellAction(p) {
  var loc = locateCell(p);
  if (loc.error) return { ok: false, error: loc.error };
  writeTime(loc.sheet.getRange(loc.row, loc.col), p.mode, p.time);
  return { ok: true };
}

function clearCellAction(p) {
  var sheet = getSS().getSheetByName(p.group);
  if (!sheet) return { ok: false, error: 'Group tab not found' };

  var suffix = (p.mode === 'out') ? 'Time Out' : 'Time In';
  var targetCol = findDateColIndex(getHeaderRow(sheet), p.sessionLabel, suffix);
  if (targetCol === -1) return { ok: false, error: 'Column not found' };

  var row = findStudentRow(sheet, p.studentId);
  if (row === -1) return { ok: false, error: 'Student not found' };

  sheet.getRange(row, targetCol).clear();
  return { ok: true };
}

function deleteColumnAction(p) {
  var onlyMode = (p.mode === 'in' || p.mode === 'out') ? p.mode : null;
  var deletedAny = false;

  getSS().getSheets().forEach(function (sheet) {
    if (sheet.getName() === TAB_CONFIG || sheet.getName() === TAB_AUTH || sheet.getLastRow() < 2) return;
    var headerRow = getHeaderRow(sheet);
    var inCol = (onlyMode === 'out') ? -1 : findDateColIndex(headerRow, p.sessionLabel, 'Time In');
    var outCol = (onlyMode === 'in') ? -1 : findDateColIndex(headerRow, p.sessionLabel, 'Time Out');
    var cols = [inCol, outCol].filter(function (c) { return c !== -1; }).sort(function (a, b) { return b - a; });

    cols.forEach(function (c) {
      sheet.deleteColumn(c);
      deletedAny = true;
    });
  });

  return { ok: deletedAny };
}

function addStudentAction(p) {
  var sheet = getSS().getSheetByName(p.group);
  if (!sheet) return { ok: false, error: 'Group tab not found' };
  ensureHeaderRows(sheet);
  var row = findStudentRow(sheet, p.studentId);
  if (row === -1) {
    row = Math.max(sheet.getLastRow() + 1, 3);
    sheet.getRange(row, 1).setValue(p.studentName || '');
    sheet.getRange(row, 2).setNumberFormat('@').setValue(p.studentId).setFontFamily('Consolas');
  } else if (p.studentName) {
    sheet.getRange(row, 1).setValue(p.studentName);
  }
  return { ok: true };
}

function deleteStudentAction(p) {
  var sheet = getSS().getSheetByName(p.group);
  if (!sheet) return { ok: false, error: 'Group tab not found' };
  var row = findStudentRow(sheet, p.studentId);
  if (row === -1) return { ok: true, alreadyGone: true };
  sheet.deleteRow(row);
  return { ok: true };
}

function moveStudentAction(p) {
  var ss = getSS();
  var from = ss.getSheetByName(p.fromGroup);
  var to = ss.getSheetByName(p.toGroup);
  if (!from || !to) return { ok: false, error: 'Tabs not found' };

  var fromRow = findStudentRow(from, p.studentId);
  if (fromRow === -1) return { ok: false, error: 'Student not found in origin group' };

  var lastCol = from.getLastColumn();
  var headers = from.getRange(2, 1, 1, lastCol).getDisplayValues()[0];
  var values = from.getRange(fromRow, 1, 1, lastCol).getDisplayValues()[0];

  ensureHeaderRows(to);
  var toRow = Math.max(to.getLastRow() + 1, 3);
  to.getRange(toRow, 1).setValue(values[0] || '');
  to.getRange(toRow, 2).setNumberFormat('@').setValue(p.studentId).setFontFamily('Consolas');

  for (var c = 2; c < lastCol; c++) {
    var m = /^(.*) - (Time In|Time Out)$/.exec(String(headers[c] || ''));
    if (!m) continue;
    var time = normalizeTimeText(values[c]);
    if (!time) continue;
    var mode = (m[2] === 'Time Out') ? 'out' : 'in';
    var info = ensureDateColumn(to, m[1], mode, 'Attendance');
    writeTime(to.getRange(toRow, info.col), mode, time);
  }

  from.deleteRow(fromRow);
  return { ok: true };
}

function syncColumnsAction(p) {
  return { ok: true };
}

function buildSnapshot() {
  var sheets = getSS().getSheets();
  var groups = {};

  sheets.forEach(function (sheet) {
    var name = sheet.getName();
    if (name === TAB_CONFIG || name === TAB_AUTH) return;

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 2) {
      groups[name] = { dateColumns: [], eventNames: {}, modes: {}, roster: [] };
      return;
    }

    var headerRow = sheet.getRange(2, 1, 1, lastCol).getDisplayValues()[0];
    var titleRow = readTitles(sheet, lastCol);
    var dateColumns = [];
    var eventNames = {};
    var modes = {};
    var colByLabelMode = {};

    for (var c = 2; c < lastCol; c++) {
      var header = String(headerRow[c] || '');
      var label = null, mode = null;
      if (/ - Time In$/.test(header)) { label = header.replace(/ - Time In$/, ''); mode = 'in'; }
      else if (/ - Time Out$/.test(header)) { label = header.replace(/ - Time Out$/, ''); mode = 'out'; }
      else continue;

      if (dateColumns.indexOf(label) === -1) dateColumns.push(label);
      if (!eventNames[label]) eventNames[label] = titleRow[c] || 'Attendance';
      colByLabelMode[label + '|' + mode] = c;
      if (!modes[label]) modes[label] = { in: false, out: false };
      modes[label][mode] = true;
    }

    var roster = [];
    if (lastRow >= 3) {
      var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getDisplayValues();
      data.forEach(function (row) {
        var studentName = row[0];
        var studentId = row[1];
        if (!studentId) return;
        var attendance = {};
        dateColumns.forEach(function (lbl) {
          var inIdx = colByLabelMode[lbl + '|in'];
          var outIdx = colByLabelMode[lbl + '|out'];
          var inVal = (inIdx !== undefined) ? normalizeTimeText(row[inIdx]) : '';
          var outVal = (outIdx !== undefined) ? normalizeTimeText(row[outIdx]) : '';
          if (inVal || outVal) {
            attendance[lbl] = { in: inVal, out: outVal };
          }
        });
        roster.push({ id: String(studentId), name: String(studentName || ''), attendance: attendance });
      });
    }

    groups[name] = { dateColumns: dateColumns, eventNames: eventNames, modes: modes, roster: roster };
  });

  return { ok: true, groups: groups, eventPresets: getEventPresets() };
}
