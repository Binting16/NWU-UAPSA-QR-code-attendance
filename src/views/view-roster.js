import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { store } from '../state/store.js';
import { exportService } from '../services/export-service.js';
import { authService } from '../services/auth-service.js';

export class ViewRoster extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 16px;
        max-width: 1400px;
        margin: 0 auto;
      }

      /* Group Tabs */
      .group-tabs {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 6px;
        margin-bottom: 12px;
        -webkit-overflow-scrolling: touch;
      }
      .group-tab {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: var(--radius-pill, 9999px);
        border: 1.5px solid var(--border, #D5E5DC);
        background: var(--surface-alt, #FBFCFE);
        color: var(--muted, #5B6B82);
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
      }
      .group-tab.active {
        background: var(--primary, #0B6E4F);
        border-color: transparent;
        color: #ffffff;
      }

      /* Search & Action Bar */
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .search-box {
        flex: 1;
        min-width: 220px;
      }
      .search-box input {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid var(--border, #D5E5DC);
        border-radius: 10px;
        background: var(--surface-alt, #FBFCFE);
      }

      .stats-badge {
        background: var(--primary-tint, #DFF3EA);
        color: var(--primary-dark, #063D2B);
        font-weight: 700;
        font-size: 12.5px;
        padding: 6px 12px;
        border-radius: var(--radius-pill, 9999px);
      }

      /* Cross-Group Search Drawer */
      .cross-group-results {
        border: 1px solid var(--border, #D5E5DC);
        border-radius: 12px;
        background: var(--surface-alt, #FBFCFE);
        padding: 10px 14px;
        margin-bottom: 14px;
        max-height: 180px;
        overflow-y: auto;
      }
      .cross-group-label {
        margin: 0 0 6px;
        font-size: 11px;
        font-weight: 700;
        color: var(--muted, #5B6B82);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .cgr-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        border: none;
        background: none;
        padding: 6px 4px;
        cursor: pointer;
        border-radius: 6px;
        text-align: left;
      }
      .cgr-item:hover {
        background: var(--primary-tint, #DFF3EA);
      }
      .cgr-name {
        flex: 1;
        font-weight: 600;
        font-size: 13px;
        color: var(--ink, #1A2332);
      }
      .cgr-id {
        font-family: var(--font-mono, monospace);
        font-size: 12px;
        color: var(--muted, #5B6B82);
      }
      .cgr-tag {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: var(--radius-pill, 9999px);
        background: var(--primary-tint, #DFF3EA);
        color: var(--primary, #0B6E4F);
      }

      /* Table Styles */
      .table-wrap {
        border: 1px solid var(--border, #D5E5DC);
        border-radius: 14px;
        overflow-x: auto;
        overflow-y: auto;
        max-height: calc(100vh - 280px);
        background: var(--surface, #FFFFFF);
      }
      table {
        border-collapse: collapse;
        width: 100%;
        font-family: var(--font-mono, monospace);
        font-size: 12.5px;
      }
      thead th {
        position: sticky;
        top: 0;
        background: var(--primary, #0B6E4F);
        color: #ffffff;
        font-family: var(--font-body, sans-serif);
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 10px 10px;
        white-space: nowrap;
        z-index: 10;
        text-align: center;
      }
      thead th.col-name, thead th.col-id {
        z-index: 20;
      }

      th.col-name, td.col-name {
        position: sticky;
        left: 0;
        background: var(--surface, #FFFFFF);
        width: var(--name-col-width, 160px);
        min-width: var(--name-col-width, 160px);
        max-width: var(--name-col-width, 160px);
        text-align: left;
        font-family: var(--font-body, sans-serif);
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        z-index: 2;
      }
      th.col-id, td.col-id {
        position: sticky;
        left: var(--name-col-width, 160px);
        background: var(--surface, #FFFFFF);
        width: var(--id-col-width, 96px);
        min-width: var(--id-col-width, 96px);
        max-width: var(--id-col-width, 96px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        z-index: 2;
      }
      thead th.col-name, thead th.col-id {
        background: var(--primary, #0B6E4F);
        color: #ffffff;
      }

      td {
        padding: 9px 12px;
        border-bottom: 1px solid var(--border, #D5E5DC);
        white-space: nowrap;
        text-align: center;
      }
      tbody tr:hover td {
        background-color: #F8FAF9;
      }

      td.cell-present {
        background: var(--success-bg, #E1F7EC) !important;
        color: var(--success-ink, #0E7A4C);
        font-weight: 700;
      }
      td.cell-present.out-cell {
        background: var(--danger-bg, #FBE7E5) !important;
        color: var(--danger, #C5413B);
      }
      td.cell-empty {
        color: #C2CCDA;
      }
      td.clickable-cell {
        cursor: pointer;
      }
      td.clickable-cell:hover {
        filter: brightness(0.95);
      }

      td.col-absent {
        font-weight: 700;
        color: var(--muted, #5B6B82);
      }
      td.col-absent.has-absences {
        background: var(--danger-bg, #FBE7E5);
        color: var(--danger, #C5413B);
      }

      .btn-icon {
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        padding: 3px 6px;
        border-radius: 6px;
      }
      .btn-icon:hover {
        background: var(--border, #D5E5DC);
      }

      .empty-state {
        padding: 40px 16px;
        text-align: center;
        color: var(--muted, #5B6B82);
      }
    `
  ];

  static properties = {
    searchQuery: { type: String },
    cellEditData: { type: Object }
  };

  constructor() {
    super();
    this.searchQuery = '';
    this.cellEditData = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  handleSearchInput(e) {
    this.searchQuery = (e.target.value || '').trim().toLowerCase();
  }

  exportExcel() {
    const state = store.getState();
    const filename = `${state.fileName || 'Attendance'}.xlsx`;
    exportService.exportWorkbook(state, filename);
  }

  openCellEditor(groupName, student, sessionLabel, mode) {
    if (!authService.isAdmin()) {
      alert('Only secretaries (Admins) can manually edit attendance records.');
      return;
    }
    const current = (student.attendance && student.attendance[sessionLabel] && student.attendance[sessionLabel][mode]) || '';
    this.cellEditData = {
      groupName,
      student,
      sessionLabel,
      mode,
      time: current
    };
  }

  saveCellEdit(e) {
    e.preventDefault();
    if (!this.cellEditData) return;
    const input = this.shadowRoot.getElementById('editTimeInput');
    const val = input ? input.value.trim() : '';

    store.setAttendanceCell(
      this.cellEditData.groupName,
      this.cellEditData.student.id,
      this.cellEditData.sessionLabel,
      this.cellEditData.mode,
      val
    );
    this.cellEditData = null;
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Cell updated' } }));
  }

  clearCellEdit() {
    if (!this.cellEditData) return;
    if (confirm(`Clear this ${this.cellEditData.mode === 'out' ? 'Time Out' : 'Time In'} record?`)) {
      store.clearAttendanceCell(
        this.cellEditData.groupName,
        this.cellEditData.student.id,
        this.cellEditData.sessionLabel,
        this.cellEditData.mode
      );
      this.cellEditData = null;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Cell cleared' } }));
    }
  }

  render() {
    const state = store.getState();
    const group = store.getActiveGroup();
    const roster = group ? group.roster || [] : [];
    const dateColumns = group ? group.dateColumns || [] : [];
    const isAdmin = authService.isAdmin();

    // Visible columns
    const colModes = {};
    const visibleDateCols = [];
    dateColumns.forEach(c => {
      const modes = group.columnModes ? group.columnModes[c] : { in: true, out: false };
      if (!modes || (!modes.in && !modes.out)) return;
      colModes[c] = { in: !!modes.in, out: !!modes.out };
      visibleDateCols.push(c);
    });

    // Filter roster
    const q = this.searchQuery;
    const filteredRoster = roster.filter(s => {
      if (!q) return true;
      return (s.name || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q);
    });

    // Cross-group search
    const crossMatches = [];
    if (q) {
      state.groupOrder.forEach(gn => {
        if (gn === state.activeGroupId) return;
        const g = state.groups[gn];
        if (!g) return;
        (g.roster || []).forEach(st => {
          if ((st.name || '').toLowerCase().includes(q) || (st.id || '').toLowerCase().includes(q)) {
            crossMatches.push({ groupName: gn, student: st });
          }
        });
      });
    }

    // Attendance counts for current session
    const currentSessionLabel = state.currentSession ? state.currentSession.label : '';
    const presentCount = roster.filter(s => {
      const rec = s.attendance && s.attendance[currentSessionLabel];
      return rec && (rec.in || rec.out);
    }).length;

    return html`
      <!-- Group Tabs -->
      <div class="group-tabs">
        ${state.groupOrder.map(name => {
          const g = state.groups[name];
          const count = g && g.roster ? g.roster.length : 0;
          const isSynced = g && g.syncMode === 'sheets';
          return html`
            <button
              class="group-tab ${name === state.activeGroupId ? 'active' : ''}"
              @click="${() => store.setActiveGroup(name)}"
            >
              <span>${isSynced ? '🔗 ' : ''}${name} (${count})</span>
            </button>
          `;
        })}
      </div>

      <!-- Action Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <input
            type="text"
            placeholder="Search student name or ID…"
            .value="${this.searchQuery}"
            @input="${this.handleSearchInput}"
          />
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <span class="stats-badge">${presentCount} / ${roster.length} Present</span>
          <button class="btn btn-accent btn-sm" @click="${this.exportExcel}">📥 Excel</button>
        </div>
      </div>

      <!-- Cross Group Results -->
      ${crossMatches.length > 0 ? html`
        <div class="cross-group-results">
          <p class="cross-group-label">Also found in other sections (${crossMatches.length}):</p>
          ${crossMatches.slice(0, 10).map(m => html`
            <button class="cgr-item" @click="${() => store.setActiveGroup(m.groupName)}">
              <span class="cgr-name">${m.student.name || '(No Name)'}</span>
              <span class="cgr-id">${m.student.id}</span>
              <span class="cgr-tag">${m.groupName}</span>
            </button>
          `)}
        </div>
      ` : ''}

      <!-- Attendance Table -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="col-name" rowspan="2">Name</th>
              <th class="col-id" rowspan="2">Student ID</th>
              ${visibleDateCols.map(col => html`
                <th colspan="${colModes[col].in && colModes[col].out ? 2 : 1}">
                  ${col}
                  ${isAdmin ? html`
                    <button class="btn-icon" title="Delete date column" style="color:#ffffff;" @click="${() => {
                      if (confirm(`Delete column "${col}" across all groups?`)) store.deleteColumn(col);
                    }}">×</button>
                  ` : ''}
                </th>
              `)}
              <th class="col-absent" rowspan="2">Absent</th>
              ${isAdmin ? html`<th rowspan="2">Actions</th>` : ''}
            </tr>
            <tr>
              ${visibleDateCols.map(col => html`
                ${colModes[col].in ? html`<th>In</th>` : ''}
                ${colModes[col].out ? html`<th>Out</th>` : ''}
              `)}
            </tr>
          </thead>
          <tbody>
            ${filteredRoster.length === 0 ? html`
              <tr>
                <td colspan="${4 + visibleDateCols.length * 2}" class="empty-state">
                  ${roster.length === 0 ? 'No students enrolled in this group yet.' : 'No matches found.'}
                </td>
              </tr>
            ` : filteredRoster.map(s => {
              const absences = store.countAbsencesFor(group, s);
              return html`
                <tr>
                  <td class="col-name" title="${s.name || ''}">${s.name || '(No name)'}</td>
                  <td class="col-id">${s.id}</td>
                  ${visibleDateCols.map(col => {
                    const rec = (s.attendance && s.attendance[col]) || {};
                    return html`
                      ${colModes[col].in ? html`
                        <td
                          class="clickable-cell ${rec.in ? 'cell-present' : 'cell-empty'}"
                          title="Click to edit or clear"
                          @click="${() => this.openCellEditor(state.activeGroupId, s, col, 'in')}"
                        >
                          ${rec.in || '—'}
                        </td>
                      ` : ''}
                      ${colModes[col].out ? html`
                        <td
                          class="clickable-cell ${rec.out ? 'cell-present out-cell' : 'cell-empty'}"
                          title="Click to edit or clear"
                          @click="${() => this.openCellEditor(state.activeGroupId, s, col, 'out')}"
                        >
                          ${rec.out || '—'}
                        </td>
                      ` : ''}
                    `;
                  })}
                  <td class="col-absent ${absences > 0 ? 'has-absences' : ''}">${absences}</td>
                  ${isAdmin ? html`
                    <td>
                      <button
                        class="btn-icon"
                        title="Delete student"
                        @click="${() => {
                          if (confirm(`Remove ${s.name || s.id} from this group?`)) {
                            store.deleteStudent(state.activeGroupId, s.id);
                          }
                        }}"
                      >🗑</button>
                    </td>
                  ` : ''}
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>

      <!-- Cell Edit Dialog (Admin Only) -->
      ${this.cellEditData ? html`
        <ui-modal
          open
          title="Edit Attendance Time"
          subtitle="${this.cellEditData.student.name || this.cellEditData.student.id} · ${this.cellEditData.sessionLabel} (${this.cellEditData.mode.toUpperCase()})"
          @modal-close="${() => { this.cellEditData = null; }}"
        >
          <form @submit="${this.saveCellEdit}">
            <div class="field">
              <label>Time (e.g. 8:30 AM)</label>
              <input type="text" id="editTimeInput" .value="${this.cellEditData.time}" required />
            </div>
            <div class="btn-row" style="margin-top:16px;">
              <button type="button" class="btn btn-ghost" style="flex:1;" @click="${() => { this.cellEditData = null; }}">Cancel</button>
              <button type="button" class="btn btn-danger" style="flex:1;" @click="${this.clearCellEdit}">Clear</button>
              <button type="submit" class="btn btn-primary" style="flex:1;">Save</button>
            </div>
          </form>
        </ui-modal>
      ` : ''}
    `;
  }
}

customElements.define('view-roster', ViewRoster);
