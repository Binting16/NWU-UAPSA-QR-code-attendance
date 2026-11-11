import { CONFIG } from '../config.js';
import { sheetsApi } from '../services/sheets-api.js';
import { authService } from '../services/auth-service.js';

export function normalizeId(str) {
  return (str || '').toString().trim().toUpperCase().replace(/\s+/g, '');
}

export function extractId(raw) {
  const m = (raw || '').match(/\b(\d{2}-\d{4,6})\b/);
  return m ? m[1] : (raw || '').trim();
}

export function formatTime(d) {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

class Store {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    let loaded = null;

    // 1. Try modern storage key
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (e) {}

    // 2. Fall back to v1 legacy storage key if v2 not present
    if (!loaded) {
      try {
        const legacy = localStorage.getItem('qrAttendanceApp_v1');
        if (legacy) loaded = JSON.parse(legacy);
      } catch (e) {}
    }

    // Default state baseline
    const defaults = {
      fileName: '',
      groups: {},
      groupOrder: [],
      activeGroupId: null,
      scanMode: 'in',
      sessionPeriod: new Date().getHours() < 12 ? 'AM' : 'PM',
      currentSession: null, // { label: 'Oct 15, 2026 (AM)', eventName: 'General Assembly', eventId: 'EVT-001' }
      eventPresets: [
        {
          id: 'EVT-001',
          title: 'UAPSA General Assembly',
          date: new Date().toISOString().split('T')[0],
          period: 'AM',
          requiredModes: 'in_out',
          status: 'ACTIVE'
        }
      ],
      sheetsUrl: '',
      lockedGroup: null,
      pendingSync: [],
      settings: {
        appName: 'QR Code Attendance',
        columnWidth: 'normal',
        importFormat: 'name_id',
        autoSync: false
      }
    };

    const state = Object.assign({}, defaults, loaded || {});

    // Ensure groups structure
    if (!state.groups || typeof state.groups !== 'object') state.groups = {};
    if (!Array.isArray(state.groupOrder)) state.groupOrder = Object.keys(state.groups);
    if (!state.activeGroupId && state.groupOrder.length > 0) state.activeGroupId = state.groupOrder[0];

    // Ensure settings
    state.settings = Object.assign({}, defaults.settings, state.settings || {});

    // Ensure currentSession default if none exists
    if (!state.currentSession) {
      const dateLabel = todayLabel();
      state.currentSession = {
        label: `${dateLabel} (${state.sessionPeriod})`,
        eventName: 'Attendance',
        eventId: 'EVT-001'
      };
    }

    return state;
  }

  save() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {}
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.save();
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    }
  }

  update(mutator) {
    mutator(this.state);
    this.notify();
  }

  // Active group convenience accessor
  getActiveGroup() {
    const s = this.state;
    return (s.activeGroupId && s.groups[s.activeGroupId]) ? s.groups[s.activeGroupId] : null;
  }

  // Roster Queries
  findStudentAcrossGroups(key) {
    for (const name of this.state.groupOrder) {
      const g = this.state.groups[name];
      if (!g || !Array.isArray(g.roster)) continue;
      const student = g.roster.find(x => x.key === key);
      if (student) return { groupName: name, student };
    }
    return null;
  }

  countAbsencesFor(group, student) {
    if (!group || !student) return 0;
    let n = 0;
    (group.dateColumns || []).forEach(label => {
      const modes = (group.columnModes && group.columnModes[label]) || { in: true, out: false };
      const rec = (student.attendance && student.attendance[label]) || {};
      if (modes.in && !rec.in) n++;
      if (modes.out && !rec.out) n++;
    });
    return n;
  }

  // Mutations
  setActiveGroup(groupName) {
    if (this.state.groups[groupName]) {
      this.update(s => {
        s.activeGroupId = groupName;
      });
    }
  }

  setScanMode(mode) {
    this.update(s => {
      s.scanMode = mode === 'out' ? 'out' : 'in';
    });
  }

  setCurrentSession(session) {
    this.update(s => {
      s.currentSession = session;
    });
  }

  setEventPresets(presets) {
    this.update(s => {
      s.eventPresets = presets;
    });
  }

  addEventPreset(preset) {
    this.update(s => {
      s.eventPresets = [...(s.eventPresets || []), preset];
    });
    // If connected to sheets and user is admin, push to _Config
    if (this.state.sheetsUrl && authService.isAdmin()) {
      sheetsApi.postAction(this.state.sheetsUrl, {
        action: 'setEventPreset',
        token: authService.getToken(),
        event: preset
      }).catch(err => console.warn('Could not sync event preset to sheet:', err));
    }
  }

  createGroup(name) {
    const clean = (name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!clean) return null;

    this.update(s => {
      if (!s.groups[clean]) {
        s.groups[clean] = {
          dateColumns: [],
          eventNames: {},
          columnModes: {},
          roster: [],
          syncMode: s.sheetsUrl ? 'sheets' : 'local'
        };
        s.groupOrder.push(clean);
      }
      s.activeGroupId = clean;
    });
    return clean;
  }

  deleteGroup(name) {
    this.update(s => {
      delete s.groups[name];
      s.groupOrder = s.groupOrder.filter(g => g !== name);
      if (s.activeGroupId === name) {
        s.activeGroupId = s.groupOrder[0] || null;
      }
      if (s.lockedGroup === name) {
        s.lockedGroup = null;
      }
    });
  }

  registerSessionColumn(sessionLabel, mode, eventName) {
    let created = false;
    this.state.groupOrder.forEach(gn => {
      const g = this.state.groups[gn];
      if (!g) return;
      if (!g.dateColumns) g.dateColumns = [];
      if (!g.eventNames) g.eventNames = {};
      if (!g.columnModes) g.columnModes = {};

      if (!g.dateColumns.includes(sessionLabel)) g.dateColumns.push(sessionLabel);
      if (!g.eventNames[sessionLabel]) g.eventNames[sessionLabel] = eventName || 'Attendance';

      const m = g.columnModes[sessionLabel] || (g.columnModes[sessionLabel] = { in: false, out: false });
      if (!m[mode]) {
        m[mode] = true;
        created = true;
      }
    });
    return created;
  }

  recordScan(rawCode) {
    const id = extractId(rawCode);
    const key = normalizeId(id);
    const session = this.state.currentSession;
    if (!session || !session.label) {
      return { ok: false, reason: 'no-session', id };
    }

    const sessionLabel = session.label;
    const eventName = session.eventName || 'Attendance';
    const mode = this.state.scanMode;

    // Check device group lock if configured
    if (this.state.lockedGroup) {
      const g = this.state.groups[this.state.lockedGroup];
      if (!g) return { ok: false, reason: 'locked-group-missing', id };
      const student = g.roster.find(s => s.key === key);
      if (!student) {
        return { ok: false, reason: 'not-in-locked-group', id, lockedGroup: this.state.lockedGroup };
      }
      return this._executeRecord(g, this.state.lockedGroup, student, sessionLabel, eventName, mode);
    }

    // Auto-detect group
    const found = this.findStudentAcrossGroups(key);
    if (!found) {
      return { ok: false, reason: 'not-found', id };
    }

    return this._executeRecord(this.state.groups[found.groupName], found.groupName, found.student, sessionLabel, eventName, mode);
  }

  _executeRecord(group, groupName, student, sessionLabel, eventName, mode) {
    if (!student.attendance) student.attendance = {};
    if (!student.attendance[sessionLabel]) student.attendance[sessionLabel] = { in: '', out: '' };

    const rec = student.attendance[sessionLabel];

    // Duplicate check
    if (rec[mode]) {
      return {
        ok: true,
        duplicate: true,
        student,
        groupName,
        existingTime: rec[mode],
        mode,
        absences: this.countAbsencesFor(group, student)
      };
    }

    // Record time locally
    const time = formatTime(new Date());
    rec[mode] = time;
    this.registerSessionColumn(sessionLabel, mode, eventName);

    // Switch active group to show scan immediately
    this.state.activeGroupId = groupName;
    this.notify();

    // Trigger background sync if connected
    if (group.syncMode === 'sheets' && this.state.sheetsUrl) {
      const payload = {
        action: 'logAttendance',
        token: authService.getToken(),
        group: groupName,
        studentId: student.id,
        studentName: student.name,
        sessionLabel,
        eventName,
        mode,
        time
      };

      sheetsApi.postAction(this.state.sheetsUrl, payload).catch(err => {
        console.warn('Scan sync failed, queueing offline:', err);
        this.update(s => {
          s.pendingSync = [...(s.pendingSync || []), payload];
        });
      });
    }

    return {
      ok: true,
      duplicate: false,
      student,
      groupName,
      time,
      mode,
      absences: this.countAbsencesFor(group, student)
    };
  }

  addOrUpdateStudent(id, name, groupName, markPresent = false) {
    const cleanId = (id || '').trim();
    const cleanName = (name || '').trim();
    const targetGroup = groupName || this.state.activeGroupId;
    if (!cleanId || !targetGroup) return null;

    const g = this.state.groups[targetGroup];
    if (!g) return null;

    const key = normalizeId(cleanId);
    let s = g.roster.find(x => x.key === key);

    if (s) {
      if (cleanName) s.name = cleanName;
    } else {
      s = { id: cleanId, key, name: cleanName, attendance: {} };
      g.roster.push(s);
    }

    if (markPresent && this.state.currentSession) {
      const sessionLabel = this.state.currentSession.label;
      const eventName = this.state.currentSession.eventName || 'Attendance';
      const mode = this.state.scanMode;
      const time = formatTime(new Date());

      this.registerSessionColumn(sessionLabel, mode, eventName);
      if (!s.attendance[sessionLabel]) s.attendance[sessionLabel] = { in: '', out: '' };
      s.attendance[sessionLabel][mode] = time;
    }

    this.notify();

    // Background sheet sync
    if (g.syncMode === 'sheets' && this.state.sheetsUrl) {
      sheetsApi.postAction(this.state.sheetsUrl, {
        action: 'addStudent',
        token: authService.getToken(),
        group: targetGroup,
        studentId: cleanId,
        studentName: cleanName
      }).catch(err => console.warn('Could not sync added student to sheet:', err));
    }

    return s;
  }

  deleteStudent(groupName, studentId) {
    const g = this.state.groups[groupName];
    if (!g) return;

    g.roster = g.roster.filter(s => s.id !== studentId);
    this.notify();

    if (g.syncMode === 'sheets' && this.state.sheetsUrl) {
      sheetsApi.postAction(this.state.sheetsUrl, {
        action: 'deleteStudent',
        token: authService.getToken(),
        group: groupName,
        studentId
      }).catch(err => console.warn('Could not sync deleted student to sheet:', err));
    }
  }

  deleteColumn(sessionLabel, mode = null) {
    this.update(s => {
      s.groupOrder.forEach(name => {
        const g = s.groups[name];
        if (!g) return;

        if (mode) {
          // Remove only that specific mode
          if (g.columnModes && g.columnModes[sessionLabel]) {
            g.columnModes[sessionLabel][mode] = false;
          }
          (g.roster || []).forEach(st => {
            if (st.attendance && st.attendance[sessionLabel]) {
              st.attendance[sessionLabel][mode] = '';
            }
          });
          // If neither in nor out remains, purge column
          const m = g.columnModes && g.columnModes[sessionLabel];
          if (!m || (!m.in && !m.out)) {
            g.dateColumns = (g.dateColumns || []).filter(c => c !== sessionLabel);
            if (g.columnModes) delete g.columnModes[sessionLabel];
            if (g.eventNames) delete g.eventNames[sessionLabel];
          }
        } else {
          // Purge whole column
          g.dateColumns = (g.dateColumns || []).filter(c => c !== sessionLabel);
          if (g.columnModes) delete g.columnModes[sessionLabel];
          if (g.eventNames) delete g.eventNames[sessionLabel];
          (g.roster || []).forEach(st => {
            if (st.attendance) delete st.attendance[sessionLabel];
          });
        }
      });
    });

    if (this.state.sheetsUrl && authService.isAdmin()) {
      sheetsApi.postAction(this.state.sheetsUrl, {
        action: 'deleteColumn',
        token: authService.getToken(),
        sessionLabel,
        mode: mode || undefined
      }).catch(err => console.warn('Could not sync column deletion to sheet:', err));
    }
  }

  setAttendanceCell(groupName, studentId, sessionLabel, mode, time) {
    const g = this.state.groups[groupName];
    if (!g) return;
    const student = g.roster.find(s => s.id === studentId);
    if (!student) return;

    if (!student.attendance) student.attendance = {};
    if (!student.attendance[sessionLabel]) student.attendance[sessionLabel] = { in: '', out: '' };

    student.attendance[sessionLabel][mode] = time;
    this.registerSessionColumn(sessionLabel, mode, (g.eventNames && g.eventNames[sessionLabel]) || 'Attendance');
    this.notify();

    if (g.syncMode === 'sheets' && this.state.sheetsUrl) {
      sheetsApi.postAction(this.state.sheetsUrl, {
        action: 'setCell',
        token: authService.getToken(),
        group: groupName,
        studentId,
        sessionLabel,
        mode,
        time
      }).catch(err => console.warn('Could not sync cell edit to sheet:', err));
    }
  }

  clearAttendanceCell(groupName, studentId, sessionLabel, mode) {
    const g = this.state.groups[groupName];
    if (!g) return;
    const student = g.roster.find(s => s.id === studentId);
    if (!student || !student.attendance || !student.attendance[sessionLabel]) return;

    student.attendance[sessionLabel][mode] = '';
    this.notify();

    if (g.syncMode === 'sheets' && this.state.sheetsUrl) {
      sheetsApi.postAction(this.state.sheetsUrl, {
        action: 'clearCell',
        token: authService.getToken(),
        group: groupName,
        studentId,
        sessionLabel,
        mode
      }).catch(err => console.warn('Could not sync clear cell to sheet:', err));
    }
  }

  async syncWithSheets() {
    if (!this.state.sheetsUrl) throw new Error('No Sheets URL configured');

    const snapshot = await sheetsApi.fetchSnapshot(this.state.sheetsUrl, authService.getToken());
    if (!snapshot || !snapshot.groups) return;

    this.update(s => {
      Object.keys(snapshot.groups).forEach(name => {
        const remote = snapshot.groups[name];
        s.groups[name] = {
          dateColumns: remote.dateColumns || [],
          eventNames: remote.eventNames || {},
          columnModes: remote.modes || {},
          roster: (remote.roster || []).map(st => ({
            id: String(st.id),
            key: normalizeId(st.id),
            name: st.name || '',
            attendance: st.attendance || {}
          })),
          syncMode: 'sheets'
        };
        if (!s.groupOrder.includes(name)) s.groupOrder.push(name);
      });

      if (snapshot.eventPresets && Array.isArray(snapshot.eventPresets)) {
        s.eventPresets = snapshot.eventPresets;
      }

      if (!s.activeGroupId && s.groupOrder.length > 0) {
        s.activeGroupId = s.groupOrder[0];
      }
    });
  }
}

export const store = new Store();
