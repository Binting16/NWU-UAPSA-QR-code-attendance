import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { store } from '../state/store.js';

export class ViewSettings extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 16px;
        max-width: 640px;
        margin: 0 auto;
      }

      .guide-box {
        background: var(--surface-alt, #FBFCFE);
        border: 1px solid var(--border, #D5E5DC);
        border-radius: 12px;
        padding: 12px;
        margin-top: 10px;
        font-size: 12.5px;
        line-height: 1.5;
      }
      .guide-box ol {
        margin: 6px 0;
        padding-left: 20px;
      }
      .guide-box code {
        background: var(--primary-tint, #DFF3EA);
        color: var(--primary-dark, #063D2B);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: var(--font-mono, monospace);
        font-size: 11.5px;
      }

      .preset-buttons {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .preset-btn {
        flex: 1;
        padding: 8px;
        border-radius: 10px;
        border: 1.5px solid var(--border, #D5E5DC);
        background: var(--surface-alt, #FBFCFE);
        color: var(--muted, #5B6B82);
        font-weight: 700;
        font-size: 12.5px;
        cursor: pointer;
      }
      .preset-btn.active {
        border-color: var(--primary, #0B6E4F);
        background: var(--primary-tint, #DFF3EA);
        color: var(--primary, #0B6E4F);
      }
    `
  ];

  static properties = {
    sheetsUrl: { type: String },
    syncing: { type: Boolean }
  };

  constructor() {
    super();
    this.sheetsUrl = store.getState().sheetsUrl || '';
    this.syncing = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => {
      this.sheetsUrl = store.getState().sheetsUrl || '';
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  handleAppNameChange(e) {
    const val = e.target.value.trim();
    store.update(s => {
      s.settings.appName = val || 'QR Code Attendance';
    });
    document.title = val || 'QR Code Attendance';
  }

  async saveSheetsUrl() {
    const input = this.shadowRoot.getElementById('sheetsUrlInput');
    const val = (input ? input.value.trim() : '');
    store.update(s => {
      s.sheetsUrl = val;
    });

    if (val) {
      this.syncNow();
    } else {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Sheets link removed (local mode)' } }));
    }
  }

  async syncNow() {
    this.syncing = true;
    try {
      await store.syncWithSheets();
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Synced successfully with Google Sheet!' } }));
    } catch (err) {
      alert('Could not sync with Google Sheets: ' + err.message);
    } finally {
      this.syncing = false;
    }
  }

  setColWidth(preset) {
    store.update(s => {
      s.settings.columnWidth = preset;
    });
    const widths = {
      compact: { name: '110px', id: '80px' },
      normal: { name: '160px', id: '96px' },
      wide: { name: '220px', id: '120px' }
    }[preset] || { name: '160px', id: '96px' };

    document.documentElement.style.setProperty('--name-col-width', widths.name);
    document.documentElement.style.setProperty('--id-col-width', widths.id);
  }

  downloadBackup() {
    const state = store.getState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Backup JSON downloaded' } }));
  }

  handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const loaded = JSON.parse(evt.target.result);
        if (!loaded.groups) {
          alert('Invalid backup file.');
          return;
        }
        if (confirm('Restore this backup? This will replace your current device data.')) {
          store.update(s => {
            Object.assign(s, loaded);
          });
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Data restored successfully' } }));
        }
      } catch (err) {
        alert('Could not parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  clearAllData() {
    if (confirm('⚠️ Permanently delete all local rosters, attendance records, and settings on this device?')) {
      localStorage.clear();
      location.reload();
    }
  }

  render() {
    const state = store.getState();
    const curWidth = state.settings.columnWidth || 'normal';

    return html`
      <!-- App Branding -->
      <div class="card">
        <p class="card-title"><span class="tick"></span>App Branding</p>
        <div class="field">
          <label>Organization / Chapter Name</label>
          <input
            type="text"
            .value="${state.settings.appName || 'QR Code Attendance'}"
            @input="${this.handleAppNameChange}"
          />
          <p class="help-text">Updates the header across all screens.</p>
        </div>
      </div>

      <!-- Google Sheets Live Sync -->
      <div class="card">
        <p class="card-title"><span class="tick"></span>Google Sheets Sync</p>
        <div class="field">
          <label>Apps Script Web App URL</label>
          <input
            type="text"
            id="sheetsUrlInput"
            placeholder="https://script.google.com/macros/s/.../exec"
            .value="${this.sheetsUrl}"
          />
          <p class="help-text">Connects devices to a shared Google Sheet so multiple users log into one file live.</p>
        </div>

        <div class="btn-row" style="margin-top:10px;">
          <button class="btn btn-primary" style="flex:1;" @click="${this.saveSheetsUrl}">Save Link</button>
          <button class="btn btn-ghost" style="flex:1;" ?disabled="${!this.sheetsUrl || this.syncing}" @click="${this.syncNow}">
            ${this.syncing ? 'Syncing…' : '↻ Sync Now'}
          </button>
        </div>

        <details class="guide-box">
          <summary style="font-weight:700; color:var(--primary); cursor:pointer;">How to set up Google Sheets sync?</summary>
          <ol>
            <li>Open the Google Sheet for attendance.</li>
            <li>Click <strong>Extensions → Apps Script</strong>.</li>
            <li>Copy the code from <code>google-apps-script/Code.gs</code> and paste it in.</li>
            <li>Click <strong>Deploy → New deployment → Web app</strong>.</li>
            <li>Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>.</li>
            <li>Copy the Web App URL and paste it above.</li>
          </ol>
        </details>
      </div>

      <!-- Column Width Preset -->
      <div class="card">
        <p class="card-title"><span class="tick"></span>Table Column Widths</p>
        <p class="help-text">Adjust how much horizontal space the student name and ID columns consume on screen:</p>
        <div class="preset-buttons">
          <button class="preset-btn ${curWidth === 'compact' ? 'active' : ''}" @click="${() => this.setColWidth('compact')}">Compact</button>
          <button class="preset-btn ${curWidth === 'normal' ? 'active' : ''}" @click="${() => this.setColWidth('normal')}">Normal</button>
          <button class="preset-btn ${curWidth === 'wide' ? 'active' : ''}" @click="${() => this.setColWidth('wide')}">Wide</button>
        </div>
      </div>

      <!-- Backup & Restore -->
      <div class="card">
        <p class="card-title"><span class="tick"></span>Backup & Safeguards</p>
        <p class="help-text">Download a complete snapshot of all groups and logs, or restore from a previous file.</p>
        <div class="btn-row" style="margin-top:12px;">
          <button class="btn btn-ghost" style="flex:1;" @click="${this.downloadBackup}">💾 Download Backup</button>
          <button class="btn btn-ghost" style="flex:1;" @click="${() => this.shadowRoot.getElementById('restoreFileInput').click()}">📂 Restore…</button>
        </div>
        <input type="file" id="restoreFileInput" accept=".json" style="display:none;" @change="${this.handleRestore}" />

        <div class="divider"></div>
        <button class="btn btn-danger btn-block" @click="${this.clearAllData}">⚠️ Clear All Local Data</button>
      </div>
    `;
  }
}

customElements.define('view-settings', ViewSettings);
