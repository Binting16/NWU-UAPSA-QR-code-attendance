/**
 * Excel (.xlsx) styled export builder using xlsx-js-style
 */
class ExportService {
  buildSheetForGroup(group) {
    const XLSX = window.XLSX;
    if (!XLSX) throw new Error('Spreadsheet library (XLSX) is not loaded.');

    const titleStyle = {
      font: { bold: true, sz: 12, color: { rgb: '0B6E4F' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { patternType: 'solid', fgColor: { rgb: 'DFF3EA' } }
    };
    const blankTitleStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } } };
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '0B6E4F' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const presentStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } },
      font: { color: { rgb: '006100' } },
      alignment: { horizontal: 'center' }
    };
    const idStyle = { font: { name: 'Consolas' } };
    const absentStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: 'FBE7E5' } },
      font: { bold: true, color: { rgb: 'C5413B' } },
      alignment: { horizontal: 'center' }
    };
    const outStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: 'FBE7E5' } },
      font: { color: { rgb: 'C5413B' } },
      alignment: { horizontal: 'center' }
    };

    const colModes = {};
    const visibleDateColumns = [];
    (group.dateColumns || []).forEach(c => {
      const modes = group.columnModes ? group.columnModes[c] : { in: true, out: false };
      if (!modes || (!modes.in && !modes.out)) return;
      colModes[c] = { in: !!modes.in, out: !!modes.out };
      visibleDateColumns.push(c);
    });

    const headerRow = [
      { v: 'Name', t: 's', s: headerStyle },
      { v: 'Student ID', t: 's', s: headerStyle }
    ];
    visibleDateColumns.forEach(c => {
      if (colModes[c].in) headerRow.push({ v: `${c} - Time In`, t: 's', s: headerStyle });
      if (colModes[c].out) headerRow.push({ v: `${c} - Time Out`, t: 's', s: headerStyle });
    });
    headerRow.push({ v: 'Absent', t: 's', s: headerStyle });

    const dataRows = (group.roster || [])
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(s => {
        const row = [
          { v: s.name || '', t: 's' },
          { v: s.id || '', t: 's', s: idStyle }
        ];
        let absentCount = 0;
        visibleDateColumns.forEach(c => {
          const rec = (s.attendance && s.attendance[c]) || {};
          if (colModes[c].in) {
            row.push(rec.in ? { v: rec.in, t: 's', s: presentStyle } : { v: '', t: 's' });
            if (!rec.in) absentCount++;
          }
          if (colModes[c].out) {
            row.push(rec.out ? { v: rec.out, t: 's', s: outStyle } : { v: '', t: 's' });
            if (!rec.out) absentCount++;
          }
        });
        row.push(absentCount > 0 ? { v: absentCount, t: 'n', s: absentStyle } : { v: 0, t: 'n' });
        return row;
      });

    const eventNames = group.eventNames || {};
    const colTitles = [];
    visibleDateColumns.forEach(c => {
      const label = eventNames[c] || 'Attendance';
      if (colModes[c].in) colTitles.push(label);
      if (colModes[c].out) colTitles.push(label);
    });

    const titleRow = [
      { v: '', t: 's', s: blankTitleStyle },
      { v: '', t: 's', s: blankTitleStyle }
    ];
    const merges = [];
    const sameTitle = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

    for (let i = 0; i < colTitles.length; ) {
      let j = i;
      while (j + 1 < colTitles.length && String(colTitles[i]).trim() !== '' && sameTitle(colTitles[i], colTitles[j + 1])) {
        j++;
      }
      titleRow.push({ v: colTitles[i], t: 's', s: titleStyle });
      for (let k = i + 1; k <= j; k++) titleRow.push({ v: '', t: 's', s: titleStyle });
      if (j > i) merges.push({ s: { r: 0, c: 2 + i }, e: { r: 0, c: 2 + j } });
      i = j + 1;
    }
    titleRow.push({ v: '', t: 's', s: blankTitleStyle });

    const aoa = [titleRow, headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;

    const dateColWidths = [];
    visibleDateColumns.forEach(c => {
      dateColWidths.push({ wch: 11 });
      if (colModes[c].in && colModes[c].out) dateColWidths.push({ wch: 11 });
    });
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, ...dateColWidths, { wch: 10 }];

    return ws;
  }

  sanitizeSheetName(name, usedNames) {
    let clean = (name || 'Sheet').replace(/[\\\/\?\*\[\]:]/g, '-').trim().slice(0, 31);
    if (!clean) clean = 'Sheet';
    let final = clean;
    let i = 2;
    while (usedNames.has(final)) {
      const suffix = ` (${i})`;
      final = clean.slice(0, 31 - suffix.length) + suffix;
      i++;
    }
    usedNames.add(final);
    return final;
  }

  buildWorkbook(state) {
    const XLSX = window.XLSX;
    if (!XLSX) throw new Error('Spreadsheet library is not loaded');

    const wb = XLSX.utils.book_new();
    const usedNames = new Set();

    if (!state.groupOrder || state.groupOrder.length === 0) {
      XLSX.utils.book_append_sheet(wb, this.buildSheetForGroup({ dateColumns: [], roster: [] }), 'Attendance');
      return wb;
    }

    state.groupOrder.forEach(name => {
      const g = state.groups[name] || { dateColumns: [], roster: [] };
      const ws = this.buildSheetForGroup(g);
      const sheetName = this.sanitizeSheetName(name, usedNames);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    return wb;
  }

  exportWorkbook(state, filename = 'Attendance.xlsx') {
    const XLSX = window.XLSX;
    const wb = this.buildWorkbook(state);
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Native Android Bridge support
    if (typeof AndroidBridge !== 'undefined' && AndroidBridge.saveAndShareFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1] || '';
        AndroidBridge.saveAndShareFile(base64, filename, blob.type);
      };
      reader.readAsDataURL(blob);
      return;
    }

    // Web download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

export const exportService = new ExportService();
