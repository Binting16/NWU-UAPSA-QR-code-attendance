import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { store, normalizeId } from '../state/store.js';
import { authService } from '../services/auth-service.js';

export class ViewAdmin extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 16px;
        max-width: 640px;
        margin: 0 auto;
      }

      .admin-gate {
        text-align: center;
        padding: 32px 16px;
      }
      .admin-gate svg {
        width: 48px;
        height: 48px;
        color: var(--accent, #E8A33D);
        margin-bottom: 12px;
      }
      .admin-gate h3 {
        font-family: var(--font-display, sans-serif);
        font-size: 18px;
        margin: 0 0 6px;
      }
      .admin-gate p {
        color: var(--muted, #5B6B82);
        font-size: 13px;
        margin: 0 0 16px;
      }

      .code-display {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--surface-alt, #FBFCFE);
        border: 1px dashed var(--primary, #0B6E4F);
        border-radius: 12px;
        margin: 10px 0;
      }
      .code-display code {
        font-family: var(--font-mono, monospace);
        font-size: 16px;
        font-weight: 700;
        color: var(--primary, #0B6E4F);
      }

      .column-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
      }
      .column-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-radius: 10px;
        background: var(--surface-alt, #FBFCFE);
        border: 1px solid var(--border, #D5E5DC);
      }
    `
  ];

  static properties = {
    isAdmin: { type: Boolean },
    loginCode: { type: String },
    generatedCode: { type: String }
  };

  constructor() {
    super();
    this.isAdmin = authService.isAdmin();
    this.loginCode = '';
    this.generatedCode = 'UAPSA-REP-' + Math.floor(1000 + Math.random() * 9000);
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => {
      this.isAdmin = authService.isAdmin();
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  async handleAdminLogin(e) {
    e.preventDefault();
    const input = this.shadowRoot.getElementById('adminPasswordInput');
    const code = input ? input.value.trim() : '';

    try {
      const state = store.getState();
      await authService.loginWithCode(code, state.sheetsUrl);
      this.isAdmin = authService.isAdmin();
      if (this.isAdmin) {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Unlocked Secretary Admin Mode' } }));
      } else {
        alert('Invalid secretary credentials. Ensure code has admin prefix or check your Google Sheet _Auth tab.');
      }
    } catch (err) {
      alert('Login error: ' + err.message);
    }
  }

  handleLogout() {
    authService.logout();
    this.isAdmin = false;
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Logged out to Scanner Mode' } }));
  }

  generateNewInvite() {
    this.generatedCode = 'UAPSA-REP-' + Math.floor(1000 + Math.random() * 9000);
  }

  copyInvite() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.generatedCode);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Invite code copied!' } }));
    }
  }

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const XLSX = window.XLSX;
    if (!XLSX) {
      alert('Spreadsheet library is not loaded.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        let totalImported = 0;

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          const groupName = sheetName.trim();
          store.createGroup(groupName);

          rows.forEach((row, idx) => {
            if (!row || row.length === 0) return;
            const cells = row.map(v => (v || '').toString().trim());
            if (cells.every(c => !c)) return;
            // Skip header if looks like header
            if (idx === 0 && /\b(name|id|student)\b/i.test(cells.join(' '))) return;

            const name = cells[0] || '';
            const id = cells[1] || '';
            if (id) {
              store.addOrUpdateStudent(id, name, groupName);
              totalImported++;
            }
          });
        });

        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { message: `Imported ${totalImported} students across ${wb.SheetNames.length} sections!` }
        }));
      } catch (err) {
        alert('Could not parse roster file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  render() {
    if (!this.isAdmin) {
      return html`
        <div class="card admin-gate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h3>Secretary Authorization</h3>
          <p>Enter the Secretary Admin Code to access roster importing, invite management, and column hygiene.</p>
          <form @submit="${this.handleAdminLogin}">
            <div class="field" style="max-width:320px; margin:0 auto 14px;">
              <input type="password" id="adminPasswordInput" placeholder="Enter Secretary Code" required />
            </div>
            <button type="submit" class="btn btn-primary">Unlock Admin Mode</button>
          </form>
        </div>
      `;
    }

    const state = store.getState();
    const group = store.getActiveGroup();
    const dateColumns = group ? group.dateColumns || [] : [];

    return html`
      <!-- Admin Header Card -->
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <p class="card-title" style="margin:0;"><span class="tick"></span>Secretary Console</p>
          <button class="btn btn-ghost btn-sm" @click="${this.handleLogout}">Exit Admin Mode</button>
        </div>
        <p class="help-text">You are authenticated as Secretary. You have full control over roster imports, columns, and invite codes.</p>
      </div>

      <!-- Invite Code Manager -->
      <div class="card">
        <p class="card-title"><span class="tick"></span>Representative Invite Codes</p>
        <p class="help-text">Share this code with student representatives. It grants them scanner access while preventing unauthorized column creation.</p>
        <div class="code-display">
          <code>${this.generatedCode}</code>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-ghost btn-sm" @click="${this.copyInvite}">Copy</button>
            <button class="btn btn-ghost btn-sm" @click="${this.generateNewInvite}">↻ New</button>
          </div>
        </div>
      </div>

      <!-- Roster Import -->
      <div class="card">
        <p class="card-title"><span class="tick"></span>Roster File Import</p>
        <p class="help-text">Upload an Excel (.xlsx) file. If the workbook has multiple tabs, each worksheet becomes its own section automatically.</p>
        <input type="file" id="rosterFileInput" accept=".xlsx,.xls,.csv" style="display:none;" @change="${this.handleFileUpload}" />
        <button class="btn btn-primary btn-block" style="margin-top:12px;" @click="${() => {
          this.shadowRoot.getElementById('rosterFileInput').click();
        }}">
          ⬆ Upload Roster File
        </button>
      </div>

      <!-- Column Cleanup -->
      <div class="card">
        <p class="card-title"><span class="tick"></span>Column Maintenance</p>
        <p class="help-text">Manage attendance date columns. Deleting a column removes it cleanly across all student rosters and Google Sheets.</p>
        ${dateColumns.length === 0 ? html`
          <p class="help-text" style="font-style:italic;">No date columns recorded yet.</p>
        ` : html`
          <div class="column-list">
            ${dateColumns.map(col => html`
              <div class="column-item">
                <span style="font-size:13px; font-weight:600;">${col}</span>
                <button class="btn btn-danger btn-sm" @click="${() => {
                  if (confirm(`Permanently delete column "${col}" across all groups?`)) store.deleteColumn(col);
                }}">Delete</button>
              </div>
            `)}
          </div>
        `}
      </div>
    `;
  }
}

customElements.define('view-admin', ViewAdmin);
